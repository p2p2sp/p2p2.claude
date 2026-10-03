/*
 * monitor-engine.test.ts - proves the build monitor's engine layer
 * (viber/hooks/monitor/register.tsx) where only Claude Code can run it: it
 * copies the viber plugin, with tests/viber/monitor/ as its tests/ folder,
 * under `.temp/viber/monitor-engine/`, runs `claude plugin validate` and
 * `claude plugin test` there, and removes the copy. Also pins that hooks.json
 * keeps viber's four command hooks beside the module.
 *
 * Repo reality: function-hook modules need Claude Code 2.1.287 or later. With
 * no `claude` binary, or an older one, the engine layer is reported as one
 * skipped test naming the reason (CI has none); the version gate itself is
 * proven on every run. The engine run is made once per process and shared by
 * the cases that read it: one copy, one validate, one plugin test.
 */

import { test } from "../harness/test.ts";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";

const REPO = path.resolve(import.meta.dirname, "../..");
const PLUGIN = path.join(REPO, "viber");
const ENGINE_TESTS = path.join(import.meta.dirname, "monitor");
const COPIES = path.join(REPO, ".temp/viber/monitor-engine");
const HOOKS = path.join(PLUGIN, "hooks/hooks.json");

interface Probe {
  /** `null` when the binary could not start (absent). */
  status: number | null;
  stdout: string;
}

/** The first Claude Code build that runs function-hook modules. */
const MINIMUM = [2, 1, 287] as const;

/** Why the engine layer cannot be proven with this `claude --version` probe, or undefined when it can. */
function gateReason(probe: Probe): string | undefined {
  if (probe.status !== 0) return "no claude binary on PATH: the engine layer needs Claude Code 2.1.287 or later";
  const version = /(\d+)\.(\d+)\.(\d+)/.exec(probe.stdout);
  if (version === null) return `claude --version printed no version (${probe.stdout.trim()}): the engine layer needs Claude Code 2.1.287 or later`;
  const parts = version.slice(1, 4).map(Number);
  const index = parts.findIndex((part, at) => part !== MINIMUM[at]);
  const isOlder = index !== -1 && parts[index] < MINIMUM[index];
  return isOlder ? `claude ${version[0]} is older than 2.1.287, the first build that runs function-hook modules` : undefined;
}

test("the version gate gives a skip reason for claude 2.1.285 (older than the first build that runs modules)", () => {
  assert.match(gateReason({ status: 0, stdout: "2.1.285 (Claude Code)\n" }) ?? "", /2\.1\.285.*2\.1\.287/);
});

test("the version gate gives a skip reason for a missing claude binary", () => {
  assert.match(gateReason({ status: null, stdout: "" }) ?? "", /no claude binary/);
});

test("the version gate gives no skip reason for claude 2.1.288", () => {
  assert.equal(gateReason({ status: 0, stdout: "2.1.288 (Claude Code)\n" }), undefined);
});

interface HooksFile {
  hooks: Record<string, { matcher?: string; hooks: { type: string; command: string }[] }[]>;
  modules?: string[];
}

test("hooks.json still holds viber's four command hooks beside the monitor module (the module must not displace them)", () => {
  const file = JSON.parse(fs.readFileSync(HOOKS, "utf-8")) as HooksFile;
  const commands = Object.entries(file.hooks).flatMap(([event, groups]) =>
    groups.flatMap((group) => group.hooks.map((hook) => `${event} ${group.matcher ?? "*"} ${hook.type} ${path.basename(hook.command.replace(/"$/, ""))}`)),
  );

  assert.deepEqual({ commands: commands.sort(), modules: file.modules }, {
    commands: [
      "PreToolUse Bash command kill-guard.sh",
      "PreToolUse ExitPlanMode command plan-gate.sh",
      "SessionStart startup|clear|compact command session-start.sh",
      "UserPromptSubmit * command plan-hints.sh",
    ],
    modules: ["./monitor/register.tsx"],
  });
});

interface EngineRun {
  copy: string;
  validate: RunResult;
  pluginTest: RunResult;
}

let engineRun: Promise<EngineRun> | undefined;

/** Copies the plugin and its engine tests under COPIES, validates and tests the copy, removes it; once per process. */
function runEngine(): Promise<EngineRun> {
  engineRun ??= (async () => {
    fs.mkdirSync(COPIES, { recursive: true });
    const copy = fs.mkdtempSync(path.join(COPIES, "run-"));
    try {
      fs.cpSync(PLUGIN, copy, { recursive: true });
      fs.cpSync(ENGINE_TESTS, path.join(copy, "tests"), { recursive: true });
      const validate = await runScript("claude", ["plugin", "validate", "--json", copy], { timeout: 120_000 });
      const pluginTest = await runScript("claude", ["plugin", "test", copy], { cwd: copy, timeout: 600_000 });
      return { copy, validate, pluginTest };
    } finally {
      fs.rmSync(copy, { recursive: true, force: true });
      // the shared parent goes too once no other run holds a copy in it
      try {
        fs.rmdirSync(COPIES);
      } catch {
        // another run's copy is still there
      }
    }
  })();
  return engineRun;
}

interface ValidateReport {
  success: boolean;
  contents: { file: string; notes: string[] }[];
}

const probed = spawnSync("claude", ["--version"], { encoding: "utf-8", timeout: 30_000 });
const skipReason = gateReason({ status: probed.error ? null : probed.status, stdout: probed.stdout ?? "" });

if (skipReason !== undefined) {
  test("claude plugin validate and claude plugin test pass on the copy under .temp/viber/monitor-engine/", { skip: skipReason }, () => {});
} else {
  test("claude plugin validate passes on the copy", async () => {
    const { validate } = await runEngine();
    assert.equal(validate.status, 0, validate.stdout + validate.stderr);
  });

  test("claude plugin validate reports the module's calls and no fs.write among them (the monitor writes nothing)", async () => {
    const { validate } = await runEngine();
    const calls = (JSON.parse(validate.stdout) as ValidateReport).contents.flatMap((entry) => entry.notes).filter((note) => note.includes("register.tsx calls: "));
    assert.deepEqual({ reported: calls.length, writes: calls.filter((note) => note.includes("fs.write")) }, { reported: 1, writes: [] });
  });

  test("claude plugin test runs the engine tests on the copy and every one passes", async () => {
    const { pluginTest } = await runEngine();
    const output = pluginTest.stdout + pluginTest.stderr;
    assert.deepEqual({ status: pluginTest.status, ran: / [1-9]\d* pass\n 0 fail\n/.test(output) }, { status: 0, ran: true }, output);
  });

  test("the copy under .temp/viber/monitor-engine/ is removed after the run", async () => {
    const { copy } = await runEngine();
    assert.equal(fs.existsSync(copy), false);
  });
}
