## Runs

- grep -n "^name: vibe-implementor" superdev/agents/vibe-implementor.md -> 2:name: vibe-implementor
- grep -n "agents/vibe-implementor.md" superdev/.claude-plugin/plugin.json -> 43:    "./agents/vibe-implementor.md"
- node -e "JSON.parse(require('fs').readFileSync('superdev/.claude-plugin/plugin.json','utf8'))" -> exit 0

UNDERSPECIFIED: brief `## Sensitive` and `## Notes` handling (Approach 2 names neither) - both written as context only: `## Sensitive` is the caller's `vibe-guard.sh --sensitive` argument and is never matched inside the agent, `## Notes` OVERRIDE lines are a record, never a work item.
UNDERSPECIFIED: brief present but carrying no `Goal:` line - folded into the documented invalid-input failure mode, `VERDICT: FAIL` + `REASON: missing input brief`, nothing changed.
UNDERSPECIFIED: a `## Checks` command the tool cuts off at its timeout - re-run once with a larger timeout, cut off again -> `VERDICT: FAIL` naming the command and the timeout, and never one of the 3 fix rounds (simplebuild/superbuild implementor precedent).
UNDERSPECIFIED: git write commands in the agent - denied explicitly (`commit`, `branch`/`checkout`/`switch`, `stash`, `reset`/`restore`/`clean`), from the header constraint that the track commits on the current branch and from Task 3 owning the commit; pre-existing dirty state is left as found.
