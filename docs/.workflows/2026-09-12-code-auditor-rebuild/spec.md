# Spec: Przebudowa superfix:code-auditor - profil repo, redakcja critica, zawężenie do katalogu, limit findingów
Intent: docs/.workflows/2026-09-12-code-auditor-rebuild/intent.md

## Problem / context (Why)

`code-auditor` zbiera sygnały deterministycznymi skryptami (churn, fix_commits, dependents, pary plików po wspólnym literale) i te sygnały są takie same dla każdego repo. Repo różnią się tym, jakie klasy błędów w nich naprawdę występują, jak biegną kontrakty producer/consumer i co w danym repo znaczy "poważny błąd". Bez tej wiedzy scouty oceniają intuicją, a moderator kalibruje severity ogólną skalą.

Critic dostaje dziś pełną narrację detektywa (opis, uzasadnienie, `CONFIDENCE`, `SEVERITY`), więc dziedziczy jego framing zamiast go niezależnie obalać. Badania nad weryfikacją LLM pokazują, że recenzent, który czyta uzasadnienie odkrywcy, potwierdza fałszywe alarmy, których nie potwierdziłby na samych faktach.

Detective i critic mają na sztywno `model: opus`, więc wybór modelu w sesji użytkownika nie ma wpływu na koszt i siłę weryfikacji. Główna sesja w Fazie 5 czyta pełne raporty detektywów, przez co przy kilkudziesięciu raportach kontekst moderatora puchnie. `findings.md` nie ma limitu, więc przy dużym repo użytkownik dostaje listę, której nie czyta.

Sweep zawsze obejmuje całe repo, mimo że użytkownik zwykle chce naprawić jeden obszar. `dependents` liczy odwołania po samej nazwie pliku, więc w repo z wieloma `index.ts`, `models.py` czy `SKILL.md` każdy taki plik dostaje sumę odwołań do wszystkich imienników i oś Impact traci moc rozdzielczą.

## Goal (What)

- Każdy run zaczyna się od profilu repo docelowego: klasy błędów z historii commitów, kształt kontraktów w tym stacku, ścieżki krytyczne, kalibracja severity. Profil trafia do `job.md` i widzą go scouty, detektywi, critic i moderator.
- Użytkownik może wskazać katalog i wtedy sweep, scoring i dispatch obejmują tylko pliki z tego katalogu (pary: co najmniej jeden koniec w katalogu), a sygnały git i `dependents` liczą się nadal po całym repo.
- Plik o powtarzalnej nazwie dostaje `dependents` liczone po literale z katalogiem nadrzędnym, a rekord sygnału mówi, po jakim literale liczono.
- Critic weryfikuje claim wyłącznie na podstawie lokalizacji, klasy i kroków reprodukcji, z mandatem obalenia; nigdy nie widzi narracji, `CONFIDENCE` ani `SEVERITY` detektywa.
- Żaden kandydat nie znika po cichu: critic bez werdyktu dostaje jedno ponowienie, potem finding zostaje na liście jako `INCONCLUSIVE` z powodem.
- Detective i critic pracują na modelu sesji użytkownika; scout i edge-scout zostają na tanim tierze.
- Moderator w głównej sesji czyta werdykty i nagłówki raportów, nigdy pełne raporty.
- `findings.md` pokazuje w pełnym formacie co najwyżej 10 findingów o najwyższej severity, resztę jako listę jednolinijkową z linkiem do raportu; pasmo 1-3 nigdy w pełnym formacie.
- Katalog pluginu (`plugin.json`, `superfix/CLAUDE.md`, `superfix/README.md`) i testy w `tests/superfix/` odzwierciedlają nowy stan.

## Out of scope

- Weryfikacja kontraktu statycznego dla prozy i skilli (SKILL.md, agenci); repo skilli audytuje `supercc:skill-designer`.
- Critic na modelu innej rodziny niż Claude (cross-model critic).
- Argument `--max-findings` lub inna konfiguracja limitu findingów.
- Zmiana rubryki 1-5, kwadrantów, progów bramek (`--min-impact 3 --min-opportunity 3 --top 20 --top-edges 20`) i algorytmu `rank.ts` / `rank_edges.ts`.
- Persystencja profilu lub findingów między runami; profiler nie czyta poprzednich `findings.md`.
- ADR.
- Zmiana `worktree.sh` i `check_node.sh`.

