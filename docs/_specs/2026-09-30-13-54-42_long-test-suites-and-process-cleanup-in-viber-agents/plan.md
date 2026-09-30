---
source: C:/Projects/p2p2.claude/docs/_specs/2026-09-30-13-54-42_long-test-suites-and-process-cleanup-in-viber-agents/plan.md
---

To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Long test suites and process cleanup in viber agents

## Goal

viber's `test-runner` breaks on a full suite longer than the 600-second foreground Bash limit: it starts the suite again while the first run is still going and then kills processes by name, which hits processes it never started. The shared "Stop what you started" section of five agents asks for a `ps` check that cannot tell an agent's own processes from anyone else's. This change makes the suite run exactly once and wait for it, makes the stop check target only the agent's own processes, and adds a hook that refuses killing by name inside viber agents.

## Acceptance criteria

1. `test-runner` runs the full suite exactly once, in the background, writing the suite output and a closing `exit=<code>` line to a log under `.temp/viber/test-runner/`, and waits for that line with a foreground wait it repeats on its own, never starting the run a second time.
2. The "Stop what you started" section of `task-coder`, `task-reviewer`, `test-runner`, `e2e-writer` and `final-reviewer` confirms each stopped process with `kill -0 <PID>` instead of `ps`, the section text identical in all five.
3. A viber `PreToolUse` hook on `Bash` refuses, with a reason the model reads, a command that stops processes by name (`killall`, `pkill`, `taskkill` by image name, `xargs` running `kill`, `kill` fed by a command substitution) when the call comes from an agent whose `agent_type` starts with `viber:`; `kill <PID>`, `kill -0 <PID>`, `kill $!` and `taskkill` by process id pass.
4. The hook stays silent (no decision, the normal permission flow applies) for every call outside viber agents, for input with no `agent_type`, for unreadable or malformed input and for every command it does not refuse; it never answers `allow` and always exits 0.
5. A test in `tests/viber/` proves every refusal, every allowed form, the main-session and non-viber cases and the hook's registration in `hooks.json`; the hook's contract sits in its script header and in the `hooks.json` description.

## Scope

### File map

- add - `viber/hooks/scripts/kill-guard.sh` - the `PreToolUse` hook refusing stop-by-name commands in viber agents
- modify - `viber/hooks/hooks.json` - registers `kill-guard.sh` on `Bash` and describes it
- add - `tests/viber/kill-guard.test.ts` - the hook's regression suite
- modify - `viber/agents/task-coder.md`, `viber/agents/task-reviewer.md`, `viber/agents/e2e-writer.md`, `viber/agents/final-reviewer.md` - the shared "Stop what you started" section
- modify - `viber/agents/test-runner.md` - the shared section plus how the full suite runs and is waited for

### Out of scope

- Blocking a second suite run with a hook: no hook event reports a command moved to the background.
- A time cap on a suite that never finishes.
- `test-runner`'s model, `SubagentStop`, and the user's own main session.
- `viber/skills/setup/assets/help.html` and `viber/README.md` - unchanged: neither describes hooks, and `test-runner` still runs the suite once.
- `CLAUDE.md` files (`viber/hooks/CLAUDE.md`, `viber/agents/CLAUDE.md`, `viber/CLAUDE.md`, `tests/viber/CLAUDE.md`) - the build's memory close updates them.

## Tasks

<!-- TASK -->
### T1 - Refuse stopping processes by name inside viber agents
- TDD: required
- Covers: #3, #4, #5
- Uses: C1
- Depends-on: none
- Files: viber/hooks/scripts/kill-guard.sh, viber/hooks/hooks.json, tests/viber/kill-guard.test.ts
- Delivers: A `PreToolUse` hook on `Bash`, registered in `hooks.json` next to the plan gate and named in that file's description, that refuses the stop-by-name command forms of C1 when the call comes from a `viber:` agent and stays silent for everything else; a script header carrying its contract per `.claude/rules/shell-script-header.md`; a test file proving it.
- Verification: bash -n viber/hooks/scripts/kill-guard.sh && node --test tests/viber/kill-guard.test.ts -> syntax check exit 0, every test passes
- DoD: from `agent_type` `viber:test-runner`, `killall -9 dotnet` is refused with the C1 deny object; `pkill -f "dotnet test"` is refused; `taskkill //IM dotnet.exe //F` and `taskkill /im dotnet.exe` are refused; `ps aux | grep dotnet | awk '{print $1}' | xargs -r kill -9` is refused; `kill -9 $(pgrep -f dotnet)` and a `kill` fed by backticks are refused; `kill 1234`, `kill -9 1234 5678`, `kill -0 1234`, `kill $!` and `taskkill //PID 1234 //T //F` produce empty stdout; `grep -n "killall" notes.md` produces empty stdout; `killall -9 dotnet` with no `agent_type` produces empty stdout; `killall -9 dotnet` from `agent_type` `Explore` produces empty stdout; malformed JSON and empty stdin produce empty stdout; every case exits 0; no case prints `"permissionDecision":"allow"`; `hooks.json` holds a `PreToolUse` entry with matcher `Bash` running `bash "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/kill-guard.sh"`
<!-- /TASK -->

