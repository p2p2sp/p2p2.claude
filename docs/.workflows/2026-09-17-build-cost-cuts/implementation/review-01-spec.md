# final review

## Gates

- Build - none - repo to markdown, JSON i bash; nie ma kroku budowy (root CLAUDE.md: "Editing markdown / JSON IS shipping")
- Tests - pass - 31s
- Integration - pass - 62s

## Coverage

1. `Review none pomija recenzenta` (#1) - met - `superdev/skills/superbuild/SKILL.md:58` (a task whose `<review>` column is `none` logs no `task-reviewer` stats event) and `:108-109` (that state dispatches no reviewer at all and goes straight to step 4/commit on the implementor's `VERDICT: PASS`) - proven by the Integration gate run (node --test "tests/**/*.test.ts", pass, 62s).
2. `Review none przechodzi recenzję planu` (#2) - met - `superdev/references/plan-review-checklist.md:51-54` (B6: `Review:` optional, `none` is one of its two valid readings; every other spelling of the skip - `None`, `skip`, `-`, empty - is B6).
3. `Trzy stany Review udokumentowane` (#3) - met - the three states (absent / `<model> <effort>` / `none`) read token-for-token the same across `superdev/skills/superplan/templates/plan.md:31,33`, `superdev/references/review-contract.md:441-449`, `superdev/README.md:71-75` and root `CLAUDE.md:97-104`.
4. `Kind wymagany` (#4) - met - `superdev/references/plan-review-checklist.md:47-49` (B6: `Kind:` is a required marker, values restricted to `code | scaffold | text`).
5. `Kind zgodny z dowodem` (#5) - met - `superdev/references/plan-review-checklist.md:130-145` (B22's table plus its explicit "a `Kind: text` or `Kind: scaffold` task carrying `TDD: required`" clause).
6. `Kind daje domyślną siłę` (#6) - met - `superdev/skills/superplan/SKILL.md:111` and `superdev/skills/simpleplan/SKILL.md:114` ("A `scaffold` or `text` task defaults to `Model: sonnet` and `Review: none`" / "... simply defaults to `Model: sonnet`", higher strength gated on a stated `### Approach` reason).
7. `Zadanie text w jednym przejściu` (#7) - met, with a wording caveat carried as Minor debt (M1) - `superdev/agents/superbuild-task-implementor.md:37` and `superdev/agents/simplebuild-task-implementor.md:36` ("read only the files under `### Files` and the files `### Approach` names, write no probe and no test, search no other repo file for precedent ... one pass: write, run `### Task Checks`, record notes").
8. `Zadanie scaffold przez narzędzie` (#8) - met - same two files, line 36/35 ("the generated output comes from running the generator or tool named in `### Approach` ... edit the generated files only where `### Approach` names that").
9. `Effort nie jest przekazywany` (#9) - met - `superdev/skills/superbuild/SKILL.md:39-40,58,104,108-110,139-141` and the analogous lines of `superdev/skills/simplebuild/SKILL.md` carry no `effort:` on any dispatch; `superdev/scripts/stats-report.sh:143-147` (`strength()`) renders effort `-` as the bare model, proven by `tests/superdev/stats-report.test.ts` (part of the Tests gate run, pass).
10. `Effort opisany jako frontmatter` (#10) - met - `superdev/references/review-contract.md:434-439` ("The `Agent` tool takes no `effort` parameter ... the agent's frontmatter decides its effort"), `superdev/README.md:64-66` and root `CLAUDE.md:100-104` state the same fact, and neither planner's strength rule (`superplan/SKILL.md:111`, `simpleplan/SKILL.md:114`) branches on `Effort:`.
11. `Zmiana droga do cofnięcia kieruje na recenzenta` (#11) - met - `superdev/skills/superplan/SKILL.md:111` ("a change expensive to undo - concurrency, security, a data migration, a public interface - takes `Model: opus` plus `Review: opus high`").
12. `Jedna postać wywołania` (#12) - met - `superdev/skills/superbuild/SKILL.md:40` and the identical rule in `simplebuild/SKILL.md:40` mandate the single literal form; `grep -c 'bash "${CLAUDE_PLUGIN_ROOT}'` returns `0` for `superbuild/SKILL.md`, `simplebuild/SKILL.md`, `e2e/SKILL.md` and `vibe/SKILL.md` (task-08/09/10/15 notes' own `## Runs`), and the three build reviewers' `run.sh` calls were already direct.
13. `Wzorzec na skrypt` (#13) - met - `git ls-files -s` shows `100755` for all nine runtime scripts (`commit-task.sh`, `decompose.sh`, `cleanup-run.sh`, `stats-record.sh`, `stats-report.sh`, `checkpoint-update.sh`, `record-decision.sh`, `vibe-guard.sh`, `merge-settings.sh`), each with a `#!/usr/bin/env bash` shebang, and every skill that runs one at runtime declares a matching `Bash(${CLAUDE_PLUGIN_ROOT}/.../<name>.sh:*)` pattern in its `allowed-tools` (`superbuild/SKILL.md:6` - 8 patterns, `simplebuild/SKILL.md:6` - 8, `e2e/SKILL.md:7` - 2, `vibe/SKILL.md:6` - 2, the three build reviewers - 1 each for `run.sh`, `setup/SKILL.md:4` - 1 for `merge-settings.sh`).
14. `Niezmiennik obejmuje runtime` (#14) - met - root `CLAUDE.md:83-93` ("Pre-approved bundled-script calls (preload and runtime)") and the same bullet in `superdev/skills/CLAUDE.md` state the runtime rule alongside the preload rule, in the same terms `superbuild`/`simplebuild`/`e2e`/`vibe` now follow.
15. `Scalenie po zgodzie` (#15) - met - `superdev/skills/setup/SKILL.md:23-38` (one `AskUserQuestion`, the exact question/option text the plan's `### Contracts` fixed; Merge dispatches `merge-settings.sh` once and relays its line; Skip touches nothing and reports the declined line); `superdev/skills/setup/scripts/merge-settings.sh` keeps host entries and other keys untouched and appends only missing template entries once each, proven by `tests/superdev/merge-settings.test.ts` ("partial coverage" and "defaultMode" cases, part of the Integration gate run).
16. `Scalenie idempotentne i bezpieczne` (#16) - met - `merge-settings.test.ts` "no settings.json at all" (created from template), "idempotence" (second run byte-identical, reports "already up to date") and "not valid JSON" (left byte-for-byte untouched, exit 2) cases, part of the Integration gate run (pass, 62s).
17. `Brak node zgłoszony` (#17) - met - `merge-settings.sh:63-67` (no `node` on PATH -> one line plus the template body, exit 0) and `merge-settings.test.ts` "no node on PATH" case, part of the Integration gate run; `setup/SKILL.md:31-32` relays that script line verbatim, fail-soft.

## Decisions taken

- fix-01-notes.md - `Kind:` marker position in the ADR task block - placed after `TDD:` to match both plan templates' marker order, over the fix's literal "next to `Effort:`" text.
- task-03-notes.md - precedence of B22's table over a `### Task Checks` section whose lines match more than one row - rows are read top down, first match settles the kind (a test-file line wins over a build command, the same precedence B16/B17 already give a test-file line).
- task-04-notes.md - `Effort:` default for a `scaffold`/`text` task in superplan - left governed by the pre-existing general low/medium/high/xhigh reasoning paragraph rather than inventing a new per-`Kind:` default.
- task-05-notes.md - `Effort:` default for a `scaffold`/`text` task in simpleplan - same call as superplan's analogous case.
- task-06-notes.md - sub-bullet vs. trailing prose for the "no `Kind:` marker" sentence and the two Failure modes entries - written as sub-bullets under "Kind discipline", matching the neighboring "TDD discipline" bullet's existing style.
- task-06-notes.md - Failure modes' "według istniejącej reguły split" wording - written "per the notes step's split rule" instead of a directional pointer, since the split-rule bullet sits after, not before, the insertion point in both files.
- task-12-notes.md - "already up to date" detection - computed semantically (nothing appended, no `defaultMode` set, no list/permissions normalization) rather than by comparing serialized bytes.
- task-12-notes.md - `defaultMode` already equal to the template's value - reported with the same `defaultMode already <x> (left untouched)` clause as a differing one, rather than a separate line shape.
- task-12-notes.md - `permissions` present but not an object - treated as absent and replaced with a fresh object, the same as the non-array `allow`/`deny` case.
- task-12-notes.md - target JSON whose top-level value is not an object (`[]`, `"x"`, `3`) - reported as `settings.json: not valid JSON - left untouched (top-level value is not an object)`, exit 2, reusing the documented line.
- task-12-notes.md - target that exists but cannot be read (EACCES) - one new line `settings.json: unreadable - left untouched (<message>)`, exit 2.
- task-12-notes.md - wrong argument count (none, or more than two) - usage on stderr and exit 1, the `record-decision.sh` shape.
- task-12-notes.md - V8 folding a JSON snippet with newlines into some parse-error messages - every interpolated message is flattened (`\s+` -> single space) so the one-line stdout contract holds.

## Debt

- M1 - `Kind: text precedent-search wording brushes past required Input reads` - `superdev/agents/superbuild-task-implementor.md:37`, `superdev/agents/simplebuild-task-implementor.md:36` - the `Kind: text` sub-bullet reads "read only the files under `### Files` and the files `### Approach` names ... (no `Grep`, no `Read` outside that set)", which taken literally conflicts with `## Input`'s mandatory reads of `plan-header`, `refs` and `decisions`. The restriction's own clause names its subject ("for precedent"), so the likely reading is that `## Input`'s labels are always read and the ban is on searching other repo files for precedent - but the wording does not say so explicitly. Already raised as Minor debt by the checkpoint-02 code review (its M3) with a matching `NOTE: plan defect` (Task 6 `### Approach` step 2 is the source wording); carried here as this dimension's own Minor since criterion #7 maps directly to this text. Fix: scope the parenthetical to the precedent search and say the `## Input` labels are always read.

## Assessment

Every acceptance criterion is satisfied by code and tests already in the tree, the Tests and Integration gates are both green with no skips proving a criterion, and the one Minor found is a wording ambiguity that does not change observable behavior.

VERDICT: PASS