## User scenarios

**S1. Jako użytkownik audytujący jeden moduł** chcę wywołać `/superfix:code-auditor <repo> <katalog>` i dostać hotlistę, edge gate i findingi tylko dla tego katalogu, żeby nie płacić za scoring i detektywów w częściach repo, których teraz nie naprawiam. Gdy pomylę ścieżkę katalogu, chcę zatrzymania z komunikatem przed wydaniem jakichkolwiek tokenów na sweep.

**S2. Jako użytkownik audytujący nieznane repo** chcę, żeby run najpierw ustalił, jakie błędy to repo faktycznie miewa i co w nim jest krytyczne, żeby scouty i detektywi szukali tego, co tu boli, a severity była skalowana do tego repo, nie do abstrakcyjnego "RCE / account takeover".

**S3. Jako użytkownik audytujący monorepo z wieloma `index.ts`** chcę, żeby Impact każdego z nich odzwierciedlał odwołania do tego konkretnego pliku, żeby hotlista nie wynosiła na górę wszystkich imienników naraz.

**S4. Jako użytkownik czytający `findings.md`** chcę, żeby każdy `VERIFIED` był potwierdzony przez agenta, który nie znał uzasadnienia detektywa i próbował claim obalić, żeby mieć pewność, że na liście są błędy, a nie przekonujące opowieści.

**S5. Jako użytkownik płacący za run** chcę, żeby wybór modelu w mojej sesji decydował o modelu detektywów i criticów, żeby jednym wyborem sterować kosztem i siłą weryfikacji, i żeby dokumentacja mówiła, co tracę na słabszym modelu.

**S6. Jako użytkownik czytający `findings.md`** chcę w pełnym formacie tylko to, co mam naprawić najpierw, a resztę jako spis z linkami, żeby przeczytać wynik w jednym podejściu.

**S7. Jako użytkownik prowadzący długi run** chcę, żeby główna sesja nie ładowała pełnych raportów detektywów, żeby kontekst moderatora nie degradował się przy kilkudziesięciu raportach.

**S8. Jako utrzymujący plugin** chcę, żeby `plugin.json`, `superfix/CLAUDE.md`, `superfix/README.md` i testy opisywały pięciu agentów, `--scope`, sidecar claim i dziedziczenie modelu, żeby katalog pozostał źródłem prawdy.

## Acceptance criteria

Zawężenie do katalogu (S1)
1. Wywołanie `/superfix:code-auditor <repo> <katalog>` skanuje, punktuje i dispatchuje detektywów tylko do plików leżących pod `<katalog>`; wywołanie bez argumentów zachowuje dotychczasowe pytanie o repo i job. `<katalog>` podany jako ścieżka bezwzględna wewnątrz repo jest przyjmowany i zapisywany w `job.md` jako względny; `<katalog>`, który nie istnieje lub leży poza repo, zatrzymuje run w Fazie 0 z komunikatem nazywającym ścieżkę, zanim jakikolwiek skrypt sweepu lub agent zostanie uruchomiony.
2. `collect_signals.sh --scope <dir>` emituje rekordy wyłącznie dla śledzonych plików pod `<dir>`, a wartości `churn`, `fix_commits` i `dependents` tych plików są identyczne z wartościami z runu bez `--scope`.
3. `collect_edges.sh --scope <dir>` emituje parę wtedy i tylko wtedy, gdy co najmniej jeden z jej końców leży pod `<dir>`; para z obydwoma końcami poza `<dir>` nie pojawia się w wyniku.

