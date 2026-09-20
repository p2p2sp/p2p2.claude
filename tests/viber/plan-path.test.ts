/*
 * plan-path.test.ts - proves viber/scripts/plan-path.sh's contract: it is the
 * ONE place a plan path is formed AND the one place the approved plan is put
 * there, so every rule about the run directory
 * `docs/_specs/<yyyy-mm-dd-HH-mm-ss>_<slug>/` lives here and nowhere else.
 *
 * Three properties carry the design. The stamp is taken when the plan LANDS,
 * so a second run of the same slug can never overwrite an earlier plan - it
 * either reports the open run as `state: existing` or mints a fresh stamp. The
 * key it prints also names `.temp/viber/<plan-key>/` and the decomposition
 * beside the plan, so anything but `[a-z0-9-]` leaking out of the slug
 * normalization would reach a directory name and a git path. And `--land`
 * COPIES: plan mode writes the plan into a user-level `plansDirectory`,
 * normally outside the repository, so the source must survive untouched and
 * the landed plan - whose progress lives in the status.md beside it - must
 * never be written over. On the way in the copy loses the template's guidance
 * comments, keeping only the markers the run itself reads.
 *
 * Every resolution also lists, as `open:` lines, the OTHER runs still holding a
 * task that is neither done nor skipped: that is what tells the orchestrator a
 * fresh plan is being landed on top of unfinished work.
 *
 * The caller is trusted to take this output as it stands - the skill never
 * re-verifies it - which makes the printed block and the exit codes (2:
 * unusable argv, 3: nothing to resume, 5: the copy failed) the whole interface.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/plan-path.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { slash } from "../harness/paths.ts";
import { withStub } from "../harness/stub.ts";
import { withTempDir } from "../harness/tmp.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/scripts/plan-path.sh");

/** The run directory's name: the landing stamp, then the normalized slug. */
const KEY_SHAPE = /^(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2})_([a-z0-9]+(?:-[a-z0-9]+)*)$/;

function run(dir: string, args: string[] = [], stubDirs?: string[]) {
  return runScript(SUT, args, { cwd: dir, shell: "bash", stubDirs });
}

interface Resolved {
  path: string;
  key: string;
  state: string;
}

function parse(stdout: string): Resolved {
  const out: Record<string, string> = {};
  for (const line of slash(stdout).trim().split("\n")) {
    const at = line.indexOf(": ");
    if (at > 0) out[line.slice(0, at)] = line.slice(at + 2);
  }
  return out as unknown as Resolved;
}

/** The slug half of a key, asserting the whole key shape on the way through -
 *  a key is a directory name, so a stray character is a broken path. */
function slugOf(key: string): string {
  const match = KEY_SHAPE.exec(key);
  assert.ok(match, `key is not <stamp>_<slug>: ${key}`);
  return match[2];
}

/** How long ago the key's stamp was, in milliseconds. The script stamps with
 *  `date`, i.e. LOCAL time, which is the clock Node reads here too. */
function stampAge(key: string): number {
  const match = KEY_SHAPE.exec(key);
  assert.ok(match, `key is not <stamp>_<slug>: ${key}`);
  const [y, mo, d, h, mi, s] = match[1].split("-").map(Number);
  return Date.now() - new Date(y, mo - 1, d, h, mi, s).getTime();
}

/** A landed plan: the run directory plus its plan.md, with a pinned mtime so
 *  "most recently worked on" is decided by the test, not by the filesystem. */
function landPlan(root: string, key: string, mtime = "2026-01-01T00:00:00Z", body?: string): string {
  const file = path.join(root, "docs", "_specs", key, "plan.md");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body ?? `# ${key}\n`);
  const seconds = Date.parse(mtime) / 1000;
  fs.utimesSync(file, seconds, seconds);
  return file;
}

/** A source plan the way plan mode leaves one: any directory, any file name,
 *  its title on the first H1. Returned as an absolute path, because that is
 *  what a `plansDirectory` outside the repository hands over. */
