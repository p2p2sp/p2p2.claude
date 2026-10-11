---
source: /Users/dario/Projects/p2p2.claude/docs/_specs/2026-10-11-11-37-28_move-deterministic-build-work-from-the-model-to-hooks-and-sc/plan.md
---

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

## Tasks

<!-- TASK -->
### T1 - Send a viber agent back once when it ends without its output line
- TDD: required
- Covers: #1
- Uses: C1
- Depends-on: none
- Files: viber/hooks/scripts/verdict-nudge.sh, tests/viber/verdict-nudge.test.ts, viber/hooks/hooks.json
- Delivers: the SubagentStop hook script of C1, wired in `hooks.json` with its description naming it, with tests.
- Verification: node --test tests/viber/verdict-nudge.test.ts tests/viber/plan-gate.test.ts tests/viber/session-start.test.ts -> every test passes
- DoD: a `viber:task-coder` payload whose final message holds no `VERDICT:` or `AUDIT:` line prints the C1 block object; a final message holding `VERDICT: PASS` on any line, indented or after a leading backtick, asterisk or hyphen, prints nothing; a final message holding `VERDICT: DENIED` prints nothing; a final message holding an `AUDIT:` line prints nothing; `stop_hook_active: true` prints nothing; `viber:scout`, `viber:mapper`, `viber:hunter`, a non-viber `agent_type` and a missing `agent_type` each print nothing; empty stdin, malformed JSON and a payload with no `last_assistant_message` each print nothing; every case exits 0; `hooks.json` holds a `SubagentStop` entry running `bash "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/verdict-nudge.sh"` with timeout 10, and its description names the SubagentStop hook, says every hook fails open and still names `planning.plain-plan-review` and the schema note
<!-- /TASK -->

<!-- TASK -->
### T2 - Refuse the coder's and reviewers' forbidden shell commands with a fix
- TDD: required
- Covers: #3, #4, #6
- Uses: C2, C3
- Depends-on: T1
- Files: viber/hooks/scripts/shell-guard.sh, tests/viber/shell-guard.test.ts, viber/hooks/hooks.json
- Delivers: the PreToolUse `Bash` guard of C3 with the C2 marker, its header carrying the rationale of the rules it enforces, wired in `hooks.json` with the description naming it, with tests.
- Verification: node --test tests/viber/shell-guard.test.ts tests/viber/plan-gate.test.ts tests/viber/session-start.test.ts -> every test passes
- DoD: from `viber:task-coder`, `make build && make test`, `a; b` and `a || b` print the R1 deny object; from each of the three guarded agents, `git stash`, `git -C sub checkout main`, `git restore x` and `git clean -fd` print the R2 deny object; from `viber:task-coder`, `rm -rf build` and `ls | xargs -r rm` print the R3 deny object; from `viber:task-coder`, `sed -i 's/a/b/' f`, `perl -pi -e 's/a/b/' f`, `echo x > src/a.ts`, `echo x >> src/a.ts` and `tee src/a.ts` print the R4 deny object; from `viber:task-coder`, `grep -n "a;b" f`, `find . -name x -exec cat {} \;`, `ls | grep a`, `git rm -r -q -- old`, `git update-index --chmod=+x -- s.sh`, `grep -n rm notes.md`, `npm test > /dev/null 2>&1`, `npm test > /tmp/log.txt` and `npm test > .temp/viber/T1/log.txt` print nothing; `a && b` and `rm x` from `viber:task-reviewer` and `viber:final-reviewer` print nothing; every guarded command from the main session, a non-viber agent and `viber:test-runner` prints nothing; empty stdin and malformed JSON print nothing; every case exits 0; every deny reason opens with the C2 marker; the script header states that one stash stack serves every coder sharing the tree, that one refused part refuses a whole chained call, and that a scripted substitution missing its pattern exits 0 on unchanged code, and that an unquoted newline is deliberately not refused; `hooks.json` holds a PreToolUse `Bash` entry running `bash "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/shell-guard.sh"` with timeout 10 beside the `kill-guard.sh` entry, and its description names the guard, says every hook fails open and still names `planning.plain-plan-review` and the schema note
<!-- /TASK -->

