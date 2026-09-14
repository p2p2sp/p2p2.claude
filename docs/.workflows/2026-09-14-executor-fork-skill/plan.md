# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "Uniwersalny fork skill executor w superdev"
Intent: docs/.workflows/2026-09-14-executor-fork-skill/intent.md
Plan: C:\Users\dario\.claude-dario\plans\wild-hatching-lampson.md

---
<!-- HEADER -->

## Goal
Plugin `superdev` ma nowy fork skill `executor` (`superdev/skills/executor/`, `context: fork`, `model: haiku`), który dostaje blok etykiet `command:` / `expect:` / `cwd:` / `timeout:`, uruchamia jedną komendę przez własny deterministyczny skrypt `scripts/run.sh` z pełnym wyjściem przekierowanym do `.temp/superdev/logs/<timestamp>-<slug>-<pid>.log`, i zwraca krótki raport (`VERDICT:`, `EXPECT:`, `SUMMARY:`, `FAILURES:`, `LOG:`) o maksymalnie 40 liniach. Oba agenty implementujące taski uruchamiają build, testy, lint i type-check wyłącznie przez ten skill; surowy `Bash` zostaje im dla `git` i podglądu plików. Skill jest wpisany w `plugin.json`, w tabeli skilli `superdev/README.md` i wspomniany w root `CLAUDE.md`.

## Context
Dziś oba implementory (`superdev/agents/superbuild-task-implementor.md`, `superdev/agents/simplebuild-task-implementor.md`) wołają `Bash` bezpośrednio w kroku Build + Test, więc każdy pełny log builda i testów ląduje w ich kontekście; przy cyklach TDD (VERIFY RED / VERIFY GREEN, do 5 rund poprawek) to kilkanaście logów na task. Dawny `superbuild-runner` (fork na haiku) rozwiązywał to, ale został usunięty w commicie `70ddabe` razem z mechanizmem `recipe.sh`. Subagent nie może dispatchować kolejnego subagenta, więc executor musi być forkiem wołanym przez `Skill`. Zgodnie z zasadą "script vs. fork" z root `CLAUDE.md` uruchomienie komendy, timeout i zapis logu to praca dla skryptu, a interpretacja heterogenicznego wyjścia zostaje w forku na haiku. Frontmatter i wpisy naśladują istniejące forki (`simplebuild-reviewer`, `supergh:cli-executor`); względem intentu doprecyzowano tylko narzędzia: `Grep` dołącza do `allowed-tools` (przeszukiwanie długiego logu), a `Skill` do `disallowed-tools` (fork nie dispatchuje niczego).

## Out of scope
- Skill `tdd` pozostaje nietknięty.
- Mechanizm `recipe.sh` i jego `verify` nie wraca.
- Reviewery build i planowania oraz orchestratory `superbuild` / `simplebuild` bez zmian.
- Werdykt `BLOCKED` i klasyfikacja zakresu (`Scope hints:`).
- Sprawdzanie, czy fork wołany z wnętrza subagenta forkuje kontekst.

