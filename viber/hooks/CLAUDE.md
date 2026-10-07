# viber/hooks - viber's harness hooks and its hooks module

This area owns `hooks.json`, the four hook scripts under `scripts/`, the two texts they inject under `content/`, and the `register.tsx` module with its logic in `write/`. It does not own `.claude/viber.yml` parsing (`../scripts/config.sh`) or the reviewer agents the plan gate waits for.

## Terms

- Plan-mode episode: the transcript lines after the last `"type":"permission-mode"` record whose mode is not `plan`. `plan-gate.sh` and `plan-hints.sh` look only inside it, so a plan approved and built earlier in the session never re-arms the gate.
- Planner ownership: a `Skill` tool_use for `planner` (bare or `viber:`, never another plugin's `xyz:planner`) inside the episode, or one whose own following `EnterPlanMode` lies inside it, AND a plan file opening with a frontmatter `source:` line. Anything else is a plain plan.

## Relationships

- `hooks.json` wires PreToolUse `ExitPlanMode` -> `plan-gate.sh`, PreToolUse `Bash` -> `kill-guard.sh`, UserPromptSubmit -> `plan-hints.sh`, SessionStart (matcher `startup|clear|compact`) -> `session-start.sh`, each as `bash "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/<name>.sh"` with a 10 s timeout, plus `"modules": ["./register.tsx"]`.
- `session-start.sh` reads `content/manifest.md` and the `schema:` of `../skills/setup/templates/viber.yml`; `plan-hints.sh` reads `content/plan-hints.md`; `plan-gate.sh` runs `../../scripts/config.sh` (relative to itself) in the payload's `cwd`.
- `register.tsx` is the only file importing `claude-code`; `write/report-name.ts` imports nothing, so its unit test loads it directly.
- Tests: `tests/viber/write-report-name.unit.test.ts` (unit tier); `plan-gate.test.ts`, `plan-hints.test.ts`, `kill-guard.test.ts`, `session-start.test.ts` (integration tier, CI only). `register.tsx` itself has no test.

## Contracts

- Each script's header `Contract:` block is its authoritative I/O contract; the `description` of `hooks.json` summarizes all of them.
- Every hook exits 0 and fails open: empty stdin, a parse miss, an unreadable file or a malformed awk result allows (or prints nothing). The one exception: under a planner signal, an unreadable or missing plan file keeps `planner-review` rather than loosening to the plain path. JSON is read with grep/sed/awk or bash regexes, never `jq`.
- `plan-gate.sh` arms only on a Write/Edit whose `"file_path"` has a `plans` segment and ends `.md` (either separator), inside the episode. The plain path is gated only when `config.sh` prints `planning.plain-plan-review: true`; no `cwd` in the payload means off. It allows only when a dispatch of the chosen reviewer after the last plan write paired with `VERDICT: PASS` and the plan file's mtime is no later than that verdict's transcript timestamp plus 2 s. A dispatch carrying a `toolu_` id pairs only with a verdict line holding that id; one without an id pairs with the first verdict after it; the last completed pair wins. `VERDICT: DENIED` denies with "grant the permission". Every deny reason opens with `Next step:`.
- `session-start.sh` puts `manifest.md` verbatim (trailing newlines cut by `$(cat)`) into `additionalContext`; wrapping markers or a preamble belong in `manifest.md`, never in the script. The banner `viber loaded <version>` goes in the top-level `systemMessage`, shown to the user and never to the model; `<version>` is the basename of `CLAUDE_PLUGIN_ROOT`, `dev` when unset. The schema note compares the column-0 `schema:` of the project's `.claude/viber.yml` (git top level of `cwd`, else `cwd`) with the template's.
- `plan-hints.sh` prints only when stdin has `"permission_mode":"plan"`, and stays silent once the episode shows a `planner`, `intent` or `fixer` Skill tool_use or a typed `/viber:intent` or `/viber:fixer` command.
- `kill-guard.sh` acts only for a top-level `agent_type` starting `viber:`, denies `killall`, `pkill`, `taskkill` with `/IM`, `xargs ... kill` and `kill` fed by a command substitution in command position, and never answers `allow`.
- `register.tsx` holds one `tool.call` handler, on `Write`: it runs `next(e)` first, and a handler error falls back to `next(e)` through `.catch`. The Write rescue fires only when all hold: the call came from an agent, it errored with text containing `Subagents should return findings as text`, the basename matches `^(report|summary|findings|analysis).*\.md$` (any case), the agent's type starts `viber:`, and the path is absolute, holds no `.` or `..` segment and lies under the session root (compared case-insensitively on a drive letter). It then writes the file and returns a Write result typed `create` or `update`.

## Commands

- Unit tests of the module logic: `node --test tests/viber/write-report-name.unit.test.ts`

## Change together

- The episode window grep and the planner `Skill`/`EnterPlanMode` awk: `plan-gate.sh` and `plan-hints.sh` (the hint's copy widened to `intent`, `fixer` and their typed commands). A change on one side alone silently disarms the other.
- The `json_str` helper: `plan-gate.sh`, `plan-hints.sh`, `session-start.sh`.
- The verdict regex in `plan-gate.sh`: the `pair_raw` awk and the `verdict_value` awk must stay identical, or a quoted `VERDICT: PASS is not...` ahead of the real FAIL reads as a pass.
- `plan-gate.sh`'s `dispatch_with` text and the input each reviewer expects: `../agents/planner-review.md` (plan path, `refs:`, `memory:`, `input:`) and `../agents/plain-plan-review.md` (plan path, the user's goal).
- A hook's behavior and the `description` string of `hooks.json`.

## Traps

- No hook script uses `set -e`: fail-open needs every non-zero exit swallowed. Each awk result is checked for its numeric shape before use, because a broken awk on PATH must allow, never deny.
- `systemMessage` nested inside `hookSpecificOutput` is silently ignored by Claude Code: it must stay top-level.
- `resume` is excluded by the `hooks.json` matcher, not by `session-start.sh`; SessionStart never fires for subagents.
- Claude Code can flush the old permission mode mid-turn between the planner's Skill call and its `EnterPlanMode`, putting the Skill line before the episode start: that is why the following `EnterPlanMode` also counts, ended early by a user prompt or a plan-mode record.
- Any write to the plan after its PASS voids it through the mtime check, applying a Minor finding included; an edit through `sed -i` or an editor is caught the same way.
- A refused planner leaves `plan-hints.sh` silent for the rest of the episode: it runs before any plan file exists, so it cannot check the frontmatter.
- `kill-guard.sh` runs on every `Bash` call of every session: a call from outside a viber agent must return on bash builtins alone, before any external command.
- The Write rescue keys on the harness guard's literal error text: a reworded guard disables it silently.