<!-- TASK -->
### T3 - Open kill-guard's refusal with the guard marker
- TDD: required
- Covers: #4
- Uses: C2
- Depends-on: T2
- Files: viber/hooks/scripts/kill-guard.sh, tests/viber/kill-guard.test.ts, viber/hooks/hooks.json
- Delivers: `kill-guard.sh` refusing the same commands with its reason opening with the C2 marker, its tests updated, and the `hooks.json` description saying so.
- Verification: node --test tests/viber/kill-guard.test.ts tests/viber/plan-gate.test.ts tests/viber/session-start.test.ts -> every test passes
- DoD: every refused command prints the deny object whose reason is the C2 marker followed by today's reason text; every command allowed today still prints nothing; every case exits 0; the `hooks.json` description says both guards open their refusal with the marker, says every hook fails open and still names `planning.plain-plan-review` and the schema note
<!-- /TASK -->

<!-- TASK -->
### T4 - Drop the missing-output-line SendMessage from the skills
- TDD: none
- Covers: #2
- Uses: C1
- Depends-on: T1
- Files: viber/skills/implementor/SKILL.md, viber/skills/planner/references/adr-tasks.md, viber/skills/memory/SKILL.md, viber/skills/rules/SKILL.md, viber/skills/e2e/SKILL.md, viber/skills/planner/SKILL.md, tests/viber/nudge-prose.unit.test.ts
- Delivers: the five skill texts handling a reply without its output line by their existing fallback alone, `memory`, `rules` and `planner` without `SendMessage` in their tools, and a unit test pinning both.
- Verification: node --test tests/viber/nudge-prose.unit.test.ts -> every test passes
- DoD: the test asserts `verdict-nudge.sh` holds the C1 reason text and none of the five skill files does; the test asserts each of the five keeps its fallback naming `no verdict returned`; the test asserts `memory/SKILL.md` and `rules/SKILL.md` name `SendMessage` neither in `allowed-tools` nor in their "whole tool set" sentence; the test asserts `planner/SKILL.md` lacks `SendMessage` in `allowed-tools` and keeps its sentence forbidding a `SendMessage` to a reviewer; the test asserts `implementor/SKILL.md` and `e2e/SKILL.md` keep `SendMessage` in `allowed-tools` and their background-process rule
<!-- /TASK -->

<!-- TASK -->
### T5 - Teach the agents the guard marker and compress the guarded rules
- TDD: none
- Covers: #5, #6
- Uses: C2, C3, C8
- Depends-on: T3
- Files: viber/agents/task-coder.md, viber/agents/task-reviewer.md, viber/agents/final-reviewer.md, viber/agents/closeout.md, viber/agents/e2e-writer.md, viber/agents/memory-node-writer.md, viber/agents/memory-writer.md, viber/agents/rules-writer.md, viber/agents/test-runner.md, viber/skills/extension/templates/extension.md, viber/agents/mapper.md, viber/agents/hunter.md, viber/agents/critic.md, tests/viber/guard-prose.unit.test.ts
- Delivers: the C8 marker sentence in the tools paragraph of the nine agents holding `Bash` and the extension template, the C8 auditor rule in the hard rules of `mapper`, `hunter` and `critic`, the C8 one-line rules in `task-coder.md`, `task-reviewer.md` and `final-reviewer.md`, and a unit test pinning them against the guard scripts.
- Verification: node --test tests/viber/guard-prose.unit.test.ts -> every test passes
- DoD: the test asserts the tools paragraph of each of the nine agents and of the extension template carries the C8 marker sentence word for word, after its `No such tool available` sentence; the test asserts the `## Hard rules` of `mapper.md`, `hunter.md` and `critic.md` each carry the C8 auditor rule word for word; the test asserts the deny text of `shell-guard.sh` and of `kill-guard.sh` both hold the marker the sentence names; the test asserts `task-coder.md` carries each of the four C8 coder lines word for word and still holds the phrases `never commit`, `never branch`, `protected file`, `FILES:` or `EXTRA:` line, `git show HEAD:<path>` and the copy of a file kept under the `out` directory; the test asserts `task-reviewer.md` and `final-reviewer.md` each carry the C8 reviewer clause word for word; the test asserts none of the three agents holds the phrase `stash stack`, while `shell-guard.sh` does
<!-- /TASK -->