Profil repo (S2)
4. Przed Fazą 2 w `.temp/superfix/<run-id>/` istnieje `profile.md` napisany przez agenta `superfix:profiler` z czterema nagłówkami: `## Bug classes from history` (klasy błędów z commitów fix/hotfix/revert w oknie sweepu), `## Contract shape` (kształt kontraktów producer/consumer w tym stacku), `## Critical paths` (ścieżki krytyczne), `## Severity calibration`; a `job.md` zawiera jego treść jako sekcję `## Repo profile`. Profiler, który nie napisał `profile.md` lub napisał plik bez któregoś z tych czterech nagłówków, jest dispatchowany ponownie raz; po drugiej porażce run kontynuuje bez sekcji `## Repo profile`, a `findings.md` w `## Coverage notes` niesie linię "repo profile unavailable".
5. Wejściem profilera jest wyłącznie repo docelowe (CLAUDE.md, `.claude/rules/`, pliki build i testów, `git log`) oraz `job.md` bieżącego runu; żaden plik z innego runu w `.temp/superfix/` nie jest jego wejściem. Pusta historia commitów fix/hotfix/revert w oknie daje profil z jawną adnotacją "no fix history in window", nie pusty plik.
6. Moderator stosuje pasma severity z `## Severity calibration` profilu; pasma z `synthesis.md` są regułą obronną stosowaną tylko wtedy, gdy `job.md` nie ma sekcji `## Repo profile` (kryterium 4, ścieżka po drugiej porażce profilera).

`dependents` dla powtarzalnych nazw (S3)
7. Literał zliczania jest wyznaczany wśród wszystkich śledzonych plików repo po filtrze szumu, niezależnie od `--scope`. Literał startowy pliku to jego `<stem>` (dotychczasowa reguła, z regułą dotfile bez zmian). Literał "powtarza się", gdy inny plik z tego zbioru wyznacza dokładnie ten sam literał (porównanie całych łańcuchów, nie sufiksów). Gdy literał pliku się powtarza, każdy plik z kolidującej grupy dokłada kolejny segment katalogu od prawej (`a/index`, potem `lib/a/index`) i porównanie jest powtarzane w tym samym kroku rozszerzania dla całej grupy (lockstep), aż literał pliku stanie się unikalny lub ścieżka pliku się wyczerpie; plik, który wyczerpał ścieżkę, wypada z grupy, a pozostałe rozszerzają dalej. Plik, którego ścieżka wyczerpała się bez unikalnego literału (w tym plik w korzeniu repo o powtórzonym `<stem>`), otrzymuje `dependents: -1` i `dependents_stem: null`. Plik z unikalnym literałem startowym liczy jak dotychczas po samym `<stem>`.
8. Każdy rekord `signals.jsonl` z `dependents` różnym od `-1` niesie pole `dependents_stem` równe literałowi użytemu do zliczania; rekord z `dependents: -1` niesie `dependents_stem: null`.
9. W repo z plikami `a/index.ts`, `b/index.ts`, trzema plikami zawierającymi literał `a/index` i jednym plikiem zawierającym literał `b/index` (żaden z nich nie jest samym `index.ts`), `dependents` wynosi odpowiednio 3 dla `a/index.ts` i 1 dla `b/index.ts`, a `dependents_stem` odpowiednio `a/index` i `b/index`.

Niezależna weryfikacja (S4)
10. Detektyw z findingiem pisze obok raportu plik `<rank>-<slug>.claim.md` zawierający wyłącznie `LOCATION:`, `CLASS:` i sekcję `## Reproduce` z krokami i obserwowalnym objawem; plik nie zawiera `CONFIDENCE`, `SEVERITY`, sekcji `Root cause` ani `Suggested fix`.
11. Critic otrzymuje ścieżkę sidecara, `job.md`, skrypt worktree i świeży worktree; nie otrzymuje ścieżki raportu głównego, a jego instrukcja nakazuje próbę obalenia claimu i dopuszcza `VERIFIED` tylko po reprodukcji, która przeszła mimo tej próby.
12. Critic, który zakończył się bez linii `VERDICT:`, jest dispatchowany ponownie raz ze świeżym worktree; po drugim braku werdyktu finding trafia do `findings.md` jako `INCONCLUSIVE` z adnotacją "critic returned no verdict".

