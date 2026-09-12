# SuperPlan
To build this plan use the `superbuild` skill.

Title: "code-auditor rebuild - repo profile, redacted critic, directory scope, findings cap"
Spec: C:/Projects/p2p2.claude/docs/.workflows/2026-09-12-code-auditor-rebuild/spec.md
Intent: docs/.workflows/2026-09-12-code-auditor-rebuild/intent.md
Plan: C:\Users\dariu\.claude-dario\plans\iterative-mapping-babbage.md

---

## Context

`superfix:code-auditor` sweeps a repo with deterministic scripts, scores files with cheap scouts, gates them, and dispatches frontier detectives whose claims a critic replays. Four gaps were confirmed in the interview: the sweep knows nothing repo-specific (bug classes, contract shape, what "severe" means here); the critic inherits the detective's narrative instead of trying to refute the claim; `model: opus` is pinned so the session model choice does not cascade; the sweep cannot be scoped to a directory and `dependents` merges every same-named file. This plan adds a `profiler` agent, a `--scope` flag on both sweep scripts, a lockstep `dependents_stem` literal, a claim sidecar the critic reads instead of the report, `model: inherit` on the frontier agents, a 10-entry cap on `findings.md`, and syncs catalog, docs and tests.

Repo facts every task relies on: no build step, no package.json; tests run from the repo root with `node --test "tests/**/*.test.ts"` (Node 26 present; a single file runs as `node --test tests/superfix/<file>.test.ts`); shell scripts are `#!/usr/bin/env bash` driven through `tests/harness/shells.ts` `forEachShell("bash", ...)`; fixtures are built with `withGitRepo` + a local `commitAt` helper; no em dash or en dash may appear in any file (`! grep -rn $'\u2013\|\u2014' <paths>` is the precedent check); plugin files are written in English.

Shared values, each owned by exactly one task: `--scope` argument grammar and path filter (Task 1, mirrored by Task 2); `dependents_stem` literal algorithm and field (Task 3); claim sidecar schema, critic input list, no-verdict fold, `findings.md` cap format and tie-break, severity calibration source (Task 4); `profile.md` headings and profiler brief (Task 6); `job.md` recipe with `Scope:` and `## Repo profile`, scope validation in Phase 0, profiler retry (Task 7).

---

<!-- TASK -->

## Task 1 - feat(superfix): collect_signals.sh accepts --scope <dir> and sweeps only that subtree
- TDD: none
- Model: opus
- Effort: high
- Covers: criteria #2, #20

### Dependencies
- none - blocks: Task 2, Task 3

### Files
- modify - superfix/skills/code-auditor/scripts/collect_signals.sh (argument loop over `"$@"`, new `SCOPE` variable, new `scope_filter()` function, header comment Usage and Signals blocks)
- modify - tests/superfix/collect_signals.test.ts (new section `// --- --scope ---`, new fixture `buildScopeFixture`)

### Test Commands
#### Build
- none (no build step in this repo: bash executed directly, TypeScript run by Node type stripping)

#### Tests
- `node --test tests/superfix/collect_signals.test.ts` - expected: all cases pass, new `--scope` cases included
- `! grep -rn $'\u2013\|\u2014' superfix/skills/code-auditor/scripts/collect_signals.sh tests/superfix/collect_signals.test.ts` - expected: no output, exit 0

### Approach
1. Replace the existing `for arg in "$@"` loop in `collect_signals.sh` with the index-driven `while [ $i -lt ${#args[@]} ]` shape `collect_edges.sh` uses for `--max-fanout`, so `--scope <value>` is read as a two-token option into `SCOPE` while `--with-dependents` and `positional[]` binding keep their current behaviour.
2. Normalise `SCOPE` once after `cd "$ROOT"`: strip a leading `./`, strip every trailing `/`; `.` or empty means no scope.
3. Add `scope_filter()` placed after `noise_filter()`: with `SCOPE` empty it is `cat`; otherwise `awk -v d="$SCOPE" '$0 == d || index($0, d "/") == 1'` (a value without a newline is safe for `-v` on BSD awk). Insert it into the pass-2 pipeline between the extension `awk` and the `while IFS= read -r f` loop, so pass 1 (extension discovery) and every git probe keep running over the whole repo and only the emitted record set shrinks.
4. Materialise the filtered pass-2 list into a variable (`candidates="$(... | scope_filter)"`) and feed the probe loop from it (`<<< "$candidates"`, skipping the empty line an empty list produces), so `N` can be counted first; when `SCOPE` is set print one stderr line `scope: <SCOPE> (<N> files)` next to the existing `sweep extensions:` line.
5. Update the header comment: Usage line `bash collect_signals.sh [window_days] [repo_root] [--with-dependents] [--scope <dir>]`, one paragraph on scope semantics (record set only, probes and pass 1 stay repo-wide, `<dir>` is repo-root-relative).
6. Tests: `buildScopeFixture` commits `src/alpha.ts`, `src/deep/beta.ts`, `lib/gamma.ts`, `srcx/delta.ts` (a sibling whose name shares the prefix) and `README.md` mentioning `alpha` and `gamma`. Cases: (a) `--scope src` emits exactly `src/alpha.ts` and `src/deep/beta.ts` and no `srcx/delta.ts`; (b) `--scope ./src/` normalises to the same set; (c) `--scope src --with-dependents` yields for `src/alpha.ts` the same `dependents` (1), `churn` and `fix_commits` values as a run with `--with-dependents` and no `--scope` (assert equality of the two records field by field); (d) `--scope` may appear before or after the positionals (`["30", "--scope", "src"]` and `["--scope", "src", "30", "."]`); (e) invalid scope values from Failure modes.

