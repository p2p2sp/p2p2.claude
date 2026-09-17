
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


### Covered criteria
9. Stałe progi rozmiaru - Delta przebiegu (wyłącznie pliki, które subagent zadeklarował jako dotknięte, mierzone względem HEAD; wcześniejsze niezacommitowane zmiany w innych plikach nie liczą się) dotykająca więcej niż 5 plików (nowy plik liczy się także jako dotknięty), tworząca więcej niż 1 nowy plik lub zmieniająca więcej niż 200 linii (suma linii dodanych i usuniętych) jest zgłoszona jako przekroczenie z nazwanym powodem; delta w tych granicach przechodzi bez pytania.
10. Ścieżki wrażliwe hosta - Zmiana dotykająca ścieżki pasującej do listy globów, którą tor wyczytał z dowolnie sformułowanej pamięci hosta (`CLAUDE.md`, `.claude/rules/`; żaden stały marker ani sekcja nie są wymagane), jest zgłoszona jako przekroczenie niezależnie od rozmiaru; host, którego pamięć nic takiego nie opisuje, jest oceniany wyłącznie progami rozmiaru.
19. Suita strażnika - Skrypt strażnika ma suitę pod `tests/`, uruchamianą z korzenia repo przez `node --test`, która dowodzi każdego progu z kryterium 9 (po obu stronach granicy, z liczbą linii jako sumą dodanych i usuniętych) i dopasowania podanej listy globów z kryterium 10 (wyciąganie listy z pamięci hosta jest osądem modelu i nie jest testowane), i przechodzi pod Git-Bash na Windows tak samo jak na Linux/macOS.
