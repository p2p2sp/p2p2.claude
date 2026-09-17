# re-review

## Gates

- Build - none - the plan moves markdown, JSON and bash scripts only; nothing compiles
- Tests - pass - 32s
- Integration - none - the repo has no integration suite, and the new `e2e` skill needs a running host application that this repo does not have

## Prior findings

| ID | Title | Verdict | Evidence |
| --- | --- | --- | --- |
| C1 | `Dead permission entry reddens the gate` | ADDRESSED | superdev/skills/e2e/SKILL.md:7 |
| I4 | `Writable-locations invariant not amended` | ADDRESSED | CLAUDE.md:329-335 |
| I1 | `Write-once check covers the index` | ADDRESSED | superdev/agents/qa-writer.md:108 |
| I2 | `Area rule paraphrased, not shared` | ADDRESSED | superdev/agents/qa-writer.md:67 |
| I3 | `grepOnlyPath duplicated across test files` | ADDRESSED | tests/harness/stub.ts:52 |

C1: the `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh:*)` entry is gone from the `allowed-tools` line
and nothing else on it changed; the bare `Bash` entry still covers the `bash "…/commit-task.sh"` call at
`## Commit`, and no other superdev skill carries such an entry (`grep` over `superdev/skills/*/SKILL.md`),
so the frontmatter now matches `superbuild` and `simplebuild`. The suite is green at HEAD - the `#### Tests`
gate above ran the plan's command and came back `RESULT: SUCCESS`, `EXIT: 0`.

I4: the amendment splits the rule in two - the three-location list now reads "writable at a plugin's own
choosing", and a following paragraph names the fourth case, the host's own e2e test directory written by
`superdev:e2e-writer` under the user-run `e2e` skill, with its path taken from host memory or from the
operator. Both halves check out against the delivery: `spec-dir` is resolved from the root `CLAUDE.md`,
its child nodes and `.claude/rules/` and, when those are silent, by one `AskUserQuestion` whose answer is
taken verbatim (superdev/skills/e2e/SKILL.md:53-70), and the agent is told never to invent a sibling
directory (superdev/agents/e2e-writer.md:37). No other file in the repo states the writable-locations
invariant, so there is no second copy left saying "three".

I1-I3 were closed in the prior round and none of the three files is in `5899f84..HEAD`; the cited evidence
still stands unchanged.

## Assessment

Both open findings are fixed at their cited locations, the fix introduced no new defect in its two-file
delta, and the gate the previous round found red is green.

VERDICT: PASS
