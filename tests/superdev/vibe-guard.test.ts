/*
 * vibe-guard.test.ts - proves vibe-guard.sh's contract: `vibe-guard.sh
 * <notes-file> [--sensitive <glob>]...` measures the delta a vibe run
 * DECLARED (every `touched: <path>` line of the notes file, cut at the first
 * ` - ` or ` (` the way commit-task.sh cuts it) against HEAD, prints
 * `files: <n>`, `new: <n>`, `lines: <n>`, then zero or more `dropped: <path>`
 * and `sensitive: <path>` lines, and closes with exactly one `RESULT: OK` |
 * `RESULT: OVER - <reason>[; <reason>]` | `RESULT: ERROR - <reason>` line.
 *
 * Both sides of all three fixed thresholds are proven here (5 files, 1 new
 * file, 200 lines - lines being added PLUS deleted), together with the
 * `--sensitive` glob match, the fixed reason order, the paths that are dropped
 * rather than counted, and every ERROR exit. Reading the glob list out of a
 * host's memory is the model's judgment and is not testable here - the list
 * arrives as arguments.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/vibe-guard.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withGitRepo, withTempDir, type GitRepo } from "../harness/tmp.ts";
import { slash } from "../harness/paths.ts";
import { canDenyRead, denyRead, restoreRead } from "../harness/perms.ts";

const SUT = path.resolve(import.meta.dirname, "../../superdev/scripts/vibe-guard.sh");

/** Invoked through `bash` explicitly, never bare: the mode bits of a checkout
 *  are not what this script's callers rely on, and macOS's own bash 3.2 is
 *  exactly the shell the script must survive.
 *
 *  `MSYS=noglob` is what keeps a `--sensitive` glob a glob on Windows. A
 *  Git-Bash `bash.exe` started by a NON-MSYS parent (this test runner) runs
 *  the MSYS runtime's own command-line globbing over its argv, so an unquoted
 *  `src/auth/*` reaches the script already expanded against the cwd - which
 *  would leave every glob case below asserting a literal path match and
 *  proving nothing. The option turns that expansion off; it is a Windows-only
 *  runtime switch and an inert variable everywhere else. A real caller never
 *  meets this: it invokes the script FROM a shell, whose own quoting settles
 *  the argument and whose MSYS-ness suppresses the runtime glob. */
function run(dir: string, env: Record<string, string>, args: string[]) {
  return runScript(SUT, args, { cwd: dir, env: { ...env, MSYS: "noglob" }, shell: "bash" });
}

/** The same invocation with that option left OFF - which an argument carrying
 *  a newline or a carriage return needs: no Windows command line survives such
 *  a character, so the harness carries the argument in the environment and
 *  restores it through a quoted `bash -c` preamble, and `noglob` also turns
 *  off the MSYS runtime's quote processing, leaving that preamble unparsed
 *  (`exec: $P2P2_ARGV_SHELL: not found`). No glob has to survive these cases -
 *  the value is rejected for its control character alone. */
function runRejected(dir: string, env: Record<string, string>, args: string[]) {
  return runScript(SUT, args, { cwd: dir, env, shell: "bash" });
}

function write(root: string, rel: string, content: string | Uint8Array): void {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/** `count` distinct lines - no two of them alike, so git's diff never pairs
 *  one with another and numstat reports exactly what the case intends. */
function textLines(prefix: string, count: number): string {
  return Array.from({ length: count }, (_, i) => `${prefix} ${i + 1}`).join("\n") + "\n";
}

/** Commits the whole tree as the run's baseline - withGitRepo's own
 *  `.gitconfig-global` included - so HEAD holds everything except the change
 *  the case then makes. */
function commitBaseline(repo: GitRepo): void {
  repo.git("add", "-A");
  const commit = repo.git("commit", "-m", "baseline");
  if (commit.status !== 0) {
    throw new Error(`baseline commit failed (status ${commit.status}): ${commit.stderr}`);
  }
}

/** The run's notes file, one `touched:` line per entry, plus a `## Runs`
 *  section the guard must ignore. Untracked on purpose: a notes file nobody
 *  declared is not part of the measured set. */
function notesFile(repo: GitRepo, ...touched: string[]): string {
  const file = path.join(repo.dir, "notes.md");
  fs.writeFileSync(
    file,
    ["## Runs", "- none - nothing to run", "", ...touched.map((entry) => `- touched: ${entry}`), ""].join("\n"),
  );
  return file;
}

function stdoutLines(stdout: string): string[] {
  return stdout
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => line.length > 0);
}

