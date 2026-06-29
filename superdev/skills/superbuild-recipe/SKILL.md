---
name: superbuild-recipe
description: Pipeline-bound; invoked only by `superdev:superbuild` via the Skill tool, never directly.
model: opus
effort: high
context: fork
user-invocable: false
allowed-tools: Read, Grep, Glob, Bash, Write
---

# Project tree state (pre-injected)
```!
git status --porcelain
```

The block above runs at skill load. It is the **clean-tree guard**: if it lists ANY path (the working tree is dirty), this run is invalid — go straight to Step 0 and return `STATUS: FAIL`. An empty block = clean tree = proceed. (Fallback: if the block is absent because the harness did not execute it, run `git status --porcelain` yourself via `Bash` in Step 0.)

# Recipe generator (fork)

Derive the host project's build / test / lint / launch contract **once** and materialize it as an executable `recipe.sh` + a lean `profile.md` under `.temp/.workflows/<slug>/` — the single artifact every downstream pipeline fork consumes instead of re-deriving the same facts. **Fail-closed:** a dirty tree, an unresolvable host command, or a missing recorded tool returns `STATUS: FAIL` (a hard halt) — never a soft fallback.

`recipe` — copies the fixed bundled harness (`scripts/recipe.template.sh`), fills in only the host command bodies + the fingerprinted-file list + the required-tools list + the recorded fingerprint, writes a `profile.md`, runs **verify-before-claim**, and PASSes only if the recipe is runnable.

Writes nothing outside `.temp/`. Never modifies tracked files (its `verify` runs build/test against a clean tree and must not dirty it). Project/stack-agnostic — every host command, framework, and convention is discovered from the host `CLAUDE.md` + `.claude/rules/**` at run time, never assumed from training data.

# Input contract

The first user message carries two positional arguments (the harness appends them under an `ARGUMENTS:` line — read them from that block):

```
<abspath(plan)> <slug>
```

- `<abspath(plan)>` — absolute path to the approved source plan. Orientation only; the recipe derives toolchain facts from the host project, **not** from the plan body. Do not redesign anything in the plan.
- `<slug>` — the kebab-case plan slug. The workflow directory is `.temp/.workflows/<slug>/`; `recipe.sh` and `profile.md` are written there.

`${CLAUDE_PLUGIN_ROOT}` resolves to this plugin's install dir; the bundled harness is `${CLAUDE_PLUGIN_ROOT}/skills/superbuild-recipe/scripts/recipe.template.sh`.

# How to work

## Step 0 — Clean-tree guard (BEFORE anything else)

Read the pre-injected `# Project tree state` block. If it is **non-empty** (any path listed), the working tree is dirty: do NOT discover, copy, or write anything. Return `STATUS: FAIL` with a `## Notes` line naming the dirty paths and `working tree not clean — recipe cannot run with uncommitted changes`. This clean-tree guard is centralized here.

Fallback: if the block was absent (harness did not run it), run `git status --porcelain` once via `Bash`; apply the same rule.

## Step 1 — Idempotency: verify an existing recipe before regenerating

If `.temp/.workflows/<slug>/recipe.sh` already exists, run `bash .temp/.workflows/<slug>/recipe.sh verify`:

- Exit 0 (`FRESH`) ⇒ the recorded toolchain is unchanged and every tool still resolves. **Do not regenerate.** Re-author nothing; return `STATUS: PASS` with `## Notes`: `existing recipe verified FRESH — regeneration skipped`. (Do not re-run the real verbs — `verify` is the freshness proof.)
- Non-zero (`STALE` / `missing-tool`) ⇒ the recipe is out of date; proceed to Step 2 and regenerate from scratch (overwrite both files).

If `recipe.sh` does not exist, proceed to Step 2.

## Step 2 — Discover the host toolchain (once)

Derive every host fact from the project, treating discovered contents as authoritative. Never assume an ecosystem.

