/*
 * lib_touched.test.ts - proves lib_touched.sh, the ONE reader of a notes
 * file's `touched:` declarations, and binds its consumer to it.
 *
 * What commit-task.sh stages is decided entirely by this parse, so the cut
 * rule (`touched: <path>` up to the first ` - ` or ` (`), the path
 * normalisation (backslash, backtick, "./", a repository-absolute path) and
 * the trim behind both must exist ONCE. Three layers here: the library's own
 * contract, driven through a bash wrapper that sources it (it is sourced,
 * never executed, and needs bash arrays/BASH_SOURCE, so every case runs under
 * `forEachShell("bash", ...)`); the structural bind - the script sources the
 * library and carries no private copy; and one live case - that same notes
 * file of awkward declarations, one repository, the commit's staged set
 * asserted equal to what the declarations mean.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/lib_touched.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withGitRepo, withTempDir, type GitRepo } from "../harness/tmp.ts";
import { forEachShell, type Shell } from "../harness/shells.ts";
import { slash } from "../harness/paths.ts";

const SCRIPTS = path.resolve(import.meta.dirname, "../../superdev/scripts");
const LIB = path.join(SCRIPTS, "lib_touched.sh");
const COMMIT = path.join(SCRIPTS, "commit-task.sh");

// ---------------------------------------------------------------------------
// The library itself, sourced into a throwaway bash wrapper.
// ---------------------------------------------------------------------------

/** Sources the library and exposes one function per invocation mode. Every
 *  value is printed inside brackets so a trailing space, a leading one and an
 *  empty result are all visible to an assertion. `root` is the global
 *  `normalise_path` reads, exactly as both shipped scripts set it. */
function wrapperScript(libPath: string): string {
  return (
    [
      "#!/usr/bin/env bash",
      `source "${slash(libPath)}"`,
      'root="${P2P2_ROOT-}"',
      'mode="$1"',
      "case \"$mode\" in",
      "  trim) printf '[%s]\\n' \"$(trim \"$2\")\" ;;",
      "  normalise) printf '[%s]\\n' \"$(normalise_path \"$2\")\" ;;",
      "  touched)",
      "    while IFS= read -r p; do printf '[%s]\\n' \"$p\"; done < <(touched_paths \"$2\")",
      "    ;;",
      '  *) echo "unknown mode: $mode" >&2; exit 2 ;;',
      "esac",
    ].join("\n") + "\n"
  );
}

function runLib(bash: Shell, args: string[], env: Record<string, string> = {}): RunResult {
  return withTempDir("p2p2-lib-touched-wrapper-", (dir) => {
    const wrapper = path.join(dir, "wrapper.sh");
    fs.writeFileSync(wrapper, wrapperScript(LIB), { mode: 0o755 });
    fs.chmodSync(wrapper, 0o755);
    return runScript(wrapper, args, { shell: bash, env });
  });
}

/** The bracketed values the wrapper printed, in order. */
function values(result: RunResult): string[] {
  return result.stdout
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => line.startsWith("[") && line.endsWith("]"))
    .map((line) => line.slice(1, -1));
}

function assertBash(fn: (bash: Shell) => void): void {
  const skips = forEachShell("bash", fn);
  for (const skip of skips) {
    assert.equal(skip.kind, "bash");
    assert.ok(skip.reason.length > 0, "a skip must record a reason");
  }
}

