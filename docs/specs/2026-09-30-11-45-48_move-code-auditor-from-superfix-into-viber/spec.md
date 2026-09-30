To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Move code-auditor from superfix into viber

## Goal

The `code-auditor` skill, its five agents, three references and six scripts live in their own plugin, `superfix`, which holds nothing else. They move into `viber` so the marketplace carries one plugin fewer, and `superfix` leaves the catalog. The auditor behaves exactly as it does today; only its install location, its command and agent namespace (`/viber:code-auditor`, `viber:<agent>`) and its scratch directory change.

## Acceptance criteria

1. The six scripts live under `viber/skills/code-auditor/scripts/`, byte-identical to the `superfix` originals except their header name line, with `check_node.sh`, `collect_edges.sh` and `worktree.sh` at git mode 100755; their six test files live in `tests/viber/` and pass, and `tests/superui/check_node.test.ts` compares superui's copy with the viber one.
2. `/viber:code-auditor`, its three references and the agents `viber:profiler`, `viber:scout`, `viber:edge-scout`, `viber:detective` and `viber:critic` are registered in `viber/.claude-plugin/plugin.json`, each file identical to its `superfix` original under the relocation text map, an agent changing only its frontmatter: the fields reordered to viber's agent shape and one `color:` line added.
3. A run writes its workspace under `.temp/viber/code-auditor/<run-id>/` and its verification worktrees under `<target-root>/.temp/viber/code-auditor/<run-id>/worktrees/`; nothing under `viber/` names `.temp/superfix/`.
4. The viber help page carries a card for `/viber:code-auditor` and one line per moved agent in both languages, and `viber/README.md` lists the command with its Node.js 22.6 requirement.
5. `superfix` is gone from the catalog: no `superfix/.claude-plugin/plugin.json`, no `superfix/README.md`, `marketplace.json` lists four plugins, `release.sh` and its test bump four manifests, and the root `README.md` lists four plugins with Node.js 22.6 named under viber's requirements.
6. `.claude/rules/` names no `superfix` path and states code-auditor's interpreter calls under a bare `Bash` allow as an exception to viber's direct-call convention.
7. `git grep -n superfix -- . ':!docs' ':!*CLAUDE*.md'` prints nothing.

## Scope

### File map

- add - viber/skills/code-auditor/scripts/check_node.sh - Node.js >= 22.6 preflight (moved)
- add - viber/skills/code-auditor/scripts/collect_signals.sh - file-track sweep (moved)
- add - viber/skills/code-auditor/scripts/collect_edges.sh - edge-track sweep (moved)
- add - viber/skills/code-auditor/scripts/rank.ts - file gate (moved)
- add - viber/skills/code-auditor/scripts/rank_edges.ts - edge gate (moved)
- add - viber/skills/code-auditor/scripts/worktree.sh - verification worktree lifecycle (moved)
- add - viber/skills/code-auditor/SKILL.md - the auditor's orchestration (moved)
- add - viber/skills/code-auditor/references/jobs.md - job signal pairs (moved)
- add - viber/skills/code-auditor/references/scoring.md - rubric and gates in prose (moved)
- add - viber/skills/code-auditor/references/synthesis.md - report, sidecar, verdict fold, findings shape (moved)
- add - viber/agents/profiler.md, viber/agents/scout.md, viber/agents/edge-scout.md, viber/agents/detective.md, viber/agents/critic.md - the five sweep agents (moved)
- add - tests/viber/check_node.test.ts, tests/viber/collect_signals.test.ts, tests/viber/collect_edges.test.ts, tests/viber/rank.test.ts, tests/viber/rank_edges.test.ts, tests/viber/worktree.test.ts, tests/viber/profiler.test.ts - the moved suites
- modify - tests/superui/check_node.test.ts - identity test against the viber copy
- modify - viber/.claude-plugin/plugin.json - registers the skill and five agents
- modify - viber/skills/setup/assets/help.html - skill card and agent lines
- modify - viber/README.md - Quick start row and Node requirement
- delete - every tracked file under superfix/ except its CLAUDE.md nodes, and tests/superfix/*.test.ts
- modify - .claude-plugin/marketplace.json - four plugins
- modify - .github/scripts/release.sh, tests/github/release.test.ts - four manifests
- modify - README.md - four plugins, requirements
- modify - .claude/rules/shell-script-exec-bit.md, .claude/rules/shell-loop-substitution.md, .claude/rules/shell-awk-environ.md, .claude/rules/shell-script-header.md - script path globs and examples
- modify - .claude/rules/agent-frontmatter.md, .claude/rules/shell-preload-contract.md, .claude/rules/tests-running.md - agent examples, interpreter-call exception, suite counts
- modify - .claude/rules/plugin-manifests.md - four manifests, only viber carries agents[], viber's skills[] order

### Out of scope

- Any change to the auditor's behaviour: phases, gates, rubric, verdict enums, models, efforts, batch sizes. The five agents' bodies gain neither viber's shared "Your tools are ..." paragraph nor a `VERDICT: DENIED` line.
- Viber's literal script-line convention: code-auditor keeps its bare `Bash` allow and its `sh` / `bash` / `node` interpreter calls, and its four shell scripts keep their current header form.
- Wiring the auditor into the `fixer` / `intent` chain, a manifest entry (the skill stays user-only), the flow SVGs.
- `docs/` (`docs/specs/`, `docs/archive/`, `docs/_specs/`).
- Cutting a release or bumping a version.
- `superui/skills/pro-designer/scripts/check_node.sh` itself: only its identity test's path changes.
- Every `CLAUDE.md` node and `CLAUDE.release.md`: under `memory: true` the build's close rewrites them - root `CLAUDE.md` (plugin count, layout, node table, the interpreter-call exception), `CLAUDE.release.md`, `viber/CLAUDE.md` (the same exception, plus the five code-auditor agents standing outside its "every agent returns `VERDICT: DENIED`" invariant), `viber/agents/CLAUDE.md`, `viber/skills/CLAUDE.md`, `superui/CLAUDE.md`, `tests/CLAUDE.md`, `tests/superui/CLAUDE.md`, `tests/viber/CLAUDE.md` - and deletes `superfix/CLAUDE.md`, `superfix/agents/CLAUDE.md`, `superfix/skills/CLAUDE.md` and `tests/superfix/CLAUDE.md` once their directories hold nothing else.