### Failure modes
- when `--scope` value is an absolute path (starts with `/` or matches `^[A-Za-z]:`) -> response exit 2 with no stdout, log one stderr line `collect_signals.sh: --scope must be a repo-root-relative directory: <value>`, test asserts status 2, empty stdout, matching stderr
- when `--scope` value contains a `..` segment -> response exit 2 with no stdout, log the same stderr line, test asserts status 2 and empty stdout
- when `--scope` is the last argument with no value -> response exit 2 with no stdout, log `collect_signals.sh: --scope requires a directory argument`, test asserts status 2
- when `--scope` matches zero tracked files -> response exit 0 with empty stdout (a valid empty sweep, the skill validates existence before calling), log stderr `scope: <dir> (0 files)`, test asserts status 0, empty stdout, stderr contains `(0 files)`

### Contracts
- `--scope <dir>` grammar: two tokens, position-independent, value repo-root-relative, `./` prefix and trailing `/` tolerated, `.` or empty means whole repo; validation: absolute paths and `..` segments rejected with exit 2 - consumed by Task 2 (identical grammar in `collect_edges.sh`) and Task 7 (the skill passes it in Phase 1)
- Record set under scope: a path `p` is kept iff `p == dir` or `p` starts with `dir/`; every probe (churn, fix_commits, recency, loc, dependents) is computed exactly as without scope - consumed by Task 3 (the literal universe stays unscoped)
- stderr line `scope: <dir> (<N> files)` - consumed by Task 2 (same line, `pairs` instead of `files`)

### DoD
`node --test tests/superfix/collect_signals.test.ts` green with the new `--scope` cases; a scoped run's record for a scoped file equals the unscoped run's record; the dash scan on both files prints nothing.

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - feat(superfix): collect_edges.sh accepts --scope <dir> and keeps pairs with at least one endpoint inside it
- TDD: none
- Model: opus
- Effort: medium
- Covers: criteria #3, #20

### Dependencies
- Task 1 - blocks: Task 7

### Files
- modify - superfix/skills/code-auditor/scripts/collect_edges.sh (existing `while [ $i -lt ${#args[@]} ]` argument loop, new `SCOPE` variable, new `in_scope()` awk filter on `pair_tsv`, header comment Usage and Edge cases blocks)
- modify - tests/superfix/collect_edges.test.ts (new section `// --- --scope ---`, new fixture `buildScopedPairFixture`)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `node --test tests/superfix/collect_edges.test.ts` - expected: all cases pass, new `--scope` cases included
- `! grep -rn $'\u2013\|\u2014' superfix/skills/code-auditor/scripts/collect_edges.sh tests/superfix/collect_edges.test.ts` - expected: no output, exit 0

### Approach
1. Add `--scope <value>` to the existing index-driven argument loop next to `--max-fanout`, store in `SCOPE`, normalise exactly as Task 1 (leading `./`, trailing `/`, `.` or empty means whole repo), reuse Task 1's validation rule.
2. Leave `raw_pairs`, `sorted_pairs` and the pairing `awk` untouched so literal counting, `fanout`, the ambient drop and `via`/`vias` scoring remain repo-wide.
3. Filter `pair_tsv` before the final JSON loop with `awk -F'\t' -v d="$SCOPE" '$1 == d || index($1, d "/") == 1 || $2 == d || index($2, d "/") == 1'` when `SCOPE` is set; a pair survives iff `a` or `b` lies under the scope.
4. Print `scope: <dir> (<N> pairs)` on stderr after the filter when `SCOPE` is set, alongside the existing `literals:` line.
5. Update the header: Usage `bash collect_edges.sh [repo_root] [--max-fanout K] [--scope <dir>]`, one paragraph stating the at-least-one-endpoint rule and that fanout stays repo-wide.
6. Tests: `buildScopedPairFixture` commits `shared.md` and `other.md` (tracked artifacts, never endpoints: `collect_edges.sh` pairs the files that MENTION a literal), `src/a.ts`, `src/b.ts` and `lib/c.ts` (all three mention `shared.md`), and `lib/d.ts` which together with `lib/c.ts` mentions `other.md`. Cases: (a) `--scope src` emits exactly `src/a.ts <-> src/b.ts`, `lib/c.ts <-> src/a.ts` and `lib/c.ts <-> src/b.ts` (the last two have one endpoint outside the scope) and no `lib/c.ts <-> lib/d.ts` pair; (b) each surviving pair's `fanout` is 3, equal to the same pair's `fanout` in the unscoped run (a filter placed before pairing would yield 2); (c) `--scope` before and after `[repo_root]` and `--max-fanout`; (d) the invalid values from Failure modes.