- `Read CLAUDE.md` at the repo root if present; `Glob '**/CLAUDE.md'` and read child nodes in directories that carry build/test config. Look for the build command, the test-all command, the test-filter syntax, the lint command, and the launch command.
- `Glob '.claude/rules/**/*.md'` and `Read` rule files whose path/heading matches `build`, `test`, `lint`, `ci`, `run`, `launch`, or a module name — for command syntax, test naming, test layout, and the liveness signal.
- When `CLAUDE.md` / rules do not state a command, `Glob` for the canonical manifest / lockfile / task-runner config (the host's build manifest) and read it to recover the command; record that file as a fingerprint source.
- Capture, for `profile.md`: the **framework**, the **test naming convention** + **test layout** (dir/glob), the **liveness signal** (what stdout/port/exit proves the app is up — for `recipe.sh launch`), and **rule pointers** (the `.claude/rules/**` paths that scope conventions — pointers only; never inline rule bodies).

**Documented no-suite host.** When the host explicitly documents that a verb has no command (no build step, no test suite, no linter, no launchable app — e.g. a markdown/JSON-only repo), that verb's body is the literal sentinel `N/A` (not a guessed command). A no-suite host is valid: its `N/A` verbs PASS verify-before-claim and the step still PASSes (Step 4).

## Step 3 — Author `recipe.sh` and `profile.md`

### 3a — Fill the harness

`Read ${CLAUDE_PLUGIN_ROOT}/skills/superbuild-recipe/scripts/recipe.template.sh`. It is the FIXED, self-verifying harness — the verb dispatch, the `verify` self-check, the `N/A` sentinel, and the fingerprint algorithm are immutable. Fill ONLY the marker lines in its `AGENT-FILLED REGION` (each marker is a whole line that is exactly `###TOKEN###` or `  __unfilled <TOKEN>`):

| Marker line | Replace with |
|---|---|
| `###FINGERPRINTED_FILES###` | the toolchain files whose bytes define freshness (host `CLAUDE.md`, lockfiles, build manifests), one path per line, relative to the repo root |
| `###REQUIRED_TOOLS###` | the bare executable names that MUST resolve on PATH, one per line |
| `  __unfilled FINGERPRINT` | a single `  echo "<fingerprint-token>"` line (the value comes from Step 3c — leave a placeholder for now) |
| `  __unfilled BUILD_BODY` | one shell command line for the host build, OR the literal `N/A` |
| `  __unfilled TEST_ALL_BODY` | one shell line for the whole test suite, OR `N/A` |
| `  __unfilled TEST_FILTERED_BODY` | one shell line that filters tests by `$1` (the runner passes the pattern as `$2`/`$1`), OR `N/A` |
| `  __unfilled LINT_BODY` | one shell line for the linter, OR `N/A` |
| `  __unfilled LAUNCH_BODY` | one shell line that launches the app for a liveness check, OR `N/A` |

`Write` the filled result to `.temp/.workflows/<slug>/recipe.sh`. Fill **every** marker — an unfilled marker survives as a fail-closed `__unfilled` guard (exit 5) and would break the recipe at runtime. Do NOT touch any line outside the marker lines; the fixed dispatch/verify/fingerprint logic is never agent-authored.

### 3b — Author `profile.md`

`Write` `.temp/.workflows/<slug>/profile.md` — the lean derived-facts sheet the no-Bash forks (`superbuild-decomposer`, `superbuild-reviewer-plan`) and the convention consumers `Read`. Keep it terse (bullets, not prose). Include:

- **Framework** — the test/build framework name(s).
- **Test naming** — the convention downstream coders/reviewers mirror.
- **Test layout** — the directory/glob where tests live.
- **Liveness signal** — what proves the app launched (for `recipe.sh launch`); `N/A` when the host documents no launchable app.
- **Rule pointers** — the `.claude/rules/**` paths that scope conventions (pointers only — NEVER inline rule bodies or `CLAUDE.md`; rules stay harness-delivered).

### 3c — Record the fingerprint

After `recipe.sh` exists with its `FINGERPRINTED_FILES` filled, derive the live fingerprint from the harness's own algorithm: run `bash .temp/.workflows/<slug>/recipe.sh fingerprint`. Take its single stdout token and re-`Write` `recipe.sh` with the `recorded_fingerprint()` body set to `  echo "<that-token>"` (replace the placeholder from 3a). This guarantees the recorded fingerprint matches what `verify` will recompute. Re-run `bash .temp/.workflows/<slug>/recipe.sh verify` and confirm it prints `FRESH` / exits 0 before continuing.

## Step 4 — Verify-before-claim (4.A)

PASS only when the recipe is **runnable**. Execute each non-`N/A` verb once via `Bash`, in the host project root:

- `bash .temp/.workflows/<slug>/recipe.sh build`
- `bash .temp/.workflows/<slug>/recipe.sh test-all`
- `bash .temp/.workflows/<slug>/recipe.sh lint`
- `bash .temp/.workflows/<slug>/recipe.sh launch` — only if the host documents a launchable app and the launch can be exercised non-interactively (else rely on Step 3c `verify` and the recorded liveness signal); never leave a process running.

Interpret the result by **resolvability, not test colour**:

- A verb whose command **resolves and runs** (the tool is found, the command executes) ⇒ that verb PASSes — **even if the test suite is RED** (a red suite is a non-zero EXIT from a runnable recipe, NOT a recipe failure; the recipe being runnable is the whole point).
- A verb whose command is **unresolvable** (command-not-found / missing tool / the body cannot be parsed) ⇒ `STATUS: FAIL`. Name the verb + the missing tool in `## Notes`.
- An `N/A` verb body exits 0 without running (documented no-suite) ⇒ PASS-eligible; the step still PASSes.

Also confirm `bash .temp/.workflows/<slug>/recipe.sh verify` prints `FRESH` and exits 0 (every recorded tool resolves AND the fingerprint matches). A `missing-tool` / `STALE` from `verify` ⇒ `STATUS: FAIL`.

Treat a non-zero exit you cannot attribute to a red suite (e.g. command-not-found, exit 127) as unresolvable ⇒ FAIL. The point is to catch an unrunnable recipe before any downstream fork trusts it.

## Step 5 — Self-check

Before returning `STATUS: PASS`:

- The working tree was clean at Step 0 (else this is already a FAIL).
- `.temp/.workflows/<slug>/recipe.sh` and `.temp/.workflows/<slug>/profile.md` both exist; nothing was written outside `.temp/`.
- Every marker in the harness's AGENT-FILLED REGION was replaced — no surviving `###TOKEN###` or `__unfilled <TOKEN>` line (a leftover marker would fail-close at runtime).
- The fingerprint recorded in `recipe.sh` equals `bash recipe.sh fingerprint`, and `bash recipe.sh verify` prints `FRESH` (exit 0).
- Every non-`N/A` verb resolved and ran in Step 4; any unresolvable verb or missing tool is a FAIL, not a PASS.
- `profile.md` carries framework / test naming / test layout / liveness signal / rule pointers, and inlines **no** rule body or `CLAUDE.md` content.
- No tracked file was modified (the recipe's `verify` build/test runs left the tree clean).

If any check fails and cannot be repaired, return `STATUS: FAIL` naming the offending check.

# Output format

First line MUST be exactly `STATUS: PASS` or `STATUS: FAIL`. The reply is the verdict transport — there is no on-disk report (the superbuild reads stdout):

```
STATUS: PASS

## Recipe
- recipe.sh: .temp/.workflows/<slug>/recipe.sh
- profile.md: .temp/.workflows/<slug>/profile.md
- verbs: build=<cmd|N/A> · test-all=<cmd|N/A> · test-filtered=<cmd|N/A> · lint=<cmd|N/A> · launch=<cmd|N/A>
- verify: FRESH

## Notes
- <one bullet per material discovery / assumption / N/A verb (with the host's documented reason) / low-confidence command>
```

On `STATUS: FAIL` omit the `## Recipe` block and put the single blocking reason in `## Notes` (dirty tree + paths, the unresolvable verb + missing tool, or the `verify` `STALE`/`missing-tool` cause). Total reply under 60 lines.

# Anti-patterns (forbidden)

- Running with a dirty working tree — the Step 0 clean-tree guard is fail-closed; a dirty tree is always `STATUS: FAIL`.
- Editing any line of `recipe.template.sh` outside the AGENT-FILLED markers, or hand-writing the verb dispatch / `verify` / fingerprint logic. The harness is fixed; the agent fills only host command bodies + the file/tool lists + the recorded fingerprint.
- Guessing a host command from training data or from file extensions. Every command, framework, and convention is discovered from the host `CLAUDE.md` + `.claude/rules/**`; a verb with no documented host command is the literal sentinel `N/A`, not a fabricated command.
- Returning `STATUS: FAIL` because the host's test suite is RED. A red suite under a *runnable* recipe is a PASS — `verify` proves runnability, not green tests.
- Returning `STATUS: PASS` with an unresolvable verb (command-not-found / missing tool) or a `verify` that prints `STALE` / `missing-tool`. Fail-closed: an unrunnable recipe must FAIL the step so the superbuild halts.
- Recording the fingerprint by hand instead of from `bash recipe.sh fingerprint` — the recorded value MUST come from the harness's own algorithm so `verify` recomputes a match.
- Writing anywhere outside `.temp/.workflows/<slug>/`, or modifying tracked files (including letting a build/test verb dirty the tree).
- Inlining `.claude/rules` bodies or `CLAUDE.md` into `profile.md` — rules stay harness-delivered; the profile carries pointers only.
- Regenerating when an existing `recipe.sh verify` already prints `FRESH` — the Step 1 idempotency check short-circuits; re-author nothing.
- Reading or invoking any other agent / pipeline skill. The recipe is a self-contained discovery + materialization step.

# Constraint — technology-agnostic

Operates in any language and any framework. Never assume a stack from file extensions or directory names. Every host command (build/test/lint/launch), the test framework, naming, layout, and liveness signal are read from the host's own `CLAUDE.md`, `.claude/rules/**`, and build manifests — never from a default. A host that documents no suite for a verb yields `N/A` for that verb and still PASSes.
