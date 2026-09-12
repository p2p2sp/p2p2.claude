# Intent: Przebudowa superfix:code-auditor - profil repo, redakcja critica, zawężenie do katalogu, limit findingów
Date: 2026-09-12

## Request
Przebudować skill `superfix/skills/code-auditor` i jego agentów (`superfix/agents/`) tak, aby wnioskowanie LLM zasilało sweep wiedzą o konkretnym repo (profil repo przed sweepem), critic weryfikował claim bez narracji detektywa i z mandatem obalenia, model frontier-tier kaskadował z sesji użytkownika, moderator w głównej sesji czytał tylko werdykty i nagłówki, `findings.md` miał twardy limit, sweep dało się zawęzić do wskazanego katalogu, a `dependents` nie zlewał plików o powtarzalnej nazwie. Skrypty deterministyczne zostają jako priors i bramki.

## Decisions
### 1. Gdzie żyje krok profilowania repo?
Nowy agent `superfix:profiler` w `superfix/agents/profiler.md` (wpis w `agents[]`), `model: inherit`, `tools: Read, Write, Grep, Glob, Bash` (Bash tylko do `git log`, Write tylko do `profile.md`). Dispatchowany w Fazie 0 równolegle ze skryptami sweepu z Fazy 1; Faza 2 czeka na jego wynik. Czyta CLAUDE.md i `.claude/rules/` repo docelowego, build i testy, `git log` po commitach fix/hotfix/revert w oknie sweepu (już naprawione błędy stają się listą "nie odkrywaj ponownie"). Pisze `.temp/superfix/<run-id>/profile.md` z sekcjami: klasy błędów z historii, kształt kontraktu producer/consumer w tym stacku, ścieżki krytyczne, `## Severity calibration`. Skill dokleja go do `job.md` jako sekcję `## Repo profile`; deterministyczna część `job.md` (rubryka, sygnały, `Target root:`) zostaje własnością skilla.

### 2. Jak wskazany katalog zawęża run?
Frontmatter dostaje `argument-hint: [<repo-path>] [<area-dir>]`; skill czyta `$ARGUMENTS`, brak argumentów to dotychczasowe pytanie interaktywne. `collect_signals.sh` i `collect_edges.sh` przyjmują opcjonalny `--scope <dir>` (ścieżka względna do root): plik trafia do sweepu tylko, gdy leży pod `<dir>`; para jest kandydatem, gdy co najmniej jeden koniec leży w obszarze. `dependents` i `git log` liczone po całym repo. `job.md` dostaje linię `Scope: <dir>`; detektyw ma entry point w obszarze i może śledzić poza nim.

### 3. Jak liczyć `dependents` dla plików o powtarzalnej nazwie?
`collect_signals.sh` zlicza wystąpienia każdego basename wśród wszystkich śledzonych plików repo (niezależnie od `--scope`). Basename unikalny: stem jak dziś. Basename powtórzony: stem to `<katalog-nadrzędny>/<stem>` (np. `code-auditor/SKILL`, `auth/index`); gdy i ten się powtarza, dokładany jest kolejny segment od prawej aż do unikalności. Plik w korzeniu repo o powtórzonym basename dostaje `dependents: -1`. Rekord JSON dostaje pole `dependents_stem` z użytym literałem (`null` przy `-1`). Reguła dotfile bez zmian.

### 4. Jak critic dostaje odredagowany claim bez czytania pełnych raportów przez główną sesję?
Detektyw pisze obok raportu sidecar `<rank>-<slug>.claim.md` zawierający wyłącznie `LOCATION:`, `CLASS:` i blok `## Reproduce` (wejście, komenda, obserwowalny objaw; bez uzasadnienia, bez `CONFIDENCE`/`SEVERITY`). Schemat w `synthesis.md`. Critic dostaje ścieżkę sidecara, `job.md`, skrypt worktree i świeży worktree; ma zakaz otwierania raportu głównego i mandat "obal": `VERIFIED` tylko gdy reprodukcja przeszła mimo prób obalenia. Critic, który nie zwrócił `VERDICT:`, jest dispatchowany ponownie raz ze świeżym worktree; po drugim braku finding zostaje jako `INCONCLUSIVE` z notką "critic returned no verdict". Żaden kandydat nie znika po cichu.

### 5. Kształt twardego limitu w `findings.md`
Maksymalnie 10 pełnych wpisów o najwyższej severity. Pasmo 1-3 nigdy nie dostaje pełnego wpisu. Reszta w sekcji `## Further findings (N)`, jedna linia na finding: `SEVERITY · LOCATION · CLASS · tytuł · ścieżka do raportu`. `INCONCLUSIVE` liczy się do limitu z widoczną etykietą i nazwanym brakującym oracle. Pasma severity stosowane z `profile.md` (`## Severity calibration`), opisy z `synthesis.md` jako fallback. Fale z Fazy 6 dopisują do jednej puli, `findings.md` jest regenerowany, limit dotyczy runu.

### 6. Modele agentów
`detective.md` i `critic.md`: `model: inherit`, `effort: high` (critic dostaje brakujący `effort`). `scout.md` i `edge-scout.md` zostają na `haiku`. `superfix/README.md` i `superfix/CLAUDE.md` nazywają konsekwencję: model sesji jest modelem reprodukcji, słabszy model w sesji to słabsza weryfikacja.

### 7. Moderator w głównej sesji
Faza 5 czyta werdykty criticów oraz nagłówki raportów (`# tytuł`, `LOCATION`, `CLASS`, `SEVERITY`), nigdy sekcje raportu. Główna sesja nie otwiera pełnych raportów w żadnej fazie; czyta je użytkownik.

### 8. Faza 6
Mechanika bez zmian. Klasy błędów z `profile.md` są dodatkowym seedem fal obok potwierdzonych findingów.

## Constraints
- Skrypty deterministyczne (`collect_signals.sh`, `collect_edges.sh`, `rank.ts`, `rank_edges.ts`, `worktree.sh`) zostają priors i bramkami; ich progi (`--min-impact 3 --min-opportunity 3 --top 20 --top-edges 20`) bez zmian.
- Każdy run jest czysty: brak persystencji raportów między runami, profiler nie czyta poprzednich `findings.md`.
- Synchronizacja katalogu: `superfix/.claude-plugin/plugin.json` `agents[]` (+profiler), `superfix/CLAUDE.md`, `superfix/README.md`, `tests/superfix/` (nowe przypadki dla `--scope` i `dependents_stem`, wzór nazw i helpery jak w istniejących testach).
- Agenty dostają ścieżki skryptów jako argumenty w briefie dispatchu, nigdy przez `${CLAUDE_SKILL_DIR}` w pliku agenta.
- Testy uruchamiane z root repo: `node --test "tests/**/*.test.ts"`; muszą przechodzić pod Git-Bash.
- Bez em dash i en dash w żadnym pliku.

## Out of scope
- Weryfikacja kontraktu statycznego dla prozy i skilli (repo skilli audytuje `supercc:skill-designer`).
- Cross-model critic.
- Argument `--max-findings`.
- Zmiana rubryki 1-5, bramek i ich progów.
- ADR.

## History
- none
