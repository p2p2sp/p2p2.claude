# Task 3 - Add the vibe skill with its brief template

## Runs
- grep -n "^name: vibe$" superdev/skills/vibe/SKILL.md -> 2:name: vibe
- grep -n "skills/vibe/" superdev/.claude-plugin/plugin.json -> 32:    "./skills/vibe/",
- node -e "JSON.parse(require('fs').readFileSync('superdev/.claude-plugin/plugin.json','utf8'))" -> exit 0
- node --test tests/portability.test.ts -> tests 21, pass 21, fail 0

Approach step 3 `Preflight` gained a third command, `git rev-parse --show-toplevel` kept as `<root>`: the `### Contracts` revert rule measures every declared path against that value, and `## Dispatch` owes the agent absolute paths.
Approach step 3 `Dispatch` does not hand on the literal `refs: ${CLAUDE_PLUGIN_ROOT}/references` line - an `Agent` prompt is expanded by no shell, so `<refs>` is resolved first through one `printf '%s\n' "${CLAUDE_PLUGIN_ROOT}/references"` call, as `simplebuild` Step 1 resolves it.
Approach step 2 `description:` is written as a single-line `>-` folded scalar (the `tdd` precedent, the only one in the repo): the paragraph carries `": "` and quote characters, which a plain scalar cannot hold, and a multi-line fold has no shipped precedent here.

UNDERSPECIFIED: `VERDICT: BLOCKED` whose notes hold no `DECISION:` line - there is nothing to ask and nothing to re-dispatch on, so `## Verdict` routes it into its no-verdict branch (guard for the counters, then `## Stop`).
UNDERSPECIFIED: abort answered to a `DECISION:` question - `## Stop` at stage `no verdict`, reason `decision aborted by the user`, so the tree the agent already changed reaches the same three options instead of being left with no exit.
UNDERSPECIFIED: the stage of a second `VERDICT: BLOCKED` - the `OVERRIDE:` vocabulary of `### Contracts` has no `blocked` value; mapped to `no verdict`, since BLOCKED is no verdict on the work either.
UNDERSPECIFIED: the stage of the `commit-task.sh` exit 1 stop - none of the four values names a commit-script failure, so that stop carries no `<stage>`, writes no `OVERRIDE:` line, and its approve option re-runs the same command once (a second exit 1 ends at `## Done`), which is also what keeps approve from looping back into a failing commit.
UNDERSPECIFIED: `<slug>` beyond the contract's "lowercase goal words joined by `-`, at most 40 characters" - every run of non-alphanumerics folds to a single `-`, so a goal carrying punctuation still yields one path segment.