function sourcePlan(dir: string, name: string, body: string): string {
  const file = path.join(dir, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
  return file;
}

/** The `open:` lines of one resolution, in the order printed. */
function openLines(stdout: string): string[] {
  return slash(stdout)
    .trim()
    .split("\n")
    .filter((line) => line.startsWith("open: "))
    .map((line) => line.slice("open: ".length));
}

/** A run's state file, as --split writes it and commit-task.sh advances it. */
function landStatus(root: string, key: string, entries: Record<string, string>, mtime?: string): void {
  const file = path.join(root, "docs", "_specs", key, "status.md");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, ["# status", "", ...Object.entries(entries).map(([k, v]) => `${k}: ${v}`), ""].join("\n"));
  if (mtime) {
    const seconds = Date.parse(mtime) / 1000;
    fs.utimesSync(file, seconds, seconds);
  }
}

/** A landed plan carrying N task blocks, so a run has something to be open about. */
function planWithTasks(title: string, ids: string[]): string {
  return [
    `# ${title}`,
    "",
    "## Tasks",
    "",
    ...ids.flatMap((id) => ["<!-- TASK -->", `### ${id} - do ${id}`, `- Files: src/${id}.ts`, "<!-- /TASK -->", ""]),
  ].join("\n");
}

/** The run directories on disk, so a test can assert that a second one was -
 *  or was not - minted. */
function runDirs(root: string): string[] {
  const specs = path.join(root, "docs", "_specs");
  return fs.existsSync(specs) ? fs.readdirSync(specs).sort() : [];
}

const PLAN_BODY = ["# Add Login", "", "## Goal", "", "Let people sign in.", ""].join("\n");

// --- no argument: resume the run in progress ---

test("no argument and nothing under docs/_specs: exit 3, an empty stdout and the next step on stderr", () => {
  withTempDir("p2p2-viber-", (dir) => {
    const result = run(dir);
    assert.equal(result.status, 3);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /no plan under docs\/_specs/);
    // The dead end this exit used to be is the whole reason --land exists, so
    // the message has to name the way out.
    assert.match(result.stderr, /--land/);
  });
});

test("no argument and one landed plan: the three-line block, verbatim and in order", () => {
  withTempDir("p2p2-viber-", (dir) => {
    landPlan(dir, "2026-09-19-17-30-00_add-login");

    const result = run(dir);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(
      slash(result.stdout),
      [
        "path: docs/_specs/2026-09-19-17-30-00_add-login/plan.md",
        "key: 2026-09-19-17-30-00_add-login",
        "state: existing",
        "",
      ].join("\n"),
    );
  });
});

test("no argument: the plan touched most recently wins, not the first on disk and not the newest stamp", () => {
  withTempDir("p2p2-viber-", (dir) => {
    landPlan(dir, "2026-01-01-09-00-00_alpha", "2026-01-01T09:00:00Z");
    landPlan(dir, "2026-02-01-09-00-00_beta", "2026-09-01T09:00:00Z");
    landPlan(dir, "2026-03-01-09-00-00_gamma", "2026-02-01T09:00:00Z");

    const result = run(dir);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(parse(result.stdout), {
      path: "docs/_specs/2026-02-01-09-00-00_beta/plan.md",
      key: "2026-02-01-09-00-00_beta",
      state: "existing",
    });
  });
});

test("a run directory with no plan.md, and a plan.md that is a directory, are both skipped (neither is a plan to resume)", () => {
  withTempDir("p2p2-viber-", (dir) => {
    fs.mkdirSync(path.join(dir, "docs", "_specs", "2026-09-01-09-00-00_abandoned"), { recursive: true });
    fs.mkdirSync(path.join(dir, "docs", "_specs", "2026-09-02-09-00-00_not-a-file", "plan.md"), { recursive: true });

    const empty = run(dir);
    assert.equal(empty.status, 3, `stdout: ${empty.stdout}`);
    assert.equal(empty.stdout, "");

    landPlan(dir, "2026-08-01-09-00-00_real", "2026-08-01T09:00:00Z");
    const found = run(dir);
    assert.equal(found.status, 0, `stderr: ${found.stderr}`);
    assert.equal(parse(found.stdout).key, "2026-08-01-09-00-00_real");
  });
});

