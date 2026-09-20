/*
 * plan-path.test.ts - proves viber/scripts/plan-path.sh's contract: it is the
 * ONE place a plan path is formed, so every rule about the run directory
 * `docs/_specs/<yyyy-mm-dd-HH-mm-ss>_<slug>/` lives here and nowhere else.
 *
 * Two properties carry the design. The stamp is taken when the plan LANDS, so
 * a second run of the same slug can never overwrite an earlier plan - it either
 * reports the open run as `state: existing` or mints a fresh stamp. And the key
 * it prints also names `.temp/viber/<plan-key>/` and the decomposition beside
 * the plan, so anything but `[a-z0-9-]` leaking out of the slug normalization
 * would reach a directory name and a git path.
 *
 * The caller is trusted to take this output as it stands - the skill never
 * re-verifies it - which makes the three-line block and the exit codes (2: the
 * slug normalizes to nothing, 3: no slug and no plan) the whole interface.
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
function landPlan(root: string, key: string, mtime = "2026-01-01T00:00:00Z"): string {
  const file = path.join(root, "docs", "_specs", key, "plan.md");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `# ${key}\n`);
  const seconds = Date.parse(mtime) / 1000;
  fs.utimesSync(file, seconds, seconds);
  return file;
}

test("no slug and nothing under docs/_specs: exit 3, an empty stdout and the reason on stderr", () => {
  withTempDir("p2p2-viber-", (dir) => {
    const result = run(dir);
    assert.equal(result.status, 3);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /no plan under docs\/_specs/);
  });
});

test("no slug and one landed plan: the three-line block, verbatim and in order", () => {
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

test("no slug: the plan touched most recently wins, not the first on disk and not the newest stamp", () => {
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

    // The same guard in the slug branch: an aborted run must not be resumed,
    // it must mint a fresh stamp.
    const aborted = run(dir, ["abandoned"]);
    assert.equal(aborted.status, 0, `stderr: ${aborted.stderr}`);
    assert.equal(parse(aborted.stdout).state, "new");

    landPlan(dir, "2026-08-01-09-00-00_real", "2026-08-01T09:00:00Z");
    const found = run(dir);
    assert.equal(found.status, 0, `stderr: ${found.stderr}`);
    assert.equal(parse(found.stdout).key, "2026-08-01-09-00-00_real");
  });
});

test("an empty argument is no argument: it resolves the plan most recently worked on rather than failing as an empty slug", () => {
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

test("a slug whose run is already open comes back as existing, at that run's own path and key", () => {
  withTempDir("p2p2-viber-", (dir) => {
    landPlan(dir, "2026-09-19-17-30-00_add-login");
    landPlan(dir, "2026-09-20-08-00-00_other-thing", "2026-09-20T08:00:00Z");

    const result = run(dir, ["Add Login"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(parse(result.stdout), {
      path: "docs/_specs/2026-09-19-17-30-00_add-login/plan.md",
      key: "2026-09-19-17-30-00_add-login",
      state: "existing",
    });
  });
});

test("a slug with no open run comes back as new, at a freshly stamped path, and nothing is written to disk", () => {
  withTempDir("p2p2-viber-", (dir) => {
    const result = run(dir, ["add-login"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);

    const resolved = parse(result.stdout);
    assert.equal(resolved.state, "new");
    assert.equal(slugOf(resolved.key), "add-login");
    assert.equal(resolved.path, `docs/_specs/${resolved.key}/plan.md`);
    assert.equal(fs.existsSync(path.join(dir, "docs")), false, "resolving a path must not create one");

    // The stamp is taken NOW, which is the whole reason a second run of one
    // slug cannot overwrite an earlier plan. The window is wide on purpose: it
    // has to catch a fixed or epoch-derived stamp (off by years), not to
    // measure the clock, and a DST-ambiguous local hour must never flip it.
    assert.ok(Math.abs(stampAge(resolved.key)) < 90 * 60_000, `the stamp must be the landing moment: ${resolved.key}`);
  });
});

test("the slug is normalized here, so the caller may hand over the plan title as it stands", () => {
  const cases: Array<[string, string]> = [
    ["Add Login", "add-login"],
    ["  --Add / LOGIN!!  ", "add-login"],
    ["add__login", "add-login"],
    ["Add-Login", "add-login"],
    ["...add...login...", "add-login"],
    ["Refactor 2 Auth", "refactor-2-auth"],
  ];
  withTempDir("p2p2-viber-", (dir) => {
    for (const [title, expected] of cases) {
      const result = run(dir, [title]);
      assert.equal(result.status, 0, `${title} -> stderr: ${result.stderr}`);
      assert.equal(slugOf(parse(result.stdout).key), expected, `title: ${title}`);
    }
  });
});

test("a non-ASCII title still yields an ASCII-only slug (the key becomes a directory name and a git path)", () => {
  withTempDir("p2p2-viber-", (dir) => {
    const result = run(dir, ["Dodaj obsługę płatności"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);

    // slugOf asserts the [a-z0-9-] shape; the leading word proves the title
    // was carried over rather than dropped.
    const slug = slugOf(parse(result.stdout).key);
    assert.ok(slug.startsWith("dodaj"), `slug: ${slug}`);
  });
});

test("a slug longer than 60 characters is cut to 60 and never keeps a trailing hyphen", () => {
  withTempDir("p2p2-viber-", (dir) => {
    const midWord = run(dir, ["b".repeat(70)]);
    assert.equal(midWord.status, 0, `stderr: ${midWord.stderr}`);
    assert.equal(slugOf(parse(midWord.stdout).key), "b".repeat(60));

    // The cut lands exactly on the separator: 59 a's, then "-bbb".
    const onSeparator = run(dir, [`${"A".repeat(59)} bbb`]);
    assert.equal(onSeparator.status, 0, `stderr: ${onSeparator.stderr}`);
    assert.equal(slugOf(parse(onSeparator.stdout).key), "a".repeat(59));
  });
});

test("a slug that normalizes to nothing: exit 2, an empty stdout and the raw input on stderr", () => {
  withTempDir("p2p2-viber-", (dir) => {
    landPlan(dir, "2026-09-19-17-30-00_add-login");

    // No bare "*" here: on Git-Bash the MSYS runtime expands it against the
    // cwd before argv ever reaches the script. A glob character that survives
    // into the slug is covered by the whole-slug case below.
    for (const argument of ["!!!", "---", "   "]) {
      const result = run(dir, [argument]);
      assert.equal(result.status, 2, `${argument} -> stdout: ${result.stdout}`);
      assert.equal(result.stdout, "", `a rejected slug must resolve to no path: ${argument}`);
      assert.match(result.stderr, /slug is empty after normalization/);
      assert.ok(result.stderr.includes(argument), `stderr must echo the raw input: ${argument}`);
    }
  });
});

test("an open run answers for its whole slug only, so neither a longer name nor a glob character can hand back a foreign run", () => {
  withTempDir("p2p2-viber-", (dir) => {
    landPlan(dir, "2026-09-19-17-30-00_add-login-v2");
    landPlan(dir, "2026-09-19-18-00-00_add-zzz-login");

    for (const argument of ["add-login", "add*login", "add?login"]) {
      const result = run(dir, [argument]);
      assert.equal(result.status, 0, `${argument} -> stderr: ${result.stderr}`);
      const resolved = parse(result.stdout);
      assert.equal(resolved.state, "new", `${argument} must not resume a foreign run`);
      assert.equal(slugOf(resolved.key), "add-login");
    }
  });
});

test("two runs open for one slug: the one touched most recently is the one resumed", () => {
  withTempDir("p2p2-viber-", (dir) => {
    landPlan(dir, "2026-09-19-17-30-00_add-login", "2026-09-30T09:00:00Z");
    landPlan(dir, "2026-09-25-11-00-00_add-login", "2026-09-26T09:00:00Z");

    const result = run(dir, ["add-login"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(parse(result.stdout).key, "2026-09-19-17-30-00_add-login");
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
