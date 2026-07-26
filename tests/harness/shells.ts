/*
 * shells.ts - discovers the real shell binaries present on THIS machine, so
 * a script test can exercise every one that is actually here and skip (never
 * fail) the ones that are not.
 *
 * Scope, per the plan: a `#!/usr/bin/env bash` script always runs under
 * bash, so it is exercised under every distinct bash MAJOR present (macOS
 * ships 3.2, Linux/Git-Bash ship 5.x - that's where real divergence lives).
 * A `#!/bin/sh` script goes through every POSIX shell present: `/bin/sh`,
 * `dash`, `busybox sh` and `bash --posix`. `busybox sh` and `bash --posix`
 * are two-token invocations ("busybox sh script", "bash --posix script"),
 * so each is wrapped in a tiny generated one-line shim that `exec`s it,
 * giving `forEachShell` a single interpreter path to hand to
 * `RunOpts.shell` either way.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

export interface ShellSkip {
  kind: "bash" | "posix";
  name: string;
  reason: string;
}

function isExecutable(candidate: string): boolean {
  try {
    fs.accessSync(candidate, fs.constants.X_OK);
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}

/** Every executable named `name` found across PATH's directories (Windows:
 *  also `name.exe`/`name.cmd`/`name.bat`). */
function candidatesOnPath(name: string): string[] {
  const dirs = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  const exeNames = process.platform === "win32" ? [`${name}.exe`, `${name}.cmd`, `${name}.bat`, name] : [name];
  const found: string[] = [];
  for (const dir of dirs) {
    for (const exe of exeNames) {
      const candidate = path.join(dir, exe);
      if (isExecutable(candidate)) found.push(candidate);
    }
  }
  return found;
}

function bashMajorVersion(bashPath: string): string | null {
  const result = spawnSync(bashPath, ["--version"], { encoding: "utf-8" });
  if (result.status !== 0 || !result.stdout) return null;
  const match = result.stdout.match(/version (\d+)\./);
  return match ? match[1] : null;
}

let shimDirCache: string | null = null;

/** One shim dir per process, under the OS temp root - never inside this
 *  repo's working tree, and never reused across test runs. */
function shimDir(): string {
  if (shimDirCache === null) {
    shimDirCache = fs.mkdtempSync(path.join(os.tmpdir(), "p2p2-shell-shim-"));
    const dir = shimDirCache;
    process.once("exit", () => fs.rmSync(dir, { recursive: true, force: true }));
  }
  return shimDirCache;
}

function writeShim(name: string, exec: string): string {
  const shimPath = path.join(shimDir(), name);
  fs.writeFileSync(shimPath, `#!/bin/sh\n${exec} "$@"\n`, { mode: 0o755 });
  fs.chmodSync(shimPath, 0o755);
  return shimPath;
}

/** Every distinct bash on this machine, deduplicated by reported `--version`
 *  major (so bash 5.1 and 5.2 on the same box count once). */
export function bashShells(): string[] {
  const candidates = new Set<string>([...candidatesOnPath("bash"), "/bin/bash"]);
  const seenMajors = new Set<string>();
  const result: string[] = [];
  for (const candidate of candidates) {
    if (!isExecutable(candidate)) continue;
    const major = bashMajorVersion(candidate);
    if (major === null || seenMajors.has(major)) continue;
    seenMajors.add(major);
    result.push(candidate);
  }
  return result;
}

interface ShellCandidate {
  name: string;
  resolve: () => string | null;
}

function posixCandidates(): ShellCandidate[] {
  return [
    { name: "/bin/sh", resolve: () => (isExecutable("/bin/sh") ? "/bin/sh" : null) },
    { name: "dash", resolve: () => candidatesOnPath("dash")[0] ?? null },
    {
      name: "busybox sh",
      resolve: () => {
        const busybox = candidatesOnPath("busybox")[0];
        return busybox ? writeShim("busybox-sh", `exec "${busybox}" sh`) : null;
      },
    },
    {
      name: "bash --posix",
      resolve: () => {
        const bash = bashShells()[0];
        return bash ? writeShim("bash-posix", `exec "${bash}" --posix`) : null;
      },
    },
  ];
}

/** Every POSIX shell present on this machine (see module doc for the list). */
export function posixShells(): string[] {
  return posixCandidates()
    .map((candidate) => candidate.resolve())
    .filter((resolved): resolved is string => resolved !== null);
}

function bashCandidates(): ShellCandidate[] {
  const found = bashShells();
  if (found.length === 0) {
    return [{ name: "bash", resolve: () => null }];
  }
  return found.map((bashPath) => ({ name: bashPath, resolve: () => bashPath }));
}

/** Calls `fn(shellPath)` for every shell of `kind` present on this machine;
 *  records a `ShellSkip` (never throws) for each one that is not. */
export function forEachShell(kind: "bash" | "posix", fn: (shell: string) => void): ShellSkip[] {
  const candidates = kind === "bash" ? bashCandidates() : posixCandidates();
  const skips: ShellSkip[] = [];
  for (const candidate of candidates) {
    const resolved = candidate.resolve();
    if (resolved === null) {
      skips.push({ kind, name: candidate.name, reason: "not found on this machine" });
      continue;
    }
    fn(resolved);
  }
  return skips;
}
