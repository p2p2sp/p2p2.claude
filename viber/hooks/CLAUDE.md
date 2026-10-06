# viber hooks - session start, plan gate, plan hints, kill guard and task panel

`content/manifest.md` names two skills only to scope rules (`viber:fixer`'s reproduction test,
`viber:intent`'s fast path, where a design approved in chat counts as an approved plan);
renaming either skill renames it there too, or the rule silently stops covering it.

## Session start

`scripts/session-start.sh` fires on the `hooks.json` matcher `startup|clear|compact` (that is
where `resume` is excluded, not the script). Any wrapping markers or preamble for the manifest
live in `content/manifest.md` itself, never in the script. The `viber loaded <version>` banner
is a top-level `systemMessage` (nested in `hookSpecificOutput` it is silently ignored), its
version the plugin-root basename, `dev` when `CLAUDE_PLUGIN_ROOT` is unset. It always exits 0.

The banner carries a schema note when the project's `.claude/viber.yml` `schema:` (payload `cwd`,
0 when missing or not a number) is lower than `skills/setup/templates/viber.yml`'s (run
`/viber:setup`) or higher (update the plugin); equal, no file or an unreadable template leaves the
plain banner. The note never touches the manifest.

## Plan-mode episode

Both plan hooks look only at the current episode: the transcript after the last
`"type":"permission-mode"` record whose mode is not `plan`. That is why a plan approved and built
earlier in the session never re-arms the gate.

## Plan gate

`scripts/plan-gate.sh` arms on a write to `plans/*.md` in the current plan-mode episode and
picks `planner-review` when a Skill tool_use named bare `planner` or `viber:planner` ran in it
(or its own `EnterPlanMode`, reached before any user prompt or `plan` record, opened it: a
mid-turn flush can record the old mode between the two) and the plan file opens with the
planner's frontmatter `source:` line (a missing or unreadable file keeps `planner-review`), else
`plain-plan-review` when `config.sh` (payload `cwd`) resolves `planning.plain-plan-review: true`.
`ExitPlanMode` passes only after that agent, dispatched after the last plan write, returned
`VERDICT: PASS` and the plan's mtime is not newer. The deny reason is the plain path's only
instruction channel. Names match literally: renaming the skill, either agent, the switch or the
verdict line disarms the fail-open gate silently.

- The verdict comes from the last completed dispatch -> verdict pair. A dispatch carrying a
  `toolu_` id binds only to a verdict line holding that same id, with no fallback; a dispatch
  with no id takes the first verdict after it. `"status":"async_launched"` lines (they echo the
  prompt) are never read as verdicts. A verdict from the other reviewer never counts.
- The awk pattern that selects the verdict line and the one that reads its value must stay
  identical, or a quoted "VERDICT: PASS is not..." becomes a false allow. Both skip markdown
  emphasis (`*`, `_`, backtick) around the label and the value: `**VERDICT: PASS**` is a PASS.
- Each outcome has its own deny reason: no dispatch ("review the plan"), no verdict yet ("let the
  review finish"), `DENIED` ("grant the permission", then review again), `FAIL` ("fix the
  findings"), plan touched after the PASS ("re-review").

## Plan hints

`scripts/plan-hints.sh` (UserPromptSubmit, soft) adds the closing-review and
parallel-subagent rules, read verbatim from `content/plan-hints.md` (empty or missing: silent),
to every prompt in plain plan mode only; its episode window and Skill
detection are copied from `plan-gate.sh`, so rename either side together; the frontmatter check
is gate-only, so a refused planner keeps the hint silent for the episode. Its detection alone also
counts `intent` and `fixer` (they only hand off to `planner`), so the gate never picks
`planner-review` for them, plus their typed `/viber:` commands: a user message opening with
`<command-message>viber:intent</command-message>`, which records no Skill tool_use.

## Kill guard

`scripts/kill-guard.sh` (PreToolUse on `Bash`) denies a command that stops processes by name, only
when the top-level `agent_type` starts with `viber:`; the main session, other agents, no `agent_type`,
unreadable input and every command it does not refuse stay silent. It never answers `allow` and
always exits 0. Its deny reason is the model's only channel: stop the PIDs you started with
`kill <PID>`, confirm with `kill -0 <PID>`.

- Refused, in command position only (start of the command or after `;` `&` `|` `(`, a backtick, `$(` or
  a newline): `killall`, `pkill`, `taskkill` with `/IM`, `xargs` whose command word is `kill`, `kill`
  whose arguments hold a command substitution (`kill -0 $(cat pidfile)` included). `kill <PID>`,
  `kill $!`, `taskkill` by PID and a name merely quoted as an argument pass; `sudo killall` or
  `env pkill` pass too, the contract being command position.
- Bash builtins and `[[ =~ ]]` only, so a call outside a viber agent runs no external command; the
  JSON command is unescaped by hand. Replacement strings sit in variables (`$dq`, `$nl`): bash 3.2
  mishandles `\"` inside a quoted `${x//a/b}` replacement. Edit the regexes with its test, and
  keep the `hooks.json` description in step with the header.
- The "Stop what you started" section of the five agents (`viber/CLAUDE.md`) is the soft half; this
  is the hard edge.

## Task panel

`register.tsx`, declared in `hooks.json` under `modules`, draws a `viber tasks <done>/<total>`
button above the prompt and a closable pane of the active run's tasks. It reads files, never
writes one, and its two `tool.call` hooks pass every call through unchanged. Claude Code without
hooks-module support ignores `modules`, so the four command hooks work either way; `plugin.json`
carries no `types` or `hooks` field and must not.

- The logic is split out so the unit tier can prove it: `panel/run-state.ts` and
  `panel/run-events.ts` are pure functions with no imports, tested by
  `tests/viber/panel-run-*.unit.test.ts`; `register.tsx` imports `claude-code` and is loaded by no
  test, so check it with `claude plugin validate`.
- The active run is the newest run directory (by name) whose `plan.md` has a task block, picked
  before the cleanup rule: a settled newest run hides older unfinished ones. `runsDirectory` and
  `isCleanupOn` re-implement `scripts/config.sh`'s `viber.yml` grammar (`viber.local.yml` ignored):
  change one side, change both.
- `planTasks` counts the first `###` heading of each `<!-- TASK -->` block under `## Tasks`, as
  `plan-path.sh` counts progress. Only `status.md`'s `done:` and `skipped:` lines are read, so a
  format change there moves `runStatus`; the pane shows task rows only, the state right-aligned.
- The state is module-level (`run`, `seq`, `running`, `stopClock`): `claude plugin validate`
  refuses `$` used in a function not declared at the top of the file, and `$.state` atoms need a
  `types` field. A reload empties `running` (task ids dispatched in this session, never written
  down); it is never pruned, `panelOf` ranks done and skipped above running.
- A refresh runs at `session.start`, after a Bash call naming `plan-path.sh`, `plan-index.sh`,
  `commit-task.sh` or `archive-run.sh` (`isRunScriptCall`), after a `viber:task-coder` or
  `viber:task-reviewer` dispatch carrying a `task: .../tasks/T<n>.md` line (`dispatchedTaskId`)
  and every 15 s; a read a newer one overtook is dropped. Renaming a script or either agent
  there disarms the refresh silently.
- Both `tool.call` hooks end `.catch((_$, e, next) => next(e))`: without it a throw could block a
  call and `validate` warns "gating hook without .catch". The `AbovePrompt` hook yields only when
  there is no run.
- `hooks.json`'s `description` names the module: keep it in step with this section.
