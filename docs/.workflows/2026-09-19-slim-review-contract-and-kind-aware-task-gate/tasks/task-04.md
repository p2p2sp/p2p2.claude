
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


### Covered criteria
2. Jedna reguła, jedno miejsce - Każda reguła słownika review istnieje w dokładnie jednym miejscu w całym pluginie i żaden recenzent nie nosi jej drugiej kopii.
3. Bez dodatkowej pracy na dispatch - Żaden dispatch review nie czyta więcej plików, nie uruchamia więcej komend ani nie wykonuje więcej kroków niż przed zmianą.
7. Żadne sprawdzenie nie żąda zakazanego narzędzia - Żaden krok recenzji nie wymaga dowodu z narzędzia, którego autorowi tego zadania zabroniono.
