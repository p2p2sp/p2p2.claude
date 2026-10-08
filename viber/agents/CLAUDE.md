# viber/agents - the twenty-two subagents viber's skills dispatch

This directory owns one markdown file per agent registered in `viber/.claude-plugin/plugin.json` `agents[]`: each a single-purpose worker taking labelled lines and returning fixed lines. The dispatching side (what a skill sends, when, at what tier) belongs to the skills node; the reference files the agents read belong to the references node.

## Terms

- Labelled input: every agent's `## Input` names the `label: value` lines its dispatch carries and what each one means; a multi-line value (`input:`, `question:`, `summary:`, `brief:`) runs to the end of the prompt. The dispatching skill sends exactly those lines and nothing else.
- `refs:`: the plugin reference directory (`${CLAUDE_PLUGIN_ROOT}/references`), from which an agent reads the reference files its body names.
- Auditor agents: the four `code-auditor` agents (`mapper`, `scout`, `hunter`, `critic`). They take another form: a `# <Name> - <role>` heading, `## Inputs you are given`, `## Hard rules`, no tools paragraph, no `DENIED` line.
- Coder notes: `<run>/work/<task id>-coder.md`, the at-most-8-line notes `task-coder` writes, read as `*-coder.md` by `task-reviewer`, `final-reviewer`, `closeout`, `memory-writer`, `rules-writer` and `qa-writer`.

## Relationships

- Reference reads: `node-doctrine.md` (`memory-writer`, `memory-auditor`, `memory-node-writer`), `rule-admission.md` (`rules-auditor`, `rules-writer`), `qa-format.md` (`qa-writer`, `e2e-writer`), `plan-rules.md` (`planner-review`), `adr-admission.md` (`adr-screener`), `test-strategy.md` (`task-coder`, `task-reviewer`), `integration-tests.md` (`planner-review`, `task-coder`, `task-reviewer`). `hunter` writes to the schema of `skills/code-auditor/references/synthesis.md`; `hunter` and `critic` get a clean checkout only for a lens reading `Worktree: required`, through `skills/code-auditor/scripts/worktree.sh` and, on the diff scope, `diff-overlay.sh`. `mapper`, `scout`, `hunter` and `critic` read the run file and one lens file of `skills/code-auditor/references/lenses/`; `mapper` also reads that lens's `<lens>.signals.md`.
- Skill calls from agents: `task-coder` invokes `viber:tdd` on a `TDD: required` task; `prototype-writer` invokes `impeccable`, else `superui:pro-designer`, when either is in its skill listing.

## Contracts

- Strength: `task-coder` and `task-reviewer` get the task's tier as `model`, `final-reviewer` `opus` clamped into the tiers range, `scout` `sonnet` on the security lens; every other dispatch passes no `model`, so the frontmatter `model:` and `effort:` decide. `mapper`, `hunter` and `critic` carry `model: inherit` and run at the session's model; `scout` is pinned to `haiku`.
- Every non-auditor agent carries the tools paragraph ("Your tools are ..., every one of them loaded ...") naming exactly its `tools:` list; an agent holding `Bash` adds the sentence that `No such tool available` on `Glob` or `Grep` means using `find` and `grep` through `Bash`, and `mapper`, `hunter` and `critic` state that fallback under `## Hard rules`.
- Agents sharing the working tree (`task-coder`, `task-reviewer`, `final-reviewer`) keep git read-only (`status`, `diff`, `log`, `show`), never `stash`, `checkout`, `restore` or `clean`: one stash stack serves every coder. `task-coder`'s only writes to the index are `git rm -r -q --` and `git update-index --chmod=+x --`.
- Write scope: a reviewer or auditor writes only its report or findings file, and only on the verdict its `## Output` names (`task-reviewer` and `final-reviewer` write nothing on `PASS`; `planner-review`, `plain-plan-review`, `adr-screener`, `arbiter`, `prover` and `critic` write nothing at all); `closeout` edits only `spec.md` and writes `outcome.md` before its one literal `archive-run.sh` call; `e2e-writer` writes one spec file plus its status line under `## Automation` of `qa.e2e.md`.
- Baseline report: `test-runner` writes `status: pass | skip | fail | build-failed` then `<test name> | <file> | <assertion or error>` lines; `task-coder` and `task-reviewer` treat a failure as pre-existing only when its test name and file match such a line.
- Stall path: `task-coder`'s `DECIDE:` options become `arbiter`'s `options:` for case `decide`; a ruling comes back to coders, reviewers and `closeout` as a `decision: <task-id>: <text>` line of `status.md`, which wins over the task file.
- Join keys: `scout` echoes `unit` (the `U<n>` id) byte-identical to the unit line it was given; `critic` is handed only the `.claim.md` sidecar (`LOCATION`, `CLASS`, `## Reproduce`), never the hunter's report.

## Commands

- `node --test tests/viber/code-auditor.unit.test.ts` after an auditor agent is added, removed or renamed: it holds every `viber:<name>` the `code-auditor` skill dispatches to `plugin.json` `agents[]`.

## Change together

- The "Stop what you started" block is verbatim in `task-coder`, `task-reviewer`, `final-reviewer`, `test-runner`, `e2e-writer` and `skills/extension/templates/extension.md`.
- The tools paragraph and the `DENIED` / `REASON: <refused tool name>: <the exact refused command, or the path for a file tool>` output wording are verbatim across every non-auditor agent (`prover` adds the URL or query for a web tool).
- Memory audit vocabulary (`STALE`, `GONE`, `UNVERIFIABLE`, `MISS`, `SHAPE`, `OK`) and the `<out><slug>-audit.md` name (`/` -> `--`): `memory-auditor`, `memory-node-writer` and `skills/memory/SKILL.md`. The rules counterpart (adding `DROP` and `MOVE:`): `rules-auditor`, `rules-writer` and `skills/rules/SKILL.md`.
- The clean-checkout steps (`worktree.sh add`, `diff-overlay.sh`, replay, `worktree.sh remove`, and `WORKTREE_FAILED` / `OVERLAY_FAILED` ending in `NO FINDING` for `hunter` and `INCONCLUSIVE` for `critic`): `hunter.md` and `critic.md`.
- An agent added, removed or renamed: `plugin.json` `agents[]`, every `viber:<name>` dispatch in `skills/`, and for `planner-review`/`plain-plan-review` `hooks/scripts/plan-gate.sh`.
- `planner-review`'s input labels (`refs:`, `memory:`, `input:`): `planner-review.md`, `skills/planner/SKILL.md` and the dispatch text `hooks/scripts/plan-gate.sh` prints in its deny message.

## Traps

- The harness rejects a subagent's `Write` of any `.md` whose name starts with `report`, `summary`, `findings` or `analysis`; `hooks/register.tsx` writes such a file in its place for a viber agent inside the project root, yet every file an agent is told to write is named otherwise (`outcome.md`, `review-*.md`, `*-audit.md`, `final-review-<n>.md`).
- A file an agent writes that something parses (`hunter`'s sidecar, `mapper`'s `map.md`) can end on a leaked `</content>` line: those two agents read the tail back and delete it, and a new parsed output needs the same guard.
- `scout`, `mapper` and `hunter` return no `VERDICT:` line (JSON lines, `map written: <path>`, the paths written): a caller parsing them never looks for one, and for `hunter` reads the files in `reports/`, never its final message.
