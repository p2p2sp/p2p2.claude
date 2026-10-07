# docs/archive/superdev - frozen source of the retired superdev plugin

Holds the last source of `superdev`, the plan-gated build track viber replaced: 20 skills, 11 agents, two hooks, shared references and plugin-level scripts, plus their old tests. It is kept to read, never to install, run or extend.

## Relationships

- The directory is laid out as a plugin root: every `${CLAUDE_PLUGIN_ROOT}` in a skill, agent or `hooks/hooks.json` means `docs/archive/superdev/`, and skill scripts reach the plugin-level ones as `../../../scripts/`.
- No `.claude-plugin/plugin.json` remains, so no `skills[]` / `agents[]` catalog exists: the `skills/` and `agents/` directory listings are the only inventory.
- Host-side paths the source names belong to superdev, not to viber: config `.claude/superdev.yml` (read by `scripts/read-config.sh`), run working directory `docs/.workflows/<run>/`, plans under `.claude/plans/*.md`.
- Child nodes: `docs/archive/superdev/skills/CLAUDE.md`, `docs/archive/superdev/tests/CLAUDE.md`.

## Contracts

- `hooks/scripts/session-start.sh` prints only an obsolescence banner as a top-level `systemMessage` and injects no context; superdev carries no manifest.
- `hooks/scripts/review-plan.sh` gates `ExitPlanMode` on the plan declaring its format (`# SimplePlan` / `# SuperPlan`), naming its own path on a `Plan:` line and the latest `simpleplan-reviewer` / `superplan-reviewer` `VERDICT: PASS`; on allow it writes `<plan>.sha256` beside the plan, which `scripts/decompose.sh` recomputes and refuses to build on a mismatch. A plan argument opening with `superdev:routing-exit` is allowed unconditionally and writes no sidecar.

## Change together

- `scripts/lib_sha256.sh` is the one digest both `review-plan.sh` and `decompose.sh` source, so the two sides of the reviewed-plan check never spell a digest differently.

## Traps

- `README.md` still shows `claude plugin install superdev@p2p2`, but `.claude-plugin/marketplace.json` lists no `superdev`: that command no longer resolves.
- superdev and viber both gate `ExitPlanMode` and each accepts only its own plan format, so the two never run in one session.
- Same-named skills and agents (`intent`, `setup`, `tdd`, `e2e`, `e2e-writer`, `qa-writer`, `memory-writer`, `rules-writer`, `commit-task.sh`) are not viber's: their contracts differ, so never read one here as documentation of viber.
