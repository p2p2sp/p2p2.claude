# re-review

## Gates

- Build - none - repo to markdown, JSON i bash; nie ma kroku budowy (root CLAUDE.md: "Editing markdown / JSON IS shipping")
- Tests - pass - 29s
- Integration - pass - 61s

## Coverage

1. `Review none pomija recenzenta` (#1) - met - `superdev/skills/superbuild/SKILL.md:58,108-109` (unchanged by this delta) - proven by the Integration gate run (pass, 61s).
2. `Review none przechodzi recenzję planu` (#2) - met - `superdev/references/plan-review-checklist.md:51-54` (unchanged).
3. `Trzy stany Review udokumentowane` (#3) - met - `superdev/skills/superplan/templates/plan.md:31,33`, `superdev/references/review-contract.md:441-449`, `superdev/README.md:71-75`, root `CLAUDE.md:97-104` (unchanged).
4. `Kind wymagany` (#4) - met - `superdev/references/plan-review-checklist.md:47-49` (unchanged).
5. `Kind zgodny z dowodem` (#5) - met - `superdev/references/plan-review-checklist.md:130-145` (unchanged).
6. `Kind daje domyślną siłę` (#6) - met - `superdev/skills/superplan/SKILL.md:111`, `superdev/skills/simpleplan/SKILL.md:114` (unchanged).
7. `Zadanie text w jednym przejściu` (#7) - met, with the wording caveat carried as Minor debt (M1) - `superdev/agents/superbuild-task-implementor.md:37`, `superdev/agents/simplebuild-task-implementor.md:36` (both byte-unchanged by this delta; the `Kind: scaffold` bullet above and the BLOCKED clause below were the only lines touched).
8. `Zadanie scaffold przez narzędzie` (#8) - **not met** - `superdev/agents/superbuild-task-implementor.md:36`, `superdev/agents/simplebuild-task-implementor.md:36`, `superdev/references/adr-task.md:22-25` - see `I1`.
9. `Effort nie jest przekazywany` (#9) - met - `superdev/skills/superbuild/SKILL.md:39-40,58,104,108-110,139-141` and the analogous `simplebuild/SKILL.md` lines (unchanged); `superdev/scripts/stats-report.sh:143-147` (`strength()`), proven by `tests/superdev/stats-report.test.ts` (part of this round's Tests gate, pass).
10. `Effort opisany jako frontmatter` (#10) - met - `superdev/references/review-contract.md:434-439`, `superdev/README.md:64-66`, root `CLAUDE.md:100-104` (unchanged).
11. `Zmiana droga do cofnięcia kieruje na recenzenta` (#11) - met - `superdev/skills/superplan/SKILL.md:111` (unchanged).
12. `Jedna postać wywołania` (#12) - met - `superdev/skills/superbuild/SKILL.md:40`, `simplebuild/SKILL.md:40` (unchanged); this delta touches no skill file.
13. `Wzorzec na skrypt` (#13) - met - `git ls-files -s` still shows `100755` for all nine runtime scripts with a `#!/usr/bin/env bash` shebang; this delta touches no script or `allowed-tools` block.
14. `Niezmiennik obejmuje runtime` (#14) - met - root `CLAUDE.md:83-93`, `superdev/skills/CLAUDE.md` (unchanged).
15. `Scalenie po zgodzie` (#15) - met - `superdev/skills/setup/SKILL.md:23-38`, `superdev/skills/setup/scripts/merge-settings.sh` (unchanged), proven by `tests/superdev/merge-settings.test.ts` (part of this round's Integration gate, pass).
16. `Scalenie idempotentne i bezpieczne` (#16) - met - `tests/superdev/merge-settings.test.ts` cases (unchanged), part of this round's Integration gate (pass, 61s).
17. `Brak node zgłoszony` (#17) - met - `merge-settings.sh:63-67`, `setup/SKILL.md:31-32` (unchanged).

## Prior findings

| ID | Title | Verdict | Evidence |
| --- | --- | --- | --- |
| M1 | `Kind: text precedent-search wording brushes past required Input reads` | NOT ADDRESSED | superdev/agents/superbuild-task-implementor.md:37 |

M1 is Minor and its two files are outside this delta - line 37 (superbuild) / 36 (simplebuild) is byte-unchanged; the fix touched the scaffold bullet and the BLOCKED clause instead.

## Decisions taken

- fix-01-notes.md - `Kind:` marker position in the ADR task block - placed after `TDD:` to match both plan templates' marker order, over the fix's literal "next to `Effort:`" text.
- fix-02-notes.md - wording of the verbatim-output clause - both implementors carry it byte-identical, as their `Kind` block already was; the diff of the two files' `Kind` lines is empty.
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

## Findings

### Important

- I1 - `Scaffold discipline now permits hand-written output` - superdev/agents/superbuild-task-implementor.md:36, superdev/agents/simplebuild-task-implementor.md:36, superdev/references/adr-task.md:22-25 - the fix that closes `review-01-code`'s I3 rewrote the `Kind: scaffold` sub-bullet in both task implementors: "where `### Approach` names a generator or tool, it comes from running that ... where `### Approach` carries the output verbatim instead, it is written exactly as given." Criterion 8 requires scaffold output to come from "uruchomieniem nazwanego generatora lub narzędzia" (running the named generator or tool), and Task 6's own `### Approach` text (the plan line this bullet implements) says that output is produced "nigdy przez ręczne pisanie tego, co ono produkuje" (never by hand-writing what it produces) - the shipped text now explicitly authorizes exactly that hand-writing path for any `scaffold` task whose `### Approach` carries its content inline, and `adr-task.md`'s new Fill rules bullet (`:22-25`) confirms the shipped ADR task block (`Kind: scaffold`, `### Approach` step 2 a literal `Write` of fenced content) is meant to use it. - why it matters: a `scaffold` task defaults to `Model: sonnet` and `Review: none` (criterion 6), so the one guarantee criterion 8 gave - that scaffold output either came from a tool or got a per-task reviewer - no longer holds for a `scaffold` task whose author writes the content directly in `### Approach`; the safety net the `Kind` axis was built to preserve is now optional to keep, for any future scaffold task, not only the ADR template. - how to fix: either narrow the carve-out so criterion 8's tool-or-nothing guarantee still holds (e.g. gate the verbatim path on carrying its own `Review: <model> <effort>`), or treat the widening as an intentional spec change - amend criterion 8's own text and record the departure through `scripts/record-decision.sh` so it is plan text instead of an unrecorded deviation.

## Assessment

The fix that closes `review-01-code`'s I3 introduces a new Important (I1): it widens the `Kind: scaffold` discipline in both task implementors to permit hand-written verbatim output, directly contradicting Task 6's own "never hand-write" `### Approach` text and acceptance criterion 8's tool-or-nothing guarantee. Both gate subsections are green and the one open prior Minor (M1) is unaddressed but untouched by this delta, which does not by itself fail the round - the new Important does.

VERDICT: FAIL