## Acceptance criteria
1. `superdev/skills/executor/scripts/run.sh` czyta ze stdin blok `label: value` (`command:` wymagane, `cwd:` i `timeout:` opcjonalne), uruchamia `command` przez `bash -c` w `cwd`, zapisuje cały stdout i stderr do `<repo-root>/.temp/superdev/logs/<UTC timestamp>-<slug>-<pid>.log` (tworząc katalog), a na stdout wypisuje dokładnie linie `STATUS:`, `EXIT:`, `DURATION:`, `LOG:`, `LINES:` (plus `REASON:` tylko przy `STATUS: error`), z kodem wyjścia 0 dla `ok` / `timeout` i 2 dla `error`.
2. `run.sh` kończy komendę po `timeout` sekundach (domyślnie 600) z `STATUS: timeout`; brak `command:`, nieistniejący `cwd:`, `timeout:` niebędący dodatnią liczbą całkowitą oraz kod wyjścia 126 lub 127 dają `STATUS: error` z jednolinijkowym `REASON:`.
3. Testy `tests/superdev/executor-run.test.ts` pokrywają kryteria 1 i 2 i przechodzą razem z `tests/portability.test.ts` (shebang, brak CRLF, bit `100755` w indeksie gita).
4. `superdev/skills/executor/SKILL.md` istnieje z frontmatter `name: executor`, opisem pod CSO, `context: fork`, `background: false`, `model: haiku` (bez `effort:`), `allowed-tools: Read, Grep, Bash(${CLAUDE_PLUGIN_ROOT}/skills/executor/scripts/run.sh:*)`, `disallowed-tools: Edit, Write, NotebookEdit, Agent, AskUserQuestion, WebFetch, WebSearch, Skill`, i treścią definiującą kontrakt wejścia (`command:`, `expect:`, `cwd:`, `timeout:`), żelazną zasadę "uruchom i zaraportuj, nigdy nie naprawiaj", sposób pracy (heredoc do `run.sh`, odczyt logu) i format wyjścia (`VERDICT: PASS | FAIL | ERROR | TIMEOUT`, `EXPECT:`, `SUMMARY:`, `FAILURES:`, `LOG:`, maksymalnie 40 linii).
5. `superdev/.claude-plugin/plugin.json` `skills[]` zawiera `./skills/executor/`, `superdev/README.md` ma wiersz `executor` w tabeli "Entry and environment", a root `CLAUDE.md` wymienia `.temp/superdev/logs/` przy `.temp/<plugin>/` i executor w opisie `superdev`.
6. Oba implementory w kroku Build + Test uruchamiają każdą komendę przez `superdev:executor` (Skill tool, jedna komenda na wywołanie, `command:` dosłownie plus `expect:`), z zakazem builda, testów, lintu, type-checku i formatera przez surowy `Bash`, przy niezmienionej pętli poprawek (build najpierw, potem testy, do 5 rund); wpis o TDD kieruje VERIFY RED / VERIFY GREEN tą samą drogą.
7. Żaden nowy ani zmieniony plik nie zawiera myślnika em (U+2014) ani en (U+2013).

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - feat(superdev): add executor run.sh with log capture and timeout
- Covers: criteria #1, #2, #3, #7
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- none - blocks: Task 2, Task 3

### Files
- add - superdev/skills/executor/scripts/run.sh (`main`, `parse_labels`, `emit_error`)
- add - tests/superdev/executor-run.test.ts

### Test Commands
#### Build
- `bash -n superdev/skills/executor/scripts/run.sh`

#### Tests
- `node --test tests/superdev/executor-run.test.ts`
- `node --test tests/portability.test.ts`

