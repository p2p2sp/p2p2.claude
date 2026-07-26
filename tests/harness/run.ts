/*
 * run.ts - runs a shipped script as a real subprocess and hands back its
 * stdout/stderr/exit status, the way an end user (or a SKILL.md `!` preload)
 * would invoke it: through an interpreter, never `import`ed.
 *
 * Interpreter resolution:
 *   - `opts.shell` set        -> `<shell> <script> ...args` (used to force a
 *     script through a specific bash/POSIX shell binary, see shells.ts).
 *     A two-token shell ("bash --posix") is passed as an argv array and its
 *     prefix args are kept ahead of the script.
 *   - script ends in a JS/TS
 *     extension                -> `<node> <script> ...args` (works
 *     identically on every OS - no shebang involved).
 *   - otherwise, on win32      -> the OS does not honour a `#!` line, so the
 *     script's own shebang is read and the matching interpreter
 *     (bash/sh/node/...) is resolved from PATH by name. A bare command name
 *     is first looked up in `opts.stubDirs`, because CreateProcess only ever
 *     appends `.exe` and would otherwise walk straight past an extensionless
 *     stub to the real binary (see stub.ts).
 *   - otherwise (POSIX,
 *     no explicit shell)       -> the script (or bare command name, e.g.
 *     "git") is executed directly; the OS/exec resolves its shebang or PATH.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export interface RunOpts {
  /** Absolute interpreter path, or [path, ...prefixArgs] for a two-token
   *  shell - when set, invoke `shell script ...args`. */
  shell?: string | string[];
  cwd?: string;
  env?: Record<string, string>;
  /** Piped to the child's stdin. */
  input?: string;
  /** Prepended to PATH, in order, ahead of the sanitised base PATH. */
  stubDirs?: string[];
  /** Milliseconds; default 60000 - generous on purpose, because CI runs the
   *  files more concurrently than the runner has cores, so a spawn-heavy
   *  script can take several times its unloaded wall time. */
  timeout?: number;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  /** `null` when the process was killed by a signal (e.g. the timeout). */
  status: number | null;
}

/** Env vars a subprocess needs to run at all, kept minimal on purpose so a
 *  test's `opts.env` is the only source of script-specific configuration. */
const BASE_ENV_KEYS = [
  "PATH",
  "HOME",
  "USERPROFILE",
  "TMPDIR",
  "TEMP",
  "TMP",
  "SystemRoot",
  "windir",
  "ProgramFiles",
  "ComSpec",
  "PATHEXT",
  "LANG",
  "LC_ALL",
];

function sanitisedBaseEnv(): Record<string, string> {
  const base: Record<string, string> = {};
  for (const key of BASE_ENV_KEYS) {
    const value = process.env[key];
    if (value !== undefined) base[key] = value;
  }
  return base;
}

function isExecutableFile(candidate: string): boolean {
  try {
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}

/** Reads a script's `#!` line and returns the interpreter to invoke it with
 *  by name (e.g. "bash", "sh", "node"), or `null` when there is none - used
 *  only on win32, where the shebang itself is never honoured by the OS. */
function shebangInterpreter(script: string): string | null {
  let firstLine: string;
  try {
    const contents = fs.readFileSync(script, "utf-8");
    firstLine = contents.split("\n", 1)[0];
  } catch {
    return null;
  }
  if (!firstLine.startsWith("#!")) return null;
  const parts = firstLine.slice(2).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  const bin = path.basename(parts[0]).replace(/\.exe$/i, "");
  if (bin === "env") return parts[1] ?? null;
  return bin;
}

/** A `withStub` stub matching the bare command name `script`, if any of
 *  `stubDirs` holds one - win32 only, where CreateProcess would ignore it. */
function stubbedCommand(script: string, stubDirs: string[]): string | null {
  if (script.includes("/") || script.includes("\\")) return null;
  for (const dir of stubDirs) {
    const candidate = path.join(dir, script);
    if (isExecutableFile(candidate) && shebangInterpreter(candidate)) return candidate;
  }
  return null;
}

function resolveCommand(script: string, args: string[], opts: RunOpts): { cmd: string; args: string[] } {
  if (opts.shell) {
    const [cmd, ...prefix] = Array.isArray(opts.shell) ? opts.shell : [opts.shell];
    return { cmd, args: [...prefix, script, ...args] };
  }
  if (/\.(ts|mts|cts|js|mjs|cjs)$/.test(script)) {
    return { cmd: process.execPath, args: [script, ...args] };
  }
  if (process.platform === "win32") {
    const stub = stubbedCommand(script, opts.stubDirs ?? []);
    const target = stub ?? script;
    if (isExecutableFile(target)) {
      const interpreter = shebangInterpreter(target);
      if (interpreter) {
        return { cmd: interpreter, args: [target, ...args] };
      }
    }
  }
  return { cmd: script, args };
}

/** Runs `script` as a real subprocess, honoring its shebang (or PATH lookup
 *  for a bare command name like "git") on every OS. */
export function runScript(script: string, args: string[] = [], opts: RunOpts = {}): RunResult {
  const env = { ...sanitisedBaseEnv(), ...(opts.env ?? {}) };
  if (opts.stubDirs && opts.stubDirs.length > 0) {
    env.PATH = [...opts.stubDirs, env.PATH ?? ""].filter(Boolean).join(path.delimiter);
  }
  const { cmd, args: fullArgs } = resolveCommand(script, args, opts);
  const result = spawnSync(cmd, fullArgs, {
    cwd: opts.cwd,
    env,
    input: opts.input,
    encoding: "utf-8",
    timeout: opts.timeout ?? 60000,
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? (result.error ? `${result.error.message}\n` : ""),
    status: result.status,
  };
}
