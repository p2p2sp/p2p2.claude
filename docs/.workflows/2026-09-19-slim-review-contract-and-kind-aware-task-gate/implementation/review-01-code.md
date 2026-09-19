# final review

## Gates
Build - none - the repo ships markdown, JSON and shell sources only; it has no build step at any level
Tests - pass - 2s
Integration - pass - 34s

## Findings

### Important

- I1 - Failure pass contradicts Stays in bounds - superdev/agents/superbuild-task-reviewer.md:58 (against :44) - what is wrong: `## Failure pass` opens with a shared rule that runs on every task - "the diff delivers what the task's `### Approach` names and nothing beyond its `### Files` - a gap either way is a finding" - while `## Check`'s "Stays in bounds" bullet twelve lines above states the opposite tolerance: "only files under the task's `Files` touched (test/config fallout is fine)". The same dispatch applies both, and a test or config file touched outside `### Files` is simultaneously fine and a finding. The shared rule's first half also duplicates `## Check`'s "Meets its target" bullet ("the task's `Approach` delivered"), so the only thing it adds to the file is the conflict - why it matters: every Super-track task passes through this gate, and the two readings pick different verdicts on the single most common legitimate out-of-bounds case, a test or config file that had to move with the change. A gate that can FAIL a task for fallout the same file calls acceptable is non-deterministic against identical input, which is exactly what `Sprawdzenia dobrane do rodzaju pracy` (criterion 4) requires it not to be; the repo has no build and no lint, so nothing else catches it. The task's own implementor recorded it as a `NOTE: plan defect` line in `task-03-notes.md` rather than resolving it - how to fix: give the shared rule the same fallout exception as `## Check`, e.g. "nothing beyond its `### Files` except test/config fallout", and drop its redundant `### Approach` half so it no longer restates `## Check`'s "Meets its target" bullet; alternatively delete the shared rule outright and let `## Check` keep sole ownership of both clauses, since the three variants below it are what the shared rule was added to frame.

## Debt

- M1 - Exclusion pointer not verbatim - superdev/agents/superbuild-task-reviewer.md:38 - `Compress the review contract to its rules alone` (Task 2) `### Contracts` fixes the pointer line every consumer replaces its copy of the exclusion rule with, "verbatim between the quotation marks". `Strip the contract copies from the three build reviewers` (Task 4) wrote it verbatim into all three build reviewers; this file wrote its own sentence instead and carries a clause of the rule with it ("whether or not `## task` lists it"). The owner named is correct, so nothing resolves wrongly - the loss is the single recognisable form and a residual partial copy. Fix: replace line 38 with the verbatim pointer, keeping the drop-before-judging step as a separate half-sentence if it is wanted.
- M2 - Description names dropped axis - superdev/agents/superbuild-reviewer-change.md:3 - the `description:` still advertises the agent as reviewing "separation of concerns, error handling, architecture, testing and production readiness", but `## Review` no longer carries an Architecture axis at all after this build. The agent is single-caller and never routed on its description, so nothing misroutes; the field is simply stale against the body it describes. Same drift reaches `superbuild-task-reviewer.md:83`, which defers "architecture opinions" to "later reviews" that no longer name that axis.
- M3 - Scaffold point names no evidence source - superdev/agents/superbuild-task-reviewer.md:72 - point (f) is Critical and asks whether the output "came from running the generator or tool the task's `### Approach` names", but `## Check`'s "Runs recorded" bullet forbids this gate from running anything and confines `Bash` to the git reads of `## Prerequisites`, so the only provenance evidence it can reach is the notes' `## Runs` section - which (f) does not name. Left as written the point either never fires or fires on inference. Fix: name `## Runs` (and the notes' `touched:` lines) as (f)'s evidence, and say what the absence of `notes` does to the point.

## Notes

NOTE: the three build reviewers' compressed `## Gates` line points at the contract's `## Gates` for "every rule that applies to an entry", but two rules those paragraphs used to carry moved out of that section in the compression - the `since: none` unbounded review now lives in `## Labels` and in the gates bullet of `## Report skeleton`, and the "every other BLOCKED condition comes from a gate command" pointer was dropped. Every reviewer is bound to all three sections and reads the whole file, so nothing is unreachable; the pointer is just no longer exhaustive for its own paragraph.

## Assessment

The compression is faithful - every `kept` row of the inventory is present in the 225-line contract, the twelve headings stand unchanged in name and order, no consumer carries a second copy of the gate-entry or working-directory paragraphs, and the new `Kind:` variants and their two extra readers are recorded in `superdev/agents/CLAUDE.md` - but the per-task gate now states one rule twice in contradicting terms inside a single file.

VERDICT: FAIL