Model z sesji (S5)
13. `detective.md` i `critic.md` mają `model: inherit` i `effort: high`; `scout.md` i `edge-scout.md` zachowują `model: haiku`.
14. `superfix/README.md` i `superfix/CLAUDE.md` stwierdzają, że model sesji jest modelem detektywów i criticów, i że słabszy model w sesji oznacza słabszą reprodukcję.

Limit findingów (S6)
15. `findings.md` zawiera w pełnym formacie co najwyżej 10 wpisów, uporządkowanych malejąco po severity; remis na granicy limitu rozstrzyga kolejno: werdykt (`VERIFIED`, potem `PARTIALLY VERIFIED`, potem `INCONCLUSIVE`), wyższy `CONFIDENCE`, niższy `<rank>` raportu. Żaden wpis z severity w paśmie 1-3 nie występuje w pełnym formacie.
16. Wszystkie pozostałe findingi występują w sekcji `## Further findings (N)` jako jedna linia każdy w formacie `SEVERITY · LOCATION · CLASS · tytuł · ścieżka do raportu`, a `N` równa się liczbie tych linii.
17. Finding `INCONCLUSIVE` liczy się do limitu 10, zachowuje `SEVERITY` z raportu i `CONFIDENCE` obniżone o jeden stopień (reguła `synthesis.md`), i nosi widoczną etykietę `INCONCLUSIVE` z powodem: nazwą brakującego oracle albo, na ścieżce z kryterium 12, adnotacją "critic returned no verdict". Po kolejnej fali Fazy 6 `findings.md` jest regenerowany z jednej puli i nadal spełnia kryteria 15 i 16.

Moderator (S7)
18. Faza 5 w SKILL.md nakazuje głównej sesji ustalić ranking wyłącznie z werdyktów criticów i nagłówków raportów (`# tytuł`, `LOCATION`, `CLASS`, `SEVERITY`), a pełny raport otwierać tylko dla wpisów, które weszły do limitu 10 z kryterium 15, i tylko w chwili pisania `findings.md`; w żadnej innej fazie i dla żadnego innego raportu główna sesja nie otwiera sekcji poza nagłówkiem.

Katalog i testy (S8)
19. `superfix/.claude-plugin/plugin.json` `agents[]` zawiera `./agents/profiler.md`; `superfix/CLAUDE.md` i `superfix/README.md` wymieniają pięciu agentów, argument `[<repo-path>] [<area-dir>]`, flagę `--scope` i sidecar claim.
20. `node --test "tests/**/*.test.ts"` przechodzi pod bash i Git-Bash, a `tests/superfix/` zawiera przypadki dla `--scope` w obu skryptach sweepu (kryteria 2 i 3), dla `dependents_stem` i dla scenariusza z kryterium 9.

## Constraints / assumptions

- Skrypty deterministyczne zostają priorami i bramkami; wnioskowanie o repo i o claimach należy do agentów (invariant "thin harness, model does the judgment").
- Agenty otrzymują ścieżki skryptów i plików jako argumenty briefu dispatchu; żaden plik w `agents/` nie rozwija `${CLAUDE_SKILL_DIR}`.
- Każdy run jest czysty: nic z poprzednich runów nie jest wejściem.
- Profiler ma `tools: Read, Write, Grep, Glob, Bash`, przy czym Bash służy wyłącznie do `git log`, a Write wyłącznie do `profile.md`.
- Harness honoruje `model: inherit` w frontmatterze agenta (wartość udokumentowana); `effort` w frontmatterze agenta jest przyjętym w repo założeniem (zapisanym w głównym CLAUDE.md), nie gwarancją.
- Nowe przypadki testowe używają wyłącznie helperów z `tests/harness/` i naśladują nazewnictwo istniejących testów (zdanie opisujące gwarantowane zachowanie, bez `describe`).
- Żaden edytowany lub nowy plik nie zawiera em dash ani en dash.
- Wszystkie pliki źródłowe pluginu w języku angielskim.
