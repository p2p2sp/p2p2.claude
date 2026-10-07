# viber/agents - the twenty-three subagents viber's skills dispatch

This directory owns one markdown file per agent registered in `viber/.claude-plugin/plugin.json` `agents[]`: each a single-purpose worker taking labelled lines and returning fixed lines. The dispatching side (what a skill sends, when, at what tier) belongs to the skills node; the reference files the agents read belong to the references node.

## Terms

- Labelled input: every agent's `## Input` names the `label: value` lines its dispatch carries and what each one means; a multi-line value (`input:`, `question:`, `summary:`, `brief:`) runs to the end of the prompt. The dispatching skill sends exactly those lines and nothing else.
- `refs:`: the plugin reference directory (`${CLAUDE_PLUGIN_ROOT}/references`), from which an agent reads the reference files its body names.
- Sweep agents: the five `code-auditor` agents (`profiler`, `scout`, `edge-scout`, `detective`, `critic`). They take another form: a `# <Name> - <role>` heading, `## Inputs you are given`, `## Hard rules`, no tools paragraph, no `DENIED` line.
- Coder notes: `<run>/work/<task id>-coder.md`, the at-most-8-line notes `task-coder` writes, read as `*-coder.md` by `task-reviewer`, `final-reviewer`, `closeout`, `memory-writer`, `rules-writer` and `qa-writer`.

## Relationships

- `implementor` dispatches `task-coder` (also as the repair and final-fix coder), `task-reviewer`, `test-runner`, `arbiter`, and through its switch fragments `final-reviewer` (`final-review.true.md`), `memory-writer`, `rules-writer`, `qa-writer` and `closeout` (`cleanup.true.md`); `intent`'s `fast-path.true.md` dispatches `test-runner` too, and `intent --prove` dispatches `prover`.
- `planner` dispatches `planner-review`, and `adr-screener` through `skills/planner/references/adr-tasks.md`; `plain-plan-review` runs only on the plan gate's request. `memory` dispatches `memory-auditor` and `memory-node-writer`; `rules` dispatches `rules-auditor` and `rules-writer`; `e2e` dispatches `e2e-writer`; `prototype` dispatches `prototype-writer`; `code-auditor` dispatches the five sweep agents.
- Reference reads: `node-doctrine.md` (`memory-writer`, `memory-auditor`, `memory-node-writer`), `rule-admission.md` (`rules-auditor`, `rules-writer`), `qa-format.md` (`qa-writer`, `e2e-writer`), `plan-rules.md` (`planner-review`), `adr-admission.md` (`adr-screener`), `test-strategy.md` (`task-coder`, `task-reviewer`), `integration-tests.md` (`planner-review`, `task-coder`, `task-reviewer`). `detective` writes to the schema of `skills/code-auditor/references/synthesis.md`; `detective` and `critic` get clean checkouts only through `skills/code-auditor/scripts/worktree.sh`.
- Skill calls from agents: `task-coder` invokes `viber:tdd` on a `TDD: required` task; `prototype-writer` invokes `impeccable`, else `superui:pro-designer`, when either is in its skill listing.
- `tests/viber/profiler.test.ts` lifts the single fenced `bash` block of `profiler.md` verbatim and runs it against a throwaway repo: the only agent file under test.

## Contracts

- Strength: `task-coder` and `task-reviewer` get the task's tier as `model`, `final-reviewer` `opus` clamped into the tiers range; every other dispatch passes no `model`, so the frontmatter `model:` and `effort:` decide. `detective`, `critic` and `profiler` carry `model: inherit` and run at the session's model.
- Every non-sweep agent carries the tools paragraph ("Your tools are ..., every one of them loaded ...") naming exactly its `tools:` list; an agent holding `Bash` adds the sentence that `No such tool available` on `Glob` or `Grep` means using `find` and `grep` through `Bash`, and `detective`, `critic` and `profiler` state that fallback under `## Hard rules`.
- Agents sharing the working tree (`task-coder`, `task-reviewer`, `final-reviewer`) keep git read-only (`status`, `diff`, `log`, `show`), never `stash`, `checkout`, `restore` or `clean`: one stash stack serves every coder. `task-coder`'s only writes to the index are `git rm -r -q --` and `git update-index --chmod=+x --`.
- Write scope: a reviewer or auditor writes only its report or findings file, and only on the verdict its `## Output` names (`task-reviewer` and `final-reviewer` write nothing on `PASS`; `planner-review`, `plain-plan-review`, `adr-screener`, `arbiter`, `prover` and `critic` write nothing at all); `closeout` edits only `spec.md` and writes `outcome.md` before its one literal `archive-run.sh` call; `e2e-writer` writes one spec file plus its status line under `## Automation` of `qa.e2e.md`.
- Baseline report: `test-runner` writes `status: pass | skip | fail | build-failed` then `<test name> | <file> | <assertion or error>` lines; `task-coder` and `task-reviewer` treat a failure as pre-existing only when its test name and file match such a line.
- Stall path: `task-coder`'s `DECIDE:` options become `arbiter`'s `options:` for case `decide`; a ruling comes back to coders, reviewers and `closeout` as a `decision: <task-id>: <text>` line of `status.md`, which wins over the task file.
- Join keys: `scout` echoes `path` and `edge-scout` echoes `a` and `b` byte-identical to the record it was given; `critic` is handed only the `.claim.md` sidecar (`LOCATION`, `CLASS`, `## Reproduce`), never the detective's report.

## Commands

- `node --test tests/viber/profiler.test.ts` after any edit to `profiler.md`'s `git log` block.

## Change together

- The "Stop what you started" block is verbatim in `task-coder`, `task-reviewer`, `final-reviewer`, `test-runner` and `e2e-writer`.
- The tools paragraph and the `DENIED` / `REASON: <refused tool name>: <the exact refused command, or the path for a file tool>` output wording are verbatim across every non-sweep agent (`prover` adds the URL or query for a web tool).
- Memory audit vocabulary (`STALE`, `GONE`, `UNVERIFIABLE`, `MISS`, `SHAPE`, `OK`) and the `<out><slug>-audit.md` name (`/` -> `--`): `memory-auditor`, `memory-node-writer` and `skills/memory/SKILL.md`. The rules counterpart (adding `DROP` and `MOVE:`): `rules-auditor`, `rules-writer` and `skills/rules/SKILL.md`.
- An agent added, removed or renamed: `plugin.json` `agents[]`, every `viber:<name>` dispatch in `skills/`, and for `planner-review`/`plain-plan-review` `hooks/scripts/plan-gate.sh`.
- `planner-review`'s input labels (`refs:`, `memory:`, `input:`): `planner-review.md`, `skills/planner/SKILL.md` and the dispatch text `hooks/scripts/plan-gate.sh` prints in its deny message.

## Traps

- The harness rejects a subagent's `Write` of any `.md` whose name starts with `report`, `summary`, `findings` or `analysis`; `hooks/register.tsx` writes such a file in its place for a viber agent inside the project root, yet every file an agent is told to write is named otherwise (`outcome.md`, `review-*.md`, `*-audit.md`, `final-review-<n>.md`).
- A file an agent writes that something parses (`detective`'s sidecar, `profiler`'s profile appended to `job.md`) can end on a leaked `</content>` line: those two agents read the tail back and delete it, and a new parsed output needs the same guard.
- `scout`, `edge-scout` and `profiler` return no `VERDICT:` line (JSON lines, or `profile written: <path>`): a caller parsing them never looks for one.
