
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


### Covered criteria
1. `superdev/skills/executor/scripts/run.sh` czyta ze stdin blok `label: value` (`command:` wymagane, `cwd:` i `timeout:` opcjonalne), uruchamia `command` przez `bash -c` w `cwd`, zapisuje cały stdout i stderr do `<repo-root>/.temp/superdev/logs/<UTC timestamp>-<slug>-<pid>.log` (tworząc katalog), a na stdout wypisuje dokładnie linie `STATUS:`, `EXIT:`, `DURATION:`, `LOG:`, `LINES:` (plus `REASON:` tylko przy `STATUS: error`), z kodem wyjścia 0 dla `ok` / `timeout` i 2 dla `error`.
2. `run.sh` kończy komendę po `timeout` sekundach (domyślnie 600) z `STATUS: timeout`; brak `command:`, nieistniejący `cwd:`, `timeout:` niebędący dodatnią liczbą całkowitą oraz kod wyjścia 126 lub 127 dają `STATUS: error` z jednolinijkowym `REASON:`.
3. Testy `tests/superdev/executor-run.test.ts` pokrywają kryteria 1 i 2 i przechodzą razem z `tests/portability.test.ts` (shebang, brak CRLF, bit `100755` w indeksie gita).
7. Żaden nowy ani zmieniony plik nie zawiera myślnika em (U+2014) ani en (U+2013).