<!-- TASK -->
### T6 - Print a task's reviewer scope from its extras file
- TDD: required
- Covers: #7
- Uses: C4, C5
- Depends-on: none
- Files: viber/scripts/plan-index.sh, tests/viber/plan-index.test.ts
- Delivers: the scope mode of C5, and `--split` dropping the leftover C4 extras files of unfinished tasks, with tests.
- Verification: node --test tests/viber/plan-index.test.ts -> every test passes
- DoD: a coder file listing a path no task claims prints `extra:` with that path and no `recheck:` line; a path under `.temp/` is left off; a reviewer file is never read; a path a done task claims prints it on `extra:` and one `recheck: <that id> | <its Verification command>` line; a path the task's own `Files` lists is left off; a path a task not yet done claims is left off; several paths print one comma-separated `extra:` line in file order, with `recheck:` lines in task order and one per task; blank lines are ignored and a carriage return or leading `./` is stripped; a missing extras file and one leaving no path print nothing and exit 0; an id the plan does not hold exits 2; `--extra` with `--split` exits 2; `--split` removes the coder file and the reviewer file of every task not done, keeps those of a done task, and then prints `orphan:` and `dirty:` lines exactly as it would with no extras file; the index output of the plain and `--split` modes is otherwise unchanged
<!-- /TASK -->

<!-- TASK -->
### T7 - Stage a task's extras file paths in its commit
- TDD: required
- Covers: #8
- Uses: C4
- Depends-on: none
- Files: viber/scripts/commit-task.sh, tests/viber/commit-task.test.ts
- Delivers: the task commit (with or without `--unreviewed`) taking every path of the task's two C4 extras files as if passed on `--with`, and staging both files with the task's work trail, with tests.
- Verification: node --test tests/viber/commit-task.test.ts -> every test passes
- DoD: a coder-file path and a reviewer-file path no task claims both land in the task's commit; an extras path an unfinished task claims is refused with `warning: refused <path> - claimed by task <id>` and the rest commits; an extras path a done task claims lands with `warning: took <path> - claimed by committed task <id>`; an extras path under `.temp/` is refused; a path both on `--with` and in the extras file is committed once; blank lines, carriage returns and a leading `./` are handled as C4 says; both extras files themselves land in the task's commit, their names derived from the task id as C4 gives them; a task with no extras file commits exactly as before; `--landed` ignores both extras files
<!-- /TASK -->

<!-- TASK -->
### T8 - Record a ruling and a decision from the arbiter's ruling file
- TDD: required
- Covers: #10
- Uses: C6
- Depends-on: T7
- Files: viber/scripts/commit-task.sh, tests/viber/commit-task.test.ts
- Delivers: the `--rule ... --from`, `--decide ... --from` and `--decide ... --first-of` forms of C6 beside the unchanged text forms, the ruling file riding in the next commit with the register and the options file in the task's trail, with tests.
- Verification: node --test tests/viber/commit-task.test.ts -> every test passes
- DoD: `--rule --from` on a ruling file holding `VERDICT: RULED`, `RULING:`, `WHY:` and `COST:` lines appends the same register line the text form writes for those texts, prints `ruled: <subject>` and `progress: unchanged`, commits nothing and keeps the file; texts carrying `"`, `$`, a backtick and a backslash are recorded verbatim; the same file recorded twice leaves one register line; `--decide --from` appends `decision: <id>: auto: <ruling text>` to `status.md` exactly as the text form does for `auto: <ruling text>`; `--decide --first-of` on an options file holding `DECIDE: a $x | b` appends `decision: <id>: auto: a $x`; an options file with no `DECIDE:` line or an empty first option exits 2 with `status.md` unchanged; the task commit stages a changed `<run-dir>/work/<id>-options.md` with the task's trail; a file missing any of its required lines, with one of them empty, an absent file, and a path outside `<run-dir>/work/` each exit 2 with `rulings.md` and `status.md` byte for byte unchanged and the file kept; the subject and task-id rules of the text forms apply; every form that stages `rulings.md` also stages a changed `<run-dir>/work/ruling-*.md`; every existing text-form case still passes; the script header's usage and its `--rule` and `--decide` paragraphs name both `--from` forms and the `--first-of` form
<!-- /TASK -->

