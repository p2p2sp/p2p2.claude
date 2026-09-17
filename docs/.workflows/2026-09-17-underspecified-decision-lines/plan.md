# SuperPlan
To build this plan use the `superbuild` skill.

Title: "Implementor decision lines: UNDERSPECIFIED with a recommendation, DECISION as a hard stop, reviewers and planner closing the gap"
Spec: docs/.workflows/2026-09-17-underspecified-decision-lines/spec.md
Intent: docs/.workflows/2026-09-17-underspecified-decision-lines/intent.md
Plan: C:\Users\dariu\.claude-p2p2\plans\compressed-roaming-kazoo.md

## Gate commands

#### Build
- none - the plan moves markdown and one bash script; nothing compiles

#### Tests
- node --test "tests/**/*.test.ts"

#### Integration
- none - the repo has no integration suite

---

<!-- TASK -->

## Task 1 - Define the two decision lines, the implementor stop and the final decisions listing in the review contract
- TDD: none
- Model: opus
- Effort: high
- Covers: `Wartość z rekomendacją nie zatrzymuje` (#1), `Sprawa bez odpowiedzi zatrzymuje` (#2), `Zatrzymanie nazywa sprawę` (#3), `Naprawa jak zadanie` (#8), `Spis decyzji na koniec` (#12)

### Dependencies
- none

### Files
- modify - superdev/references/review-contract.md (`## Finding IDs`, `## Report skeleton`, `## Decisions file`, `## Notes line formats`, `## Implementor fix-mode input`, new `## Implementor stop`)

### Task Checks
- grep -n "DECISION:" superdev/references/review-contract.md
- grep -n "## Decisions taken" superdev/references/review-contract.md
- grep -n "## Implementor stop" superdev/references/review-contract.md

### Approach
1. In `## Notes line formats`, replace the `UNDERSPECIFIED:` bullet with two bullets and the split rule above them: `UNDERSPECIFIED: <value> - <the decision made>` is a value the task, its `### Contracts`, its `### Failure modes` and the plan header left open and for which the implementor had a defensible answer (an existing pattern in the repo, a covered criterion, a host convention) and used it; `DECISION: <what> - <why it cannot be settled here> - <options seen, or none>` is a matter the implementor cannot settle (a contradiction with a decisions-file line, the spec, another plan section, or a criterion unmeetable without changing a recorded decision), carrying an ID `D<n>` unique for the life of the build - `<n>` continues from the highest `D<n>` in the `decisions` file handed in, or starts at 1 when no such file or line exists - and written together with a `VERDICT: BLOCKED` return. State the rule in one sentence: a recommendation exists -> use it and write `UNDERSPECIFIED:`; none exists -> write `DECISION:` and stop. Rewrite the fix-mode paragraph: fix-mode notes are the `## Runs` section, one status line per ID, one `touched:` line per file, plus `UNDERSPECIFIED:` and `DECISION:` lines under the same two rules when a report left a value open or two findings contradict each other.
2. Add a `## Implementor stop` section after `## Implementor fix-mode input`: the implementor's third return shape, line 1 `VERDICT: BLOCKED`, line 2 `REASON: <the first DECISION line's <what>>`, with every `DECISION:` line written to `notes` before returning; the stop is raised before any file is edited when the matter is visible from the task text, and a matter found mid-work leaves the working tree as it stands; the orchestrator asks the user one question per `DECISION:` line, records each answer through `scripts/record-decision.sh` with `<id>` = `D<n>`, `<subject>` = `` `<task title>` (Task <N>) `` (or `` `<fix title>` (fix <NN>) `` in fix mode) and `<accepted-text>` = the answer, and re-dispatches the same implementor call with a `decisions:` line added; a `decisions` file handed to an implementor is plan text, and a `DECISION:` whose matter a line there already answers is never raised again.
3. In `## Finding IDs`, add `D<n>` as the ID class of an implementor stop, unique for the life of the build (continuing from the highest `D<n>` in the decisions file, or 1), never renumbered, reused by the decisions-file line and the orchestrator's question.
4. In `## Report skeleton`, add `## Decisions taken` between `## Prior findings` and `## Findings`: written at `stage: final` and at the re-review of a final report only, by the reviewer that owns requirement coverage on its track (`superbuild-reviewer-spec` on Super, `simplebuild-reviewer` on Simple), one line per `UNDERSPECIFIED:` line found across every `*-notes.md` of the notes directory, shaped `- <notes file basename> - <value> - <decision>`, informational, never affecting the verdict, omitted when no such line exists. Rewrite the closing sentence so it names two owned sections: the spec reviewer's `## Coverage` and the final reviewer's `## Decisions taken`.
5. In `## Decisions file`, extend the first sentence so a line is also written for every answer the user gives at an implementor stop, in the same shape, `<ID>` being `D<n>`.

### Failure modes
- none - reference text

### Contracts
- Line shape `UNDERSPECIFIED: <value> - <the decision made>` with the recommendation rule - consumed by `Split the two lines and the stop in both task implementors` (Task 2), `Judge every implementor decision at the per-task gate` (Task 5), `List the run's decisions at the final review and judge them on the Simple track` (Task 6), `Name the two decision lines as delivered behaviour for qa-writer` (Task 7)
- Line shape `DECISION: <what> - <why it cannot be settled here> - <options seen, or none>`, ID `D<n>` per notes file - consumed by `Split the two lines and the stop in both task implementors` (Task 2), `Handle the implementor stop in both orchestrators` (Task 3), `Judge every implementor decision at the per-task gate` (Task 5), `Count DECISION lines in the stats report` (Task 8)
- Implementor return shape `VERDICT: BLOCKED` + `REASON: <first DECISION what>` and the orchestrator protocol (question per line, `record-decision.sh <workdir> "D<n>" "<subject>" "<answer>"`, re-dispatch with `decisions:`) - consumed by `Split the two lines and the stop in both task implementors` (Task 2), `Handle the implementor stop in both orchestrators` (Task 3)
- Report section `## Decisions taken`, final stage and its re-review only, line shape `- <notes file basename> - <value> - <decision>` - consumed by `List the run's decisions at the final review and judge them on the Simple track` (Task 6)
- Fix-mode notes = `## Runs` + status lines + `touched:` lines + the two decision lines when they arise - consumed by `Split the two lines and the stop in both task implementors` (Task 2)

### DoD
The contract defines both line shapes, the `D<n>` ID class, the implementor stop protocol, the `## Decisions taken` section and the extended fix-mode notes; every later task cites these sections instead of restating them.

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - Split the two lines and the stop in both task implementors
- TDD: none
- Model: opus
- Effort: high
- Covers: `Wartość z rekomendacją nie zatrzymuje` (#1), `Sprawa bez odpowiedzi zatrzymuje` (#2), `Zatrzymanie nazywa sprawę` (#3), `Ścieżka Simple równa Super` (#7), `Naprawa jak zadanie` (#8)

### Dependencies
- `Define the two decision lines, the implementor stop and the final decisions listing in the review contract` (Task 1) - blocks: the line shapes, the `D<n>` ID and the return shape this task writes into the agents

### Files
- modify - superdev/agents/superbuild-task-implementor.md (`## Input`, `## 1. Implement`, `## 3. Record notes`, `## Output format`)
- modify - superdev/agents/simplebuild-task-implementor.md (`## Input`, `## 1. Implement`, `## 4. Record notes`, `## Output format`)

### Task Checks
- grep -n "DECISION:" superdev/agents/superbuild-task-implementor.md
- grep -n "DECISION:" superdev/agents/simplebuild-task-implementor.md
- grep -n "VERDICT: BLOCKED" superdev/agents/superbuild-task-implementor.md superdev/agents/simplebuild-task-implementor.md

### Approach
1. In both agents' `## Input`, add an optional `decisions` label: a path to the run's decisions file; every line in it is plan text, a matter a line there answers is settled, never raised as a `DECISION:` again, and a new `DECISION:` takes the next `D<n>` after the highest one found there (1 when the label is absent or holds no `D<n>` line).
2. In both agents' `## 1. Implement`, add one bullet on the stop: before editing any file, read the task against `## plan-header`, `## decisions` (when given) and the task's own sections; a matter the implementor cannot settle by the contract's `## Notes line formats` rule -> write its `DECISION:` lines to `notes` and return per `## Output format` without editing; a matter found mid-work -> stop at that point, leave the working tree as it stands, write the lines and return the same way.
3. In both agents' notes step, replace the `UNDERSPECIFIED:` bullet (superbuild) or add it (simplebuild) with the two bullets from the contract's `## Notes line formats`, the split rule in one sentence, and rewrite the fix-mode paragraph to the contract's extended shape; keep the simplebuild step number (`4`) and the superbuild step number (`3`).
4. In both agents' `## Output format`, add the third shape: line 1 `VERDICT: BLOCKED`, line 2 `REASON: <the first DECISION line's <what>>`, notes already written.

### Failure modes
- when `notes` is unset and a stop is raised -> response: `VERDICT: FAIL` with `REASON: DECISION needs a notes path - <what>`, log: none, test: none - agent prose (the orchestrators always pass `notes:`, so the branch guards a direct invocation only)

### Contracts
- Implementor label `decisions` (optional, path) - consumed by `Handle the implementor stop in both orchestrators` (Task 3)
- Both implementors write the two decision lines in the contract's shapes and return `VERDICT: BLOCKED` per the contract's `## Implementor stop` - consumed by `Handle the implementor stop in both orchestrators` (Task 3), `Judge every implementor decision at the per-task gate` (Task 5)

### DoD
Both agent files carry the split rule, both line shapes, the `decisions` input, the stop-before-edit bullet, the extended fix-mode notes and the `VERDICT: BLOCKED` return; the two notes steps read identically apart from their step numbers.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - Handle the implementor stop in both orchestrators
- TDD: none
- Model: opus
- Effort: high
- Covers: `Sprawa bez odpowiedzi zatrzymuje` (#2), `Odpowiedź wiąże resztę biegu` (#4), `Zatrzymane zadanie idzie dalej` (#5), `Przerwanie kończy bieg` (#6), `Ścieżka Simple równa Super` (#7), `Naprawa jak zadanie` (#8)

### Dependencies
- `Define the two decision lines, the implementor stop and the final decisions listing in the review contract` (Task 1) - blocks: the protocol this task writes into the loops
- `Split the two lines and the stop in both task implementors` (Task 2) - blocks: the `decisions` label and the return shape the loops branch on

### Files
- modify - superdev/skills/superbuild/SKILL.md (`### Loop` step 2 and step 3 FAIL branch, `### Fix loop` step 1, `## Mandatory rules` escalation bullet)
- modify - superdev/skills/simplebuild/SKILL.md (`### Loop` step 2, `### Fix loop` step 1, `## Mandatory rules` escalation bullet)

### Task Checks
- grep -n "VERDICT: BLOCKED" superdev/skills/superbuild/SKILL.md
- grep -n "VERDICT: BLOCKED" superdev/skills/simplebuild/SKILL.md
- grep -c "record-decision.sh" superdev/skills/superbuild/SKILL.md

### Approach
1. In both `### Loop` step 2 (the implementor dispatch), add the branch `VERDICT: BLOCKED` + `REASON: <line>`: read every `DECISION:` line off `notes`; one `AskUserQuestion` per line, naming the task `` `<title>` (Task NN) `` and quoting the line's `<what>` and `<options>`, with the options **answer** (free text) / **abort**; per answer run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/record-decision.sh" <workdir> "D<n>" "`<title>` (Task NN)" "<the answer>"`; then re-dispatch the same implementor call with the same labels plus `decisions: <workdir>/implementation/decisions.md`; abort ends the loop exactly as today's abort. The re-dispatch is neither a review round nor a fix round; a second BLOCKED from the re-dispatched task is a new matter and takes this same branch again.
2. In superbuild's step 3 FAIL branch (the fix after a task review) and in both `### Fix loop` step 1, add the same `VERDICT: BLOCKED` branch with `<subject>` `` `<fix title>` (fix <NN>) `` for a fix dispatch, the re-dispatch carrying `decisions:` alongside the labels it already had.
3. Every implementor dispatch anywhere in both skills passes `decisions: <workdir>/implementation/decisions.md` when that file exists, the same condition the reviewer dispatches already use.
4. In both `## Mandatory rules`, extend the escalation bullet so an implementor `BLOCKED` is recorded as kind `escalation`, label the task or fix in reference form, note the `DECISION:` `<what>` and the user's answer.
5. Keep the `no report` interruption rule intact: an implementor `VERDICT: BLOCKED` whose `notes` file holds no `DECISION:` line is the no-report state and takes that rule (retry / abort), never this branch.

### Failure modes
- when the implementor returns `VERDICT: BLOCKED` and `notes` holds no `DECISION:` line -> response: the existing `no report` interruption (`AskUserQuestion` retry / abort), log: the escalation stats event with note `BLOCKED without DECISION line`, test: none - orchestrator prose
- when `record-decision.sh` exits non-zero -> response: `AskUserQuestion` (retry the script / abort), no re-dispatch until it succeeds, log: the escalation stats event, test: none - orchestrator prose

### Contracts
- Orchestrator question shape for a stop: task or fix in reference form, the `DECISION:` `<what>` and `<options>`, options **answer** / **abort** - consumed by `Document the decision lines and the implementor stop` (Task 9)

### DoD
Both orchestrators branch on an implementor `VERDICT: BLOCKED` in the task loop and in every fix dispatch, ask once per `DECISION:` line, record through `record-decision.sh` with a `D<n>` ID, re-dispatch with `decisions:`, and treat abort as today's abort.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - Set the planner rules that keep endpoint contracts, user-visible text, mid-operation failures and whole-repository commands where they belong
- TDD: none
- Model: opus
- Effort: high
- Covers: `Nowy endpoint ma kontrakt` (#15), `Tekst dla użytkownika ma właściciela` (#16), `Awaria w połowie operacji ma decyzję` (#17), `Cały projekt tylko w bramce końcowej` (#18)

### Dependencies
- none

### Files
- modify - superdev/references/plan-review-checklist.md (`## Evidence rule` range, `## Blocking classes` B18-B21, `## Advisory (NOTES)` range, `## Author self-check`)
- modify - superdev/skills/superplan/SKILL.md (**Gate commands** bullets, the `Then write each task's sections so the checklist's Blocking classes B9-B14 have nothing to flag:` list, **Task Checks** `narrowest scope` criterion, `### Self-Review` range)
- modify - superdev/skills/simpleplan/SKILL.md (the same four places)
- modify - superdev/skills/superplan-reviewer/SKILL.md (the `FINDINGS - Blocking only` bucket line's `B1-B17` range)
- modify - superdev/skills/simpleplan-reviewer/SKILL.md (the same bucket line)
- modify - superdev/skills/superplan/templates/plan.md (`## Gate commands`, `### Failure modes` and `### Contracts` placeholders)
- modify - superdev/skills/simpleplan/templates/plan.md (the same placeholders)

### Task Checks
- grep -n "B18\|B19\|B20\|B21" superdev/references/plan-review-checklist.md
- grep -n "B9-B14 and B18-B21" superdev/skills/superplan/SKILL.md superdev/skills/simpleplan/SKILL.md
- grep -n "B1-B21" superdev/skills/superplan-reviewer/SKILL.md superdev/skills/simpleplan-reviewer/SKILL.md superdev/references/plan-review-checklist.md
- grep -c "copy:" superdev/skills/superplan/templates/plan.md
- grep -n "whole repository" superdev/skills/superplan/SKILL.md superdev/skills/simpleplan/SKILL.md

### Approach
1. In the checklist, append four Blocking classes after B17: B18 `New endpoint with no contract` - a task whose `### Approach` adds an HTTP endpoint, route or handler and whose `### Contracts` carries no request shape, response shape and status codes for it; settled by reading `### Approach` against `### Contracts`. B19 `User-visible text with no owner` - a task whose `### Approach` or `### Files` produces text a person reads (a message, a screen, an error message, a text resource) and neither carries that text nor a `copy: implementor, after <existing key or file>` line under `### Contracts`; settled by reading those three sections. B20 `Mid-operation failure with no decision` - a task whose `### Approach` has a step made of a persisted write followed by an outside action (a send, a call, a job hand-off) and whose `### Failure modes` has no bullet for a failure between the two; settled by reading `### Approach` against `### Failure modes`. B21 `Whole-repository command outside the final gate` - a `#### Build` or `#### Tests` line, or a `### Task Checks` line, that builds or tests the whole repository, solution or workspace while the host's runner and memory files offer a narrower scope (one project, one path, one suite) covering what the plan moves; a whole-repository build or full suite belongs under `#### Integration` alone, which runs at the final review and its re-review only; settled by reading the command against the host's memory files and the plan's `### Files`. Add the four to `## Author self-check` as one bullet each.
2. In both plan skills, retitle the list to `B9-B14 and B18-B21` and append three bullets in the skills' own bullet style: the endpoint contract bullet, the user-visible text bullet naming the `copy: implementor, after <existing key or file>` delegation line, and the mid-operation failure bullet naming the `### Failure modes` shape.
3. In both plan skills' **Gate commands** paragraph, add one bullet after `Take the narrowest scope that still proves the change`: `#### Build` and `#### Tests` run at every checkpoint, so they never carry a whole repository, solution or workspace command when a narrower scope exists - a full build or full suite, when its result is worth having at all, goes under `#### Integration`, the final review's own gate; and in the **Task Checks** paragraph add one sentence to the `narrowest scope` criterion: a command that builds or tests the whole repository never appears here, whatever the task moves.
4. In both templates, extend the `### Contracts` placeholder with the endpoint contract and the `copy:` delegation line, the `### Failure modes` placeholder with the mid-operation failure between a write and an outside action, and the `## Gate commands` placeholder with the sentence that `#### Build` and `#### Tests` carry the narrowest proving scope and a whole-repository command belongs under `#### Integration` only.
5. Widen every hardcoded Blocking range from `B1-B17` to `B1-B21`: the checklist's `## Evidence rule` sentence and its `## Advisory (NOTES)` opening sentence (`Everything real but not in B1-B17`), both plan reviewers' `FINDINGS - Blocking only` bucket line, and both plan skills' `### Self-Review` sentence (`B1-B17 plus ## Author self-check`).

### Failure modes
- none - reference and skill text

### Contracts
- Checklist classes B18, B19, B20, B21 with their titles, filed under FINDINGS by both plan reviewers - consumed by `Judge every implementor decision at the per-task gate` (Task 5)
- Delegation line `copy: implementor, after <existing key or file>` under `### Contracts` - consumed by `Judge every implementor decision at the per-task gate` (Task 5)

### DoD
Both plan skills, both templates, the checklist's Blocking classes and its self-check carry the four rules under the same class IDs and the same delegation line; a whole-repository build or test command is Blocking outside `#### Integration`.

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 - Judge every implementor decision at the per-task gate
- TDD: none
- Model: opus
- Effort: medium
- Covers: `Ustalona wartość nie jest decyzją` (#9), `Zła decyzja jest znaleziskiem` (#10), `Decyzja należąca do planu jest zastrzeżeniem` (#11)

### Dependencies
- `Define the two decision lines, the implementor stop and the final decisions listing in the review contract` (Task 1) - blocks: the line shapes this gate reads
- `Set the planner rules that keep endpoint contracts, user-visible text, mid-operation failures and whole-repository commands where they belong` (Task 4) - blocks: the checklist classes B18-B20 step (c) cites

### Files
- modify - superdev/agents/superbuild-task-reviewer.md (`## Input` notes bullet, `## Check`, `## Calibration`)

### Task Checks
- grep -n "UNDERSPECIFIED:" superdev/agents/superbuild-task-reviewer.md
- grep -n "DECISION:" superdev/agents/superbuild-task-reviewer.md

### Approach
1. In `## Input`, extend the `notes` bullet so it names `UNDERSPECIFIED:` and `DECISION:` lines beside `## Runs` and `CARRY:`, pointing at the contract's `## Notes line formats`.
2. In `## Check`, add the bullet `Decisions judged (when notes is set)` after `Notes honest`, with three ordered steps per `UNDERSPECIFIED:` line: (a) the value is pinned in the task text, its `### Contracts`, its `### Failure modes` or the plan header -> the line is a deviation from the plan, Important; (b) the value was open, and the decision departs from the pattern the repo already uses for that kind of value or from a criterion under `Covered criteria` -> Important, the `how to fix` naming the pattern or criterion the decision must follow; (c) the value was open and the decision holds, but the value is one the planning rules require the plan to carry (a new endpoint's request, response and status codes; user-visible text; the outcome of an infrastructure failure mid-operation - the checklist classes B18, B19, B20) -> one `NOTE: plan defect - <value> left to the implementor` line, never a finding. A `DECISION:` line in the notes of a task under review -> Important: the implementor was to stop, not to continue.
3. In `## Calibration`, add one sentence: an `UNDERSPECIFIED:` line that passes (a) and (b) is a decision the diff is judged against, like a `### Failure modes` entry.

### Failure modes
- none - agent prose

### Contracts
- none

### DoD
The per-task reviewer's `## Check` carries the three-step judgment with severities, the `DECISION:`-in-closed-task rule, and the notes input names both lines.

<!-- /TASK -->

---

<!-- TASK -->

## Task 6 - List the run's decisions at the final review and judge them on the Simple track
- TDD: none
- Model: opus
- Effort: medium
- Covers: `Ustalona wartość nie jest decyzją` (#9), `Zła decyzja jest znaleziskiem` (#10), `Decyzja należąca do planu jest zastrzeżeniem` (#11), `Spis decyzji na koniec` (#12), `Ścieżka Simple równa Super` (#7)

### Dependencies
- `Define the two decision lines, the implementor stop and the final decisions listing in the review contract` (Task 1) - blocks: the `## Decisions taken` section shape
- `Judge every implementor decision at the per-task gate` (Task 5) - blocks: the three-step judgment mirrored here for the Simple track

### Files
- modify - superdev/skills/superbuild-reviewer-spec/SKILL.md (`Notes dir:` paragraph, `## Report`)
- modify - superdev/skills/simplebuild-reviewer/SKILL.md (`Notes dir:` paragraph, `## Calibration` paragraphs, `## Report`)

### Task Checks
- grep -n "Decisions taken" superdev/skills/superbuild-reviewer-spec/SKILL.md
- grep -n "Decisions taken" superdev/skills/simplebuild-reviewer/SKILL.md
- grep -n "UNDERSPECIFIED:" superdev/skills/simplebuild-reviewer/SKILL.md

### Approach
1. In `superbuild-reviewer-spec`'s `## Report`, extend the owned-sections sentence: at `Stage` `final`, and at `re-review` when `Prior report` is a final report, also write `## Decisions taken` per the contract's `## Report skeleton`, one line per `UNDERSPECIFIED:` line across the notes directory; at `checkpoint` never.
2. In `superbuild-reviewer-spec`'s `Notes dir:` paragraph, name the two decision lines and say an `UNDERSPECIFIED:` line is a decision the code is judged against, and a `DECISION:` line in a closed task's notes is an Important finding.
3. In `simplebuild-reviewer`, add the same `## Decisions taken` rule to `## Report` (this track's final report is `review-NN.md`), and add to `## Calibration`, next to the duplicate-pair scan paragraph, the three-step judgment of Task 5 step 2 verbatim in mandate, applied to every `UNDERSPECIFIED:` line in the notes of tasks inside `git diff <since>..HEAD` - the Simple track has no per-task gate, so this round is where (a), (b) and (c) run - with (c) written as a `NOTE: plan defect` line in this report.
4. Leave the existing duplicate-pair scan in both `simplebuild-reviewer` and `superbuild-reviewer-change` unchanged.

### Failure modes
- none - fork prose

### Contracts
- none

### DoD
The Super final spec review and the Simple final review write `## Decisions taken` on final and its re-review only; the Simple checkpoint and final rounds judge `UNDERSPECIFIED:` lines by the same three steps as the Super per-task gate.

<!-- /TASK -->

---

<!-- TASK -->

## Task 7 - Name the two decision lines as delivered behaviour for qa-writer
- TDD: none
- Model: sonnet
- Effort: low
- Covers: `Zapis dla testera zna decyzje` (#13)

### Dependencies
- `Define the two decision lines, the implementor stop and the final decisions listing in the review contract` (Task 1) - blocks: the line names this bullet cites

### Files
- modify - superdev/agents/qa-writer.md (`Workdir:` and `Notes dir:` paragraphs in `## Input`)

### Task Checks
- grep -n "UNDERSPECIFIED:" superdev/agents/qa-writer.md
- grep -n "decisions.md" superdev/agents/qa-writer.md

### Approach
1. Extend the `Notes dir:` paragraph: a note records a deviation as a deviation line, an `UNDERSPECIFIED: <value> - <decision>` line, or a `DECISION:` line answered in the decisions file; in each case the delivered behaviour a scenario describes is the recorded decision or the user's recorded answer, never the plan's wording, for the acceptance document and the handoff file alike.
2. Extend the `Workdir:` paragraph: Read `<workdir>/implementation/decisions.md` when it exists - every line there is the user's own answer and outranks the plan's wording and the notes alike; absent, nothing is read and nothing is an error. No new prompt label: the dispatch lines in both orchestrators stay as they are.

### Failure modes
- none - agent prose

### Contracts
- none

### DoD
qa-writer names both lines and reads the decisions file off its workdir as sources of delivered behaviour for both artifacts it writes.

<!-- /TASK -->

---

<!-- TASK -->

## Task 8 - Count DECISION lines in the stats report
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: `Statystyki liczą oba rodzaje` (#14)

### Dependencies
- `Define the two decision lines, the implementor stop and the final decisions listing in the review contract` (Task 1) - blocks: the `DECISION:` prefix the counter matches

### Files
- modify - superdev/scripts/stats-report.sh (header comment `ANOMALIES:` paragraph, awk counters, table header and `printf`)
- modify - tests/superdev/stats-report.test.ts (the two Anomalies-table tests)

### Task Checks
- tests/superdev/stats-report.test.ts - node --test tests/superdev/stats-report.test.ts

### Approach
1. In the awk block, add `/^(- )?DECISION:/ { decision[task]++ }` beside the `UNDERSPECIFIED:` counter, include `decision[task]` in the all-zero `continue` test, add the column `DECISION` right after `UNDERSPECIFIED` in the header line and the separator line, and add the matching `%d` and `decision[task] + 0` to the `printf`.
2. Update the header comment's `ANOMALIES:` paragraph to list `"DECISION:"` among the counted prefixes.
3. In the test file, add one `DECISION: the retry cap - two findings contradict each other - none` line to `task-01-notes.md` in the counters test and update both expected tables to the seven-column shape (`| task-01 | 1 | 1 | 1 | 2 | 1 | 1 |` and `| fix-01 | 0 | 0 | 0 | 1 | 0 | 0 |`).

### Failure modes
- none - additive counter, existing all-zero row rule unchanged

### Contracts
- Anomalies table header `| Task | UNDERSPECIFIED | DECISION | CARRY | touched | NOTE: plan defect | Extra review rounds |` - consumed by `Document the decision lines and the implementor stop` (Task 9)

### DoD
The test file passes with the seven-column table; a notes file carrying a `DECISION:` line yields a non-zero `DECISION` cell.

<!-- /TASK -->

---

<!-- TASK -->

## Task 9 - Document the decision lines and the implementor stop
- TDD: none
- Model: sonnet
- Effort: low
- Covers: `Sprawa bez odpowiedzi zatrzymuje` (#2), `Spis decyzji na koniec` (#12)

### Dependencies
- `Handle the implementor stop in both orchestrators` (Task 3) - blocks: the protocol the documentation describes
- `List the run's decisions at the final review and judge them on the Simple track` (Task 6) - blocks: the section the documentation names
- `Count DECISION lines in the stats report` (Task 8) - blocks: the table column the documentation names

### Files
- modify - superdev/hooks/content/manifest.md (`## Build chain`)
- modify - superdev/README.md (item 5 and item 6 of the numbered flow)
- modify - CLAUDE.md (the superdev bullet's build-chain sentences, `## Cross-plugin architecture invariants` self-documentation paragraph on the implementors)

### Task Checks
- grep -n "DECISION" superdev/hooks/content/manifest.md
- grep -n "DECISION" superdev/README.md
- grep -n "DECISION" CLAUDE.md

### Approach
1. In the manifest's `## Build chain`, rewrite the `VERDICT: BLOCKED` bullet: BLOCKED comes from a build reviewer on a criterion unmet by a recorded decision and from a task implementor on a `DECISION:` it cannot settle; in both cases the user answers once and the answer binds the rest of the build.
2. In `superdev/README.md`, add to item 5 the split between `UNDERSPECIFIED:` (a value the implementor settled by an existing pattern, judged at the per-task gate and listed at the final review under `## Decisions taken`) and `DECISION:` (a hard stop answered by the user through `decisions.md`), and to item 6 the `## Decisions taken` section of the final report, the whole-repository rule for `#### Build` / `#### Tests` versus `#### Integration`, and the stats table's `DECISION` column.
3. In root `CLAUDE.md`, extend the superdev bullet's review-chain sentences with the same facts in one or two sentences, and the implementors' paragraph under self-documentation with the `VERDICT: BLOCKED` return and the `decisions:` label.

### Failure modes
- none - documentation

### Contracts
- none

### DoD
Manifest, README and root CLAUDE.md describe the two lines, the implementor stop, the `## Decisions taken` section, the whole-repository gate rule and the `DECISION` stats column consistently with Tasks 1-8.

<!-- /TASK -->
