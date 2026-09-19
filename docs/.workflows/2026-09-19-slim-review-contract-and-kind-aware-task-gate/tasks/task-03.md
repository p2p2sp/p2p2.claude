
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


### Covered criteria
4. Sprawdzenia dobrane do rodzaju pracy - Recenzja zadania uruchamia sprawdzenia, które mogą wystrzelić na tym, co zadanie dostarczyło, a to samo zadanie dostaje ten sam zestaw w każdym biegu.
5. Rozjazd w prozie złapany - Zadanie dostarczające prozę jest flagowane, gdy jego tekst przeczy plikowi, na który się powołuje, wprowadza słownictwo, którego ten plik nie definiuje, albo powtarza regułę mającą już swoje miejsce.
6. Wygenerowany output sprawdzony u źródła - Zadanie dostarczające wygenerowany output jest flagowane, gdy output nie powstał z uruchomienia narzędzia, które zadanie nazywa, albo został po wygenerowaniu zmieniony ręcznie.
7. Żadne sprawdzenie nie żąda zakazanego narzędzia - Żaden krok recenzji nie wymaga dowodu z narzędzia, którego autorowi tego zadania zabroniono.
3. Bez dodatkowej pracy na dispatch - Żaden dispatch review nie czyta więcej plików, nie uruchamia więcej komend ani nie wykonuje więcej kroków niż przed zmianą.
2. Jedna reguła, jedno miejsce - Każda reguła słownika review istnieje w dokładnie jednym miejscu w całym pluginie i żaden recenzent nie nosi jej drugiej kopii.
