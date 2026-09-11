
## Task 2 - feat(scripts): commit-task.sh stages only the declared set and prints the commit SHA
- TDD: none
- Model: opus
- Effort: xhigh
- Covers: criteria #26, #27, #28, #29

### Dependencies
- none - blocks: 11, 12

### Files
- modify - superdev/scripts/commit-task.sh (argument parsing, `declared_paths()`, `undeclared_changes()`, staging, `commit:` line)
- modify - tests/superdev/commit-task.test.ts (new cases, header comment)

### Test Commands
#### Build
- `bash -n superdev/scripts/commit-task.sh` - expected: no output, exit 0

#### Tests
- `node --test "tests/superdev/commit-task.test.ts"` - expected: all tests pass, including the six new cases named in DoD
- `node --test "tests/**/*.test.ts"` - expected: all tests pass
- `! grep -n 'git add -A$\|git add \.$' superdev/scripts/commit-task.sh` - expected: no output, exit 0 (the only `git add` left is pathspec-limited)

### Approach
1. Extend the header contract and argument parsing: `commit-task.sh <message> [task-file] [--notes <notes-file>] [--path <pathspec>]...`. Keep `message` as `$1` and an optional positional `task-file` as `$2` (existing callers), then parse the options in a `while` loop. A fresh repository's initial commit declares the whole tree explicitly with `--path .` (Task 11 uses that in its git-init branch); there is no flag that stages without a pathspec.
2. `declared_paths()` builds the staged set: from `task-file`, every `### Files` bullet's path (the line shape `- <add|modify|delete> - <path> (<symbol>)`: strip the leading `- <verb> - `, then everything from the first ` (`; trim); from `--notes`, every `touched: <path>` line (first colon split, trim); every `--path` value; plus the run directory derived as `dirname(dirname(task-file))` or `dirname(dirname(notes-file))` when either is given. Drop entries that neither exist in the tree nor are tracked (`git ls-files --error-unmatch` fails) so a planned-but-uncreated file never aborts the commit.
3. `undeclared_changes()` lists `git status --porcelain=v1 --untracked-files=all -z`, drops every entry whose path equals a declared path or starts with a declared directory (with trailing `/`), and drops every entry under `.temp/`. Any remaining entry -> print `undeclared: <path>` per line on stdout, print `error: undeclared changes in the working tree - nothing committed` on stderr, exit 2. The status bump via `status-update.sh` still runs first (unchanged), and the git-repo guard (`Not a git repository - skipping commit.`, exit 0) stays before any staging.
4. Stage with `git add -A -- "${declared[@]}" ':(exclude).temp'` (pathspec-limited, so deletions under `### Files` `delete` entries are staged too, and `.temp/` never enters even under `--path .`), keep `Nothing to commit.` on an empty index, otherwise `git commit -m "$message"` and then print `commit: $(git rev-parse HEAD)` as the last stdout line.
5. Update `tests/superdev/commit-task.test.ts`: the existing "message + task file" case gets a task file with a `### Files` section naming `work.txt`; the existing message-only cases ("stages and commits a pending change", "newline, quote and non-ASCII") pass `--path a.txt`; add the cases from DoD; every case that expects a stop asserts exit 2, the `undeclared:` line, and that `git log` is unchanged.

### Edge cases
- A declared directory (`--path <workdir>` or `--path .`) also declares every file below it, including new untracked ones.
- `.gitignore`d files never appear in porcelain output, so they are neither undeclared nor staged; `.temp/` is excluded even when the host has no `.gitignore` entry for it.
- A `### Files` path with `delete` verb whose file is already gone: `git add -A -- <path>` stages the deletion; a path that never existed is dropped silently.
- No task file, no notes, no `--path` (message only): declared set is empty; any change in the tree is undeclared -> exit 2; a clean tree -> `Nothing to commit.`.
- Windows: paths from porcelain are `/`-separated already; declared paths from the task file may carry `\` - normalise `\` to `/` before comparing.

### Contracts
- stdout lines consumed by the orchestrator: `commit: <sha>` (success), `undeclared: <path>` (one per offending path, exit 2), `Nothing to commit.` (exit 0), `Not a git repository - skipping commit.` (exit 0).
- Exit codes: 0 committed / nothing / no repo; 1 missing message or status-update failure; 2 undeclared changes.
- `touched:` line shape as in Task 1 `## Notes line formats`.

### DoD
`commit-task.sh` never stages outside the declared set; the six new tests pass - tracked file modified outside the set -> exit 2 + `undeclared:` + no commit; untracked file outside the set and outside `.gitignore` -> the same; untracked file under `.temp/` -> commit succeeds without it; `touched:` path from `--notes` is in the commit; `--path <dir>` stages a new file below it; stdout ends with `commit: <sha>` equal to `git rev-parse HEAD`. Full suite green.


### Covered criteria
26. `scripts/commit-task.sh` stawia w indeksie wyłącznie: ścieżki z `### Files` pliku zadania (gdy podany), ścieżki z linii `touched:` pliku notatek (gdy podany) i katalog runu; `.temp/` traktuje jak ignorowany niezależnie od `.gitignore` hosta.
27. Przy każdej innej zmianie w drzewie (zmodyfikowany lub usunięty plik śledzony, plik nieśledzony poza `.gitignore` i poza `.temp/`) `commit-task.sh` nic nie commituje, wypisuje listę tych ścieżek i kończy się niezerowo, a orkiestrator na ten wynik eskaluje `AskUserQuestion` (dołącz / odrzuć / przerwij).
28. Po udanym commicie `commit-task.sh` wypisuje linię `commit: <sha>`, której orkiestrator używa jako `since` kolejnej rundy; `scripts/decompose.sh` stawia w indeksie tylko katalog runu, który sam utworzył; commity raportów i close-outu dostają jawny pathspec (katalog runu plus ścieżki z linii `NODE:`/`RULE:`/`ADR:`/`CHANGELOG:` writerów).
29. `tests/superdev/commit-task.test.ts` ma przypadki: obca zmiana w pliku śledzonym → brak commitu, lista, exit niezerowy; plik nieśledzony poza `.gitignore` → to samo; plik pod `.temp/` → commit przechodzi; `touched:` z notatek wchodzi do commitu; linia `commit: <sha>` w wyjściu.
