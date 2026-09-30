---
source: C:/Projects/p2p2.claude/docs/_specs/2026-09-30-11-45-48_move-code-auditor-from-superfix-into-viber/plan.md
---

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

## Tasks

<!-- TASK -->
### T1 - Move the code-auditor scripts and their tests into viber
- TDD: none
- Covers: #1, #6
- Uses: C2
- Depends-on: none
- Files: viber/skills/code-auditor/scripts/check_node.sh, viber/skills/code-auditor/scripts/collect_signals.sh, viber/skills/code-auditor/scripts/collect_edges.sh, viber/skills/code-auditor/scripts/rank.ts, viber/skills/code-auditor/scripts/rank_edges.ts, viber/skills/code-auditor/scripts/worktree.sh, superfix/skills/code-auditor/scripts/check_node.sh, superfix/skills/code-auditor/scripts/collect_signals.sh, superfix/skills/code-auditor/scripts/collect_edges.sh, superfix/skills/code-auditor/scripts/rank.ts, superfix/skills/code-auditor/scripts/rank_edges.ts, superfix/skills/code-auditor/scripts/worktree.sh, tests/viber/check_node.test.ts, tests/viber/collect_signals.test.ts, tests/viber/collect_edges.test.ts, tests/viber/rank.test.ts, tests/viber/rank_edges.test.ts, tests/viber/worktree.test.ts, tests/superfix/check_node.test.ts, tests/superfix/collect_signals.test.ts, tests/superfix/collect_edges.test.ts, tests/superfix/rank.test.ts, tests/superfix/rank_edges.test.ts, tests/superfix/worktree.test.ts, tests/superui/check_node.test.ts, .claude/rules/shell-script-exec-bit.md, .claude/rules/shell-loop-substitution.md, .claude/rules/shell-awk-environ.md, .claude/rules/shell-script-header.md
- Delivers: the six code-auditor scripts at their viber paths per the relocation map, with their git modes kept; their six test files under `tests/viber/` driving the viber copies; superui's identity test comparing against the viber copy; the superfix copies and tests removed; the four shell rules pointing at the viber paths, `shell-script-header.md` counting viber's scripts with code-auditor's four named as keeping their own header form.
- Verification: `node --test --test-concurrency=12 --test-reporter=dot tests/viber/check_node.test.ts tests/viber/collect_signals.test.ts tests/viber/collect_edges.test.ts tests/viber/rank.test.ts tests/viber/rank_edges.test.ts tests/viber/worktree.test.ts tests/superui/check_node.test.ts tests/portability.test.ts tests/orphan-tags.test.ts` -> every file passes; `for f in check_node.sh collect_signals.sh collect_edges.sh rank.ts rank_edges.ts worktree.sh; do git show "3f6d87c9:superfix/skills/code-auditor/scripts/$f" | sed -e 's|^# superfix - |# viber - |' | diff - "viber/skills/code-auditor/scripts/$f"; done` -> no output; `git ls-files -s viber/skills/code-auditor/scripts/check_node.sh viber/skills/code-auditor/scripts/collect_edges.sh viber/skills/code-auditor/scripts/worktree.sh` -> three lines, each 100755; `git grep -n superfix -- viber/skills/code-auditor/scripts tests/viber tests/superui/check_node.test.ts .claude/rules/shell-script-exec-bit.md .claude/rules/shell-loop-substitution.md .claude/rules/shell-awk-environ.md .claude/rules/shell-script-header.md` -> no output; `grep -n "viber/skills/code-auditor/scripts/collect_signals.sh" .claude/rules/shell-awk-environ.md && grep -n "ENVIRON" viber/skills/code-auditor/scripts/collect_signals.sh` -> both hit.
- DoD: the six scripts exist under `viber/skills/code-auditor/scripts/` identical to the originals but for the header name line; `check_node.sh`, `collect_edges.sh` and `worktree.sh` are 100755 in the index; the six moved test files pass from `tests/viber/`; `tests/superui/check_node.test.ts` resolves the second copy under `viber/skills/code-auditor/scripts/` and passes; no file remains under `superfix/skills/code-auditor/scripts/` and no `*.test.ts` of the six under `tests/superfix/`; the four shell rules name no `superfix` path and `shell-awk-environ.md` cites the viber `collect_signals.sh`; `shell-script-header.md` counts viber's scripts including the four moved shell scripts and names them as keeping their own header form
<!-- /TASK -->

