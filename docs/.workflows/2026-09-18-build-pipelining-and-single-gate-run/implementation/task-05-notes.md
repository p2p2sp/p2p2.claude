## Runs
- grep -n 'run no gate command' superdev/agents/superbuild-reviewer-change.md -> exit 0 - line 31
- grep -n 'run no gate command' superdev/agents/superbuild-reviewer-spec.md -> exit 0 - line 31
- grep -n 'run no gate command' superdev/agents/simplebuild-reviewer.md -> exit 0 - line 31
- grep -n 'gates:' superdev/agents/CLAUDE.md superdev/README.md -> exit 0 - CLAUDE.md:81, README.md:187,208,209

Step 3: the missing-entry failure mode is worded as a hole in the round's input rather than as a gate-command outcome, so none of the three `## Gates` sections contradicts the contract's claim to own every gate-command BLOCKED condition in full.

Step 3 also re-sourced the second paragraph of `superbuild-reviewer-spec.md` `## Gates` (the all-`none` case) from the plan's block to the handed block; step 3 names the first paragraph alone, but that paragraph was the section's other reader of the plan's `## Gate commands` block as a source of results.

`superbuild-reviewer-spec.md:75` ("running the gates", `## Calibration`) left as it stands - outside the four sections this task's `### Files` line opens in that file, and still true now that the round's run precedes the reviewer's read.

The three reviewers' frontmatter `description:` keeps its unconditional "checkpoint round every 5 committed tasks" wording - step 2 scopes the description edit to the gate-running claim, and the conditional dispatch belongs to the orchestrator, recorded in `superdev/agents/CLAUDE.md` and in the `superbuild-reviewer-change` README row instead.

`superdev/README.md` step 6's "After every 5th committed task ... a checkpoint review reads" sentence left unconditional: step 8 names only the `superbuild-reviewer-change` row for that restatement, and that sentence is track-agnostic while the header's constraints keep the Simple track's checkpoint unconditional.
