## Output Format

Reviewed against `git diff --name-status 62fb87fa5aedbe1fc3f4c8dc54b04da32cc883d2..HEAD`. All 11 changed
runtime/doc files map cleanly onto the plan's 8 tasks (plus 1 new file, `superfix/agents/critic.md`). All
8 `task-XX-notes.md` files say "no deviations". Every test command specified in the plan (Tasks 1-8, all
criteria) was re-executed independently in this review, not just re-read - on macOS system awk and Node
native type-stripping, matching the plan's target environment.

### Strengths
- `collect_signals.sh`: the ENVIRON hand-off for `kept_exts` (`KEPT_EXTS="$kept_exts" awk '... ENVIRON["KEPT_EXTS"] ...'`)
  correctly sidesteps the BSD-awk `-v`-with-newline crash, and I confirmed it end-to-end against a live
  café.py / 日本語.md fixture and against the real `p2p2.claude` repo (270 JSONL lines, exit 0, `sweep
  extensions: gitattributes gitignore json md sh ts txt yml`).
- Both `git ls-files` call sites (pass 1 extension harvest, pass 2 candidate list) carry `-c
  core.quotePath=false`, so the stderr coverage line and the swept set agree on quoted-path files - verified
  both non-ASCII filenames appear in the JSONL and in the stderr line.
- Per-file probe guarding in Task 2 is done right: each of `churn`/`fix_commits`/`last_ct`/`loc` is wrapped
  in its own `if ! x="$(...)"` with a named `continue`, so one unreadable file (`chmod 000`) produces exactly
  one warning and the sweep still completes for the rest - confirmed live.
  Unborn-HEAD detection (`git rev-parse --verify -q HEAD`) fires before any output is emitted - confirmed
  exit 1, empty stdout, one stderr line.
- The dotfile stem fallback (`[ -n "$stem" ] || stem="$base"`) correctly turns `.gitignore`'s would-be-empty
  stem into `.gitignore` itself rather than matching every tracked file - confirmed `dependents: 0`, not `3`,
  against a 3-sibling fixture.
- `rank.ts`: `quadrant()` now takes independent `minImpact`/`minOpportunity`; I confirmed both directions
  live (`--min-impact 5 --min-opportunity 3` drops both 4-impact files; `--min-impact 2 --min-opportunity 3`
  drops the opportunity-2 file) and that the tie-break regression (score-desc, impact-desc, churn-desc) and
  the `already-fine` quadrant label are unchanged.
- The three-way `hotspots`/`overflow`/`skipped` partition is correct and exhaustive: ran a 26-row fixture
  (25 gate-clearing) through `--top 20` and got `counts: {scored:26, hotspots:20, overflow:5, skipped:1}`
  with the full 25-path union present - nothing silently dropped, unlike the pre-fix `--top`. The
  scores/signals join-miss warning (`warn: no signals row for sub/a.ts`) fires correctly on a synthetic path
  drift.
- `agents/scout.md`: `tools:` is now `Read, Grep, Glob` (no Write, no Bash); the byte-identical path-echo
  rule is stated in the output section; the "no prose" rule is the last line of `## Hard rules`; the
  "appends your line" phrasing is gone, replaced with an explicit "write nothing" instruction.
- `agents/detective.md` / `references/synthesis.md`: the clean-checkout recipe (the `git worktree add/remove`
  block plus both recovery bullets) is byte-identical between the two files - diffed directly, confirmed. I
  reproduced the "already exists" git error live (`git worktree add` twice against the same path) and it
  matches the documented recovery text exactly. `Edit` is removed from `tools:`; the "never write inside the
  target tree" hard rule is present.
- `agents/critic.md` is a clean new agent: `name/model/tools` match the plan exactly (`opus`;
  `Read, Grep, Glob, Bash`), it is listed in `agents[]` and absent from `skills[]` (confirmed via a
  JSON-parsing check), and `references/synthesis.md` documents all four verdict values with a fold-in table
  for `findings.md`. Both `superfix/CLAUDE.md` and root `CLAUDE.md` were updated to name three agents.
