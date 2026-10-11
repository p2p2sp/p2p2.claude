To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Move deterministic build work from the model to hooks and scripts

## Goal

Hooks and scripts take over the deterministic parts of a viber build: sending an agent back when it ended without its output line, enforcing the coder's and reviewers' shell and git rules, tracking the paths a task changed outside its file map, and recording an arbiter ruling. The orchestrator reads less and composes less, and a refusal from a viber guard stops being a reason to halt the build.

## Problem

The orchestrating skills do mechanical work a model can get wrong and pays tokens for: five skills carry a nudge message for an agent that returned no output line, `implementor` computes the reviewer's extra paths and rechecks and the commit's extra paths across attempts, and it escapes quotes, dollar signs, backticks and backslashes by hand before recording a ruling or a decision. The coder's and reviewers' git and shell rules exist only as prose, which a model can overlook. A refusal from `kill-guard.sh` today ends a viber agent as denied (the tools paragraph of every agent holding `Bash`), so a coder trying to stop a process by name halts the build with a question to the user although correcting the command would do.

## Current behaviour

`hooks/hooks.json` wires four hooks: the plan gate, `kill-guard.sh` on `Bash`, `plan-hints.sh` and `session-start.sh`. `kill-guard.sh` refuses stopping processes by name inside any viber agent, with a reason carrying no marker. `implementor`, `planner/references/adr-tasks.md`, `memory`, `rules` and `e2e` send an agent that returned no output line one `SendMessage`, then fall back. `task-coder` returns an `EXTRA:` line; `implementor` gathers those lines across attempts into the reviewer's extra paths, derives the rechecks from the index, adds the paths to the task commit and to a re-run coder's resume paths. `arbiter` is read-only; `implementor` escapes its ruling, reason and cost into the register call, and escapes the ruling again into the decision call of a stalled task. `task-coder.md` lines 39, 40 and 47 and line 10 of `task-reviewer.md` and `final-reviewer.md` state the git and shell rules together with their rationale.

### Must not change

- Every viber agent's own output lines, and each skill's fallback for a second reply without them.
- `kill-guard.sh` refuses exactly the commands it refuses today, and only inside viber agents.
- The main session and every agent outside the three guarded viber agents run their `Bash` calls exactly as before.
- A task commit stages the same paths as before, with the same ownership warnings, and the register keeps its line format.
- Task tiers, review waivers decided when the tasks are profiled, attempt counting and the coder's limits on what it may change.

## Behaviour

### S1 - An agent that ends without its output line is sent back once [CHANGED - was: the dispatching skill sent it one SendMessage]

Given a viber agent that ends its work on a fixed output line
When it stops with a final message holding no such line
Then a hook keeps it running with the instruction to finish and return its output lines, once; a second stop without the line reaches the dispatching skill, which applies its existing fallback.

### S2 - A guarded agent's forbidden shell command is refused with a fix [NEW]

Given the coder working on a task
When it stashes, switches or cleans with git, chains commands, removes a file with `rm`, edits a file in place or redirects into a file outside the scratch directory
Then the call is refused with a marked reason naming the allowed way, and the coder corrects the command and goes on.

### S3 - A viber guard refusal no longer stops the build [CHANGED - was: any refused call ended the agent as denied and the build asked the user]

Given any viber agent holding `Bash`
When `kill-guard.sh` or the new guard refuses a call
Then the reason carries the guard marker, the agent treats it as a correction, and the build asks nothing.

### S4 - The guarded rules read as one line each [CHANGED - was: each rule carried its rationale in the agent's prose]

Given the coder's or a reviewer's instructions
When the agent reads its shell and git rules
Then each guarded rule is one line, and the reason behind it lives in the guard's own header.

### S5 - Paths outside the file map travel through the extras file [CHANGED - was: implementor gathered EXTRA lines and computed the reviewer's lines and the commit's paths itself]

Given a coder that changed a file its task's file map does not name
When it finishes
Then the path is in the task's extras file; the reviewer gets its extra paths and rechecks by running a scope command; the task commit stages the path on its own; `implementor` computes none of these.

### S6 - The arbiter writes its ruling for the register [CHANGED - was: implementor escaped the ruling texts by hand]

Given a build that dispatches the arbiter
When the arbiter rules
Then it writes its output lines to the ruling file its dispatch names, the register and a stalled task's decision are recorded from that file, and `implementor` escapes nothing.

### Edge cases