<!-- TASK -->
### T9 - Hand the extras file to the coder and reviewer instead of computing their lines
- TDD: none
- Covers: #7, #8, #9
- Uses: C4, C5, C7
- Depends-on: T4, T5, T6, T7
- Files: viber/skills/implementor/SKILL.md, viber/agents/task-coder.md, viber/agents/task-reviewer.md, tests/viber/extras-prose.unit.test.ts
- Delivers: `implementor` dispatching the C7 extras and scope lines, committing a task with no `--with`, and deciding a forced review from the coder's `EXTRA:` line alone; `task-coder` recording its `EXTRA:` paths in the coder's extras file and reading it as earlier attempts' work; `task-reviewer` taking its `extra:` and `recheck:` lines from the scope command and recording its own `EXTRA:` paths in the reviewer's extras file; a unit test pinning these lines against the scripts.
- Verification: node --test tests/viber/extras-prose.unit.test.ts -> every test passes
- DoD: the test asserts the coder dispatch of `implementor/SKILL.md` carries the C7 `extras:` line and its reviewer dispatch the C7 `extras:` and `scope:` lines; the test asserts `implementor/SKILL.md` names no `--with` and builds no `extra:`, `recheck:` or `EXTRA:`-derived `resume:` line, while the `resume:` line of a `dirty:` answer stays; the test asserts the scope line names the `--extra` mode `plan-index.sh` declares and the extras path ends in the `-extra.md` name `commit-task.sh` derives; the test asserts a coder `PASS` goes to review when review is due or the task's coder returned an `EXTRA:` line in any attempt; the test asserts `implementor/SKILL.md` runs no `plan-index.sh` call of its own between a coder's return and the reviewer dispatch, the `--extra` mode appearing only inside the `scope:` line; the test asserts `task-coder.md` names the `extras` input line, reads that file first when it exists, appends its `EXTRA:` paths to it once, continues the paths already in it, exempts them from its uncommitted-changes check as it exempts its `resume` paths, and never names on `EXTRA:` a file a task not yet done lists; the test asserts `task-reviewer.md` names the `extras` and `scope` input lines, runs the scope command before judging, reads its `extras` file first when it exists, appends its own `EXTRA:` paths to it once, and names that file beside its report as the files it may write; the test asserts the reviewer's `extras:` path ends in the `-extra-review.md` name `commit-task.sh` derives
<!-- /TASK -->

<!-- TASK -->
### T10 - Let the arbiter write its ruling and record it unescaped
- TDD: none
- Covers: #10, #11
- Uses: C6, C7
- Depends-on: T8, T9
- Files: viber/agents/arbiter.md, viber/skills/implementor/SKILL.md, viber/agents/task-coder.md, tests/viber/ruling-prose.unit.test.ts
- Delivers: `arbiter` with `Write`, a `ruling` input line and its output lines written to that file; `task-coder` writing its `DECIDE:` line to the options file; `implementor` dispatching the C7 `ruling:` and `decide-file:` lines, recording rulings and decisions through the C6 file forms, and recording an accepted refused arbiter with fixed words; a unit test pinning these lines against the script.
- Verification: node --test tests/viber/ruling-prose.unit.test.ts -> every test passes
- DoD: the test asserts `arbiter.md` lists `tools: Read, Grep, Glob, Write`, its tools paragraph names Read, Grep, Glob and Write, it names the `ruling` input line, reads that path first when it exists, writes its four output lines to it whole before returning them, writes no other file, and no longer says it changes no files; the test asserts `task-coder.md` names the `decide-file` input line, reads that file first when it exists, and writes its `DECIDE:` line there, whole, whenever it returns one; the test asserts every arbiter dispatch of `implementor/SKILL.md` carries the C7 `ruling:` line and every task coder dispatch the C7 `decide-file:` line; the test asserts an accepted refused arbiter records the C7 `<first option>` word of its case; the test asserts `implementor/SKILL.md` records rulings and decisions only through the C7 `--from`, `--first-of` and fixed-words calls, and each form appears in `commit-task.sh`'s usage; the test asserts `implementor/SKILL.md` holds no instruction to rewrite a quote, dollar sign, backtick or backslash; the test asserts a `decide` ruling naming no listed option, and an accepted refused arbiter on case `decide`, record the decision through the C7 `--first-of` call, and a ruling naming no listed option is carried out as the first option with the mismatch named in the final summary
<!-- /TASK -->

## Contracts

### C1 - SubagentStop nudge

File: viber/hooks/scripts/verdict-nudge.sh

```
stdin  : SubagentStop JSON; read: top-level "agent_type", "stop_hook_active",
         "last_assistant_message" (JSON-unescaped: \n, \r, \t, \", \\).
acts   : agent_type starts "viber:" and is none of viber:scout, viber:mapper,
         viber:hunter; stop_hook_active is not true; last_assistant_message is
         present; no line of it, after optional leading whitespace and any
         leading "`", "*" or "-" characters, starts "VERDICT:" or "AUDIT:".