/** A notes file holding `lines`, handed to the wrapper's `touched` mode. */
function touchedOf(bash: Shell, lines: string[]): string[] {
  return withTempDir("p2p2-lib-touched-notes-", (dir) => {
    const notes = path.join(dir, "notes.md");
    fs.writeFileSync(notes, lines.join("\n") + "\n");
    const result = runLib(bash, ["touched", notes]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    return values(result);
  });
}

test("trim strips both ends and leaves the inside alone", () => {
  assertBash((bash) => {
    assert.deepEqual(values(runLib(bash, ["trim", "  a b \t "])), ["a b"]);
    assert.deepEqual(values(runLib(bash, ["trim", "   "])), [""]);
    assert.deepEqual(values(runLib(bash, ["trim", "a.ts\r"])), ["a.ts"]);
  });
});

test("normalise_path folds backslashes, backticks, './' and a trailing slash", () => {
  assertBash((bash) => {
    assert.deepEqual(values(runLib(bash, ["normalise", "src\\auth\\login.ts"])), ["src/auth/login.ts"]);
    assert.deepEqual(values(runLib(bash, ["normalise", "`src/a.ts`"])), ["src/a.ts"]);
    assert.deepEqual(values(runLib(bash, ["normalise", "./src/a.ts"])), ["src/a.ts"]);
    assert.deepEqual(values(runLib(bash, ["normalise", "src/dir/"])), ["src/dir"]);
    assert.deepEqual(values(runLib(bash, ["normalise", "  src/a.ts  "])), ["src/a.ts"]);
  });
});

test("normalise_path reduces a repository-absolute path against the global root", () => {
  assertBash((bash) => {
    const posix = { P2P2_ROOT: "/repo" };
    assert.deepEqual(values(runLib(bash, ["normalise", "/repo/src/a.ts"], posix)), ["src/a.ts"]);
    assert.deepEqual(values(runLib(bash, ["normalise", "/repo"], posix)), ["."]);
    // outside the root: left exactly as it stands, for the caller to classify
    assert.deepEqual(values(runLib(bash, ["normalise", "/elsewhere/a.ts"], posix)), ["/elsewhere/a.ts"]);
    // the backslash fold runs BEFORE the root comparison, so a Windows-style
    // declaration reduces against a forward-slash root too
    const win = { P2P2_ROOT: "C:/proj" };
    assert.deepEqual(values(runLib(bash, ["normalise", "C:\\proj\\src\\a.ts"], win)), ["src/a.ts"]);
  });
});

test("touched_paths reads a bulleted, a starred and a bare line, and ignores every other line", () => {
  assertBash((bash) => {
    assert.deepEqual(
      touchedOf(bash, [
        "## Runs",
        "- node --test x -> ok",
        "",
        "- touched: a.ts",
        "* touched: b.ts",
        "touched: c.ts",
        "   - touched: d.ts",
        "- CARRY: e.ts - left in place",
        "no deviations",
      ]),
      ["a.ts", "b.ts", "c.ts", "d.ts"],
    );
  });
});

test("touched_paths cuts at the FIRST ' - ' or ' (' and keeps a path carrying a space", () => {
  assertBash((bash) => {
    assert.deepEqual(
      touchedOf(bash, [
        "- touched: a.ts - the generator rewrote it - twice",
        "- touched: b.ts (regenerated by the formatter)",
        "- touched: c.ts (a note) - and a reason",
        "- touched: d.ts - a reason (and a note)",
        "- touched: two words.ts",
      ]),
      ["a.ts", "b.ts", "c.ts", "d.ts", "two words.ts"],
    );
  });
});

test("touched_paths declares nothing for a value that cuts to nothing, and never the reason itself", () => {
  assertBash((bash) => {
    assert.deepEqual(touchedOf(bash, ["- touched:  - I forgot the path", "- touched:", "- touched:   "]), []);
  });
});

test("touched_paths keeps duplicates and file order - collapsing them is the caller's policy", () => {
  assertBash((bash) => {
    assert.deepEqual(touchedOf(bash, ["- touched: a.ts", "- touched: b.ts", "- touched: a.ts"]), [
      "a.ts",
      "b.ts",
      "a.ts",
    ]);
  });
});

test("touched_paths survives a CRLF notes file and a last line with no newline", () => {
  assertBash((bash) => {
    withTempDir("p2p2-lib-touched-crlf-", (dir) => {
      const notes = path.join(dir, "notes.md");
      fs.writeFileSync(notes, "- touched: a.ts\r\n- touched: b.ts");
      const result = runLib(bash, ["touched", notes]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.deepEqual(values(result), ["a.ts", "b.ts"]);
    });
  });
});

test("touched_paths on a file that does not exist prints nothing and returns 0", () => {
  assertBash((bash) => {
    withTempDir("p2p2-lib-touched-missing-", (dir) => {
      const result = runLib(bash, ["touched", path.join(dir, "nowhere", "notes.md")]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.deepEqual(values(result), []);
    });
  });
});

// ---------------------------------------------------------------------------
// The bind - one parser, no private copy on the consumer's side.
// ---------------------------------------------------------------------------

test("commit-task.sh sources lib_touched.sh and carries no copy of its three pieces", () => {
  assert.ok(fs.existsSync(LIB), `the shared parser must exist at ${LIB}`);
  const content = fs.readFileSync(COMMIT, "utf-8");
  assert.match(content, /^\s*source\s+.*lib_touched\.sh"/m, `${COMMIT} must source lib_touched.sh`);
  assert.doesNotMatch(content, /^\s*trim\(\)\s*\{/m, `${COMMIT} must not define its own trim()`);
  assert.doesNotMatch(content, /^\s*normalise_path\(\)\s*\{/m, `${COMMIT} must not define its own normalise_path()`);
  assert.doesNotMatch(content, /\$\{entry#touched:\}/, `${COMMIT} must not cut a touched: line itself`);
});

// ---------------------------------------------------------------------------
// Live - one notes file, one repository: what the declarations mean is what
// the commit stages.
// ---------------------------------------------------------------------------

const NOTES_REL = "run/impl/notes.md";

function committedFiles(repo: GitRepo): string[] {
  return repo
    .git("show", "--name-only", "--format=", "HEAD")
    .stdout.trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .sort();
}

function write(root: string, rel: string, content: string): void {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

test("the commit stages exactly the declared paths, over one notes file of awkward declarations", () => {
  withGitRepo((repo) => {
    const files = [
      "sub/extra.txt",
      "sub/other.txt",
      "sub/two words.txt",
      "sub/dotted.txt",
      "sub/quoted.txt",
      "sub/back.txt",
      "sub/bare.txt",
      // never declared and never changed: its presence proves the commit's
      // undeclared-change gate stayed quiet for the right reason
      "foreign.txt",
    ];
    for (const rel of files) write(repo.dir, rel, "one\n");
    repo.git("add", "-A");
    const baseline = repo.git("commit", "-m", "baseline");
    assert.equal(baseline.status, 0, `baseline commit failed: ${baseline.stderr}`);
    for (const rel of files.filter((f) => f !== "foreign.txt")) write(repo.dir, rel, "two\n");

    write(
      repo.dir,
      NOTES_REL,
      [
        "## Runs",
        "- none - nothing to run",
        "",
        "- touched: sub/extra.txt - the generator rewrote it - twice",
        "- touched: sub/other.txt (regenerated by the formatter)",
        "- touched: sub/two words.txt",
        "- touched: ./sub/dotted.txt",
        "- touched: `sub/quoted.txt`",
        "- touched: sub\\back.txt",
        "touched: sub/bare.txt",
        "- touched: sub/extra.txt",
        "- touched:  - I forgot the path",
        "- touched: gone/missing.txt",
        "",
      ].join("\n"),
    );

    const declared = [
      "sub/back.txt",
      "sub/bare.txt",
      "sub/dotted.txt",
      "sub/extra.txt",
      "sub/other.txt",
      "sub/quoted.txt",
      "sub/two words.txt",
    ];

    const commit = runScript(COMMIT, ["a small change", "--notes", NOTES_REL], {
      cwd: repo.dir,
      env: repo.env,
      shell: "bash",
    });
    assert.equal(commit.status, 0, `stdout: ${commit.stdout}\nstderr: ${commit.stderr}`);
    // the run directory joins the commit's declared set on its own (the notes
    // file's grandparent) and is no part of what the guard measures
    assert.deepEqual(
      committedFiles(repo).filter((file) => !file.startsWith("run/")),
      declared,
    );
  });
});