- The agent is already continuing because of the nudge -> it is not sent back again.
- The scout, mapper or hunter agent, an agent outside viber, or the main session -> no nudge.
- Empty, malformed or truncated hook input, or no final message in it -> nothing happens, the hook exits 0.
- The output line is indented or opens with a backtick, an asterisk or a hyphen -> counts as present; a denied verdict counts as present.
- A semicolon inside quotes or escaped with a backslash (`find ... -exec ... \;`) -> not a chain; a pipe is never refused.
- The coder's `git rm` and its exec-bit `git update-index` -> allowed; `rm` quoted as an argument (`grep -n rm notes.md`) -> allowed; `rm` run through `xargs` -> refused.
- A redirect to `/dev/null` or another absolute path, a descriptor duplication such as `2>&1`, or a target under `.temp/` -> allowed.
- A session resuming a run whose earlier session was cut off -> the leftover extras files of every unfinished task are dropped before the index is printed, so leftover paths reach the `dirty:` and orphan questions exactly as today and no later commit or review reads them.
- The task reviewer or final reviewer chaining commands or using `rm` -> allowed: only the git rule binds them.
- No extras file for the task -> no extra paths reach the reviewer and the commit stages nothing from it.
- An extras path the task's own file map lists -> not an extra path; one a task not yet done claims -> not an extra path, and refused by the commit with today's warning; one under `.temp/` -> refused.
- An extras file holding blank lines, carriage returns or `./`-prefixed paths -> blank lines ignored, carriage returns and the `./` prefix stripped.
- A task commit that names a landed commit -> the extras file is ignored, as explicit extra paths are refused there today.
- A ruling file missing its ruling, reason or cost, one of them empty, the file absent, or a path outside the run's working directory -> nothing is recorded and the file stays.
- Ruling text carrying quotes, dollar signs, backticks or backslashes -> recorded verbatim.
- An arbiter ruling that names no listed option -> the register records the ruling file as written; `implementor` carries out the first option and names the mismatch in the final summary; on a stalled task the decision recorded is the coder's first option, read from the coder's options file.
- The arbiter refused and the user accepts -> the register entry is recorded with fixed words only; on a stalled task the decision recorded is the coder's first option, read from the coder's options file.
- A second ruling on the same subject -> the arbiter reads its ruling file before writing it whole, so the register records the new ruling.

## Glossary

- Nudge - the hook's one-time instruction sending a viber agent back to finish when its final message lacks its output line.
- Guard marker - the fixed prefix opening every refusal of a viber guard; it tells an agent the refusal is a correction to apply, not a denied permission.
- Extras file - the per-task list of paths a task changed or needed outside its file map, kept in the run's working directory: one file for the coder's paths, one for the reviewer's.
- Ruling file - the arbiter's output lines, written to the run's working directory for the build to record.
- Options file - a stalled coder's ways forward, written to the run's working directory so the build can record the first one without retyping it.
- Scope command - the script call a reviewer runs to get its extra paths and rechecks.

## Acceptance criteria

1. A SubagentStop hook sends a viber agent other than the scout, mapper and hunter back once with the nudge when it stops without a `VERDICT:` or `AUDIT:` line, does nothing in every other case, always exits 0, and is wired in `hooks.json`.
2. `implementor`, `adr-tasks.md`, `memory`, `rules` and `e2e` no longer send the nudge themselves, each keeping its existing fallback, and `memory`, `rules` and `planner` no longer list `SendMessage` among their tools.
3. A PreToolUse guard on `Bash` refuses, for the coder, chained commands, the four forbidden git subcommands, `rm` and file writes through `Bash`; for the task reviewer and the final reviewer, only the four git subcommands; it does nothing for every other caller and always exits 0.
4. Every refusal of `kill-guard.sh` and of the new guard opens with the guard marker.
5. The tools paragraph of every viber agent holding `Bash` and of the extension template, and the hard rules of the mapper, hunter and critic, say a refusal carrying the guard marker is a correction to apply and go on, never a denial.
6. The guarded rules stay in `task-coder.md`, `task-reviewer.md` and `final-reviewer.md` as one line per rule with no rationale, and the rationale lives in the new guard's header.
7. A coder and a reviewer each record their extra paths in their own extras file for the task, and the scope command gives the reviewer, from the coder's file, the extra paths and rechecks `implementor` used to compute.
8. A task commit stages the paths of both of the task's extras files under the same ownership rules and warnings as explicit extra paths, plus the two files themselves.
9. `implementor` computes no extra paths, rechecks or resume paths from `EXTRA:` lines, and adds no call before the reviewer.
10. The arbiter writes its output lines to the ruling file its dispatch names, the register entry and a stalled task's decision are recorded from that file, and a decision that must take the coder's first option is recorded from the coder's options file.
11. `implementor` records every ruling and decision without escaping any text.

## Scope

### File map