<!-- TASK -->
### T2 - Confirm stopped processes with kill -0 in the five agents
- TDD: none
- Covers: #2
- Uses: C3
- Depends-on: none
- Files: viber/agents/task-coder.md, viber/agents/task-reviewer.md, viber/agents/test-runner.md, viber/agents/e2e-writer.md, viber/agents/final-reviewer.md
- Delivers: The "Stop what you started" section of all five agents replaced by the C3 paragraph, word for word, under the unchanged heading.
- Verification: grep -c -F 'kill -0 <PID>' viber/agents/task-coder.md viber/agents/task-reviewer.md viber/agents/test-runner.md viber/agents/e2e-writer.md viber/agents/final-reviewer.md && grep -h -A2 '^## Stop what you started$' viber/agents/task-coder.md viber/agents/task-reviewer.md viber/agents/test-runner.md viber/agents/e2e-writer.md viber/agents/final-reviewer.md | grep -v -e '^--$' | sort | uniq -c -> each file reports 1, and every distinct line of the five sections is counted 5 times
- DoD: each of the five files holds the C3 paragraph exactly once under `## Stop what you started`; no file under `viber/agents/` holds the text "confirm with `ps`"; the five sections are identical line for line
<!-- /TASK -->

<!-- TASK -->
### T3 - Run the full suite once in the background and wait for its exit line
- TDD: none
- Covers: #1
- Uses: C2
- Depends-on: T2
- Files: viber/agents/test-runner.md
- Delivers: `test-runner`'s `## Run` section runs the full suite per C2 - one background run writing the C2 log, a repeated foreground wait for its `exit=` line, the verdict read from that log - in place of the single foreground run with a long timeout; the rest of the section (manifest lookup, build first, end-to-end layer left out, no re-run, no narrowing) keeps its meaning.
- Verification: grep -c -F '.temp/viber/test-runner/' viber/agents/test-runner.md && grep -c -F 'exit=' viber/agents/test-runner.md && ! grep -q -F 'explicit generous timeout' viber/agents/test-runner.md -> both counts print 1 or more and the whole command exits 0
- DoD: `## Run` names the C2 log path; `## Run` names the C2 background run with its `exit=` line; `## Run` names the C2 wait and says the wait, never the run, is what repeats; `## Run` no longer asks for one foreground suite run with a long timeout; the build still runs before the tests and a failed build still runs no test
<!-- /TASK -->

## Contracts

### C1 - kill-guard hook

File: viber/hooks/scripts/kill-guard.sh, viber/hooks/hooks.json

Registration (`hooks.json`, under `PreToolUse`):

```
{ "matcher": "Bash", "hooks": [ { "type": "command", "command": "bash \"${CLAUDE_PLUGIN_ROOT}/hooks/scripts/kill-guard.sh\"", "timeout": 10 } ] }
```

stdin: `PreToolUse` JSON; read keys `agent_type` (top level, present only inside a subagent) and `tool_input.command`.

Refused only when `agent_type` starts with `viber:` and the command holds, in command position (the start of the command or right after `;`, `&`, `|`, `(`, a backtick, `$(` or a newline, whitespace allowed between), any of:

- `killall`
- `pkill`
- `taskkill` with an `/IM` argument (any case, one or two leading slashes)
- `xargs` whose command word is `kill` (xargs options allowed between)
- `kill` whose arguments hold a command substitution (`$(` or a backtick)

Refused -> stdout, one line:

```
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Stopping processes by name is refused in viber agents: it also stops processes you did not start. Stop only the PIDs you started yourself with kill <PID>, then confirm each is gone with kill -0 <PID>."}}
```

Anything else -> empty stdout. Exit code: always 0. A call whose input does not name a `viber:` agent returns before running any external command.

### C2 - test-runner suite log

File: viber/agents/test-runner.md

- Log: `.temp/viber/test-runner/<report file name without .md>.log`, deleted before the run starts.
- Run, one Bash call with `run_in_background`: `<test command> > <log> 2>&1; echo "exit=$?" >> <log>`
- Wait, one foreground Bash call at timeout 600000, repeated until it returns with the line present: `until grep -q '^exit=' <log> 2>/dev/null; do sleep 10; done`
- Result: the suite output, then the closing `exit=<code>` line, both read from the log.

### C3 - Stop what you started

File: viber/agents/task-coder.md, viber/agents/task-reviewer.md, viber/agents/test-runner.md, viber/agents/e2e-writer.md, viber/agents/final-reviewer.md

```
Before you return, stop every process you started in the background: `kill` each PID it spawned, not just its shell, and confirm each one is gone with `kill -0 <PID>`, which must fail - a process left running outlives you and lands in the caller's session. Start such a process only through the Bash tool's `run_in_background`, never detached with `&`, `nohup`, `setsid` or `start`, which the harness cannot see.
```