<!-- TASK -->
### T2 - Serve code-auditor and its five agents from viber
- TDD: none
- Covers: #2, #3, #4, #6
- Uses: C1, C2
- Depends-on: T1
- Files: viber/skills/code-auditor/SKILL.md, viber/skills/code-auditor/references/jobs.md, viber/skills/code-auditor/references/scoring.md, viber/skills/code-auditor/references/synthesis.md, viber/agents/profiler.md, viber/agents/scout.md, viber/agents/edge-scout.md, viber/agents/detective.md, viber/agents/critic.md, viber/.claude-plugin/plugin.json, viber/skills/setup/assets/help.html, viber/README.md, tests/viber/profiler.test.ts, superfix/skills/code-auditor/SKILL.md, superfix/skills/code-auditor/references/jobs.md, superfix/skills/code-auditor/references/scoring.md, superfix/skills/code-auditor/references/synthesis.md, superfix/agents/profiler.md, superfix/agents/scout.md, superfix/agents/edge-scout.md, superfix/agents/detective.md, superfix/agents/critic.md, tests/superfix/profiler.test.ts, .claude/rules/agent-frontmatter.md, .claude/rules/shell-preload-contract.md, .claude/rules/tests-running.md
- Delivers: the skill, its three references and the five agents at their viber paths per the relocation map, dispatching `viber:<agent>` and writing the run workspace of C1; the skill and agents registered in viber's manifest; the help page card and agent lines and the README row that make the command visible; the profiler test reading the viber agent; the superfix copies removed; the three rules citing viber agents, the code-auditor interpreter-call exception and the viber suite's file count.
- Verification: `node --test --test-concurrency=12 --test-reporter=dot tests/viber/help.test.ts tests/viber/profiler.test.ts tests/portability.test.ts tests/orphan-tags.test.ts` -> every file passes; `for f in skills/code-auditor/SKILL.md skills/code-auditor/references/jobs.md skills/code-auditor/references/scoring.md skills/code-auditor/references/synthesis.md; do git show "3f6d87c9:superfix/$f" | sed -e 's|superfix:|viber:|g' -e 's|\.temp/superfix/|.temp/viber/code-auditor/|g' | diff - "viber/$f"; done` -> no output; `for a in profiler scout edge-scout detective critic; do echo "== $a"; git show "3f6d87c9:superfix/agents/$a.md" | sed -e 's|superfix:|viber:|g' -e 's|\.temp/superfix/|.temp/viber/code-auditor/|g' | awk 'c>=2;/^---$/{c++}' | diff - <(awk 'c>=2;/^---$/{c++}' "viber/agents/$a.md"); diff <(git show "3f6d87c9:superfix/agents/$a.md" | awk '/^---$/{c++;next} c==1' | sort) <(awk '/^---$/{c++;next} c==1' "viber/agents/$a.md" | sort); awk '/^---$/{c++;next} c==1{sub(/:.*/,"");printf "%s ",$0}' "viber/agents/$a.md"; echo; done` -> per agent no body diff, a frontmatter diff of exactly the one added `color:` line of C2, and the field order `name description tools model effort color` for `detective` and `critic`, `name description tools model color` for `profiler`, `scout` and `edge-scout`; `node -e "const p=require('./viber/.claude-plugin/plugin.json');console.log(p.skills.includes('./skills/code-auditor/'),['profiler','scout','edge-scout','detective','critic'].every(a=>p.agents.includes('./agents/'+a+'.md')))"` -> `true true`; `git grep -n superfix -- viber tests/viber .claude/rules/agent-frontmatter.md .claude/rules/shell-preload-contract.md .claude/rules/tests-running.md` -> no output; `grep -n "code-auditor" .claude/rules/shell-preload-contract.md && grep -n 'bash "${CLAUDE_SKILL_DIR}/scripts/collect_signals.sh"' viber/skills/code-auditor/SKILL.md` -> both hit.
- DoD: `viber/skills/code-auditor/SKILL.md` and its three references are identical to the superfix originals under the relocation text map; each of the five agents under `viber/agents/` carries its original body unchanged under that map; each moved agent's frontmatter holds exactly its original fields, `effort:` only where the original has one, reordered to viber's `name, description, tools, model, effort, color`, plus the one `color:` line C2 assigns it; `viber/.claude-plugin/plugin.json` lists `./skills/code-auditor/` between `./skills/rules/` and `./skills/help/` and the five agent files in `agents[]`; every workspace and worktree path in the skill, its references and the agents is one of C1's; `help.html` carries `id="skill-code-auditor"` and `id="agent-<name>"` for each moved agent in both languages, and `tests/viber/help.test.ts` passes; `viber/README.md` carries a Quick start row for `/viber:code-auditor` naming Node.js 22.6; `tests/viber/profiler.test.ts` reads `viber/agents/profiler.md` and passes; no skill, reference or agent file and no `profiler.test.ts` remains under `superfix/` or `tests/superfix/`; `agent-frontmatter.md` cites `viber/agents/` paths for its examples and states one field shape, viber's, with no exception; `shell-preload-contract.md` names code-auditor's interpreter calls under a bare `Bash` allow as an exception; `tests-running.md` names no superfix path and states the viber subset's file and test counts as a run of `"tests/viber/*.test.ts"` reports them after this task
<!-- /TASK -->

