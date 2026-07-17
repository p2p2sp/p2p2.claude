# superfix — prioritized multi-agent codebase investigation

> Dev-time orientation for **editing this plugin's source**. Like the repo root `CLAUDE.md`, it is **not a
> plugin input** — it never reaches the skill / agents as runtime data. See the root `CLAUDE.md` for the
> repo-wide warnings and cross-plugin invariants; this file holds only what is specific to `superfix`.

`superfix` is the codebase-investigation plugin: one user-invoked skill that sweeps a repo, scores
Impact × Opportunity, and dispatches cheap-triage / deep-dive agents into the hotspots. It is the only plugin
with **no `hooks/` and no injected manifest**. Its single skill `code-auditor` is `disable-model-invocation:
true` (user-only, invoked solely via `/superfix:code-auditor`), so there is nothing to auto-route — a dispatcher
manifest would be dead weight, and the manifest is what the `SessionStart` hook injects, so dropping the
manifest drops the hook too. This is the plugin-scale analogue of superdev's `setup`: a user-only command
deliberately outside any routing manifest. The **per-skill** catalog of record is `.claude-plugin/plugin.json`
`skills[]` + `agents[]`.

## Layout (superfix internals)

```
superfix/
  .claude-plugin/plugin.json   The plugin manifest — skills[] + agents[] are the catalog of record
  skills/            One user-invoked skill code-auditor/ (disable-model-invocation); bundles
                     references/ (jobs.md, scoring.md, synthesis.md) + scripts/ (check_python.sh,
                     collect_signals.sh, rank.py) — all addressed via `${CLAUDE_SKILL_DIR}/...`
  agents/            Two plugin agents: scout.md (cheap haiku triage) + detective.md (frontier opus deep-dive)
```

## Components (qualified `superfix:<name>`)

- `code-auditor` (skill, main context, user-only) — prioritized multi-agent codebase investigation on the
  `score = Impact × Opportunity` law: a deterministic sweep (`scripts/collect_signals.sh`) → cheap `scout`
  scoring fan-out → deterministic gate/rank (`scripts/rank.py`) → frontier `detective` dispatch into the
  hotspots only → verified, severity-ranked synthesis. State lives under a `.temp/code-reviewer/<run-id>/`
  workspace, not the main context. Bundles `references/{jobs,scoring,synthesis}.md`. Phase 0 resolves the
  interpreter via `scripts/check_python.sh` and HARD-STOPS on `PYTHON_MISSING` — the gate is what makes the
  cut reproducible, so a run that cannot rank must not pay for the sweep and the scout fan-out first. This is
  the one place superfix's env-check differs from superui's (which degrades to a skip-with-note); it is also
  why the check sits in Phase 0 rather than next to the Phase 3 step it guards.
- `scout` / `detective` — the two **plugin agents** (`agents/*.md`, listed in `plugin.json` `agents[]`,
  dispatched via the Agent tool with `subagent_type: superfix:<name>`). `scout` is cheap-tier breadth-first
  triage (spawn many); `detective` is frontier-tier depth-first investigation (spawn few). Bare-named because
  they are genuine agents, not fork-skills.

`superfix` declares no cross-plugin chains.
