# SuperPlan
To build this plan use the `superbuild` skill.

Title: "Vibe track - fast direct changes with an advisory scope guard"
Spec: C:/Projects/p2p2.claude/docs/.workflows/2026-09-17-vibe-track/spec.md
Intent: docs/.workflows/2026-09-17-vibe-track/intent.md
Plan: C:\Users\dariu\.claude-p2p2\plans\zesty-purring-finch.md

## Gate commands

#### Build
- none - the plugin ships markdown, JSON and bash only; there is no build step in this repo

#### Tests
- node --test tests/superdev/vibe-guard.test.ts tests/portability.test.ts

#### Integration
- node --test "tests/**/*.test.ts"

---

<!-- TASK -->

## Task 1 - Add the vibe-guard script and its regression suite
- TDD: none
- Model: opus
- Effort: high
- Covers: `Stałe progi rozmiaru` (#9), `Ścieżki wrażliwe hosta` (#10), `Suita strażnika` (#19)

### Dependencies
- none - first task

### Files
- add - superdev/scripts/vibe-guard.sh (`vibe-guard.sh`)
- add - tests/superdev/vibe-guard.test.ts (`vibe-guard.test.ts`)

### Task Checks
- tests/superdev/vibe-guard.test.ts - node --test tests/superdev/vibe-guard.test.ts
- node --test tests/portability.test.ts

### Approach
1. Write `superdev/scripts/vibe-guard.sh` (`#!/usr/bin/env bash`, `set -u`, English header comment carrying the full I/O contract below, in the style of `superdev/scripts/commit-task.sh`). Usage: `vibe-guard.sh <notes-file> [--sensitive <glob>]...`. Constants at the top: `MAX_FILES=5`, `MAX_NEW=1`, `MAX_LINES=200`.
2. Collect the measured set from the notes file exactly as `commit-task.sh` reads its `--notes` file: every `touched: <path>` line, the path being what stands between `touched:` and the first ` - ` or ` (`, trimmed; an empty cut declares nothing; backslashes become `/`; an absolute path inside the repository (`git rev-parse --show-toplevel`) is reduced to a repository-relative one; duplicates are collapsed, first occurrence order kept.
3. Classify each path with git, all commands run from the repository root: `git ls-files --error-unmatch -- <path>` succeeds -> tracked, its line delta is added + deleted from `git diff --numstat HEAD -- <path>` (a `-` numstat column, a binary file, counts 0); not tracked and an existing regular file -> new, counted once under `new:` and once under `files:`, its lines from `awk 'END{print NR}'`; a directory, or a path that neither exists nor is tracked -> printed as `dropped: <path>` and counted nowhere.
4. Match every counted path against each `--sensitive` glob with a bash `case` pattern (`*` crosses `/`, patterns are shell globs, never regex); a hit prints `sensitive: <path>` once per path.
5. Print `files: <n>`, `new: <n>`, `lines: <n>`, the `dropped:` and `sensitive:` lines, then the verdict line: `RESULT: OK` when no threshold is exceeded and no path is sensitive, else `RESULT: OVER - <reason>[; <reason>]` with reasons in the fixed order `files <n> > 5`, `new <n> > 1`, `lines <n> > 200`, `sensitive <path>` (one per hit). Exit 0 on both.
6. Write `tests/superdev/vibe-guard.test.ts` with the harness (`runScript` from `tests/harness/run.ts`, `withGitRepo` / `withTempDir` from `tests/harness/tmp.ts`, `slash` from `tests/harness/paths.ts`), one case per line of `### DoD`, each building a real throwaway repo with one committed baseline and the modifications a case needs, and asserting the exact `RESULT:` line plus the counters.

### Failure modes
- when the notes file argument is missing, unreadable or the file does not exist -> response `RESULT: ERROR - notes file not found: <path>` on stdout and exit 1, log nothing else, test `missing notes file exits 1 with RESULT: ERROR`
- when the working directory is not inside a git repository (`git rev-parse --show-toplevel` fails) -> response `RESULT: ERROR - not a git repository` and exit 1, log nothing else, test `outside a git repository exits 1 with RESULT: ERROR`
- when `--sensitive` carries no value, an empty value, or a value with a newline or carriage return -> response `RESULT: ERROR - invalid --sensitive value` and exit 1, log nothing else, test `an empty --sensitive value exits 1`
- when input is invalid (an argument that is neither the notes file nor `--sensitive <glob>`) -> response `RESULT: ERROR - unknown argument: <arg>` and exit 1, log nothing else, test `an unknown argument exits 1`
- when the notes file carries no `touched:` line at all -> response `files: 0`, `new: 0`, `lines: 0`, `RESULT: OK`, exit 0 (the caller decides what an empty delta means), log nothing, test `no touched lines is RESULT: OK with zero counters`
- when a `touched:` path is a directory or neither exists nor is tracked -> response one `dropped: <path>` line and the path counted nowhere, log nothing, test `a dropped path is listed and not counted`

### Contracts
- CLI contract `vibe-guard.sh <notes-file> [--sensitive <glob>]...`; stdout lines in order `files: <n>`, `new: <n>`, `lines: <n>`, zero or more `dropped: <path>`, zero or more `sensitive: <path>`, then exactly one `RESULT: OK` | `RESULT: OVER - <reason>[; <reason>]` | `RESULT: ERROR - <reason>`; exit 0 for OK and OVER, 1 for ERROR; consumed by `Add the vibe skill with its brief template` (Task 3)
- Threshold constants `MAX_FILES=5`, `MAX_NEW=1`, `MAX_LINES=200`, a new file counting toward both `files:` and `new:`, lines being added plus deleted, a new file's lines counted as `awk 'END{print NR}'` prints them (a last line with no trailing newline counts, as numstat would count it); consumed by `Add the vibe skill with its brief template` (Task 3), `Route the vibe track in the manifest and the neighbouring skill descriptions` (Task 4) and `Document the vibe track in the README and the root CLAUDE.md` (Task 5)
- External value `--sensitive <glob>` (a glob the model read out of the host's memory): must be non-empty and free of newline and carriage return; it is used only as a bash `case` pattern against a repository-relative path, never expanded against the filesystem and never passed to `eval`; consumed by `Add the vibe skill with its brief template` (Task 3)
- The `touched:` parsing rule is the one `superdev/scripts/commit-task.sh` documents in its header (cut at the first ` - ` or ` (`), cited, not redefined; consumed by `Add the vibe-implementor agent` (Task 2)

### DoD
`node --test tests/superdev/vibe-guard.test.ts` is green with cases proving: 5 touched files -> `RESULT: OK` and 6 -> `RESULT: OVER - files 6 > 5`; 1 new file -> OK and 2 -> `OVER - new 2 > 1`; a tracked file changed by 100 added + 100 deleted lines -> OK and 101 + 100 -> `OVER - lines 201 > 200`; a path matching `--sensitive 'src/auth/*'` with counters inside every threshold -> `sensitive: <path>` and `OVER - sensitive <path>`; the same repo state with no `--sensitive` -> OK; two thresholds exceeded at once -> both reasons joined by `; ` in the fixed order; a binary file counts 0 lines; a `touched: <path> - <reason>` line is cut at ` - `; a path written with backslashes is measured and printed with `/` (compared through `slash()`); every ERROR case of `### Failure modes` exits 1. `node --test tests/portability.test.ts` stays green (shebang, LF endings).

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - Add the vibe-implementor agent
- TDD: none
- Model: opus
- Effort: high
- Covers: `Wejście plikowe` (#5), `Sprawdzenia z pamięci hosta` (#13), `Nieudane sprawdzenie wstrzymuje commit` (#14), `Katalog i README spójne` (#18)

### Dependencies
- `Add the vibe-guard script and its regression suite` (Task 1) - blocks: the notes `touched:` rule this agent writes to is the one Task 1 measures

### Files
- add - superdev/agents/vibe-implementor.md (`vibe-implementor`)
- modify - superdev/.claude-plugin/plugin.json (`agents`)

### Task Checks
- grep -n "^name: vibe-implementor" superdev/agents/vibe-implementor.md
- grep -n "agents/vibe-implementor.md" superdev/.claude-plugin/plugin.json
- node -e "JSON.parse(require('fs').readFileSync('superdev/.claude-plugin/plugin.json','utf8'))"

### Approach
1. Write `superdev/agents/vibe-implementor.md` in English, modelled on `superdev/agents/simplebuild-task-implementor.md`: frontmatter `name: vibe-implementor`, `description: Invoked only by the vibe skill, never directly.`, `tools: Read, Write, Edit, Grep, Glob, Bash`, `model: sonnet`, `effort: high`, `background: false`, `color: green`.
2. `## Input` - one `label: value` line per input, every value a path read by the agent itself: `brief` (required), `refs` (required, the plugin's references directory, read for `review-contract.md`'s `## Notes line formats` only), `notes` (required, a path the agent writes; may not exist). A required label absent or unreadable -> `VERDICT: FAIL`, `REASON: missing input <label>`, nothing changed.
3. `## 1. Implement` - deliver the brief's `Goal:` sentence, touching the files under `## Files` and any file the goal needs, every repo edit through `Edit` / `Write` (never a shell editor), scratch under `.temp/` only; no refactors, nothing outside the goal. A brief whose `## Decisions` answers a matter is settled by it. A matter the agent cannot settle without the user (a contradiction inside the brief, or a goal that cannot be met as written) stops the work at the point it surfaces: leave the tree as it stands, write `DECISION: <what> - <why> - <options seen, or none>` to `notes`, return `VERDICT: BLOCKED`.
4. `## 2. Review` - re-read the own diff before verifying.
5. `## 3. Run checks` - run every `- <command>` line under the brief's `## Checks` verbatim, one direct `Bash` call each with an explicit timeout; a section reading `none - <reason>` runs nothing and the step is green; never the host's full suite, never `executor`; a command that cannot start -> `VERDICT: FAIL` naming it; any red -> fix and rerun; fix loop max 3 rounds, then `VERDICT: FAIL` with `REASON:` naming the command and its failing line.
6. `## 4. Record notes` - always on PASS and on FAIL (so the caller can commit or revert either way; on BLOCKED only the `DECISION:` lines): `## Runs` first (one `- <command verbatim> -> <summary line | exit <n>>` per check, or `none - <reason>`), then one `touched: <repo-relative path>` line per file changed or created (a reason may follow the path after ` - `, as both `commit-task.sh` and `vibe-guard.sh` cut it there), `CARRY: <path> - <problem>` for problems seen and left, or `no deviations`. Append when the file exists.
7. `## Output format` - line 1 `VERDICT: PASS` | `VERDICT: FAIL` | `VERDICT: BLOCKED`; line 2 `REASON: <one line>` on FAIL and BLOCKED only; nothing else.
8. Add `"./agents/vibe-implementor.md"` as the last entry of `agents[]` in `superdev/.claude-plugin/plugin.json`.

### Failure modes
- when input is invalid (a required label missing or its file unreadable) -> response `VERDICT: FAIL` + `REASON: missing input <label>` and no file changed, log nothing, test `none - prompt` (an agent prompt has no executable test; the per-task reviewer reads the wording)
- when a `## Checks` command fails 3 rounds in a row -> response `VERDICT: FAIL` + `REASON: <command> - <failing line>` with notes written (`## Runs` and `touched:` lines) and the tree left as it stands, log the last run under `## Runs`, test `none - prompt`
- when a check command cannot start (command not found, shell error) -> response `VERDICT: FAIL` + `REASON: <command> - <shell message>` after zero fix rounds, log that line under `## Runs`, test `none - prompt`
- when the brief cannot be executed without a user decision -> response `VERDICT: BLOCKED` + `REASON: <what>` with the `DECISION:` line in notes and nothing reverted, log the `DECISION:` line, test `none - prompt`
- when `notes` cannot be written -> response `VERDICT: FAIL` + `REASON: cannot write notes <path>`, log nothing, test `none - prompt`

### Contracts
- Agent input labels `brief:`, `refs:`, `notes:` (all required, all paths); consumed by `Add the vibe skill with its brief template` (Task 3)
- Brief shape the agent reads (owned here, mirrored by the template Task 3 ships): line 1 `# Vibe brief`, line 2 `Goal: <one sentence>`, then `## Files` (`- <repo-relative path>` lines the reconnaissance expects to change, advisory), `## Checks` (`- <command>` lines or the single line `none - <reason>`), `## Sensitive` (`- <glob>` lines or `none`), `## Decisions` (`- <answer>` lines or `none`), `## Notes` (free lines, e.g. `OVERRIDE: entry guard - <reason>`); consumed by `Add the vibe skill with its brief template` (Task 3)
- Agent output: `VERDICT: PASS|FAIL|BLOCKED` on line 1, `REASON:` on line 2 for FAIL and BLOCKED; consumed by `Add the vibe skill with its brief template` (Task 3)
- Notes lines: `## Runs` section, `touched: <path>` (per `commit-task.sh`'s documented rule), `CARRY:`, `no deviations`, `DECISION:` - the same shapes `superdev/references/review-contract.md` (`## Notes line formats`) already defines; consumed by `Add the vibe skill with its brief template` (Task 3)
- `plugin.json` `agents[]` gains one entry; the agent appears in `agents[]` only, never in `skills[]`

### DoD
`superdev/agents/vibe-implementor.md` exists with the frontmatter and the four numbered sections above, `plugin.json` parses and lists it under `agents[]` exactly once, and `grep -c "vibe-implementor" superdev/.claude-plugin/plugin.json` prints 1.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - Add the vibe skill with its brief template
- TDD: none
- Model: opus
- Effort: xhigh
- Covers: `Wejście komendą lub sygnałem` (#1), `Bez ceremonii` (#2), `Plan mode opuszczony` (#3), `Jeden odizolowany wykonawca` (#4), `Stan maszynowy w .temp` (#6), `Odmowa z propozycją wywiadu` (#7), `Nadpisanie przez użytkownika` (#8), `Ścieżki wrażliwe hosta` (#10), `Trzy wyjścia z przekroczenia` (#11), `Subagent bez werdyktu` (#12), `Sprawdzenia z pamięci hosta` (#13), `Nieudane sprawdzenie wstrzymuje commit` (#14), `Commit tylko zadeklarowanych plików` (#15), `Katalog i README spójne` (#18)

### Dependencies
- `Add the vibe-guard script and its regression suite` (Task 1) - blocks: the guard call and its `RESULT:` lines
- `Add the vibe-implementor agent` (Task 2) - blocks: the dispatch labels, the brief shape, the verdict lines

### Files
- add - superdev/skills/vibe/SKILL.md (`vibe`)
- add - superdev/skills/vibe/references/brief-template.md (`brief-template`)
- modify - superdev/.claude-plugin/plugin.json (`skills`)

### Task Checks
- grep -n "^name: vibe$" superdev/skills/vibe/SKILL.md
- grep -n "skills/vibe/" superdev/.claude-plugin/plugin.json
- node -e "JSON.parse(require('fs').readFileSync('superdev/.claude-plugin/plugin.json','utf8'))"
- node --test tests/portability.test.ts

### Approach
1. Write `superdev/skills/vibe/references/brief-template.md`: the brief shape of `Add the vibe-implementor agent` (Task 2) `### Contracts`, each section with a one-line fill rule, no worked example.
2. Write `superdev/skills/vibe/SKILL.md` in English. Frontmatter: `name: vibe`; `description:` one paragraph that routes on an explicit request to skip planning and do a small change right away - example signals "vibe", "od ręki", "just do it", "bez planu", "no plan", "/superdev:vibe" - states that the list is illustrative, that "now" or "fast" inside an ordinary change request is not a signal (the two example prompts of spec criterion `Wejście komendą lub sygnałem` (#1) included), that it also takes a small bug fix when the user asks for vibe explicitly, and that it never fires for a request the user wants designed; `argument-hint: [one-sentence change]`; `allowed-tools: Read, Grep, Glob, Write, Bash, Agent, AskUserQuestion, Skill, ExitPlanMode, Bash(date:*)`; `disallowed-tools: Edit, NotebookEdit, WebFetch, WebSearch`; `user-invocable: true`.
3. Body, fixed order, each a `##` section: `Plan mode` (run `ExitPlanMode` first when plan mode is active, before any read); `Preflight` (the `Agent` tool must be in the pool, else stop with the four-line report shape `simplebuild` uses; `git rev-parse --git-dir` must succeed, else stop with one line saying vibe needs a git repository); `Reconnaissance` (Grep/Glob for the files the request names, never `Read` whole source files; read the host's `CLAUDE.md` and `.claude/rules/` for (a) the check commands that cover the touched area and (b) any paths the memory describes as sensitive, protected, critical or requiring review - collected as globs); `Entry guard` (the change is a vibe when its goal fits one sentence, its files are known from reconnaissance, it adds no module, no contract between components and touches no sensitive path; otherwise say in one sentence why not, name `intent` with the same request as the alternative and stop; the user answering with an explicit "vibe anyway" / "mimo to vibe" continues with `OVERRIDE: entry guard - <the reason given>` written into the brief's `## Notes`); `Brief` (`date +%Y%m%d-%H%M%S` once for `<timestamp>`, `<slug>` from the goal, `Write` `.temp/superdev/vibe/<timestamp>-<slug>/brief.md` from the template - the only file this skill ever writes); `Dispatch` (one `Agent` call, `subagent_type: superdev:vibe-implementor`, no `model` / `effort` parameter, prompt = three labeled lines `brief:`, `refs: ${CLAUDE_PLUGIN_ROOT}/references`, `notes: <run dir>/notes.md`, absolute paths); `Verdict` (PASS -> `Guard`; FAIL -> `Stop`; BLOCKED -> read the `DECISION:` lines from notes, one `AskUserQuestion` per line (answer / abort), append each answer under the brief's `## Decisions`, re-dispatch the same call once, a second BLOCKED -> `Stop`; a result with no `VERDICT:` line, or an interrupted-by-limit result -> `Guard` then `Stop` whatever the guard says); `Guard` (`bash "${CLAUDE_PLUGIN_ROOT}/scripts/vibe-guard.sh" <notes> --sensitive '<glob>'` per collected glob, each single-quoted; read its `RESULT:` line; OK -> `Commit`; OVER or ERROR -> `Stop` with the guard's reason); `Stop` (one `AskUserQuestion` with exactly three options - approve and commit anyway, revert, leave the diff and go to `intent` - the labels naming the reason; approve -> append `OVERRIDE: <stage> - <reason>` to the brief's `## Notes` and go to `Commit`; revert -> for each `touched:` path `git checkout -- <path>` when tracked, delete it when untracked, warn in the option text that earlier uncommitted edits in those same files are lost; go to intent -> invoke the `intent` Skill with the goal sentence, the brief path and the touched list as its argument text, leaving the tree as it is); `Commit` (`bash "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "<goal sentence>" --notes <notes>`; the run directory joins the declared set and is dropped as `.temp/` by the script itself, so `brief.md` and `notes.md` never land in the commit; exit 2 with `undeclared:` lines -> `AskUserQuestion` remove / include named / abort exactly as `simplebuild` Step 2 does; `Nothing to commit.` -> say so); `Done` (two or three status lines: the commit SHA or the outcome chosen, the guard counters, the run directory; no writers, no recap).
4. Body rules, one `## Rules` section: never edit a host source file from this context (`Edit` is disallowed, `Write` is for the brief only); every handoff is labeled paths, never pasted content; name nothing by a bare number; every stop is advisory - the user's explicit choice always wins and is recorded as an `OVERRIDE:` line; `simpledebug`'s tracing is not run here even for a bug fix.
5. Add `"./skills/vibe/"` to `skills[]` in `superdev/.claude-plugin/plugin.json` after `"./skills/simpledebug/"`.

### Failure modes
- when the `Agent` tool is absent from the pool -> response stop with the four-line `AGENT TOOL UNAVAILABLE` report shape, nothing written, log nothing, test `none - prompt`
- when `git rev-parse --git-dir` fails -> response one line "vibe needs a git repository - nothing was changed" and stop, log nothing, test `none - prompt`
- when the implementor returns `VERDICT: FAIL` -> response the `Stop` question with the `REASON:` line as the reason, tree left as it stands, log nothing, test `none - prompt`
- when the implementor returns `VERDICT: BLOCKED` twice for the same brief -> response the `Stop` question with the second `REASON:`, log nothing, test `none - prompt`
- when the implementor result carries no `VERDICT:` line or reports an interruption by limit -> response run the guard for the counters, then the `Stop` question with reason "implementor returned no verdict", log nothing, test `none - prompt`
- when the guard prints `RESULT: ERROR` -> response the `Stop` question with the guard's reason, no commit, log nothing, test `none - prompt`
- when `commit-task.sh` exits 2 -> response `AskUserQuestion` remove / include named / abort, nothing staged by the skill itself, log nothing, test `none - prompt`
- when `commit-task.sh` prints `Nothing to commit.` -> response say so in the status lines and end, log nothing, test `none - prompt`
- when the user picks revert and a `touched:` path is neither tracked nor present, or resolves outside the repository root, or carries a `..` segment -> response skip that path and list it in the status lines, log nothing, test `none - prompt`
- when a sensitive glob read out of the host's memory spans more than one line or carries a quote character -> response drop that glob, name it in one status line, run the guard with the remaining globs, log nothing, test `none - prompt`
- when `commit-task.sh` exits 1 (missing message, unknown argument) -> response the `Stop` question with the script's stderr line as the reason, nothing staged, log nothing, test `none - prompt`
- when the implementor result carries no `VERDICT:` line and `notes.md` does not exist -> response the `Stop` question with reason "implementor returned no verdict - counters unmeasured" and no guard call, log nothing, test `none - prompt`

### Contracts
- Run directory `.temp/superdev/vibe/<timestamp>-<slug>/` with `brief.md` and `notes.md`, `<timestamp>` = `date +%Y%m%d-%H%M%S`, `<slug>` = lowercase goal words joined by `-`, at most 40 characters; consumed by `Document the vibe track in the README and the root CLAUDE.md` (Task 5)
- External value: every `touched:` path read out of `notes.md` (a file the implementor agent wrote) is reduced, before the revert branch or the intent handoff uses it, by the rule `Add the vibe-guard script and its regression suite` (Task 1) cites from `commit-task.sh` (cut at the first ` - ` or ` (`, backslash to `/`, an absolute path inside the repository reduced to a repository-relative one); a path that resolves outside `git rev-parse --show-toplevel`, or carries a `..` segment after that reduction, is never passed to `git checkout` and never deleted
- Appending to `brief.md` (an answer under `## Decisions`, an `OVERRIDE:` line under `## Notes`) means `Read` the brief and `Write` the whole file back with the line added, because `Edit` is disallowed and `Write` overwrites
- External value: every sensitive glob read out of the host's memory is passed to the guard as its own single-quoted `--sensitive '<glob>'` argument, one glob per argument, never joined, never unquoted (the `?`, `*`, `[` rule of the root `CLAUDE.md`), and only after checking it is one line with no quote character; a glob failing that check is dropped with one status line
- External value: the user's request text becomes the brief's `Goal:` sentence and the commit title; it is written through `Write` and passed to `commit-task.sh` as one quoted argument, never interpolated into any other command
- `OVERRIDE: <stage> - <reason>` line under the brief's `## Notes`, `<stage>` one of `entry guard`, `size guard`, `failed checks`, `no verdict`
- `plugin.json` `skills[]` gains one entry; the skill appears in `skills[]` only, never in `agents[]`

### DoD
`superdev/skills/vibe/SKILL.md` and its `references/brief-template.md` exist with the sections above in the given order, `plugin.json` parses and lists `./skills/vibe/` exactly once, `tests/portability.test.ts` is green over the new SKILL.md, and `grep -c "vibe-guard.sh" superdev/skills/vibe/SKILL.md` prints at least 1.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - Route the vibe track in the manifest and the neighbouring skill descriptions
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: `Wejście komendą lub sygnałem` (#1), `Sąsiednie skille ustępują` (#16), `Manifest zna trzeci tor` (#17)

### Dependencies
- `Add the vibe skill with its brief template` (Task 3) - blocks: the skill name the descriptions and the manifest point at

### Files
- modify - superdev/hooks/content/manifest.md (`## Four rules that always override convenience`)
- modify - superdev/skills/intent/SKILL.md (`description`)
- modify - superdev/skills/simpledebug/SKILL.md (`description`)
- modify - superdev/skills/tdd/SKILL.md (`description`)

### Task Checks
- grep -n "vibe" superdev/hooks/content/manifest.md
- grep -n "vibe" superdev/skills/intent/SKILL.md superdev/skills/simpledebug/SKILL.md superdev/skills/tdd/SKILL.md
- node --test tests/superdev/session-start.test.ts

### Approach
1. In `superdev/hooks/content/manifest.md`, rewrite the bullet `No code before an approved plan - write it, get approval, THEN implement.` to `No code before an approved plan - write it, get approval, THEN implement. The one exception is the vibe track: an explicit request to skip planning for a one-sentence change runs the vibe skill, which needs no plan.` and add to `## Build chain` one bullet: `Vibe track: an explicit "vibe" / "just do it" request for a one-sentence change runs the vibe skill - one implementor agent, host-declared checks, an advisory scope guard (5 files / 1 new file / 200 lines / host-declared sensitive paths) and one commit; no interview, no plan, no reviewer, no knowledge writer. Every stop of that guard is a recommendation the user may override.`
2. In `superdev/skills/intent/SKILL.md`, replace the description's last sentence `Do not trigger when user want to implement something here and now or fast.` with `Do not trigger when the user explicitly asks for a vibe change (skip planning, do it right away) - that request belongs to the vibe skill.`
3. In `superdev/skills/simpledebug/SKILL.md`, append to the description: `Do not trigger when the user explicitly asks for the fix as a vibe change ("vibe: fix ...") - the vibe skill owns that request and the user has chosen to skip tracing.`
4. In `superdev/skills/tdd/SKILL.md`, replace the description's closing `or as a default gate on every code change.` with `or as a default gate on every code change, or for a change the user explicitly asked for as a vibe change.`

### Failure modes
- none - documentation

### Contracts
- none

### DoD
The three descriptions and the manifest carry the new sentences verbatim, `tests/superdev/session-start.test.ts` is green (the manifest still injects), and no other line of those files changed.

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 - Document the vibe track in the README and the root CLAUDE.md
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: `Katalog i README spójne` (#18)

### Dependencies
- `Route the vibe track in the manifest and the neighbouring skill descriptions` (Task 4) - blocks: the wording the README mirrors

### Files
- modify - superdev/README.md (`## Quick start`, `## Skills`)
- modify - CLAUDE.md (`## What this repo is`, `## Cross-plugin architecture invariants`)

### Task Checks
- grep -n "### Vibe track" superdev/README.md
- grep -n "vibe" CLAUDE.md

### Approach
1. `superdev/README.md`: under `## How it works` change the caption sentence to `Same interview on the way in, two execution tracks, one shared Close Out - plus a third, plan-less vibe track for one-sentence changes.`; in `## Quick start` add after step 3's track list one paragraph `**Or skip all of it for a one-sentence change.** Say "vibe: <change>" (or run /superdev:vibe <change>) and the vibe skill does it with one implementor agent, the checks your CLAUDE.md declares for that area, an advisory scope guard and one commit - no interview, no plan, no reviewer, no knowledge writer. The guard stops on more than 5 files, more than 1 new file, more than 200 changed lines, or a path your memory calls sensitive, and on a failed check; every stop offers approve-and-commit, revert, or hand the diff to intent - the choice is yours.`; add a `### Vibe track` table after `### Simple track` with two rows: `vibe` (the skill: entry, reconnaissance, entry guard, brief under `.temp/superdev/vibe/<timestamp>-<slug>/`, dispatch, `vibe-guard.sh`, commit through `commit-task.sh`, the three-option stop, every override recorded as an `OVERRIDE:` line in that run's `brief.md`) and `superdev:vibe-implementor` (the agent: brief in, checks run directly with `Bash`, max 3 fix rounds, notes with `## Runs` and `touched:` lines, `VERDICT:` out).
2. Root `CLAUDE.md`: in the `superdev` bullet of `## What this repo is` add one sentence naming the vibe track (skill `vibe`, agent `vibe-implementor`, script `scripts/vibe-guard.sh`, no plan, no reviewer, no knowledge layer, machine state under `.temp/superdev/vibe/`); in the `.temp/` list of the dot-dir invariant add `.temp/superdev/vibe/<timestamp>-<slug>/` (the vibe track's brief and notes); in the self-documentation invariant's agents list add `vibe-implementor` (dispatched by the `vibe` skill alone, never at Close Out).

### Failure modes
- none - documentation

### Contracts
- none

### DoD
`superdev/README.md` carries the caption change, the Quick start paragraph and the `### Vibe track` table; root `CLAUDE.md` names the track, the `.temp/superdev/vibe/` location and the `vibe-implementor` agent; both greps under `### Task Checks` print at least one line.

<!-- /TASK -->

---