<!-- TASK -->
### T3 - Remove superfix from the marketplace catalog
- TDD: none
- Covers: #5, #6, #7
- Uses: none
- Depends-on: T2
- Files: superfix/.claude-plugin/plugin.json, superfix/README.md, .claude-plugin/marketplace.json, .github/scripts/release.sh, tests/github/release.test.ts, README.md, .claude/rules/plugin-manifests.md
- Delivers: a catalog of four plugins - superfix's manifest and README removed, the marketplace, the release script and its test covering four manifests, the root README listing four plugins with Node.js 22.6 under viber's requirements, and the manifest rule describing four manifests with viber alone carrying `agents[]`.
- Verification: `node --test --test-concurrency=12 --test-reporter=dot tests/github/release.test.ts tests/portability.test.ts tests/orphan-tags.test.ts` -> every file passes (release cases skip only when `jq` is absent); `node -e "console.log(require('./.claude-plugin/marketplace.json').plugins.map(p=>p.name).join(','))"` -> `superui,superbiz,supercc,viber`; `grep -n "viber/.claude-plugin/plugin.json" .github/scripts/release.sh && grep -n '"name": "viber"' viber/.claude-plugin/plugin.json` -> both hit; `git grep -n superfix -- . ':!docs' ':!*CLAUDE*.md'` -> no output.
- DoD: `superfix/.claude-plugin/plugin.json` and `superfix/README.md` no longer exist; `.claude-plugin/marketplace.json` lists `superui`, `superbiz`, `supercc`, `viber`; `release.sh` bumps the four remaining manifests and its header says four; `tests/github/release.test.ts` fixtures and test names cover four manifests and pass; `README.md` lists four plugins, carries no superfix install line or row, and names Node.js 22.6 for `/viber:code-auditor` under viber's requirements; `plugin-manifests.md` says only viber carries `agents[]`, counts four manifests and lists `code-auditor` in viber's `skills[]` order; `git grep -n superfix -- . ':!docs' ':!*CLAUDE*.md'` prints nothing
<!-- /TASK -->

## Contracts

### C1 - Run workspace paths

File: viber/skills/code-auditor/SKILL.md, viber/skills/code-auditor/references/jobs.md, viber/skills/code-auditor/references/synthesis.md, viber/agents/profiler.md, viber/agents/critic.md

```
workspace:   .temp/viber/code-auditor/<run-id>/{signals,scores,reports,hotlist,worktrees}
job:         .temp/viber/code-auditor/<run-id>/job.md
profile:     .temp/viber/code-auditor/<run-id>/profile.md
report:      .temp/viber/code-auditor/<run-id>/reports/<rank>-<slug>.md
claim:       .temp/viber/code-auditor/<run-id>/reports/<rank>-<slug>.claim.md
findings:    .temp/viber/code-auditor/<run-id>/findings.md
worktrees:   <target-root>/.temp/viber/code-auditor/<run-id>/worktrees/<rank>-<slug>
             <target-root>/.temp/viber/code-auditor/<run-id>/worktrees/critic-<rank>-<slug>
             <target-root>/.temp/viber/code-auditor/<run-id>/worktrees/critic-<rank>-<slug>-retry
```

### C2 - Relocation map

File: none

```
superfix/skills/code-auditor/<rest>   ->  viber/skills/code-auditor/<rest>
superfix/agents/<name>.md             ->  viber/agents/<name>.md
tests/superfix/<name>.test.ts         ->  tests/viber/<name>.test.ts

text map on every moved file, nothing else changes:
  superfix:<agent>                    ->  viber:<agent>
  .temp/superfix/                     ->  .temp/viber/code-auditor/
  "# superfix - " (script header line 2)  ->  "# viber - "
  ../../superfix/ (test SUT / AGENT)  ->  ../../viber/
  tests/superfix/ (test header)       ->  tests/viber/
  superfix/agents/ (test header)      ->  viber/agents/
  superfix/skills/code-auditor/ (test header)  ->  viber/skills/code-auditor/

agent frontmatter: exactly the original fields reordered to name, description,
  tools, model, effort, color (effort only where the original carries one:
  detective and critic), plus one color line:
  profiler: cyan | scout: green | edge-scout: green | detective: purple | critic: yellow
git mode: kept per file (100755: check_node.sh, collect_edges.sh, worktree.sh)
```