### Failure modes
- when `--scope` value is absolute or contains `..` -> response exit 2 with no stdout, log `collect_edges.sh: --scope must be a repo-root-relative directory: <value>`, test asserts status 2 and empty stdout
- when `--scope` is the last argument with no value -> response exit 2, log `collect_edges.sh: --scope requires a directory argument`, test asserts status 2
- when no pair has an endpoint in scope -> response exit 0 with empty stdout (the documented "no pairs" contract), log `scope: <dir> (0 pairs)`, test asserts status 0 and empty stdout

### Contracts
- Pair scope rule: emit iff `a` or `b` is under `<dir>` (Task 1's path predicate applied to either endpoint); `fanout`, `shared`, `via`, `vias` unchanged by scope - consumed by Task 7 (Phase 1 command and the detective brief for an edge whose other endpoint lies outside the scope)

### DoD
`node --test tests/superfix/collect_edges.test.ts` green with the new cases; a scoped run never emits a pair with both endpoints outside the scope and never changes a surviving pair's `fanout`; the dash scan prints nothing.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - feat(superfix): dependents counted by a lockstep-unique literal, recorded as dependents_stem
- TDD: none
- Model: opus
- Effort: high
- Covers: criteria #7, #8, #9, #20

### Dependencies
- Task 1 - blocks: Task 7

### Files
- modify - superfix/skills/code-auditor/scripts/collect_signals.sh (new `literal_map` computed before the probe loop, new lookup in the `--with-dependents` block replacing `base`/`stem` derivation, `printf` record gains `dependents_stem`, header Signals block and dotfile paragraph)
- modify - tests/superfix/collect_signals.test.ts (case `one JSONL record per tracked file, with exactly the documented keys` gains `dependents_stem`; new section `// --- dependents_stem ---`)
- modify - superfix/agents/scout.md (the `## Inputs you are given` bullet naming the signal keys adds `dependents_stem`)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `node --test tests/superfix/collect_signals.test.ts` - expected: green, including the updated keys case and the new `dependents_stem` cases
- `node --test tests/superfix/rank.test.ts` - expected: green (regression guard only; `rank.ts` picks fixed `hotKeys` and ignores unknown signal keys, the rank fixtures carry no `dependents_stem`)
- `! grep -rn $'\u2013\|\u2014' superfix/skills/code-auditor/scripts/collect_signals.sh superfix/agents/scout.md tests/superfix/collect_signals.test.ts` - expected: no output, exit 0

### Approach
1. Before the pass-2 pipeline, when `WITH_DEPENDENTS=yes`, build `literal_map` (TAB-separated `path<TAB>literal`, literal empty for `-1`) with one `awk` program over the unscoped universe `git -c core.quotePath=false ls-files | noise_filter` (quoted paths starting with `"` skipped, as pass 2 does). Algorithm `lockstep_literals`: split each path on `/` into segments; `depth = 0`; `active = all paths`; repeat: for every active path compute `lit = join(last depth+1 segments, "/")` with the last segment's extension stripped by the existing rule (`${base%.*}` semantics, a dotfile keeps its full basename); count `lit` over active paths only; a path whose `lit` is unique is finalised with that literal; a path whose `lit` collides and has more than `depth+1` segments stays active; a colliding path with no segment left is finalised with the empty literal; `depth++` until `active` is empty.
2. Hand `literal_map` to the probe loop through a temp file created with `mktemp` and removed by an `EXIT` trap; inside the loop, replace `base="$(basename "$f")"` / `stem=...` with a lookup `stem="$(awk -F'\t' -v p="$f" '$1 == p { print $2; exit }' "$literal_map_file")"`.
3. Keep the `git grep -lI -- "$stem"` probe unchanged; when `stem` is empty set `dependents=-1`.
4. Emit `"dependents_stem":"<esc stem>"` after `dependents` when `dependents` is not `-1`, else `"dependents_stem":null` (also without `--with-dependents`).
5. Header: Signals block gains `dependents_stem  the literal dependents was counted by (null when -1)`; replace the dotfile paragraph with one describing the lockstep rule (uniqueness over the noise-filtered tracked set regardless of `--scope`, whole-string comparison, extend one segment from the right per round for every member of a colliding group, a member with no segment left drops out with `-1` and the rest keep extending).
6. Tests: update the keys case to the seven keys and assert `dependents_stem === null` without the flag. New fixture `buildCollisionFixture`: `a/index.ts`, `b/index.ts`, `lib/a/index.ts`, `index.ts` (root), plus `use1.md`..`use3.md` containing the literal `a/index`, `use4.md` containing `b/index`, `use5.md` containing `lib/a/index`, `widget.ts` with `consumer.md` mentioning `widget`. Cases: (a) `b/index.ts` -> `dependents 1`, `dependents_stem "b/index"`; `lib/a/index.ts` -> `dependents_stem "lib/a/index"` and `dependents 1`; `a/index.ts` -> `dependents -1`, `dependents_stem null` (its path is exhausted at `a/index` while `lib/a/index.ts` still carries the substring, and at depth 1 the two literals `a/index` and `a/index` collide; `lib/a/index.ts` extends, `a/index.ts` has no segment left); root `index.ts` -> `-1`/`null`; `widget.ts` -> `dependents 1`, `dependents_stem "widget"`. (b) A second fixture with only `a/index.ts`, `b/index.ts` and the `a/index` x3 / `b/index` x1 mentions asserts `3`/`1` and stems `a/index`/`b/index` (criterion 9 verbatim). (c) `--scope b --with-dependents` on fixture (b) still yields `dependents_stem "b/index"` (uniqueness judged repo-wide).

### Failure modes
- when `mktemp` fails -> response exit 1 with no further stdout, log `collect_signals.sh: cannot create literal map temp file`, test none (environmental; documented in header only)
- when a path has no entry in `literal_map` (a file that appeared between passes) -> response `dependents=-1`, `dependents_stem null` for that record, log stderr warning `collect_signals.sh: warning: no literal for <path>`, test none - a race between two `git ls-files` passes cannot be staged in a fixture; the keys case guarantees the null shape
- when the literal is empty for a path -> response `dependents -1`, `dependents_stem null`, log none, test case (a) root `index.ts`

### Contracts
- `signals.jsonl` record: `{"path","churn","fix_commits","recency_days","loc","dependents","dependents_stem"}` in that order, `dependents_stem` a JSON string or `null` - consumed by Task 7 (Phase 1 description) and read by `scout.md` (this task updates its input bullet); `rank.ts` and `rank_edges.ts` ignore unknown keys (verified by the rank test run)
- Lockstep literal rule as stated in Approach step 1 - consumed by Task 8 (CLAUDE.md script inventory sentence)

### DoD
Both test files green; the collision fixture yields `1 / 1 / -1 / -1 / 1` with the stems named above; the criterion 9 fixture yields `3` and `1`; the dash scan prints nothing.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - feat(superfix): synthesis.md owns the claim sidecar, the redacted critic input, the no-verdict fold and the capped findings.md
- TDD: none
- Model: opus
- Effort: high
- Covers: criteria #6, #10, #11, #12, #15, #16, #17

### Dependencies
- none - blocks: Task 5, Task 7

### Files
- modify - superfix/skills/code-auditor/references/synthesis.md (sections `## Contents`, `## Detective report schema`, new `## Claim sidecar schema`, `## Critic verdict schema`, `## Deduplicate`, `## Severity`, `## findings.md (final output)`, new `## What the moderator reads`)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `grep -c '^## ' superfix/skills/code-auditor/references/synthesis.md` - expected: `9` (Contents, Detective report schema, Claim sidecar schema, Clean-checkout verification, Critic verdict schema, Deduplicate, Severity, findings.md, What the moderator reads)
- `grep -n 'Further findings\|critic returned no verdict\|## Reproduce\|Severity calibration' superfix/skills/code-auditor/references/synthesis.md` - expected: at least one hit per term
- `! grep -rn $'\u2013\|\u2014' superfix/skills/code-auditor/references/synthesis.md` - expected: no output, exit 0

### Approach
1. Add `## Claim sidecar schema` after the detective report schema: file `.temp/superfix/<run-id>/reports/<rank>-<slug>.claim.md`, body exactly `LOCATION: <same as report>`, `CLASS: <same as report>`, `## Reproduce` with input, command and the observable symptom (exit code, output line, HTTP status, failing test name); an explicit list of what the sidecar never contains (`CONFIDENCE`, `SEVERITY`, `ENTRY`, root cause, fix sketch, any sentence explaining why). A `NO FINDING` report has no sidecar.
2. Rewrite `## Critic verdict schema`'s preamble: the critic receives the sidecar path, `job.md`, the worktree script path and its own worktree path, never the report path; its mandate is to refute; `VERIFIED` only when the reproduction passed despite that attempt. Keep the four verdict lines and the four fold bullets, then add a fifth fold bullet: a critic that returned no `VERDICT:` line (empty output, crash, timeout) is dispatched once more with a fresh worktree; a second miss files the finding as `INCONCLUSIVE` with `CONFIDENCE` lowered one step and the reason `critic returned no verdict`.
3. Rewrite `## Severity`: the bands come first from `job.md`'s `## Repo profile` -> `## Severity calibration`; the four generic bands stay as the defensive fallback used only when `job.md` has no `## Repo profile` section.
4. Rewrite `## findings.md (final output)`: header line adds `P pairs swept`; at most 10 full entries (`## 1.` .. `## 10.`), each with `SEVERITY`, `CONFIDENCE`, `VERDICT`, optional `STATUS: INCONCLUSIVE - <missing oracle | critic returned no verdict>`, `LOCATION`, `CLASS`, root cause, reproduction, fix sketch; band 1-3 never gets a full entry; `## Further findings (N)` with one line per remaining finding `SEVERITY · LOCATION · CLASS · <title> · <report path>`; tie-break at the cap: verdict (`VERIFIED`, `PARTIALLY VERIFIED`, `INCONCLUSIVE`), then higher `CONFIDENCE`, then lower report `<rank>`; `## Coverage notes` keeps its two bullets and gains the optional `repo profile unavailable` line; the file is regenerated from the whole pool after every Phase 6 wave.
5. Add `## What the moderator reads`: ranking is built from critic verdict blocks plus each report's first four lines (`# title`, `LOCATION`, `CLASS`, `SEVERITY`); the full report is opened only for entries that made the cap, only while writing their full entry; no other report section is opened in any phase.
6. Update `## Contents` to list the two new sections.

### Failure modes
- none - reference-only (this task changes prose contracts; every runtime branch it names is tested through the agents and skill that implement it in Tasks 5 and 7)

### Contracts
- Claim sidecar schema (path pattern, three-part body, exclusion list) - consumed by Task 5 (detective writes it, critic reads it) and Task 7 (Phase 4 brief names the sidecar path, Phase 5 hands it to the critic)
- Critic input list and no-verdict retry rule - consumed by Task 5 (critic.md inputs and mandate) and Task 7 (Phase 5 dispatch and retry)
- `findings.md` format: cap 10, `## Further findings (N)` line format, tie-break order, `STATUS: INCONCLUSIVE` line, `repo profile unavailable` coverage line, header with pairs count - consumed by Task 7 (Phase 5 step 2, Phase 6 regeneration, "Output the user sees") and Task 8 (README step 4)
- Severity source order (`## Severity calibration` from `job.md`, generic bands as fallback) - consumed by Task 6 (profiler writes the section) and Task 7 (job.md recipe)
- Moderator read rule - consumed by Task 7 (Phase 5 text)

### DoD
`synthesis.md` carries the nine sections, the sidecar schema, the no-verdict fold, the capped `findings.md` format with tie-break, the severity source order and the moderator read rule; grep checks above hit; the dash scan prints nothing.

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 - feat(superfix): detective writes the claim sidecar, critic refutes from the sidecar alone, both inherit the session model
- TDD: none
- Model: opus
- Effort: high
- Covers: criteria #10, #11, #13

### Dependencies
- Task 4 - blocks: Task 7

### Files
- modify - superfix/agents/detective.md (frontmatter `model`, `effort`; `## Inputs you are given` gains the sidecar output path; `## Method` step 4; `## Hard rules`)
- modify - superfix/agents/critic.md (frontmatter `model`, new `effort`; `## Inputs you are given`; `## Method` steps 1 and 3; `## Output` unchanged; `## Hard rules`)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `grep -n '^model: inherit$' superfix/agents/detective.md superfix/agents/critic.md` - expected: one hit per file
- `grep -n '^effort: high$' superfix/agents/detective.md superfix/agents/critic.md` - expected: one hit per file
- `grep -n '^model: haiku$' superfix/agents/scout.md superfix/agents/edge-scout.md` - expected: one hit per file (unchanged)
- `grep -n 'claim.md' superfix/agents/detective.md superfix/agents/critic.md` - expected: at least one hit per file
- `! grep -n 'report path' superfix/agents/critic.md` - expected: no output (the critic no longer receives the report path)
- `! grep -rn $'\u2013\|\u2014' superfix/agents/` - expected: no output, exit 0

### Approach
1. `detective.md`: set `model: inherit`, keep `effort: high`; add an input bullet for the sidecar path (`<report path>.claim.md`, given by the skill); Method step 4 becomes "write the report at the schema you were given, then write the claim sidecar at the sidecar schema in the same file: only `LOCATION`, `CLASS` and `## Reproduce`"; add hard rules: the sidecar carries no reasoning, no confidence, no severity; a `NO FINDING` report has no sidecar.
2. `critic.md`: set `model: inherit`, add `effort: high`; replace the inputs with: the sidecar path, `job.md`, the worktree script path, the reserved worktree path; Method step 1 becomes "read the sidecar; your task is to refute it: look for a reason the symptom is not a defect (a test fixture, an intended branch, a precondition the sidecar assumes but the code enforces) before and while replaying"; step 3 adds "`VERIFIED` only when the reproduction passed and no refutation held"; add hard rules: never open the detective's report, never search `.temp/superfix/<run-id>/reports/` for it; judge severity from the observed symptom and `job.md`'s `## Repo profile` -> `## Severity calibration` when present.
3. Keep both `## Output` blocks byte-identical to today so `synthesis.md`'s fold rules keep matching.
4. Keep every worktree line (`sh <worktree-script> add|remove ...`, `WORKTREE_FAILED` mapping) unchanged in both files.

### Failure modes
- none - prose-only (the agents' runtime branches, `WORKTREE_FAILED` -> `NO FINDING` / `INCONCLUSIVE`, are unchanged and already documented in both files and `synthesis.md`)

### Contracts
- Detective dispatch brief must now carry a sidecar output path in addition to the report path - consumed by Task 7 (Phase 4)
- Critic dispatch brief: sidecar path, `job.md`, worktree script path, worktree path; no report path - consumed by Task 7 (Phase 5)

### DoD
All grep checks above hold; detective writes report plus sidecar; critic's inputs exclude the report path and its method leads with refutation; scout and edge-scout untouched; the dash scan prints nothing.

<!-- /TASK -->

---

<!-- TASK -->

## Task 6 - feat(superfix): profiler agent writes profile.md from the target repo's memory, tooling and fix history
- TDD: none
- Model: opus
- Effort: high
- Covers: criteria #4, #5, #19

### Dependencies
- none - blocks: Task 7

### Files
- add - superfix/agents/profiler.md (frontmatter `name: profiler`, `model: inherit`, `tools: Read, Write, Grep, Glob, Bash`; sections `## Inputs you are given`, `## Method`, `## Output`, `## Hard rules`)
- modify - superfix/.claude-plugin/plugin.json (`agents[]` gains `./agents/profiler.md` as the first entry, before `./agents/scout.md`)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `node -e "const p=require('./superfix/.claude-plugin/plugin.json'); if(!p.agents.includes('./agents/profiler.md')) process.exit(1)"` - expected: exit 0
- `grep -n '^model: inherit$\|^tools: Read, Write, Grep, Glob, Bash$' superfix/agents/profiler.md` - expected: two hits
- `grep -n '## Bug classes from history\|## Contract shape\|## Critical paths\|## Severity calibration\|no fix history in window' superfix/agents/profiler.md` - expected: at least five hits, every one of the five terms present
- `! grep -rn $'\u2013\|\u2014' superfix/agents/profiler.md superfix/.claude-plugin/plugin.json` - expected: no output, exit 0

### Approach
1. Frontmatter: `name: profiler`, `description: Repo profiler - reads the target repo's memory, tooling and fix history and writes the run's repo profile. Invoked only by the code-auditor skill, never directly.`, `model: inherit`, `tools: Read, Write, Grep, Glob, Bash`.
2. Inputs: `Target root: <path>`, `Window: <days>`, optional `Scope: <dir>`, the `job.md` path of this run (for the job's class of issue), the output path `.temp/superfix/<run-id>/profile.md`.
3. Method: (a) read `CLAUDE.md` files and `.claude/rules/*.md` under the target root, the build and test entry points the memory names (or, absent memory, the manifest and test directories found with Glob); (b) run `git -C <target-root> log --since=<window>d -i --grep=fix --grep=hotfix --grep=revert --stat --format='%h %s' -- <scope or .>` (one `git log` call, `--stat` names the touched files; no other git subcommand); (c) derive bug classes from those commits (grouped by recurring symptom, each with 1-3 example hashes), the producer/consumer contract shape of this stack (how modules reference one another: imports, filenames, routes, config keys), critical paths (files the memory calls core, plus the top fix-touched files), and severity calibration (what a 9-10, 7-8, 4-6, 1-3 finding is in this repo, in one line each); (d) write `profile.md` with exactly the four `##` headings in that order and one preamble line `Already fixed in window: <n> commits` followed by the hash list (the "do not rediscover" list).
4. Output section shows the file skeleton with the four headings and the `no fix history in window` sentence used under `## Bug classes from history` when step (b) returns nothing.
5. Hard rules: Bash runs `git log` only; Write targets the given output path only; never read `.temp/superfix/` outside this run's directory; never read a previous `findings.md`; stay under one page; English.

### Failure modes
- when `git log` returns no commits in the window -> response `## Bug classes from history` contains the single sentence `no fix history in window` and the preamble says `Already fixed in window: 0 commits`, log none (it is content, not an error), test the grep check for the sentence in the agent file (the runtime branch is exercised by the skill, not by a script test)
- when the target has no `CLAUDE.md` and no `.claude/rules/` -> response derive contract shape and critical paths from the manifest and test layout found with Glob and say so in `## Contract shape`, log none, test none - prose-only
- when Write to the output path fails -> response return the profile text in the final message so the skill can retry the dispatch (Task 7 owns the retry), log none, test none - prose-only

### Contracts
- `profile.md` layout: preamble `Already fixed in window: <n> commits` + hashes, then `## Bug classes from history`, `## Contract shape`, `## Critical paths`, `## Severity calibration` in that order - consumed by Task 7 (job.md recipe appends the whole file under `## Repo profile`; Phase 0 checks the four headings before accepting the profile; Phase 6 seeds waves from `## Bug classes from history`) and Task 4's severity source rule
- Profiler brief: `Target root`, `Window`, optional `Scope`, `job.md` path, output path - consumed by Task 7 (Phase 0 dispatch)
- `plugin.json` `agents[]` now lists five agents - consumed by Task 8 (CLAUDE.md and README agent tables)

### DoD
`superfix/agents/profiler.md` exists with the frontmatter and four headings above; `plugin.json` lists it; all grep and node checks pass; the dash scan prints nothing.

<!-- /TASK -->

---

<!-- TASK -->

## Task 7 - feat(superfix): code-auditor takes [<repo-path>] [<area-dir>], profiles the repo, scopes the sweep, redacts the critic and caps findings
- TDD: none
- Model: opus
- Effort: xhigh
- Covers: criteria #1, #4, #6, #12, #18

### Dependencies
- Task 2 - blocks: Task 8
- Task 3 - blocks: Task 8
- Task 4 - blocks: Task 8
- Task 5 - blocks: Task 8
- Task 6 - blocks: Task 8

### Files
- modify - superfix/skills/code-auditor/SKILL.md (frontmatter `argument-hint`; new `## Arguments` section; `## Phase 0 - Frame` steps 1, 4, 5 and new steps 6-7; `## Phase 1 - Sweep` both command blocks and the record description; `## Phase 2 - Score` first paragraph; `## Phase 4 - Dispatch detectives` brief list; `## Phase 5 - Synthesize`; `## Phase 6 - Iterate and open new fronts`; `## Output the user sees`)
- modify - superfix/skills/code-auditor/references/jobs.md (one sentence under `## Choosing and combining`: the profile's `## Bug classes from history` narrows the job's Opportunity signal to this repo's recurring classes)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `grep -n '^argument-hint: "\[<repo-path>\] \[<area-dir>\]"$' superfix/skills/code-auditor/SKILL.md` - expected: one hit
- `grep -n -- '--scope' superfix/skills/code-auditor/SKILL.md` - expected: at least two hits (both Phase 1 commands)
- `grep -n 'superfix:profiler\|## Repo profile\|Scope:\|claim.md\|critic returned no verdict\|Further findings\|repo profile unavailable' superfix/skills/code-auditor/SKILL.md` - expected: at least one hit per term
- `! grep -n 'the report path, `job.md`' superfix/skills/code-auditor/SKILL.md` - expected: no output (old critic brief removed)
- `! grep -rn $'\u2013\|\u2014' superfix/skills/code-auditor/SKILL.md superfix/skills/code-auditor/references/jobs.md` - expected: no output, exit 0

### Approach
1. Frontmatter: add `argument-hint: "[<repo-path>] [<area-dir>]"` (quoted, the two-bracket precedent is `superbiz/skills/idea-validator/SKILL.md`) after `disable-model-invocation: true`. Add `## Arguments` before `## Phase 0`: `$ARGUMENTS` holds zero, one or two whitespace-separated tokens; token 1 is the target repo path, token 2 the area directory; with zero tokens Phase 0 step 1 asks as today; with one token only the repo is set and the job is still confirmed.
2. Phase 0 renumbered to eight steps, in this order: (1) read the tokens and confirm repo and job; (2) resolve the root; (3) validate `<area-dir>` - an absolute path is accepted only when it lies under the resolved root and is rewritten to the root-relative form; a path that does not exist as a directory under the root, or lies outside it, or contains `..`, STOPS the run with `code-auditor: area directory not found under <root>: <value>`; (4) `check_node.sh` with its existing hard stop; (5) create the workspace; (6) write `job.md` with the existing recipe plus `Window: <days>` and `Scope: <dir>` (Scope omitted when unset); (7) dispatch `superfix:profiler` (Agent tool) with the brief from Task 6's contract (`Target root`, `Window`, `Scope` when set, `job.md` path, output path `.temp/superfix/<run-id>/profile.md`) in the same message as the Phase 1 scripts start; (8) profile gate: when the profiler returns, check that `profile.md` exists and carries the four headings `## Bug classes from history`, `## Contract shape`, `## Critical paths`, `## Severity calibration`, then append the whole file to `job.md` under `## Repo profile`; the miss branch is in Failure modes. Nothing that spends tokens or runs a script precedes step 4.
3. Phase 1: both command blocks gain `--scope <area-dir>` as a trailing option, present only when a scope is set; the record description names `dependents_stem`; one sentence: with a scope, records and pairs shrink to the area (pairs keep any partner outside it) while every signal stays repo-wide.
4. Phase 2: first sentence adds "Do not start until `job.md` carries `## Repo profile` or the profile gate has recorded its absence"; scouts' `job.md` is otherwise unchanged.
5. Phase 4: the detective brief gains the sidecar output path `.temp/superfix/<run-id>/reports/<rank>-<slug>.claim.md` and the sentence that an edge partner outside the scope is still a valid entry point.
6. Phase 5 rewritten in three steps: (1) for every report that is not `NO FINDING`, spawn `superfix:critic` with the sidecar path, `job.md`, the worktree-script path and a fresh unique worktree path (`.../worktrees/critic-<rank>-<slug>`), never the report path; (2) a critic whose final message has no `VERDICT:` line is dispatched once more with a fresh worktree path (`.../worktrees/critic-<rank>-<slug>-retry`); after a second miss the finding is folded as `INCONCLUSIVE` with reason `critic returned no verdict`, as `synthesis.md` specifies; (3) rank from verdict blocks plus each report's first four lines only, then write `findings.md` exactly as `synthesis.md` specifies (cap 10, `## Further findings (N)`, tie-break), opening a full report only for an entry that made the cap and only while writing its entry. Keep "synthesis.md is the sole authority" sentence.
7. Phase 6: first bullet adds `## Bug classes from history` in `job.md` as a second seed source for scout waves; last bullet adds "regenerate `findings.md` from the whole pool after every wave; the cap applies to the run".
8. Output the user sees: item 3 names the capped format and the `## Further findings (N)` section; item 4 adds pairs swept and whether the repo profile was available.
9. `jobs.md`: one sentence under `## Choosing and combining` as listed in Files.

### Failure modes
- when `<area-dir>` is missing under the root, outside it, or contains `..` -> response STOP in Phase 0 before any script or agent, log the message `code-auditor: area directory not found under <root>: <value>` to the user, test none - skill prose (the two scripts' own `--scope` validation from Tasks 1 and 2 is the tested backstop)
- when the profiler returns without `profile.md` or the file lacks one of the four headings -> response dispatch the profiler once more with the same brief; after a second miss continue with no `## Repo profile` section in `job.md`, record `repo profile unavailable` for `## Coverage notes`, and tell the user in the Phase 3 hotlist message, log that line in `findings.md`, test the grep for `repo profile unavailable` in SKILL.md (prose)
- when `check_node.sh` returns `NODE_MISSING` -> response the existing hard stop at step 4, before step 7 dispatches the profiler, so no agent is ever paid for on a missing runtime, log as today, test none - ordering rule stated in Approach step 2
- when a critic returns no `VERDICT:` twice -> response fold as `INCONCLUSIVE` with reason `critic returned no verdict` (Task 4 rule), log the reason in the entry's `STATUS` line, test the grep for the phrase in SKILL.md (prose)

### Contracts
- `$ARGUMENTS` grammar `[<repo-path>] [<area-dir>]`, `<area-dir>` validation (exists as a directory under the root, absolute-inside-root rewritten to relative, `..` and outside paths rejected before any spend) - consumed by Task 8 (README quick start and CLAUDE.md)
- `job.md` recipe: signals + rubric + `Target root:` + `Window:` + optional `Scope:` + `## Repo profile` (Task 6 layout verbatim) - consumed by every agent brief in this file; Task 8 documents it
- Critic worktree paths `critic-<rank>-<slug>` and `critic-<rank>-<slug>-retry` under `.temp/superfix/<run-id>/worktrees/` - consumed by Task 8 (CLAUDE.md components bullet names the retry path so a reader knows two critic worktrees per report may exist)

### DoD
All grep checks pass; SKILL.md carries the argument contract, scope validation, profiler dispatch and gate, `--scope` in both Phase 1 commands, the sidecar in the detective brief, the redacted critic brief with the retry rule, the moderator read rule and the capped output description; the dash scan prints nothing.

<!-- /TASK -->

---

<!-- TASK -->

## Task 8 - docs(superfix): catalog and docs describe five agents, scope, sidecar and model inheritance; full suite and dash scan green
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: criteria #14, #19, #20

### Dependencies
- Task 7 - blocks: none

### Files
- modify - superfix/CLAUDE.md (`## Layout` agents line and scripts line; `## Components` `code-auditor` bullet gains a Phase 0 profile sentence and the scope sentence; agents bullet lists `profiler`; new invariant paragraph `**Plugin-specific invariant: the critic never sees the detective's reasoning.**`; new sentence on `model: inherit` for detective and critic and its consequence)
- modify - superfix/README.md (`## Quick start` step 1 shows `/superfix:code-auditor [<repo-path>] [<area-dir>]`, step 4 describes the 10-entry cap and `## Further findings`; a new paragraph after the two-track list: the session model is the detective and critic model, a weaker session model means weaker reproduction; `## Agents` table gains a `profiler` row and the `detective` / `critic` rows mention inherit and the sidecar)
- modify - CLAUDE.md (repo root; the superfix agents parenthetical `superfix's scout / edge-scout / detective / critic live there` gains `profiler`, and the superfix bullet under `## What this repo is` gains one clause on the profile step and the `[<area-dir>]` argument)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `node --test "tests/**/*.test.ts"` - expected: every test file passes, including the new cases from Tasks 1-3
- `grep -n 'profiler' superfix/CLAUDE.md superfix/README.md CLAUDE.md superfix/.claude-plugin/plugin.json` - expected: at least one hit per file
- `grep -n 'inherit' superfix/CLAUDE.md superfix/README.md` - expected: at least one hit per file
- `! grep -rn $'\u2013\|\u2014' superfix CLAUDE.md` - expected: no output, exit 0 (the `×` sign in superfix/CLAUDE.md is not a dash and stays)

### Approach
1. `superfix/CLAUDE.md`: layout line "Five plugin agents: profiler.md (session-model repo profiler, Phase 0) + scout.md ... + detective.md (session-model deep-dive) + critic.md (session-model refuter)"; scripts line notes `--scope` on both sweep scripts and `dependents_stem`'s lockstep literal; components bullet gains the profile sentence (profiler runs alongside the Phase 1 scripts, `job.md` carries `## Repo profile`, Phase 2 waits for it) and the scope sentence (records and pairs shrink to the area, signals stay repo-wide); agents bullet adds `profiler` and rewrites `critic` as "reads only the claim sidecar, mandate to refute, one retry on a missing verdict in its own `-retry` worktree"; new invariant paragraph stating the sidecar rule and why (a verifier that reads the discoverer's reasoning confirms its framing); one sentence that detective, critic and profiler are `model: inherit` so the session model is the reproduction model, weaker session model means weaker verification.
2. `superfix/README.md`: edits as listed in Files, keeping the table shape; agents table row for `profiler`: "Session model, Phase 0: reads the target's memory, tooling and fix history and writes the run's repo profile. One per run."
3. Root `CLAUDE.md`: the two edits listed in Files, nothing else.
4. Run the full suite and the dash scan; fix any dash the scan finds in files this plan touched.

### Failure modes
- none - documentation (the suite run is the verification step, and a red test here is a Task 1-3 defect to fix in place, not a branch of this task)

### Contracts
- none

### DoD
Full suite green under the current shell; every documentation file names the profiler, the argument form, `--scope`, the sidecar and model inheritance; the dash scan over `superfix` and the root `CLAUDE.md` prints nothing.

<!-- /TASK -->