- `SKILL.md`: Phase 0 now records an absolute target root in `job.md`; Phase 2 hands the scout the raw
  signal line as the sole path source; Phase 3's command block carries `--run-id`/`--job` (confirmed the
  generated `hotlist.md` title picks up a real run id instead of the `# HOTLIST - run` fallback); Phase 4
  resolves the hotspot path against the recorded root before dispatch and supplies a per-detective
  verification-worktree path; Phase 5 dispatches `superfix:critic` and the stale "verify-only mode" wording
  is gone (`grep -rn 'verify-only' superfix/` returns nothing).
- `scoring.md`'s `Hotlist schema` section documents `counts` (with the sum invariant), the `overflow`
  bucket, `min_impact`/`min_opportunity` in place of `threshold`, the 50-row skipped-table cap, and 1..5
  clamping - I diffed the documented key set against a live `rank.ts` JSON output key-by-key and they match
  exactly (empty symmetric difference).
- Extra edge case I checked beyond the plan's own list: a repo of only extensionless files (`Makefile`,
  a shebang script, no dotted names) produces `sweep extensions: ` (empty) without the awk filter degrading
  to match-nothing or match-everything - both files still swept, exit 0. This confirms Task 1's "empty
  kept_exts" edge case, which the plan calls out but has no explicit Test Command for.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
- `superfix/skills/code-auditor/references/scoring.md:31` - the `## The combine formula` section still reads
  "Quadrant (the 2×2), using a threshold T (default 3): `impact >= T AND opportunity >= T` -> HOTSPOT ...",
  i.e. one shared threshold for both axes. This directly contradicts the file's own `## Hotlist schema`
  section 44 lines later ("`min_impact` and `min_opportunity` are the two independent gates ... there is no
  single `threshold` scalar") and contradicts what `rank.ts` actually does post-Task-3 (independently settable
  minimums, e.g. `--min-impact 5 --min-opportunity 3`). A reader who stops at the combine-formula section -
  the first and more prominent explanation of the gate logic in this file - comes away with the pre-fix
  mental model. This is not an implementor deviation: Task 8's `Files`/`Approach` explicitly scoped the edit
  to `## Hotlist schema (hotlist.json)` and `## Tie-breaking & caps` only, and the implementor followed that
  scope exactly (notes say "no deviations", correctly). It is a **plan gap** - criterion #13 asked to
  document "the two independent minimums" without scoping which section, and the task's approach happened to
  leave the older section stale. Fix: reword `## The combine formula`'s quadrant bullets to use `min_impact`
  T_i / `min_opportunity` T_o (or otherwise drop the shared-T framing) in a follow-up docs task.

#### Minor (Nice to Have)
- `superfix/skills/code-auditor/references/scoring.md:52-57` - the worked JSON example in `## Hotlist schema`
  hardcodes `"top": 20` and `counts.hotspots: 18` alongside `overflow: 2`, `skipped: 22`, which sums to 42 -
  correct arithmetic, but the reader has to do that check themselves since the invariant sentence sits a
  paragraph below the example rather than beside it. Cosmetic only; the invariant is still stated correctly
  in prose immediately after.

### Recommendations
- Land a small follow-up to reconcile `## The combine formula` in `scoring.md` with the independent-minimums
  model now that Task 3/8 have shipped it everywhere else - low risk, docs-only, but leaves the file
  internally consistent for the next reader.
- No code changes recommended beyond that; the shipped fixes were re-verified against live commands rather
  than re-read, and all matched the plan's stated behavior, including several edge cases (empty `kept_exts`,
  dotfile stem fallback, stale-worktree recovery, join-miss warning, 26-row overflow split) exercised with
  fresh fixtures independent of the implementor's own (already-removed) scratch artifacts.

### Assessment

**Ready to merge?** Yes

**Reasoning:** All 13 acceptance criteria are met and independently re-verified by execution (not
re-reading), the change set maps 1:1 onto the plan's tasks with no unrecorded deviations, and the sole
finding is a pre-existing documentation section that the plan itself scoped out of Task 8's edit - a
plan gap, not an implementation defect, and not release-blocking for a docs-only inconsistency in a
reference file.
