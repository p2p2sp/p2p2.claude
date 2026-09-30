To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Long test suites and process cleanup in viber agents

## Goal

viber's `test-runner` breaks on a full suite longer than the 600-second foreground Bash limit: it starts the suite again while the first run is still going and then kills processes by name, which hits processes it never started. The shared "Stop what you started" section of five agents asks for a `ps` check that cannot tell an agent's own processes from anyone else's. This change makes the suite run exactly once and wait for it, makes the stop check target only the agent's own processes, and adds a hook that refuses killing by name inside viber agents.

## Acceptance criteria

1. `test-runner` runs the full suite exactly once, in the background, writing the suite output and a closing `exit=<code>` line to a log under `.temp/viber/test-runner/`, and waits for that line with a foreground wait it repeats on its own, never starting the run a second time.
2. The "Stop what you started" section of `task-coder`, `task-reviewer`, `test-runner`, `e2e-writer` and `final-reviewer` confirms each stopped process with `kill -0 <PID>` instead of `ps`, the section text identical in all five.
3. A viber `PreToolUse` hook on `Bash` refuses, with a reason the model reads, a command that stops processes by name (`killall`, `pkill`, `taskkill` by image name, `xargs` running `kill`, `kill` fed by a command substitution) when the call comes from an agent whose `agent_type` starts with `viber:`; `kill <PID>`, `kill -0 <PID>`, `kill $!` and `taskkill` by process id pass. [D1]
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

## Deviations

D1 (#3): the hook refuses a stop-by-name command only in command position (the start of the command or right after `;`, `&`, `|`, `(`, a backtick, `$(` or a newline); one behind a wrapper such as `sudo killall`, `env pkill` or `timeout 5 pkill x` passes.