function counter(stdout: string, name: string): number {
  const line = stdoutLines(stdout).find((candidate) => candidate.startsWith(`${name}: `));
  assert.ok(line !== undefined, `no "${name}:" line in:\n${stdout}`);
  return Number(line.slice(name.length + 2));
}

function resultLine(stdout: string): string {
  const lines = stdoutLines(stdout).filter((line) => line.startsWith("RESULT:"));
  assert.equal(lines.length, 1, `expected exactly one RESULT line in:\n${stdout}`);
  return lines[0];
}

// ---------------------------------------------------------------------------
// The file threshold - 5 files pass, 6 do not.
// ---------------------------------------------------------------------------

test("five touched tracked files stay inside every threshold", () => {
  withGitRepo((repo) => {
    const touched = ["a.ts", "b.ts", "c.ts", "d.ts", "e.ts"];
    for (const rel of touched) write(repo.dir, rel, "one\n");
    commitBaseline(repo);
    for (const rel of touched) write(repo.dir, rel, "two\n");

    const result = run(repo.dir, repo.env, [notesFile(repo, ...touched)]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(counter(result.stdout, "files"), 5);
    assert.equal(counter(result.stdout, "new"), 0);
    // one added and one deleted line per file
    assert.equal(counter(result.stdout, "lines"), 10);
    assert.equal(resultLine(result.stdout), "RESULT: OK");
  });
});

test("a sixth touched file is over the file threshold", () => {
  withGitRepo((repo) => {
    const touched = ["a.ts", "b.ts", "c.ts", "d.ts", "e.ts", "f.ts"];
    for (const rel of touched) write(repo.dir, rel, "one\n");
    commitBaseline(repo);
    for (const rel of touched) write(repo.dir, rel, "two\n");

    const result = run(repo.dir, repo.env, [notesFile(repo, ...touched)]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(counter(result.stdout, "files"), 6);
    assert.equal(resultLine(result.stdout), "RESULT: OVER - files 6 > 5");
  });
});

// ---------------------------------------------------------------------------
// The new-file threshold - 1 new file passes, 2 do not; a new file counts
// under BOTH new: and files:.
// ---------------------------------------------------------------------------

test("one new file counts under new: and files: and stays inside the threshold", () => {
  withGitRepo((repo) => {
    write(repo.dir, "kept.ts", "one\n");
    commitBaseline(repo);
    // no trailing newline: that last line still counts, the way numstat counts it
    write(repo.dir, "fresh.ts", "new 1\nnew 2\nnew 3");

    const result = run(repo.dir, repo.env, [notesFile(repo, "fresh.ts")]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(counter(result.stdout, "files"), 1);
    assert.equal(counter(result.stdout, "new"), 1);
    assert.equal(counter(result.stdout, "lines"), 3);
    assert.equal(resultLine(result.stdout), "RESULT: OK");
  });
});

test("a second new file is over the new-file threshold", () => {
  withGitRepo((repo) => {
    write(repo.dir, "kept.ts", "one\n");
    commitBaseline(repo);
    write(repo.dir, "fresh.ts", "new 1\n");
    write(repo.dir, "fresher.ts", "new 1\n");

    const result = run(repo.dir, repo.env, [notesFile(repo, "fresh.ts", "fresher.ts")]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(counter(result.stdout, "files"), 2);
    assert.equal(counter(result.stdout, "new"), 2);
    assert.equal(resultLine(result.stdout), "RESULT: OVER - new 2 > 1");
  });
});

// ---------------------------------------------------------------------------
// The line threshold - added PLUS deleted, 200 passes, 201 does not.
// ---------------------------------------------------------------------------

test("100 added and 100 deleted lines sit exactly on the line threshold", () => {
  withGitRepo((repo) => {
    write(repo.dir, "big.ts", textLines("old", 100));
    commitBaseline(repo);
    write(repo.dir, "big.ts", textLines("new", 100));

    const result = run(repo.dir, repo.env, [notesFile(repo, "big.ts")]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(counter(result.stdout, "files"), 1);
    assert.equal(counter(result.stdout, "lines"), 200);
    assert.equal(resultLine(result.stdout), "RESULT: OK");
  });
});

test("101 added and 100 deleted lines are over the line threshold", () => {
  withGitRepo((repo) => {
    write(repo.dir, "big.ts", textLines("old", 100));
    commitBaseline(repo);
    write(repo.dir, "big.ts", textLines("new", 101));

    const result = run(repo.dir, repo.env, [notesFile(repo, "big.ts")]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(counter(result.stdout, "lines"), 201);
    assert.equal(resultLine(result.stdout), "RESULT: OVER - lines 201 > 200");
  });
});

test("two exceeded thresholds are joined by '; ' in the fixed reason order", () => {
  withGitRepo((repo) => {
    const untouched = ["a.ts", "b.ts", "c.ts", "d.ts", "e.ts"];
    for (const rel of untouched) write(repo.dir, rel, "one\n");
    write(repo.dir, "big.ts", textLines("old", 100));
    commitBaseline(repo);
    // only big.ts changes: the other five are declared, tracked and unchanged,
    // so they count under files: and add nothing to lines:
    write(repo.dir, "big.ts", textLines("new", 101));

    const result = run(repo.dir, repo.env, [notesFile(repo, ...untouched, "big.ts")]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(counter(result.stdout, "files"), 6);
    assert.equal(counter(result.stdout, "lines"), 201);
    assert.equal(resultLine(result.stdout), "RESULT: OVER - files 6 > 5; lines 201 > 200");
  });
});

test("a binary file counts zero lines", () => {
  withGitRepo((repo) => {
    write(repo.dir, "logo.bin", Uint8Array.from([0x00, 0x01, 0x02, 0x00, 0x03]));
    commitBaseline(repo);
    write(repo.dir, "logo.bin", Uint8Array.from([0x00, 0x09, 0x08, 0x00, 0x07, 0x06]));

    const result = run(repo.dir, repo.env, [notesFile(repo, "logo.bin")]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(counter(result.stdout, "files"), 1);
    assert.equal(counter(result.stdout, "lines"), 0);
    assert.equal(resultLine(result.stdout), "RESULT: OK");
  });
});

// ---------------------------------------------------------------------------
// Sensitive paths - size-independent, matched only against counted paths.
// ---------------------------------------------------------------------------

test("a counted path matching a --sensitive glob is OVER whatever its size", () => {
  withGitRepo((repo) => {
    write(repo.dir, "src/auth/login.ts", "one\n");
    commitBaseline(repo);
    write(repo.dir, "src/auth/login.ts", "two\n");

    const notes = notesFile(repo, "src/auth/login.ts");
    const result = run(repo.dir, repo.env, [notes, "--sensitive", "src/auth/*"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(counter(result.stdout, "files"), 1);
    assert.equal(counter(result.stdout, "lines"), 2);
    assert.ok(
      stdoutLines(result.stdout).includes("sensitive: src/auth/login.ts"),
      `no sensitive line in:\n${result.stdout}`,
    );
    assert.equal(resultLine(result.stdout), "RESULT: OVER - sensitive src/auth/login.ts");

    // the same repository state, the same notes file, no glob -> nothing to say
    const plain = run(repo.dir, repo.env, [notes]);
    assert.equal(plain.status, 0, `stderr: ${plain.stderr}`);
    assert.equal(
      stdoutLines(plain.stdout).filter((line) => line.startsWith("sensitive:")).length,
      0,
      `unexpected sensitive line in:\n${plain.stdout}`,
    );
    assert.equal(resultLine(plain.stdout), "RESULT: OK");
  });
});

test("a path written with backslashes is measured and printed with forward slashes", () => {
  withGitRepo((repo) => {
    write(repo.dir, "src/auth/login.ts", "one\n");
    commitBaseline(repo);
    write(repo.dir, "src/auth/login.ts", "two\n");

    const result = run(repo.dir, repo.env, [
      notesFile(repo, "src\\auth\\login.ts"),
      "--sensitive",
      "src/auth/*",
    ]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(counter(result.stdout, "files"), 1);
    assert.equal(counter(result.stdout, "lines"), 2);
    assert.ok(
      stdoutLines(result.stdout).map(slash).includes(slash("sensitive: src/auth/login.ts")),
      `no forward-slash sensitive line in:\n${result.stdout}`,
    );
    assert.equal(resultLine(result.stdout), "RESULT: OVER - sensitive src/auth/login.ts");
  });
});

// ---------------------------------------------------------------------------
// Reading the notes file.
// ---------------------------------------------------------------------------

test("a touched line is cut at the first ' - ' or ' (' and still measured", () => {
  withGitRepo((repo) => {
    write(repo.dir, "a.ts", "one\n");
    write(repo.dir, "b.ts", "one\n");
    commitBaseline(repo);
    write(repo.dir, "a.ts", "two\n");
    write(repo.dir, "b.ts", "two\n");

    const result = run(repo.dir, repo.env, [
      // the third line cuts to nothing and declares nothing - not even a
      // dropped path, and never the reason itself
      notesFile(repo, "a.ts - the reason it was touched", "b.ts (the new helper)", " - only a reason"),
    ]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(counter(result.stdout, "files"), 2);
    assert.equal(counter(result.stdout, "lines"), 4);
    assert.equal(stdoutLines(result.stdout).filter((line) => line.startsWith("dropped:")).length, 0);
    assert.equal(resultLine(result.stdout), "RESULT: OK");
  });
});

test("no touched lines is RESULT: OK with zero counters", () => {
  withGitRepo((repo) => {
    write(repo.dir, "a.ts", "one\n");
    commitBaseline(repo);
    write(repo.dir, "a.ts", "two\n");

    const result = run(repo.dir, repo.env, [notesFile(repo)]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(counter(result.stdout, "files"), 0);
    assert.equal(counter(result.stdout, "new"), 0);
    assert.equal(counter(result.stdout, "lines"), 0);
    assert.equal(resultLine(result.stdout), "RESULT: OK");
  });
});

// a directory and a path that exists nowhere: dropped, counted nowhere, and
// never matched against a --sensitive glob either
test("a dropped path is listed and not counted", () => {
  withGitRepo((repo) => {
    write(repo.dir, "src/auth/login.ts", "one\n");
    commitBaseline(repo);

    const result = run(repo.dir, repo.env, [
      notesFile(repo, "src/auth", "gone/missing.ts"),
      "--sensitive",
      "*",
    ]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(counter(result.stdout, "files"), 0);
    assert.equal(counter(result.stdout, "new"), 0);
    assert.equal(counter(result.stdout, "lines"), 0);
    const lines = stdoutLines(result.stdout).map(slash);
    assert.deepEqual(
      lines.filter((line) => line.startsWith("dropped:")),
      ["dropped: src/auth", "dropped: gone/missing.ts"],
    );
    assert.equal(lines.filter((line) => line.startsWith("sensitive:")).length, 0);
    assert.equal(resultLine(result.stdout), "RESULT: OK");
  });
});

// ---------------------------------------------------------------------------
// Every ERROR exit: one RESULT line on stdout, nothing else, exit 1.
// ---------------------------------------------------------------------------

test("missing notes file exits 1 with RESULT: ERROR", () => {
  withGitRepo((repo) => {
    write(repo.dir, "a.ts", "one\n");
    commitBaseline(repo);

    const noArgument = run(repo.dir, repo.env, []);
    assert.equal(noArgument.status, 1);
    assert.equal(stdoutLines(noArgument.stdout).length, 1);
    assert.equal(noArgument.stdout.trim(), "RESULT: ERROR - notes file not found:");

    const missing = path.join(repo.dir, "nowhere", "notes.md");
    const result = run(repo.dir, repo.env, [missing]);
    assert.equal(result.status, 1);
    assert.equal(stdoutLines(result.stdout).length, 1);
    assert.equal(slash(result.stdout.trim()), slash(`RESULT: ERROR - notes file not found: ${missing}`));
  });
});

test(
  "an unreadable notes file exits 1 with RESULT: ERROR",
  { skip: canDenyRead() ? false : "this machine cannot deny its own account read access" },
  () => {
    withGitRepo((repo) => {
      write(repo.dir, "a.ts", "one\n");
      commitBaseline(repo);
      const notes = notesFile(repo, "a.ts");
      assert.ok(denyRead(notes), "the deny must hold, or this case proves nothing");
      try {
        const result = run(repo.dir, repo.env, [notes]);
        assert.equal(result.status, 1);
        assert.equal(stdoutLines(result.stdout).length, 1);
        assert.equal(slash(result.stdout.trim()), slash(`RESULT: ERROR - notes file not found: ${notes}`));
      } finally {
        restoreRead(notes);
      }
    });
  },
);

test("outside a git repository exits 1 with RESULT: ERROR", () => {
  // no withGitRepo here on purpose: a bare temp dir is not a git repository,
  // and GIT_CEILING_DIRECTORIES stops git's upward .git search at its parent
  // so the machine's own layout cannot turn it into one.
  withTempDir("p2p2-vibe-guard-", (dir) => {
    const notes = path.join(dir, "notes.md");
    fs.writeFileSync(notes, "- touched: a.ts\n");

    const result = runScript(SUT, [notes], {
      cwd: dir,
      env: { GIT_CEILING_DIRECTORIES: path.dirname(dir), MSYS: "noglob" },
      shell: "bash",
    });
    assert.equal(result.status, 1);
    assert.equal(stdoutLines(result.stdout).length, 1);
    assert.equal(result.stdout.trim(), "RESULT: ERROR - not a git repository");
  });
});

test("an empty --sensitive value exits 1", () => {
  withGitRepo((repo) => {
    write(repo.dir, "a.ts", "one\n");
    commitBaseline(repo);
    const notes = notesFile(repo, "a.ts");

    const empty = run(repo.dir, repo.env, [notes, "--sensitive", ""]);
    assert.equal(empty.status, 1);
    assert.equal(stdoutLines(empty.stdout).length, 1);
    assert.equal(empty.stdout.trim(), "RESULT: ERROR - invalid --sensitive value");

    const noValue = run(repo.dir, repo.env, [notes, "--sensitive"]);
    assert.equal(noValue.status, 1);
    assert.equal(noValue.stdout.trim(), "RESULT: ERROR - invalid --sensitive value");

    const newline = runRejected(repo.dir, repo.env, [notes, "--sensitive", "src/auth/*\nsrc/keys/*"]);
    assert.equal(newline.status, 1);
    assert.equal(newline.stdout.trim(), "RESULT: ERROR - invalid --sensitive value");

    const carriageReturn = runRejected(repo.dir, repo.env, [notes, "--sensitive", "src/auth/*\rx"]);
    assert.equal(carriageReturn.status, 1);
    assert.equal(carriageReturn.stdout.trim(), "RESULT: ERROR - invalid --sensitive value");
  });
});

test("an unknown argument exits 1", () => {
  withGitRepo((repo) => {
    write(repo.dir, "a.ts", "one\n");
    commitBaseline(repo);
    const notes = notesFile(repo, "a.ts");

    const option = run(repo.dir, repo.env, [notes, "--nope", "x"]);
    assert.equal(option.status, 1);
    assert.equal(stdoutLines(option.stdout).length, 1);
    assert.equal(option.stdout.trim(), "RESULT: ERROR - unknown argument: --nope");

    const secondPositional = run(repo.dir, repo.env, [notes, "extra.ts"]);
    assert.equal(secondPositional.status, 1);
    assert.equal(secondPositional.stdout.trim(), "RESULT: ERROR - unknown argument: extra.ts");
  });
});