test("--land beside an aborted run of the same slug mints a fresh stamp rather than adopting the empty directory", () => {
  withTempDir("p2p2-viber-", (dir) => {
    const aborted = "2026-09-01-09-00-00_abandoned";
    fs.mkdirSync(path.join(dir, "docs", "_specs", aborted), { recursive: true });

    const src = sourcePlan(dir, "outside/abandoned.md", "# Abandoned\n");
    const result = run(dir, ["--land", src]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);

    const resolved = parse(result.stdout);
    assert.equal(resolved.state, "new");
    assert.equal(slugOf(resolved.key), "abandoned");
    assert.notEqual(resolved.key, aborted);
    assert.deepEqual(runDirs(dir), [aborted, resolved.key].sort());
  });
});

test("an empty argument is no argument: it resolves the plan most recently worked on rather than failing as a usage error", () => {
  withTempDir("p2p2-viber-", (dir) => {
    landPlan(dir, "2026-09-19-17-30-00_add-login");

    const result = run(dir, [""]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(parse(result.stdout), {
      path: "docs/_specs/2026-09-19-17-30-00_add-login/plan.md",
      key: "2026-09-19-17-30-00_add-login",
      state: "existing",
    });
  });
});

test("a host whose stat is missing, or answers with something that is not a timestamp, still resolves a plan", () => {
  withTempDir("p2p2-viber-", (dir) => {
    landPlan(dir, "2026-09-19-17-30-00_add-login", "2026-09-19T17:30:00Z");
    landPlan(dir, "2026-09-25-11-00-00_other-thing", "2026-09-25T11:00:00Z");
    const landed = [
      "docs/_specs/2026-09-19-17-30-00_add-login/plan.md",
      "docs/_specs/2026-09-25-11-00-00_other-thing/plan.md",
    ];

    for (const body of ["exit 1", "echo not-a-timestamp"]) {
      withStub("stat", body, (stubDir) => {
        const result = run(dir, [], [stubDir]);
        assert.equal(result.status, 0, `${body} -> stderr: ${result.stderr}`);
        assert.ok(landed.includes(parse(result.stdout).path), `stdout: ${result.stdout}`);
      });
    }
  });
});

// --- --land: the approved plan into the run directory ---

test("--land copies a plan from outside the repository into a freshly stamped directory and leaves the source untouched", () => {
  withTempDir("p2p2-viber-", (dir) => {
    withTempDir("p2p2-plans-", (plans) => {
      const src = sourcePlan(plans, "2026-09-20-fancy-name.md", PLAN_BODY);

      const result = run(dir, ["--land", src]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);

      const resolved = parse(result.stdout);
      assert.equal(resolved.state, "new");
      assert.equal(slugOf(resolved.key), "add-login");
      assert.equal(resolved.path, `docs/_specs/${resolved.key}/plan.md`);

      // The landed plan is the source, byte for byte - the orchestrator never
      // retypes it out of its context.
      assert.equal(fs.readFileSync(path.join(dir, resolved.path), "utf-8"), PLAN_BODY);
      // ... and the source is still where plan mode left it.
      assert.equal(fs.readFileSync(src, "utf-8"), PLAN_BODY);

      // The stamp is taken NOW, which is the whole reason a second run of one
      // slug cannot overwrite an earlier plan. The window is wide on purpose:
      // it has to catch a fixed or epoch-derived stamp (off by years), not to
      // measure the clock, and a DST-ambiguous local hour must never flip it.
      assert.ok(Math.abs(stampAge(resolved.key)) < 90 * 60_000, `the stamp must be the landing moment: ${resolved.key}`);
    });
  });
});

test("--land takes the slug from the plan's own first H1, never from its file name and never from an H2", () => {
  withTempDir("p2p2-viber-", (dir) => {
    const src = sourcePlan(dir, "outside/scratch-plan-7.md", "## Not The Title\n\n# Add Login\n\n## Goal\n");

    const result = run(dir, ["--land", src]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(slugOf(parse(result.stdout).key), "add-login");
  });
});

test("--land falls back to the file name when the plan carries no H1 at all", () => {
  withTempDir("p2p2-viber-", (dir) => {
    const src = sourcePlan(dir, "outside/Add Login.md", "## Goal\n\nNo title line here.\n");

    const result = run(dir, ["--land", src]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(slugOf(parse(result.stdout).key), "add-login");
  });
});

test("the title is normalized here, so no caller ever has to form a slug", () => {
  const cases: Array<[string, string]> = [
    ["Add Login", "add-login"],
    ["  --Add / LOGIN!!  ", "add-login"],
    ["add__login", "add-login"],
    ["Add-Login", "add-login"],
    ["...add...login...", "add-login"],
    ["Refactor 2 Auth", "refactor-2-auth"],
  ];
  // One repository per case: two titles that normalize alike would otherwise
  // have the second resume the first's run instead of landing its own.
  for (const [title, expected] of cases) {
    withTempDir("p2p2-viber-", (dir) => {
      const src = sourcePlan(dir, "outside/plan.md", `# ${title}\n`);
      const result = run(dir, ["--land", src]);
      assert.equal(result.status, 0, `${title} -> stderr: ${result.stderr}`);
      assert.equal(parse(result.stdout).state, "new", `title: ${title}`);
      assert.equal(slugOf(parse(result.stdout).key), expected, `title: ${title}`);
    });
  }
});

test("a CRLF plan yields the same slug as an LF one (the title carries the carriage return)", () => {
  withTempDir("p2p2-viber-", (dir) => {
    const src = sourcePlan(dir, "outside/crlf.md", "# Add Login\r\n\r\n## Goal\r\n");

    const result = run(dir, ["--land", src]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(slugOf(parse(result.stdout).key), "add-login");
  });
});

test("a non-ASCII title still yields an ASCII-only slug (the key becomes a directory name and a git path)", () => {
  withTempDir("p2p2-viber-", (dir) => {
    const src = sourcePlan(dir, "outside/pl.md", "# Dodaj obsługę płatności\n");

    const result = run(dir, ["--land", src]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);

    // slugOf asserts the [a-z0-9-] shape; the leading word proves the title
    // was carried over rather than dropped.
    const slug = slugOf(parse(result.stdout).key);
    assert.ok(slug.startsWith("dodaj"), `slug: ${slug}`);
  });
});

test("a title longer than 60 characters is cut to 60 and never keeps a trailing hyphen", () => {
  withTempDir("p2p2-viber-", (dir) => {
    const long = sourcePlan(dir, "outside/long.md", `# ${"b".repeat(70)}\n`);
    const midWord = run(dir, ["--land", long]);
    assert.equal(midWord.status, 0, `stderr: ${midWord.stderr}`);
    assert.equal(slugOf(parse(midWord.stdout).key), "b".repeat(60));

    // The cut lands exactly on the separator: 59 a's, then "-bbb".
    const edge = sourcePlan(dir, "outside/edge.md", `# ${"A".repeat(59)} bbb\n`);
    const onSeparator = run(dir, ["--land", edge]);
    assert.equal(onSeparator.status, 0, `stderr: ${onSeparator.stderr}`);
    assert.equal(slugOf(parse(onSeparator.stdout).key), "a".repeat(59));
  });
});

test("a title that normalizes to nothing, over a file name that does too: exit 2, an empty stdout and nothing landed", () => {
  withTempDir("p2p2-viber-", (dir) => {
    // The file name is the fallback, so it has to normalize to nothing as
    // well for the rejection to be the title's. No bare "*" here: on Git-Bash
    // the MSYS runtime expands it against the cwd before argv ever reaches the
    // script. A glob character that survives into the slug is covered by the
    // whole-slug case below.
    for (const [index, title] of ["!!!", "---", "   "].entries()) {
      const src = sourcePlan(dir, path.join("outside", String(index), "!!!.md"), `# ${title}\n`);
      const result = run(dir, ["--land", src]);
      assert.equal(result.status, 2, `${title} -> stdout: ${result.stdout}`);
      assert.equal(result.stdout, "", `a rejected title must resolve to no path: ${title}`);
      assert.match(result.stderr, /slug is empty after normalization/);
      assert.deepEqual(runDirs(dir), [], `a rejected title must land nothing: ${title}`);
    }
  });
});

test("a whitespace-only H1 is no title, so the file name answers instead", () => {
  withTempDir("p2p2-viber-", (dir) => {
    const src = sourcePlan(dir, "outside/Add Login.md", "#    \n\n## Goal\n");

    const result = run(dir, ["--land", src]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(slugOf(parse(result.stdout).key), "add-login");
  });
});

test("a run already open for that slug comes back existing, and its progress is not written over", () => {
  withTempDir("p2p2-viber-", (dir) => {
    const inProgress = ["# Add Login", "", "## Tasks (1/2)", "", "<!-- done: T1 -->", ""].join("\n");
    landPlan(dir, "2026-09-19-17-30-00_add-login", "2026-09-19T17:30:00Z", inProgress);
    landPlan(dir, "2026-09-20-08-00-00_other-thing", "2026-09-20T08:00:00Z");

    // The same plan, edited after the build started: the landed copy is the
    // state, so the edit must NOT reach it.
    const src = sourcePlan(dir, "outside/add-login.md", PLAN_BODY);
    const result = run(dir, ["--land", src]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(parse(result.stdout), {
      path: "docs/_specs/2026-09-19-17-30-00_add-login/plan.md",
      key: "2026-09-19-17-30-00_add-login",
      state: "existing",
    });
    assert.equal(
      fs.readFileSync(path.join(dir, "docs", "_specs", "2026-09-19-17-30-00_add-login", "plan.md"), "utf-8"),
      inProgress,
    );
  });
});

test("--land pointed at a plan that is already landed is a no-op, so re-running the orchestrator never forks a second run", () => {
  withTempDir("p2p2-viber-", (dir) => {
    const src = sourcePlan(dir, "outside/add-login.md", PLAN_BODY);
    const first = parse(run(dir, ["--land", src]).stdout);

    for (const again of [first.path, path.join(dir, first.path)]) {
      const result = run(dir, ["--land", again]);
      assert.equal(result.status, 0, `${again} -> stderr: ${result.stderr}`);
      assert.deepEqual(parse(result.stdout), { path: first.path, key: first.key, state: "existing" });
      assert.deepEqual(runDirs(dir), [first.key], `${again} minted a second run`);
    }
  });
});

test("an open run answers for its whole slug only, so neither a longer name nor a glob character can hand back a foreign run", () => {
  // One repository per case: landing writes, so a case that shares a tree
  // with the one before it would resume that one's fresh run instead of
  // proving the glob is inert.
  for (const title of ["add-login", "add*login", "add?login"]) {
    withTempDir("p2p2-viber-", (dir) => {
      landPlan(dir, "2026-09-19-17-30-00_add-login-v2");
      landPlan(dir, "2026-09-19-18-00-00_add-zzz-login");

      const src = sourcePlan(dir, "outside/glob.md", `# ${title}\n`);
      const result = run(dir, ["--land", src]);
      assert.equal(result.status, 0, `${title} -> stderr: ${result.stderr}`);
      const resolved = parse(result.stdout);
      assert.equal(resolved.state, "new", `${title} must not resume a foreign run`);
      assert.equal(slugOf(resolved.key), "add-login");
    });
  }
});

test("two runs open for one slug: the one touched most recently is the one resumed", () => {
  withTempDir("p2p2-viber-", (dir) => {
    landPlan(dir, "2026-09-19-17-30-00_add-login", "2026-09-30T09:00:00Z");
    landPlan(dir, "2026-09-25-11-00-00_add-login", "2026-09-26T09:00:00Z");

    const src = sourcePlan(dir, "outside/add-login.md", PLAN_BODY);
    const result = run(dir, ["--land", src]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(parse(result.stdout).key, "2026-09-19-17-30-00_add-login");
  });
});

// --- unusable argv, and a copy the filesystem refused ---

test("--land with no source: exit 2, the usage line, nothing created", () => {
  withTempDir("p2p2-viber-", (dir) => {
    for (const args of [["--land"], ["--land", ""]]) {
      const result = run(dir, args);
      assert.equal(result.status, 2, `${args.join(" ")} -> stdout: ${result.stdout}`);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, /usage: plan-path\.sh --land <src>/);
      assert.equal(fs.existsSync(path.join(dir, "docs")), false);
    }
  });
});

test("--land with a source that is not a file: exit 2, the path echoed back", () => {
  withTempDir("p2p2-viber-", (dir) => {
    fs.mkdirSync(path.join(dir, "outside"), { recursive: true });

    for (const src of ["outside/nope.md", "outside"]) {
      const result = run(dir, ["--land", src]);
      assert.equal(result.status, 2, `${src} -> stdout: ${result.stdout}`);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, /plan file not found/);
      assert.ok(result.stderr.includes(src), `stderr must echo the source: ${src}`);
    }
  });
});

test("a bare first argument is a usage error, not a slug (the slug form is gone, and guessing one would land the wrong plan)", () => {
  withTempDir("p2p2-viber-", (dir) => {
    for (const argument of ["add-login", "--split", "-land"]) {
      const result = run(dir, [argument]);
      assert.equal(result.status, 2, `${argument} -> stdout: ${result.stdout}`);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, /usage: plan-path\.sh \[--land <src>\]/);
      assert.equal(fs.existsSync(path.join(dir, "docs")), false);
    }
  });
});

test("a copy the filesystem refuses: exit 5, nothing on stdout and no half-made run directory left behind", () => {
  withTempDir("p2p2-viber-", (dir) => {
    const src = sourcePlan(dir, "outside/add-login.md", PLAN_BODY);

    withStub("cp", "exit 1", (stubDir) => {
      const result = run(dir, ["--land", src], [stubDir]);
      assert.equal(result.status, 5, `stdout: ${result.stdout}`);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, /could not land the plan/);
      assert.deepEqual(runDirs(dir), [], "a failed copy must not leave an empty run directory");
    });
  });
});

// --- the guidance the template carries for whoever writes the plan ----------

test("--land keeps the markers the run reads and drops the template's guidance, leaving the source untouched", () => {
  withTempDir("p2p2-viber-", (dir) => {
    const body = [
      "# Add Login",
      "",
      "<!-- source: /elsewhere/plans/drifting-dolphin.md -->",
      "",
      "Build: skill `implementor`",
      "",
      "<!-- two parts: everything above \"## Tasks\" is the specification",
      "     and is split off as spec.md -->",
      "",
      "## Tasks",
      "",
      "<!-- TASK -->",
      "### T1 - do the thing",
      "- Files: src/a.ts",
      "<!-- /TASK -->",
      "",
      "<!--",
      "One TASK block per unit of work; leave every HTML marker intact.",
      "-->",
      "",
    ].join("\n");
    const src = sourcePlan(dir, "outside/drifting-dolphin.md", body);

    const result = run(dir, ["--land", src]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);

    const landed = fs.readFileSync(path.join(dir, parse(result.stdout).path), "utf-8");
    assert.match(landed, /<!-- source: \/elsewhere\/plans\/drifting-dolphin\.md -->/);
    assert.match(landed, /<!-- TASK -->/);
    assert.match(landed, /<!-- \/TASK -->/);
    assert.doesNotMatch(landed, /two parts/);
    assert.doesNotMatch(landed, /One TASK block per unit of work/);
    assert.doesNotMatch(landed, /\n\n\n/, "a dropped comment must not leave a double blank line behind");

    // the plans directory is the user's, and a re-land has to find it as it was
    assert.equal(fs.readFileSync(src, "utf-8"), body);
  });
});

// --- open runs: unfinished work the caller cannot see for itself ------------

test("landing a fresh plan while another run is unfinished reports that run as an open: line", () => {
  withTempDir("p2p2-viber-", (dir) => {
    landPlan(dir, "2026-09-01-09-00-00_earlier", "2026-09-01T09:00:00Z", planWithTasks("Earlier", ["T1", "T2", "T3"]));
    landStatus(dir, "2026-09-01-09-00-00_earlier", { progress: "1/3", done: "T1" });

    const src = sourcePlan(dir, "outside/add-login.md", PLAN_BODY);
    const result = run(dir, ["--land", src]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(parse(result.stdout).state, "new");
    assert.deepEqual(openLines(result.stdout), ["docs/_specs/2026-09-01-09-00-00_earlier/plan.md | 1/3"]);
  });
});

test("a run whose tasks are all done or all skipped is not open, and the resolved run is never listed as one", () => {
  withTempDir("p2p2-viber-", (dir) => {
    landPlan(dir, "2026-09-01-09-00-00_finished", "2026-09-01T09:00:00Z", planWithTasks("Finished", ["T1", "T2"]));
    landStatus(dir, "2026-09-01-09-00-00_finished", { progress: "2/2", done: "T1 T2" }, "2026-09-01T10:00:00Z");
    landPlan(dir, "2026-09-02-09-00-00_dropped", "2026-09-02T09:00:00Z", planWithTasks("Dropped", ["T1", "T2"]));
    landStatus(dir, "2026-09-02-09-00-00_dropped", { progress: "1/2", done: "T1", skipped: "T2" }, "2026-09-02T10:00:00Z");
    landPlan(dir, "2026-09-03-09-00-00_current", "2026-09-03T09:00:00Z", planWithTasks("Current", ["T1", "T2"]));
    landStatus(dir, "2026-09-03-09-00-00_current", { progress: "0/2", done: "none" }, "2026-09-03T10:00:00Z");

    const result = run(dir);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(parse(result.stdout).key, "2026-09-03-09-00-00_current");
    assert.deepEqual(openLines(result.stdout), []);
  });
});

test("a run that never reached its first commit carries no status file and is open with nothing done", () => {
  withTempDir("p2p2-viber-", (dir) => {
    landPlan(dir, "2026-09-01-09-00-00_untouched", "2026-09-01T09:00:00Z", planWithTasks("Untouched", ["T1", "T2"]));
    landPlan(dir, "2026-09-02-09-00-00_current", "2026-09-02T09:00:00Z", planWithTasks("Current", ["T1"]));
    landStatus(dir, "2026-09-02-09-00-00_current", { progress: "1/1", done: "T1" });

    const result = run(dir);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(parse(result.stdout).key, "2026-09-02-09-00-00_current");
    assert.deepEqual(openLines(result.stdout), ["docs/_specs/2026-09-01-09-00-00_untouched/plan.md | 0/2"]);
  });
});

test("no argument: a frozen plan.md does not age its run out - the status file beside it is what counts as worked on", () => {
  withTempDir("p2p2-viber-", (dir) => {
    // both plans landed long ago and are never written to again; only one run
    // has been committing since
    landPlan(dir, "2026-01-01-09-00-00_older", "2026-01-01T09:00:00Z", planWithTasks("Older", ["T1"]));
    landStatus(dir, "2026-01-01-09-00-00_older", { progress: "1/1", done: "T1" }, "2026-09-20T18:00:00Z");
    landPlan(dir, "2026-02-01-09-00-00_newer", "2026-02-01T09:00:00Z", planWithTasks("Newer", ["T1"]));
    landStatus(dir, "2026-02-01-09-00-00_newer", { progress: "0/1", done: "none" }, "2026-02-01T09:00:00Z");

    const result = run(dir);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(parse(result.stdout).key, "2026-01-01-09-00-00_older");
    assert.deepEqual(openLines(result.stdout), ["docs/_specs/2026-02-01-09-00-00_newer/plan.md | 0/1"]);
  });
});
