/*
 * test.ts - the `test()` every test file imports instead of node:test's own.
 * node:test runs a file's top-level tests one after another; this one collects
 * them and, once the file has finished loading, registers them inside one
 * suite named after the file with `concurrency` set, so a file's cases run in
 * parallel while each still reports, skips and filters (`--test-name-pattern`)
 * under its own name. Needs every case to be registered synchronously at load
 * (no top-level `await` before a `test()` call) and to share no mutable state
 * with another case of its file.
 *
 * Concurrency per file: `P2P2_TEST_CONCURRENCY` when set, else 4. It
 * multiplies with `--test-concurrency` (files at once).
 */

import os from "node:os";
import path from "node:path";
import { suite, test as nodeTest, type TestContext, type TestOptions } from "node:test";

type TestFn = (t: TestContext) => void | Promise<void>;

interface Case {
  name: string;
  options: TestOptions;
  fn: TestFn;
}

const CONCURRENCY = Math.max(1, Number(process.env.P2P2_TEST_CONCURRENCY) || Math.min(4, os.availableParallelism()));

const cases: Case[] = [];

export function test(name: string, fn: TestFn): void;
export function test(name: string, options: TestOptions, fn: TestFn): void;
export function test(name: string, optionsOrFn: TestOptions | TestFn, maybeFn?: TestFn): void {
  const fn = typeof optionsOrFn === "function" ? optionsOrFn : maybeFn!;
  const options = typeof optionsOrFn === "function" ? {} : optionsOrFn;
  if (cases.push({ name, options, fn }) > 1) return;
  queueMicrotask(() => {
    void suite(path.basename(process.argv[1] ?? "tests"), { concurrency: CONCURRENCY }, () => {
      for (const c of cases) void nodeTest(c.name, c.options, c.fn);
    });
  });
}
