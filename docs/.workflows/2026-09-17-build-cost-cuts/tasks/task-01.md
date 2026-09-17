
## Task 1 - Give the three runtime-invoked scripts the exec bit
- TDD: none
- Model: sonnet
- Effort: low
- Covers: `Wzorzec na skrypt` (#13)

### Dependencies
- none

### Files
- modify - superdev/scripts/commit-task.sh (tryb w indeksie git: 100644 -> 100755, treść bez zmian)
- modify - superdev/scripts/decompose.sh (tryb w indeksie git: 100644 -> 100755, treść bez zmian)
- modify - superdev/scripts/cleanup-run.sh (tryb w indeksie git: 100644 -> 100755, treść bez zmian)
- modify - tests/superdev/commit-task.test.ts (komentarz nad `function run` o trybie `100644`)
- modify - tests/superdev/decompose.test.ts (komentarz o trybie `100644` przy `runScript` z `shell: "bash"`, linia 107)

### Task Checks
- git ls-files -s superdev/scripts/commit-task.sh superdev/scripts/decompose.sh superdev/scripts/cleanup-run.sh superdev/scripts/stats-record.sh superdev/scripts/stats-report.sh superdev/scripts/checkpoint-update.sh superdev/scripts/record-decision.sh superdev/scripts/vibe-guard.sh | grep -c '^100755'
- node --test tests/portability.test.ts
- node --test tests/superdev/commit-task.test.ts
- node --test tests/superdev/decompose.test.ts

### Approach
1. Dla każdego z ośmiu skryptów runtime z pierwszej linii `### Task Checks`, którego tryb w `git ls-files -s` nie jest `100755` (dziś: `commit-task.sh`, `decompose.sh`, `cleanup-run.sh`; pozostałe pięć sprawdź, nie zakładaj), wykonaj `chmod +x <ścieżka>` oraz `git update-index --chmod=+x <ścieżka>` (drugie ustawia tryb w indeksie także na Windows, gdzie `core.fileMode` jest `false`); pierwsza komenda z `### Task Checks` ma wypisać `8`.
2. W `tests/superdev/commit-task.test.ts` zastąp komentarz nad `function run(dir, env, args)` (dziś: skrypt ma tryb `100644`, każdy SKILL.md woła go jawnie przez `bash`, sweep przenośności nie wymaga bitu) zdaniem, że skrypt ma `100755`, bo orkiestratory wołają go bezpośrednio (`"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh"`), a harness dalej uruchamia go przez `shell: "bash"`, bo tak testuje treść skryptu, nie jego bit. Ten sam komentarz w `tests/superdev/decompose.test.ts` (linia 107) o `decompose.sh` popraw tak samo.
3. Nic w treści skryptów się nie zmienia; `tests/portability.test.ts` (reguła `execBitViolations`) po tym zadaniu przechodzi zarówno z dzisiejszą postacią `bash "..."`, jak i z postacią bezpośrednią, którą wprowadzą zadania 8-10, 13 i 15.

### Failure modes
- when `git update-index --chmod=+x` fails (plik nieśledzony lub poza indeksem) -> response zatrzymaj zadanie z `VERDICT: FAIL` i komunikatem gita, log linia w `## Runs`, test pierwsza komenda `### Task Checks` wypisuje mniej niż `8`

### Contracts
- Osiem skryptów runtime (`commit-task.sh`, `decompose.sh`, `cleanup-run.sh`, `stats-record.sh`, `stats-report.sh`, `checkpoint-update.sh`, `record-decision.sh`, `vibe-guard.sh`) ma tryb `100755` w indeksie git; postać bezpośrednia wywołania (bez `bash`) jest od tego zadania dozwolona przez `tests/portability.test.ts` - consumed by `Rewrite superbuild for Review: none, no effort passing and direct script calls` (Task 8), `Rewrite simplebuild for no effort passing and direct script calls` (Task 9), `Move the build reviewers and e2e to direct script calls with patterns` (Task 10), `Move vibe to direct script calls with patterns` (Task 15)

### DoD
`git ls-files -s` pokazuje `100755` dla ośmiu skryptów (pierwsza linia `### Task Checks` wypisuje `8`), `tests/portability.test.ts`, `tests/superdev/commit-task.test.ts` i `tests/superdev/decompose.test.ts` zielone, oba komentarze w testach opisują nowy stan.


### Covered criteria
13. Wzorzec na skrypt - Każdy z tych skilli deklaruje jeden wzorzec pre-approval na każdy skrypt, który uruchamia w runtime, a każdy tak uruchamiany skrypt jest wykonywalny w indeksie git i ma shebang bash.