- add - `viber/hooks/scripts/verdict-nudge.sh` - the SubagentStop nudge.
- add - `tests/viber/verdict-nudge.test.ts` - its tests and the `hooks.json` pin of its entry.
- add - `viber/hooks/scripts/shell-guard.sh` - the PreToolUse `Bash` guard for the coder and the two reviewers, its header holding the rules' rationale.
- add - `tests/viber/shell-guard.test.ts` - its tests and the `hooks.json` pin of its entry.
- modify - `viber/hooks/hooks.json` - the two new entries and the description.
- modify - `viber/hooks/scripts/kill-guard.sh` - the guard marker on its reason.
- modify - `tests/viber/kill-guard.test.ts` - the expected deny object.
- modify - `viber/scripts/plan-index.sh` - the scope mode.
- modify - `tests/viber/plan-index.test.ts` - its tests.
- modify - `viber/scripts/commit-task.sh` - the extras file on a task commit, the ruling file forms of `--rule` and `--decide`, the first-option form of `--decide`, the ruling and options files in the trail.
- modify - `tests/viber/commit-task.test.ts` - their tests.
- modify - `viber/skills/implementor/SKILL.md` - no nudge, the new dispatch lines, no computed extra paths, no escaping.
- modify - `viber/skills/planner/references/adr-tasks.md`, `viber/skills/memory/SKILL.md`, `viber/skills/rules/SKILL.md`, `viber/skills/e2e/SKILL.md`, `viber/skills/planner/SKILL.md` - no nudge, `SendMessage` dropped where nothing else uses it.
- modify - `viber/agents/task-coder.md`, `viber/agents/task-reviewer.md`, `viber/agents/final-reviewer.md` - the one-line rules, the marker sentence, the extras file (coder and task reviewer).
- modify - `viber/agents/closeout.md`, `viber/agents/e2e-writer.md`, `viber/agents/memory-node-writer.md`, `viber/agents/memory-writer.md`, `viber/agents/rules-writer.md`, `viber/agents/test-runner.md`, `viber/skills/extension/templates/extension.md` - the marker sentence in the tools paragraph; the template keeps the agents' wording verbatim.
- modify - `viber/agents/mapper.md`, `viber/agents/hunter.md`, `viber/agents/critic.md` - the marker rule in their hard rules (they hold `Bash`, so `kill-guard.sh` reaches them).
- modify - `viber/agents/arbiter.md` - `Write`, the `ruling` input, the ruling file.
- add - `tests/viber/nudge-prose.unit.test.ts` - pins the removed nudge and the kept fallbacks in the five skills.
- add - `tests/viber/guard-prose.unit.test.ts` - pins the marker sentence and the one-line rules in the agents.
- add - `tests/viber/extras-prose.unit.test.ts` - pins the extras and scope lines in `implementor`, `task-coder` and `task-reviewer`.
- add - `tests/viber/ruling-prose.unit.test.ts` - pins the ruling line and the unescaped record calls in `implementor` and `arbiter`.

### Out of scope

- An auto-commit hook on a reviewer's PASS.
- Coder autonomy, tiers, review waivers.
- New rules for the reviewers, and the new guard for any agent but the three named.
- The tools paragraph of agents without `Bash`: no guard acts on their calls.
- `planner`'s and `code-auditor`'s re-dispatch of a reviewer or critic returning no `VERDICT:` line: they re-dispatch, never `SendMessage`, and keep doing so.
- The background-process `SendMessage` of `implementor` and `e2e`.
- Deferred paths, and the repair, fix-number and final-review fix commits.
- User docs (`README.md`, `docs/`, `help.html`): no user-visible command or setting changes.
- `CLAUDE.md` nodes and `.claude/rules/`: the build's close updates them.

## Solution requirements

- Every script works on Windows (Git Bash) and macOS; hook scripts are `#!/usr/bin/env bash`, use `set -u` and never `set -e`, read JSON without `jq`, fail open and always exit 0.
- Both new hooks return on bash builtins alone, before any external command, for a caller they do not act on: they run on every `Bash` call or agent stop of every session.
- No new orchestrator round-trip per task.
- Review stays exactly as today: the coder's `EXTRA:` line never names a file an unfinished task lists (the coder may not change one, `task-coder.md:34`), so "the coder returned an `EXTRA:` line" forces a review exactly when today's computed lines were non-empty; and the reviewer records its own paths apart from the coder's, so a later review round never lists them.
- After release, a manual check settles the one unverified assumption: dispatch the coder told to run `git stash` (expect a marked refusal and the coder going on, no denial), and dispatch a viber agent told to end without its `VERDICT:` line (expect the nudge).