stdout : when it acts, exactly
         {"decision":"block","reason":"Finish your task, then return your output lines."}
         otherwise nothing.
exit   : 0 always (fail-open). A non-matching agent_type returns on bash builtins alone.
```

### C2 - Guard marker

File: none

```
Every refusal a viber guard prints (kill-guard.sh, shell-guard.sh):
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"viber guard: <text>"}}

kill-guard.sh <text>: today's reason text, unchanged.
shell-guard.sh <text>: the reason of the matching C3 rule.
```

### C3 - Shell guard rules

File: viber/hooks/scripts/shell-guard.sh

```
stdin  : PreToolUse JSON; read: top-level "agent_type", "tool_input.command"
         (JSON-unescaped as kill-guard.sh does).
agents : viber:task-coder -> R1, R2, R3, R4; viber:task-reviewer and
         viber:final-reviewer -> R2 only; any other caller -> nothing printed,
         returning on bash builtins alone.
quoting: operators and words count only outside quotes: '...' is literal,
         "..." honours backslash escapes, a backslash outside quotes escapes
         the next character.
command position: the start of the command or right after an unquoted
         |, ;, &, (, $(, a backtick or a newline, whitespace allowed.
R1 chain : an unquoted ";", "&&" or "||". An unquoted newline is not refused:
           the rule names these three operators only, and the header says so.
R2 git   : "git" in command position, any global options (-C <arg>, -c <arg>,
           --git-dir=..., --work-tree=..., other -options), then the subcommand
           stash, checkout, restore or clean.
R3 rm    : the word "rm" in command position, or "xargs" in command position
           whose command word, after its options, is "rm" (git rm and rmdir
           are not rm).
R4 write : "sed" in command position with an argument -i..., or --in-place...;
           "perl" in command position with an option cluster holding i (-i, -pi);
           an unquoted >, >>, &> or <digit>> whose target is a relative path
           (not opening with "/", "~" or "$", not &<digit>) that does not
           start .temp/ or ./.temp/; "tee" in command position with such a
           file argument. An absolute target (/dev/null, /tmp/x) is not refused:
           the rule guards the working tree, where the coder's cwd is.
order  : the first rule matching, R1 then R2, R3, R4, gives the one deny printed.
reasons, each printed after the C2 marker:
  R1: one command per Bash call - run each part of the chain as its own Bash call.
  R2: git is read-only here (status, diff, log, show) - compare with git show HEAD:<path> or git diff instead.
  R3: remove a file or directory with git rm -r -q -- <path>, never rm.
  R4: Bash never writes a file - change it with Edit or Write, and redirect scratch output only under .temp/.
exit   : 0 always (fail-open: empty or malformed input prints nothing).
```

### C4 - Extras file

File: none

```
paths   : coder file    <run-dir>/work/<task-id>-extra.md
          reviewer file <run-dir>/work/<task-id>-extra-review.md
content : one repo-relative path per line, forward slashes, no "./", no
          duplicate, nothing else; created by its first writer.
writers : task-coder (a dispatch with a task file and an extras line) appends
          each path of its EXTRA: line to the coder file; task-reviewer appends
          each path of its EXTRA: line to the reviewer file; each reads its
          file first when it exists and skips a path already listed.
readers : plan-index.sh --extra reads the coder file only; commit-task.sh's
          task commit reads both; both ignore blank lines and strip a carriage
          return and a leading "./".
lifetime: one session: plan-index.sh --split, which every build session runs
          first, removes both files of every task not yet done before it
          prints the index; a done task's files stay, committed in its trail.
```

### C5 - Scope command

File: viber/scripts/plan-index.sh

```
argv   : plan-index.sh <plan> --extra <task-id>
reads  : the plan, status.md beside it, the C4 coder file
stdout : extra: <path>,<path>,...      paths of the coder file in file order,
                                       minus one the task's own Files lists, one
                                       a task not yet done claims and one under
                                       .temp/; omitted
                                       when none remains
         recheck: <id> | <command>     one per done task whose Files claims a
                                       path on extra:, in task order, <command>
                                       its Verification command as on verify:
         nothing at all when no path remains or the file is missing
exit   : 0; 2 for an id the plan lacks, --extra combined with --split, or the
         existing argv and plan errors; 3 and 4 as today
```

### C6 - Ruling file forms

File: viber/scripts/commit-task.sh

```
argv   : commit-task.sh --rule <plan> <subject> --from <ruling-file>
         commit-task.sh --decide <plan> <task-id> --from <ruling-file>
         commit-task.sh --decide <plan> <task-id> --first-of <options-file>
         (the text forms --rule <plan> <subject> <ruling> <why> <cost> and
          --decide <plan> <task-id> <text> stay)
file   : under <run-dir>/work/; a trailing carriage return is stripped from
         every line read. Ruling file: the first line starting "RULING: ",
         "WHY: " and "COST: " each gives its text, other lines ignored; --rule
         needs all three, --decide --from only RULING. Options file: the first
         line starting "DECIDE: "; its text split on " | ", the first part
         trimmed is the option.
--first-of: records as the text form for the text "auto: <first option>".
--rule : records as the text form for those three texts: same subject rules,
         same "- <subject>: <ruling> | why: <why> | cost if wrong: <cost>" line,
         same no-duplicate rule; stdout "ruled: <subject>", "progress: unchanged";
         commits nothing; keeps the file.
--decide: records as the text form for the text "auto: <ruling>".
trail  : every form that stages rulings.md also stages a changed
         <run-dir>/work/ruling-*.md; a task commit also stages a changed
         <run-dir>/work/<task-id>-options.md.
exit   : 2 for a missing or unreadable file, a path outside <run-dir>/work/, a
         missing or empty required text, and the text forms' argv errors; 3 for
         a task id the plan lacks. Any non-zero exit leaves rulings.md,
         status.md and the ruling file untouched.
```

### C7 - Dispatch and record lines

File: none

```
coder dispatch, every attempt of a task:  extras: <dir>/work/<id>-extra.md
                                          decide-file: <dir>/work/<id>-options.md
reviewer dispatch:                        extras: <dir>/work/<id>-extra-review.md
                                          scope: "${CLAUDE_PLUGIN_ROOT}/scripts/plan-index.sh" "<plan>" --extra "<id>"
arbiter dispatch:                         ruling: <dir>/work/ruling-<subject>.md
         <subject> the task id, else the case name (baseline, tests, final-review, commit)
record a ruling:   "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" --rule "<plan>" "<subject>" --from "<dir>/work/ruling-<subject>.md"
record a decision: "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" --decide "<plan>" "<id>" --from "<dir>/work/ruling-<id>.md"
record a decision taking the coder's first option (a decide ruling naming no
listed option, or an accepted refused arbiter on case decide):
                   "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" --decide "<plan>" "<id>" --first-of "<dir>/work/<id>-options.md"
record an accepted refused arbiter:
                   "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" --rule "<plan>" "<subject>" "<first option>" "the arbiter was refused" "not assessed - the arbiter was refused"
         <first option> the case's own first word (accept, skip, continue,
         leave uncommitted) on cases cap, baseline, tests, final-review and
         commit; the fixed phrase "the coder's first option" on case decide.