### Approach
1. Create `run.sh` with `#!/usr/bin/env bash`, `set -uo pipefail` (no `-e`, the command's exit code is data), a header comment carrying the full I/O contract below, and `parse_labels`: read stdin line by line, match `^(command|cwd|timeout):[[:space:]]*(.*)$`, keep the first occurrence of each label, ignore other lines.
2. Resolve inputs: `cwd` defaults to `$PWD`; `timeout` defaults to `600`; repo root = `git -C "$cwd" rev-parse --show-toplevel` when that succeeds, else `$cwd`; log dir = `<repo-root>/.temp/superdev/logs`, created with `mkdir -p`; slug = first 40 chars of `command` with every run of characters outside `[A-Za-z0-9._]` (so `-` included) replaced by one `-` and leading/trailing `-` stripped, `cmd` when empty; log path = `<log dir>/$(date -u +%Y%m%dT%H%M%SZ)-<slug>-$$.log`.
3. Run: `start=$SECONDS`; `( cd "$cwd" && bash -c "$command" ) >"$log" 2>&1 &`; `pid=$!`; poll `kill -0 "$pid"` every second; when `SECONDS - start >= timeout`, `kill -TERM "$pid"`, sleep 1, `kill -KILL "$pid"` if still alive, set `status=timeout`; otherwise `wait "$pid"`, capture `exit_code=$?`, `status=ok`.
4. Emit exactly, in this order: `STATUS: <ok|timeout|error>`, `EXIT: <n>` (the captured exit code; `124` when timeout), `DURATION: <SECONDS - start>s`, `LOG: <absolute log path>`, `LINES: <n>` (`$(( $(wc -l < "$log") ))`, so BSD `wc` padding never leaks); exit 0 on `ok` / `timeout`, 2 on the 126/127 branch and on every pre-launch error under `### Failure modes`.
5. Write `executor-run.test.ts` after the pattern of `tests/superdev/record-decision.test.ts` (`runScript` with `input:` for stdin, `withTempDir`, `slash` for path comparison): happy path (`command: printf 'hello\nworld\n'` in a temp cwd, no git repo, so the log lands under `<cwd>/.temp/superdev/logs/`; assert the five lines, `STATUS: ok`, `EXIT: 0`, the log file content equals the printed text, `LINES: 2`); non-zero exit (`command: printf 'boom\n' >&2; exit 3` gives `STATUS: ok`, `EXIT: 3`, log holds `boom`); git-root resolution (`withGitRepo`, `cwd:` set to a subdirectory, log path lands under the repo root's `.temp/superdev/logs/`); timeout (`command: sleep 30`, `timeout: 1`, assert `STATUS: timeout`, `EXIT: 124`, script exit 0, wall time under 10 s); missing `command:` (exit 2, `STATUS: error`, `REASON:` names `command`); nonexistent `cwd:` (exit 2, `REASON:` names the directory); `timeout: abc` and `timeout: 0` (exit 2); `command: definitely-not-a-real-command-xyz` (`STATUS: error`, `EXIT: 127`, `REASON:` mentions `command not found`, `LOG:` still printed); slug sanitisation (`command: npm test -- --grep "a b"` yields a log basename matching `/^\d{8}T\d{6}Z-npm-test-grep-a-b-\d+\.log$/`).
6. Stage the new script with its exec bit in one step, `git add --chmod=+x superdev/skills/executor/scripts/run.sh` (a plain `git update-index --chmod=+x` acts only on a path already in the index), and keep LF line endings.

### Failure modes
- when input has no `command:` line or its value is empty -> response `STATUS: error`, `REASON: missing command:` on stdout, exit 2, no log file, log none (stdout is the channel), test `missing command:` case in executor-run.test.ts
- when `cwd:` names a directory that does not exist -> response `STATUS: error`, `REASON: working directory missing: <cwd>`, exit 2, no log file, log none, test `nonexistent cwd:` case
- when `timeout:` is not a positive integer (`^[1-9][0-9]*$`) -> response `STATUS: error`, `REASON: invalid timeout: <value>`, exit 2, log none, test `timeout: abc` and `timeout: 0` cases
- when the log directory cannot be created or the log file cannot be opened -> response `STATUS: error`, `REASON: cannot write log: <path>`, exit 2, log none, test none - platform-dependent (documented in the header comment only)
- when the command exceeds `timeout` seconds -> response `STATUS: timeout`, `EXIT: 124`, `DURATION:`, `LOG:`, `LINES:` (partial output kept), exit 0, log the partial output stays in the log file, test `timeout` case
- when the command exits 126 or 127 -> response `STATUS: error`, `EXIT: <126|127>`, `DURATION:`, `LOG:`, `LINES:` all still printed, then `REASON: command not found or not executable (exit <n>)` as the last line, exit 2, log the shell's own message stays in the log file, test `definitely-not-a-real-command-xyz` case asserts all six lines
- when `cwd` is not inside a git repository (`git rev-parse --show-toplevel` fails) -> response the log lands under `<cwd>/.temp/superdev/logs/` and every other line is unchanged, log none, test happy path case (temp dir with no git repo)
- when two runs start in the same second with the same slug -> response distinct files because the basename ends in `-$$` (the script pid), log none, test slug case asserts the `-<pid>.log` suffix

### Contracts
- stdin block, one `label: value` per line: `command:` (required, one shell line executed verbatim by `bash -c`; the caller owns its content, the script only checks it is non-empty), `cwd:` (optional, must be an existing directory, default `$PWD`), `timeout:` (optional, positive integer seconds, default 600); consumed by Task 2 (the SKILL.md tells the model to feed exactly this block through a quoted heredoc)
- stdout lines in fixed order: `STATUS: ok | timeout | error`, `EXIT: <n>`, `DURATION: <n>s`, `LOG: <absolute path>`, `LINES: <n>`, `REASON: <one line>` (error only, always the last line; on a pre-launch error `EXIT:`, `DURATION:`, `LOG:`, `LINES:` are omitted, on the 126/127 branch all four are printed); script exit 0 for `ok` / `timeout`, 2 for `error`; consumed by Task 2 (maps `ok`+`EXIT: 0` to `VERDICT: PASS`, `ok`+non-zero to `FAIL`, `timeout` to `TIMEOUT`, `error` to `ERROR`)
- log location `<repo-root>/.temp/superdev/logs/<UTC yyyymmddTHHMMSSZ>-<slug>-<pid>.log`, repo root from `git rev-parse --show-toplevel` of `cwd`, else `cwd`; consumed by Task 2 (documented in SKILL.md) and Task 3 (README / CLAUDE.md mention `.temp/superdev/logs/`)
- slug rule: first 40 chars of `command`, every run of chars outside `[A-Za-z0-9._]` (a `-` counts as outside, so `-- --grep` collapses with its neighbours) replaced by one `-`, edges trimmed, `cmd` when empty

### DoD
`run.sh` exists with the exec bit `100755` in the git index, `node --test tests/superdev/executor-run.test.ts` and `node --test tests/portability.test.ts` are green, and a manual `printf 'command: echo hi\n' | bash superdev/skills/executor/scripts/run.sh` prints the five lines with `STATUS: ok` and `EXIT: 0` and leaves the log under `.temp/superdev/logs/`.

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - feat(superdev): add executor fork skill
- Covers: criteria #4, #7
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- Task 1 - blocks: Task 3

### Files
- add - superdev/skills/executor/SKILL.md

### Test Commands
#### Build
- `grep -cE '^(name: executor|context: fork|model: haiku|background: false)$' superdev/skills/executor/SKILL.md` (expected `4`)

#### Tests
- `grep -c 'effort:' superdev/skills/executor/SKILL.md` (expected `0`, exit 1)
- `grep -cE '^(allowed-tools: Read, Grep, Bash\(\$\{CLAUDE_PLUGIN_ROOT\}/skills/executor/scripts/run\.sh:\*\)|disallowed-tools: Edit, Write, NotebookEdit, Agent, AskUserQuestion, WebFetch, WebSearch, Skill)$' superdev/skills/executor/SKILL.md` (expected `2`)
- `grep -cE 'VERDICT: PASS \| FAIL \| ERROR \| TIMEOUT|^EXPECT:|^SUMMARY:|^FAILURES:|^LOG:' superdev/skills/executor/SKILL.md` (expected at least `5`)
- `LC_ALL=C grep -cE $'\xe2\x80(\x93|\x94)' superdev/skills/executor/SKILL.md` (expected `0`, exit 1)
- `node --test tests/portability.test.ts`

### Approach
1. Write the frontmatter: `name: executor`; a CSO `description:` of the shape "Runs one build, test, lint, type-check or any other shell command in a forked context and returns a short structured result (verdict, the tool's own summary line, the failures, a log path) instead of the full output. Use whenever a command's outcome must be judged but its output must not enter the caller's context - a build, a full or filtered test suite, a lint or type-check run, a script. Input is a labeled block: `command:` (required), `expect:`, `cwd:`, `timeout:`."; `context: fork`; `background: false`; `model: haiku`; no `effort:`; no `user-invocable:` line (the default keeps `/superdev:executor` usable); `allowed-tools` and `disallowed-tools` exactly as criterion 4 states.
2. Body `# Input contract`: the task arrives as the trailing `ARGUMENTS:` block (as `supergh:cli-executor` reads its own); labels `command:` (required, one shell line, run verbatim, never rewritten or completed), `expect:` (optional, one sentence naming the outcome the caller wants to see, e.g. "all green", "test X fails because the behaviour is missing", "build passes without warnings"), `cwd:`, `timeout:` (both passed through to `run.sh` untouched); an unknown label is ignored.
3. Body `# Iron law`: run and report, never fix; exactly one `run.sh` call per invocation, never a re-run "to confirm", never any other `Bash` command (no `sed -i`, no redirection into a tracked file, no `git checkout` / `reset` / `stash`, no `--fix` / `--write` flag, no install, no commit); a fork cannot prompt, so a missing `command:` is reported, never asked about; never look up a command in `CLAUDE.md` or anywhere else.
4. Body `# How to work`: (a) call `"${CLAUDE_PLUGIN_ROOT}/skills/executor/scripts/run.sh"` once, feeding the `command:` / `cwd:` / `timeout:` lines through a single-quoted heredoc (`<<'EOF'`) so the command line travels byte for byte; (b) read its `STATUS:` / `EXIT:` / `LOG:` / `LINES:` lines and map them to the verdict per the Task 1 contract; (c) when `LINES:` is 2000 or fewer, `Read` the whole log, otherwise `Read` the last 400 lines (offset `LINES - 400`) and `Grep` the log for the tool's failure markers (`FAIL`, `failed`, `Error`, `error TS`, `✗`, `×`, `AssertionError`) to locate every failure; (d) find the tool's own aggregate line verbatim (`42 passed, 3 failed`, `Build succeeded`, `0 problems`), or the last meaningful line when none; (e) judge `expect:` against the verdict, the aggregate line and the failure list, and reply.
5. Body `# Output format`, the reply is the whole output channel, at most 40 lines, in this fixed shape: line 1 `VERDICT: PASS | FAIL | ERROR | TIMEOUT (exit <n>, <duration>)`; line 2 `EXPECT: met | not met - <one line why>` only when `expect:` was given; `SUMMARY: <aggregate line verbatim>`; `FAILURES:` followed by one `- <test or target> - <message verbatim>` bullet per failure with its first stack frame indented below, at most 10 bullets then `- +<N> more, see LOG`, the section omitted when there is no failure; last line `LOG: <path>`; on `VERDICT: ERROR` the `REASON:` text from `run.sh` goes into `SUMMARY:`. Add a `PASS` example and a `FAIL` example in fenced blocks (language `text`, never a `!` fence).
6. Close with `# Safety`: never mutate the working tree, never ask the user, never dump raw log lines beyond the summary and the per-failure message plus first frame.

### Failure modes
- when `command:` is absent from `ARGUMENTS` -> response reply `VERDICT: ERROR (exit -, -)` with `SUMMARY: missing command:` and no `LOG:` line, log none, test grep for the `missing command:` wording in SKILL.md
- when `run.sh` prints `STATUS: error` -> response `VERDICT: ERROR` with the `REASON:` text as `SUMMARY:` and `LOG:` when the script printed one, log none, test grep for `STATUS: error` mapping wording in SKILL.md
- when `run.sh` prints `STATUS: timeout` -> response `VERDICT: TIMEOUT`, `SUMMARY:` the last meaningful log line, `LOG:`, log none, test grep for `TIMEOUT` in SKILL.md
- when the log holds no recognisable aggregate line -> response `SUMMARY:` carries the last non-empty log line, log none, test covered by the "last meaningful line" wording check in SKILL.md
- when `expect:` was given and the observed outcome contradicts it (e.g. expected a failing test but `EXIT: 0`) -> response `EXPECT: not met - <why>` while `VERDICT:` still reports the command's own outcome, log none, test grep for `not met` in SKILL.md

### Contracts
- consumes the Task 1 stdin block and stdout lines (feeds the block via a quoted heredoc; maps `STATUS` / `EXIT` to `VERDICT`)
- reply shape (`VERDICT:`, optional `EXPECT:`, `SUMMARY:`, optional `FAILURES:`, `LOG:`; at most 40 lines); consumed by Task 3 (both implementors read `VERDICT:` and `EXPECT:` and open `LOG:` only when the failure list is not enough)
- `expect:` is free text from the caller; it never influences which command runs, only the `EXPECT:` judgement

### DoD
`superdev/skills/executor/SKILL.md` exists, every grep under Test Commands returns its expected count, `node --test tests/portability.test.ts` is green (no `!` preload, no unquoted glob), and the body reads as a complete, self-contained instruction for a haiku fork with no reference to `recipe.sh`, `Scope hints:` or `BLOCKED`.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - feat(superdev): route implementors through executor and document it
- Covers: criteria #5, #6, #7
- TDD: none
- Model: sonnet
- Effort: medium

### Dependencies
- Task 2 - blocks: none

### Files
- modify - superdev/agents/superbuild-task-implementor.md (`## 2. Build + Test`, the `TDD discipline` bullet)
- modify - superdev/agents/simplebuild-task-implementor.md (`## 3. Run Build & Tests`, the `TDD discipline` bullet)
- modify - superdev/.claude-plugin/plugin.json (`skills`)
- modify - superdev/README.md (table under `### Entry and environment`)
- modify - CLAUDE.md (the `superdev` bullet under `## What this repo is`; the `.temp/` sentence under `## Cross-plugin architecture invariants`)

### Test Commands
#### Build
- `node -e "const s=JSON.parse(require('fs').readFileSync('superdev/.claude-plugin/plugin.json','utf8')).skills; if(!s.includes('./skills/executor/')) process.exit(1)"`

#### Tests
- `grep -c 'superdev:executor' superdev/agents/superbuild-task-implementor.md superdev/agents/simplebuild-task-implementor.md` (expected at least `2` per file)
- `grep -cE 'never go through raw .Bash' superdev/agents/superbuild-task-implementor.md superdev/agents/simplebuild-task-implementor.md` (expected at least `1` per file)
- `grep -c 'Fix loop max 5 rounds' superdev/agents/superbuild-task-implementor.md superdev/agents/simplebuild-task-implementor.md` (expected `1` per file)
- `grep -c '^| `executor` | Fork - ' superdev/README.md` (expected `1`)
- `grep -c '\.temp/superdev/logs/' CLAUDE.md` (expected at least `1`)
- `LC_ALL=C grep -cE $'\xe2\x80(\x93|\x94)' superdev/agents/superbuild-task-implementor.md superdev/agents/simplebuild-task-implementor.md superdev/README.md CLAUDE.md` (expected `0` for each, exit 1)
- `node --test "tests/**/*.test.ts"`

### Approach
1. In both implementors, rewrite step 1 of the build-and-test section to: run every command through the `executor` skill (`Skill` tool, `superdev:executor`), one command per invocation, with `command:` copied verbatim from the task's `Test Commands` and `expect:` naming the outcome this run must show; build first, then tests; read the reply's `VERDICT:` and `EXPECT:` lines and open its `LOG:` path with `Read` only when `FAILURES:` is not enough to act. Keep step 2 ("Any red -> fix, then re-run from step 1") and the `Fix loop max 5 rounds` line unchanged.
2. In both implementors add one bullet right after that step: build, test, lint, type-check, formatter and script runs never go through raw `Bash`; raw `Bash` is for `git`, file inspection and other read-only work.
3. In both implementors extend the `TDD: required` bullet with: every VERIFY RED and VERIFY GREEN run of the `tdd` cycle goes through `superdev:executor` the same way, with `expect:` naming the test and the missing behaviour it must fail on (RED) or the green state it must show (GREEN).
4. In `superdev/.claude-plugin/plugin.json` insert `"./skills/executor/"` into `skills` right after `"./skills/tdd/"`.
5. In `superdev/README.md` add a row to the `### Entry and environment` table after the `tdd` row: `| \`executor\` | Fork - runs one build, test, lint or any other command on haiku and returns a short result (\`VERDICT:\`, \`EXPECT:\`, the tool's summary line, the failures, a \`LOG:\` path under \`.temp/superdev/logs/\`) instead of the full output; both task implementors route every build and test run through it, and you can call it yourself with a \`command:\` line. |`.
6. In root `CLAUDE.md`: add `.temp/superdev/logs/<timestamp>-<slug>-<pid>.log` (the `executor` fork's command logs) to the `.temp/` sentence next to `.temp/superdev/{memory,rules}/capture-<RUN_ID>.md`; add one sentence to the `superdev` bullet under `## What this repo is` stating that both task implementors run build and test commands only through the `executor` fork skill (haiku), which keeps full tool logs out of the implementor's context and returns a short verdict, and that it is model-invocable via its `description:`.

### Failure modes
- none - documentation

### Contracts
- consumes the Task 2 reply shape (implementors read `VERDICT:`, `EXPECT:`, `FAILURES:`, `LOG:`)
- consumes the Task 1 log location (README and CLAUDE.md name `.temp/superdev/logs/`)
- `plugin.json` `skills[]` stays a flat list of directory paths with a trailing slash; `agents[]` untouched (a worker never appears in both)

### DoD
Both implementors name `superdev:executor` in their build-and-test step and in the TDD bullet with the raw-`Bash` prohibition, `plugin.json` parses and lists `./skills/executor/`, the README row and both CLAUDE.md mentions exist, no touched file carries an em or en dash, and `node --test "tests/**/*.test.ts"` is green.

<!-- /TASK -->

---

<!-- repeat Task <N> per unit of work; leave intact all comment markers; keep tasks small, independently testable, and builder-executable unattended (no interactive human step) -->
