# SuperPlan
To build this plan use the `superbuild` skill.

Title: "Odchudzenie kontraktu review i brama per task świadoma rodzaju zadania"
Spec: docs/.workflows/2026-09-19-slim-review-contract-and-kind-aware-task-gate/spec.md
Intent: docs/.workflows/2026-09-19-slim-review-contract-and-kind-aware-task-gate/intent.md
Plan: /Users/dario/.claude-dario/plans/staged-yawning-starfish.md

## Gate commands

#### Build
- none - the repo ships markdown, JSON and shell sources only; it has no build step at any level

#### Tests
- node --test tests/orphan-tags.test.ts
- awk 'END { if (NR > 230) exit 1 }' superdev/references/review-contract.md

#### Integration
- node --test "tests/**/*.test.ts"

---

<!-- TASK -->

## Task 1 - Inventory every rule the review contract carries today
- TDD: none
- Kind: text
- Model: opus
- Covers: `Każda reguła rozliczona` (#9)

### Dependencies
none - this task reads the pre-change contract, which every later task then rewrites

### Files
- add - docs/misc/review-contract-rule-inventory.md

### Task Checks
- grep -n 'kept' docs/misc/review-contract-rule-inventory.md
- grep -n 'dropped' docs/misc/review-contract-rule-inventory.md

### Approach
1. `Model: opus` because this task decides, rule by rule, what the compression may drop from the single owner of the build review loop's vocabulary, and `Compress the review contract to its rules alone` (Task 2) executes that classification without re-deciding it.
2. Read `superdev/references/review-contract.md` end to end and enumerate every rule it carries, walking its twelve `## ` sections in file order. A rule is one obligation a consumer must apply; the prose around it is not a rule.
3. Write `docs/misc/review-contract-rule-inventory.md` with a `## <section>` heading per contract section and one bullet per rule under it, each bullet in the row shape of `### Contracts`. Classify each rule `kept`, `moved -> superdev/CLAUDE.md` or `dropped`, and give every `dropped` and every `moved` row its one-sentence reason.
4. Classify as `dropped` the three content classes the spec names: a mechanism rationale that states why a rule was adopted, a dead or retired rule, and a repetition of a rule the same file already states elsewhere. Name the retired `base:` and `runner:` label paragraph and the pre-contract report handling of `## Finding IDs` as `dropped` rows. Classify the `## Naming` legacy fallback as `kept` - `plan-review-checklist.md` B15 and both planning skills cite it.
5. Classify a row `moved` only when it carries rationale worth keeping for a human editor and no obligation at all. An obligation a consumer applies at runtime is always `kept` or `dropped`, never `moved`: the root `CLAUDE.md` states this repo's `CLAUDE.md` files are never plugin inputs and never read at runtime.
6. Open the file with one sentence placing it beside the repo's other working notes in `docs/misc/` as a record of this compression, read by a human editor and by no dispatch.

### Failure modes
- when a rule cannot be classified because two sections state it in conflicting terms -> response record both as one row classified `kept` with the conflict named in the reason, log that row in `docs/misc/review-contract-rule-inventory.md`, test none - dev-time record

### Contracts
- inventory row shape - `- <rule, one clause> - kept | moved -> <destination> | dropped - <reason>`, one bullet per rule under a `## <section>` heading naming its contract section - consumed by `Compress the review contract to its rules alone` (Task 2)
- allowed `moved` destination - `superdev/CLAUDE.md` alone, and only for rationale carrying no obligation; no rule moves to a script header, to another reference or to any agent body under this plan - consumed by `Compress the review contract to its rules alone` (Task 2)

### DoD
`docs/misc/review-contract-rule-inventory.md` carries one row per rule of today's `review-contract.md`, grouped by its twelve sections, each row classified `kept`, `moved -> superdev/CLAUDE.md` or `dropped`, and every `dropped` and `moved` row carrying its reason.

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - Compress the review contract to its rules alone
- TDD: none
- Kind: text
- Model: opus
- Review: opus
- Covers: `Kontrakt skrócony` (#1), `Reguły bez historii` (#8)

### Dependencies
- `Inventory every rule the review contract carries today` (Task 1) - blocks: the classification this task executes is written there and is not re-decided here

### Files
- modify - superdev/references/review-contract.md (the opening preamble and all twelve `## ` sections)
- modify - docs/misc/review-contract-rule-inventory.md
- modify - superdev/CLAUDE.md (`## Contracts & invariants`)

### Task Checks
- grep -n 'Rules only' superdev/references/review-contract.md
- grep -n 'build bookkeeping' superdev/references/review-contract.md

### Approach
1. `Model: opus` and `Review: opus` because this file is the public interface twelve consumers are written against, and a rule lost here fails silently - the repo has no build and no lint to catch it. Invoke `supercc:skill-designer` (Skill tool) first: `.claude/rules/_common.md` binds every edit to an agent-facing instruction file to its rules.
2. Rewrite `superdev/references/review-contract.md` section by section, executing `docs/misc/review-contract-rule-inventory.md` row by row: a `kept` row survives as its rule alone, a `moved` row leaves the file and lands in `superdev/CLAUDE.md` `## Contracts & invariants`, a `dropped` row leaves the file. Keep every rule's own wording where it is already rule-shaped; state it in one clause where it is buried in prose.
3. Keep all twelve `## ` headings verbatim and in their present order, and keep the token `### Needs decision` spelled exactly as it stands wherever the file names that report sub-heading - out-of-scope skills, agents and references cite both by name.
4. Add the working-directory exclusion rule to `## Verdict rules` in the shape of `### Contracts`, so the four copies the reviewers carry today have an owner to point at, and widen the per-task subset paragraph of the opening preamble in the same edit: that gate binds `## Verdict rules` for the exclusion rule as well as for the one BLOCKED condition it names today.
5. Open the file with the line `Rules only: no rationale, no history - the reason a rule exists belongs in CLAUDE.md.` under the title, so the next editor holds the file's own discipline.
6. Reconcile `docs/misc/review-contract-rule-inventory.md` in this same edit wherever the execution departed from a row's classification, rewriting that row's verdict and its reason.

### Failure modes
- when a rule the inventory marks `kept` has no place left in the compressed file within its 230-line bound -> response the rule stays in the file and its row is reclassified in the same edit, log the reclassified row in `docs/misc/review-contract-rule-inventory.md`, test none - contract prose
- when a `moved` row's rationale duplicates a line `superdev/CLAUDE.md` already carries -> response drop the rationale instead of appending it and reclassify that row `dropped`, log the reclassified row in `docs/misc/review-contract-rule-inventory.md`, test none - contract prose

### Contracts
- twelve `## ` section headings of `review-contract.md`, unchanged in name and order: `## Labels`, `## Naming`, `## Finding IDs`, `## Report skeleton`, `## Gates`, `## Verdict rules`, `## Per-task gate`, `## Decisions file`, `## Notes line formats`, `## Implementor fix-mode input`, `## Implementor stop`, `## Dispatch strength` - consumed by `Give the per-task gate a Kind-aware failure pass` (Task 3), `Strip the contract copies from the three build reviewers` (Task 4)
- working-directory exclusion rule, owned by `## Verdict rules` - everything under the run's own working directory (`docs/.workflows/<run>/`, its `implementation/` subdirectory included) is build bookkeeping written by the build's own workers, so it is never part of a task's diff, never scope creep, never a changed file mapping to no task's `### Files` and never a finding of any severity, whether or not a plan task lists it - consumed by `Give the per-task gate a Kind-aware failure pass` (Task 3), `Strip the contract copies from the three build reviewers` (Task 4)
- the one pointer line every consumer replaces its own copy of that rule with, verbatim between the quotation marks and with `## Verdict rules` as a backticked span: "The contract's ## Verdict rules owns the working-directory exclusion." - consumed by `Give the per-task gate a Kind-aware failure pass` (Task 3), `Strip the contract copies from the three build reviewers` (Task 4)

### DoD
`superdev/references/review-contract.md` is at most 230 lines, carries its twelve section headings unchanged, states no reason why a rule was adopted, owns the working-directory exclusion rule under `## Verdict rules`, and its preamble names that section for the per-task gate too; every rationale a `moved` row names stands in `superdev/CLAUDE.md` `## Contracts & invariants`; and every row of `docs/misc/review-contract-rule-inventory.md` matches what the two files now hold.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - Give the per-task gate a Kind-aware failure pass
- TDD: none
- Kind: text
- Model: opus
- Review: opus
- Covers: `Sprawdzenia dobrane do rodzaju pracy` (#4), `Rozjazd w prozie złapany` (#5), `Wygenerowany output sprawdzony u źródła` (#6), `Żadne sprawdzenie nie żąda zakazanego narzędzia` (#7), `Bez dodatkowej pracy na dispatch` (#3), `Jedna reguła, jedno miejsce` (#2)

### Dependencies
- `Compress the review contract to its rules alone` (Task 2) - blocks: the exclusion rule this task points at must already have its owner in the contract

### Files
- modify - superdev/agents/superbuild-task-reviewer.md (`## Scope`, `## Check`, `## Failure pass`, `## Calibration`, `## Output format`)
- modify - superdev/agents/CLAUDE.md (the `superbuild-task-reviewer.md` entry point)

### Task Checks
- grep -n 'Kind: text' superdev/agents/superbuild-task-reviewer.md
- grep -n 'Kind: scaffold' superdev/agents/superbuild-task-reviewer.md

### Approach
1. `Model: opus` because this task authors the three variants' targets from scratch - what can actually be broken in prose and in generated output has no precedent in the file it replaces. Invoke `supercc:skill-designer` (Skill tool) first: `.claude/rules/_common.md` binds every edit to an agent body to its rules.
2. In `## Failure pass`, replace the five-point list with one shared rule plus three variants selected deterministically from the `Kind:` marker of the `task:` file, per `### Contracts`. Shared rule: the diff delivers what the task's `### Approach` names and nothing beyond its `### Files`. `code` variant: today's five points (a)-(e) and their severity mapping, unchanged. `scaffold` variant: the output came from running the generator or tool `### Approach` names, or is the verbatim output `### Approach` carries, and was not edited by hand afterwards. `text` variant: the three targets of `### Contracts`.
3. Anchor the `text` variant in the files the task itself names - its `### Contracts`, the file its `### Approach` points at, and a contract file the diff cites that one of those two already names - and nowhere else, so the variant demands no read the `text` implementor was denied and reaches a strict subset of what today's repo-wide pass reaches.
4. In `## Check`, narrow the repo-wide `Grep` mandate of step (b) under "Decisions judged" to `Kind: code` and `Kind: scaffold`; on `Kind: text` that step is settled from the files the task names alone.
5. In `## Scope`, replace the "One exclusion" paragraph with the pointer line of Task 2's `### Contracts`. Then compress the file's three remaining restatements of contract rules to a pointer plus the action they add: the `## Check` bullet restating the `## Per-task gate` BLOCKED condition, the `## Calibration` paragraph restating the `### Failure modes`-is-a-decision and `NOTE: plan defect` rules, and the `## Output format` bullets restating `## Report skeleton` detail. Each keeps the step this gate takes and loses the rule's own text.
6. Update the `superbuild-task-reviewer.md` entry point of `superdev/agents/CLAUDE.md` in this same edit: the `Kind:` marker now sets the reviewer's failure pass as well as the implementor's discipline.

### Failure modes
- when the `task:` file carries no `Kind:` marker - a pre-axis plan task, or a findings-list task in fix mode -> response run the `code` variant, log nothing, test none - agent prose
- when the `task:` file carries a `Kind:` value outside `code | scaffold | text` -> response run the `code` variant, log one `NOTE: Kind: <value> unknown - reviewed as code` line wherever this round writes its notes, test none - agent prose

### Contracts
- variant selection - the `Kind:` marker of the `task:` file, one of `code | scaffold | text`, read off the marker line the reviewer already holds; exactly one variant runs per dispatch, so no dispatch gains a file read, a command or a step. The set is not extended here; its consumers stay `superdev/agents/superbuild-task-implementor.md`, `superdev/agents/simplebuild-task-implementor.md`, `superdev/references/plan-review-checklist.md` (B22) and the plan template of `superdev/skills/superplan`
- `text` variant targets - the diff's claims agree with the file it cites; the diff introduces no term that file does not define; the diff does not state a rule that already has an owner elsewhere. Severity: a claim contradicting the cited file is Critical, the other two are Important
- `scaffold` variant targets - the output came from running the generator or tool the task's `### Approach` names, or is the verbatim output that `### Approach` carries; nothing in it was hand-edited outside what `### Approach` names. Severity: both Critical

### DoD
`superbuild-task-reviewer.md` selects one of three failure-pass variants from the task's `Kind:` marker, its `text` variant reads only the files the task names, no step of `## Check` or `## Failure pass` demands a repo-wide `Grep` on a `Kind: text` task, it restates no rule the contract owns - the working-directory exclusion, the per-task BLOCKED condition, the `### Failure modes`-is-a-decision rule and the report skeleton are all pointers now - and `superdev/agents/CLAUDE.md` records the marker's second reader.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - Strip the contract copies from the three build reviewers
- TDD: none
- Kind: text
- Model: opus
- Covers: `Jedna reguła, jedno miejsce` (#2), `Bez dodatkowej pracy na dispatch` (#3), `Żadne sprawdzenie nie żąda zakazanego narzędzia` (#7)

### Dependencies
- `Compress the review contract to its rules alone` (Task 2) - blocks: the rules removed here must already have their owner in the contract

### Files
- modify - superdev/agents/superbuild-reviewer-change.md (`## Gates`, `## Scope`, `## Review`)
- modify - superdev/agents/superbuild-reviewer-spec.md (`## Gates`, `## Review`)
- modify - superdev/agents/simplebuild-reviewer.md (`## Gates`, `## Scope`, `## Review`, `## Calibration`)
- modify - superdev/agents/CLAUDE.md (the `simplebuild-reviewer.md` entry point)

### Task Checks
- grep -n 'where the changed file is of that nature' superdev/agents/superbuild-reviewer-change.md
- grep -n 'where the changed file is of that nature' superdev/agents/simplebuild-reviewer.md
- grep -n 'owns the working-directory exclusion' superdev/agents/superbuild-reviewer-spec.md

### Approach
1. `Model: opus` because step 3 decides, bullet by bullet, which of a review axis's obligations the model already holds and which is this repo's own - a judgement the file it edits gives no precedent for. Invoke `supercc:skill-designer` (Skill tool) first: `.claude/rules/_common.md` binds every edit to an agent body to its rules. Then, in each of the three files, replace the `## Gates` body - the paragraph restating which outcome yields BLOCKED, the paragraph restating the `COMMAND:`/`TIMEOUT:`/`RESULT:` entry handling, and, in `superbuild-reviewer-spec.md` alone, the paragraph restating what an all-`none` block means - with one line: read the block handed on `gates` before any code and record one line per subsection in the report, the contract's `## Gates` owning every rule that applies to an entry. Each file's closing per-track concurrency paragraph survives unchanged: it states what that one track does, which the contract does not.
2. In each file, replace the "One exclusion, at every stage" paragraph with the pointer line of Task 2's `### Contracts`. `superbuild-reviewer-spec.md` carries that paragraph under `## Review`, the other two under `## Scope`.
3. In `superbuild-reviewer-change.md` and `simplebuild-reviewer.md` only, trim the four review-axis blocks - `## Review`'s code quality, architecture, testing and production readiness bullets - to what is not general engineering knowledge: the repo-specific and contract-specific obligations. Drop the enumerations the model already holds. `superbuild-reviewer-spec.md` carries no such block and is not touched here.
4. Add this line verbatim to the `## Review` section of those same two files: `Every axis above binds where the changed file is of that nature; a change to prose is judged on whether it agrees with what it declares, never on error handling.` `superbuild-reviewer-spec.md` judges criteria rather than code axes, so it gets no such line.
5. In `simplebuild-reviewer.md` `## Calibration`, condition step (b) of the `UNDERSPECIFIED:` ladder - the only genuinely repo-wide `Grep` mandate there - on the judged task's `Kind:` being `code` or `scaffold`; on a `Kind: text` task it is settled from the files that task names, because `superdev/agents/CLAUDE.md` denies a `text` implementor any repo-wide precedent search. The repeated-pattern sweep above it is already scoped to the changed files and keeps that scope untouched. This track has no per-task gate, so the narrowing has to land here.
6. Record that narrowing in the `simplebuild-reviewer.md` entry point of `superdev/agents/CLAUDE.md` in this same edit: the `Kind:` marker is read by this reviewer too, not by the implementors and the per-task gate alone.

### Failure modes
- when the task step 5 judges carries no `Kind:` marker, or one outside `code | scaffold | text` -> response treat it as `code` and run the mandate, matching the precedent `superdev/agents/CLAUDE.md` already declares for a pre-axis plan, log nothing, test none - agent prose

### Contracts
none

### DoD
None of the three build reviewers restates a gate outcome, an entry-handling rule or the working-directory exclusion; each points at `review-contract.md` for them, the two that carry code axes carry the axis-scope line, `simplebuild-reviewer.md` demands no repo-wide `Grep` on a `Kind: text` task, and each still reads exactly one contract file per dispatch.

<!-- /TASK -->

---