task commit:       "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "<plan>" "<id>" plus the deferred and unreviewed options as today, and no other option
```

### C8 - Agent prose lines

File: none

```
Marker sentence, appended to the tools paragraph of every non-auditor agent
holding Bash and of the extension template, after its "No such tool available" sentence:
  A refusal whose reason opens with `viber guard:` is no refusal either: correct the command as the reason says, then go on.

task-coder lines, one per rule:
  - One command per `Bash` call, never chained with `;`, `&&` or `||`.
  - Files change through `Edit` and `Write` alone, never through `Bash`.
  - Remove a file or directory with `git rm -r -q -- <path>`, never `rm`.
  - Git is read-only (`status`, `diff`, `log`, `show`), never `stash`, `checkout`, `restore` or `clean`; your only index writes are `git rm` and `git update-index --chmod=+x`.

task-coder sentences of lines 39, 40 and 47 that stay, each keeping its meaning:
  Bash reads, searches, builds and tests; never commit, never branch, never
  touch a protected file; a git rm removal or an exec-bit path still goes on
  your FILES: or EXTRA: line; compare with the committed state through
  git show HEAD:<path> or git diff; keep your own work ahead of a risky change
  with a copy of your file under your out directory.

mapper, hunter and critic, one bullet in ## Hard rules:
  - A refusal whose reason opens with `viber guard:` is a correction: change the command as the reason says, then go on.

task-reviewer and final-reviewer clause, inside their opening paragraph:
  your git is read-only (`status`, `diff`, `log`, `show`), never `stash`, `checkout`, `restore` or `clean`
```
