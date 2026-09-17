
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


### Covered criteria
5. Wejście plikowe - Subagent dostaje wyłącznie ścieżki do plików (brief, referencje, miejsce na notatki), nigdy wklejoną treść; niekompletne wejście kończy się werdyktem `FAIL` z powodem i bez żadnej zmiany w repo.
13. Sprawdzenia z pamięci hosta - Komendy sprawdzające pasujące do dotkniętego obszaru, zadeklarowane w `CLAUDE.md` / `.claude/rules/` hosta, są uruchomione przez subagenta, a każde uruchomienie z wynikiem jest zapisane w notatkach przebiegu; host bez deklaracji kończy przebieg bez żadnego uruchomionego polecenia, a notatki mówią dlaczego.
14. Nieudane sprawdzenie wstrzymuje commit - Sprawdzenie, które nie przechodzi po co najwyżej trzech rundach poprawek, kończy pracę subagenta werdyktem `FAIL` z powodem i bez automatycznego commitu; użytkownik dostaje te same trzy opcje co w kryterium 11, a wybór "zatwierdź" kończy się commitem z odnotowanym nadpisaniem.
18. Katalog i README spójne - `plugin.json` superdev wymienia nowy skill w `skills[]` i nowego agenta w `agents[]` (nigdy w obu), a `superdev/README.md` i root `CLAUDE.md` opisują tor `vibe`, jego strażnika i to, że nie pisze żadnej warstwy wiedzy.
