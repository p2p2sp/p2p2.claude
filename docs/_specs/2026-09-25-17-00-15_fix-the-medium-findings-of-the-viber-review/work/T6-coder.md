Added `SendMessage` to the e2e skill's `allowed-tools` (placed after `Agent`, matching implementor's ordering) and two new paragraphs at the end of step 5 mirroring implementor's "stopped with background work" / no-`VERDICT:` rules, adapted to the per-scenario loop instead of a task list.

Decision: rather than re-numbering the existing 1-6 list in step 5, the two new rules sit as unnumbered paragraphs after it and reference "point 5" (the existing `VERDICT: FAIL` handling) by number, since that is where the scenario-loop retry/AskUserQuestion mechanics already live. This keeps the diff minimal and avoids disturbing the six-item dispatch list a coder/reviewer would otherwise have to re-verify end to end.

`viber/agents/e2e-writer.md` already carries its own "Stop what you started" section (from an earlier task) - untouched here, only verified by the given grep.
