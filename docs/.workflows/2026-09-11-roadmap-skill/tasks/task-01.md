
## Task 1 - feat(superdev): add roadmap-status.sh phase status script with tests
- Covers: criteria #1, #8
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- none - blocks: Task 5

### Files
- add - superdev/scripts/roadmap-status.sh (`roadmap-status.sh`)
- add - tests/superdev/roadmap-status.test.ts

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `node --test "tests/superdev/roadmap-status.test.ts"` - expected: all tests pass
- `node --test "tests/portability.test.ts"` - expected: pass (shebang, no CRLF, exec bit 100755 because the roadmap skill invokes the script directly)

### Approach
1. Write `superdev/scripts/roadmap-status.sh` with `#!/usr/bin/env bash`, `set -euo pipefail`, a header comment carrying the full I/O contract from criterion #1 (arguments, output lines, status rules, exit codes), in the style of `superdev/scripts/status-update.sh`.
2. Parse: `roadmap="${1:-}"`; missing -> `error: missing required parameter 'roadmap-file'` + `usage: roadmap-status.sh <roadmap-file>` on stderr, exit 1; not a file -> `error: roadmap file not found: <path>`, exit 1. `base="$(dirname -- "$roadmap")"` with `\` normalised to `/`.
3. Collect `Dir:` values with `sed -n 's/^-[[:space:]]*Dir:[[:space:]]*//p'` (trim trailing spaces); none -> `error: no '- Dir:' lines found in <path>` on stderr, exit 3.
4. For each value compute `dir="$base/$value"` (strip a leading `./` from `base` so a roadmap passed as `./docs/...` prints `docs/...`) and the status: `[[ ! -d "$dir" ]]` -> `done`; `[[ -f "$dir/status.md" ]]` -> parse `last` from `task: NN` (unparsable -> 00) and `highest` from `tasks/task-*.md` exactly as `superdev/scripts/cleanup-run.sh` does (10# arithmetic), `highest != 00 && last == highest` -> `done` else `building`; else `[[ -f "$dir/spec.md" || -f "$dir/plan.md" ]]` -> `planned`; else `pending`. Print `printf '%s\t%s\n' "$dir" "$status"`.
5. After the loop print `next: <first dir whose status != done>` or `next: none`. Stage the script and set its index mode: `git add superdev/scripts/roadmap-status.sh && git update-index --chmod=+x superdev/scripts/roadmap-status.sh`; verify `git ls-files -s superdev/scripts/roadmap-status.sh` starts with `100755`.
6. Write `tests/superdev/roadmap-status.test.ts` following `tests/superdev/status-update.test.ts` (`runScript` with `shell: "bash"`, `withTempDir`, `slash()` for printed paths): one test per status value, mixed roadmap with `next:` pointing at the first non-done phase, all-done -> `next: none`, missing argument -> exit 1, nonexistent file -> exit 1, an existing roadmap with no `- Dir:` lines -> exit 3, a roadmap path with `./` prefix prints without it.

### Edge cases
- `status.md` present but no `tasks/` dir -> `building` (highest 00).
- `Dir:` value with trailing whitespace -> trimmed.
- Windows path with backslashes in the argument -> normalised to `/` before joining.

### Contracts
- stdout: `<dir>\t<done|building|planned|pending>` per phase, then `next: <dir>|none`. stderr: errors only. Exit 0 / 1 / 3 as in criterion #1. Consumed by the `roadmap` skill (Task 5).

### DoD
Script committed at mode 100755, both test commands green.


### Covered criteria
1. `superdev/scripts/roadmap-status.sh <roadmap.md>` drukuje na stdout po jednej linii `<dir><TAB><status>` na każdą linię `- Dir:` z sekcji `## Phases` (w kolejności pliku, `<dir>` = katalog roadmapu + `/` + wartość `Dir:`), a na końcu `next: <dir>` (pierwsza faza o statusie innym niż `done`) albo `next: none`; status: katalog nieobecny -> `done`; `status.md` obecny i `task: NN` równe najwyższemu `tasks/task-NN.md` (i różne od 00) -> `done`; `status.md` obecny w innym przypadku -> `building`; brak `status.md`, obecny `spec.md` lub `plan.md` -> `planned`; w przeciwnym razie -> `pending`. Brak argumentu lub pliku -> usage na stderr, exit 1; brak linii `- Dir:` -> błąd na stderr, exit 3.
8. `superdev/.claude-plugin/plugin.json` wymienia `./skills/roadmap/` i `./skills/roadmap-reviewer/`; `superdev/README.md`, root `CLAUDE.md` i komentarz `cleanup` w `superdev/skills/setup/assets/config.yml` opisują fazy; `node --test "tests/**/*.test.ts"` jest zielony (w tym `tests/portability.test.ts` dla nowego skryptu).
