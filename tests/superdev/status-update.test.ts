/*
 * status-update.test.ts - proves status-update.sh's contract: given a
 * `tasks/task-NN.md` path it derives the working dir (parent of `tasks/`)
 * and overwrites `<workdir>/status.md` with `task: <NN>`, reporting the
 * update on stdout; exits 1 on a missing/nonexistent argument or a filename
 * that does not fit the `task-NN.md` shape.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/status-update.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";

const SUT = path.resolve(import.meta.dirname, "../../superdev/scripts/status-update.sh");

function writeTask(workdir: string, name: string): string {
  const tasksDir = path.join(workdir, "tasks");
  fs.mkdirSync(tasksDir, { recursive: true });
  const file = path.join(tasksDir, name);
  fs.writeFileSync(file, "## a task\n");
  return file;
}

test("valid tasks/task-NN.md updates <workdir>/status.md and reports it on stdout, exit 0", () => {
  withTempDir("p2p2-status-update-", (dir) => {
    const taskFile = writeTask(dir, "task-01.md");
    const result = runScript(SUT, [taskFile], { cwd: dir });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const statusPath = path.join(dir, "status.md");
    assert.equal(fs.readFileSync(statusPath, "utf-8"), "task: 01\n");
    assert.equal(result.stdout, `status: ${statusPath} -> task: 01\n`);
  });
});

test("missing argument -> exit 1 with usage on stderr", () => {
  withTempDir("p2p2-status-update-", (dir) => {
    const result = runScript(SUT, [], { cwd: dir });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /missing required parameter 'task-file'/);
    assert.match(result.stderr, /usage: status-update\.sh <task-file>/);
  });
});

test("nonexistent task file -> exit 1", () => {
  withTempDir("p2p2-status-update-", (dir) => {
    const missing = path.join(dir, "tasks", "task-01.md");
    const result = runScript(SUT, [missing], { cwd: dir });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /task file not found/);
  });
});

test("a path not matching tasks/task-NN.md -> exit 1, cannot extract task number", () => {
  withTempDir("p2p2-status-update-", (dir) => {
    fs.mkdirSync(path.join(dir, "tasks"), { recursive: true });
    const file = path.join(dir, "tasks", "notes.md");
    fs.writeFileSync(file, "not a task file\n");
    const result = runScript(SUT, [file], { cwd: dir });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /cannot extract task number from 'notes\.md' \(expected task-NN\.md\)/);
  });
});

test("task-07 (zero-padded) preserves the exact digits in status.md and stdout", () => {
  withTempDir("p2p2-status-update-", (dir) => {
    const taskFile = writeTask(dir, "task-07.md");
    const result = runScript(SUT, [taskFile], { cwd: dir });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(fs.readFileSync(path.join(dir, "status.md"), "utf-8"), "task: 07\n");
    assert.match(result.stdout, /-> task: 07$/m);
  });
});

test("task-7 (no zero-padding) also resolves, preserving the un-padded digits", () => {
  withTempDir("p2p2-status-update-", (dir) => {
    const taskFile = writeTask(dir, "task-7.md");
    const result = runScript(SUT, [taskFile], { cwd: dir });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(fs.readFileSync(path.join(dir, "status.md"), "utf-8"), "task: 7\n");
    assert.match(result.stdout, /-> task: 7$/m);
  });
});

test("a second run overwrites status.md rather than appending", () => {
  withTempDir("p2p2-status-update-", (dir) => {
    const first = writeTask(dir, "task-01.md");
    const second = writeTask(dir, "task-02.md");
    runScript(SUT, [first], { cwd: dir });
    const result = runScript(SUT, [second], { cwd: dir });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(fs.readFileSync(path.join(dir, "status.md"), "utf-8"), "task: 02\n");
  });
});
