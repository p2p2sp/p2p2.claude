# Spec: superdev - pętla recenzji i bramki jakości w superbuild/simplebuild
Intent: docs/.workflows/2026-09-11-superdev-review-loop-and-quality-gates/intent.md

## Problem / context (Why)
Duże buildy superdev (11-22 zadań) kończą się 2-5 rundami końcowej recenzji kodu, a pętla poprawek trwa tyle co budowa. Najpoważniejsze błędy (utrata danych, 404 zamieniane w 500, wartości z zewnątrz bez walidacji, szwy między zadaniami, regresje z rund poprawek) przechodzą przez plan, recenzję planu i bramkę per-task i wychodzą dopiero w końcowej recenzji, często w rundzie 2-3. Z ok. 120 Critical/Important z rund 1 w ośmiu projektach największe klasy to gałąź awaryjna bez decyzji, szew między zadaniami („każde zadanie odnotowało lukę i odłożyło ją na nikogo”) i test, który nie może paść.

Przyczyny leżą w samym pluginie, nie w modelu ani efforcie: żadna bramka przed końcową recenzją nie pyta „co się stanie, gdy”; recenzenci buildu nie mają skalowania rund, więc każda runda jest pełnym świeżym czytaniem całego diffu z nowymi, wcześniej istniejącymi znaleziskami i inflacją rangi; rundy poprawek wprowadzają regresje, bo nic nie wymaga testu na poprawkę, a implementor rusza też 10-30 Minor; orkiestrator ma `Edit`/`Write` i po padnięciu implementora na limicie kończy poprawki sam; `git add -A` w `commit-task.sh` i `decompose.sh` zgarnia obce i tymczasowe pliki (albo, gdy poprawka została w drzewie, nie zgarnia nic); `resolve-input.sh` rozwiązuje ścieżki względem cwd; recenzja spec daje PASS bez uruchomienia pełnego zestawu, a przy kryterium niespełnialnym przez zatwierdzoną decyzję krąży jako Critical do wyczerpania budżetu.

## Goal (What)
Po zmianie build superdev (oba tory) ma cztery warstwy bramek o rozłącznych mandatach i twardych budżetach, a każda z nich działa na małym, jasno wyznaczonym zakresie:

- Plan nazywa zachowanie awaryjne, konsumentów kontraktów i kształt odpowiedzi w miejscu, które recenzent planu sprawdza; niepełny plan pada na recenzji planu, nie w kodzie.
- Bramka per-task dodatkowo przechodzi „failure pass” po diffie zadania.
- Co 5 zacommitowanych zadań, dopóki zostają zadania do zbudowania, recenzja kontrolna (checkpoint) czyta deltę od poprzedniego checkpointu i uruchamia pętlę poprawek.
- Recenzja końcowa jest ostatnią rundą tego łańcucha z mandatem integracyjnym nad całym buildem i budżetem 1 poprawka + 1 re-recenzja, po którym decyzję podejmuje użytkownik.
- Znaleziska mają stałe ID; każda runda po poprawce weryfikuje poprzednie po ID i czyta tylko diff poprawki; Minor trafiają do ulotnego pliku długu i nie wpływają na werdykt.
- Poprawki są udowadniane testem i zadeklarowane co do plików; commit stawia w indeksie wyłącznie zbiór zadeklarowany, a wszystko inne zatrzymuje build z listą.
- Orkiestrator nie edytuje plików i przy każdym przerwaniu (limit, brak raportu, budżet) eskaluje do użytkownika.
- Recenzja spec najpierw uruchamia pełny zestaw, a kryterium niespełnialne albo niesprawdzalne kończy się werdyktem `BLOCKED` i decyzją użytkownika, nie pętlą.

## Out of scope
- Izolacja builda w git worktree.
- Skill `roadmap` oraz pluginy superui, supergh, superfix, superbiz, supercc.
- Naprawa błędów w projektach, których raporty posłużyły jako dowody.
- Zmiana budżetu rund bramki per-task (max 3) i eskalacja implementora na mocniejszy model.
- Trwała księga długu w repo hosta i zmiany formatu wpisu changelogu (`changelog-writer`, `references/changelog-entry-format.md`).
- Zmiana `Model:`/`Effort:` w planach i modeli/effortu orkiestratorów.
- Zmiana skilli planowania poza szablonem zadania, checklistą i instrukcją pisania `### Approach`/`### Contracts`.

## User scenarios
- Jako planista (użytkownik piszący plan przez `superplan`/`simpleplan`) chcę, żeby szablon zadania wymuszał na mnie zapisanie każdej gałęzi awaryjnej z odpowiedzią, logiem i testem oraz konsumenta każdego kontraktu, żeby recenzent planu odrzucił plan z luką zamiast recenzenta kodu za trzy godziny.
- Jako użytkownik `superbuild` chcę, żeby bramka po zadaniu zapytała o każdą nową gałąź `catch`, każdy nowy wariant zbioru i każdą wartość z zewnątrz w diffie tego zadania, żeby 404 zamienione w 500 zatrzymało to jedno zadanie, a nie wyszło po 20 kolejnych.
- Jako użytkownik uruchamiający `superbuild` na 15 zadań chcę, żeby po 5. i 10. zadaniu recenzent kodu przeczytał tylko te zadania i uruchomił poprawki od razu, żeby recenzja końcowa dostała deltę i szwy, a nie 30 tys. linii.
- Jako użytkownik czekający na koniec builda chcę, żeby recenzja końcowa skończyła się po jednej dyspozycji poprawek i jednej re-recenzji, a resztę dostała ode mnie jako decyzję, żeby build nie krążył w 4-9 rundach.
- Jako użytkownik czytający raport re-recenzji chcę widzieć tabelę „C1 ADDRESSED, I3 NOT ADDRESSED” i tylko znaleziska z diffu poprawki, żeby wiedzieć, co naprawdę zostało, bez listy 20 Minor i 60 linii pochwał.
- Jako użytkownik, którego build trafił na limit wydatków, chcę dostać pytanie „retry po resecie / abort” zamiast orkiestratora dokańczającego kod z dysku w sonnet/low.
- Jako użytkownik pracujący równolegle w tym samym checkoucie chcę, żeby commit zadania zatrzymał się z listą moich niezadeklarowanych zmian, zamiast wciągnąć je do commitu albo, w drugą stronę, zostawić poprawkę agenta w drzewie.
- Jako użytkownik, który uruchomił build z cwd w podkatalogu repo (po `cd src && pnpm test`), chcę, żeby fork recenzenta i tak dostał plan i spec, zamiast `INPUT ERROR` w piątej rundzie.
- Jako użytkownik, którego kryterium akceptacji stało się niespełnialne przez decyzję zapisaną w planie, chcę dostać to jako pytanie po pierwszej recenzji spec, a nie jako Critical wracający w każdej rundzie.
- Jako właściciel pluginu chcę, żeby `plugin.json`, README, manifest i CLAUDE.md opisywały nowy łańcuch tak, jak działa, żeby następna osoba edytująca źródła nie odtwarzała go z transkryptów.

## Acceptance criteria

Historia A - plan nazywa zachowanie awaryjne i konsumentów (planista)
1. Oba szablony planu (`skills/superplan/templates/plan.md`, `skills/simpleplan/templates/plan.md`) mają w zadaniu sekcję `### Failure modes` zamiast `### Edge cases`, z instrukcją stałego kształtu punktu „gdy X zawiedzie / wejście jest złe / dwa X biegną równolegle → odpowiedź Y, log Z, test T” i zasadą, że „none” wymaga jednosłownego uzasadnienia.
2. W obu szablonach `### Contracts` wymaga macierzy metod i kodów dla zmiany transportu, listy konsumentów dla rozszerzonego zamkniętego zbioru i nazwy zadania-konsumenta przy każdym kontrakcie używanym przez inne zadanie, a instrukcja `### Approach` zakazuje kodu linia po linii i decyzji awaryjnych.
3. `references/plan-review-checklist.md` ma klasy Blocking B9-B14 (gałąź awaryjna bez odpowiedzi i logu; rozszerzony zamknięty zbiór bez wyliczenia konsumentów; zmiana mechanizmu odpowiedzi bez macierzy metod/kodów; wartość z zewnątrz w ścieżce, zapytaniu lub poleceniu bez walidacji; test, który nie może paść; kontrakt lub wartość bez zadania-konsumenta), każda z dowodem rozstrzygalnym przez Read/Grep/Glob; `superplan-reviewer` i `simpleplan-reviewer` wymieniają zakres B1-B14, a plan z `### Failure modes` równym „none” bez uzasadnienia albo z kontraktem bez zadania-konsumenta dostaje `VERDICT: FAIL` z klasą B9 lub B14.

Historia B - bramka per-task pyta „co się stanie, gdy” (użytkownik superbuild)
4. `agents/superbuild-task-reviewer.md` ma sekcję „failure pass” wykonywaną na diffie zadania: każda nowa gałąź `catch`/fallback (co wraca, co się loguje), każdy nowy wariant zamkniętego zbioru (grep po konsumentach), każda zmiana mechanizmu odpowiedzi (metody i kody), każda wartość z nagłówka lub parametru wchodząca w ścieżkę, zapytanie lub polecenie (walidacja), każdy nowy test (czy może paść); niespełnienie dowolnego punktu to znalezisko Critical lub Important w raporcie zadania.
5. Recenzent zadania i recenzenci buildu mają regułę: zachowanie zapisane w `### Failure modes` zadania to decyzja, a niezgoda z nim to `NOTE: plan defect` w raporcie, nigdy Critical ani Important.

Historia C - checkpoint co 5 zadań (użytkownik obu torów)
6. `superbuild/SKILL.md` i `simplebuild/SKILL.md` uruchamiają recenzję kontrolną po każdym 5. zacommitowanym zadaniu (5, 10, 15, …) tylko wtedy, gdy zostaje co najmniej jedno zadanie do zbudowania; recenzentem jest ten sam skill co w recenzji końcowej kodu (`superbuild-reviewer-change` / `simplebuild-reviewer`), wejście to `stage: checkpoint`, `since: <SHA poprzedniego checkpointu, a dla pierwszego SHA bazy, czyli wartość base: z indeksu decompose.sh i pliku base.md>`, `prior: <ostatni raport poprzedniego checkpointu>` (pomijane dla pierwszego checkpointu) i `report: <workdir>/implementation/checkpoint-NN.md`, a pętla poprawek jest ta sama co w recenzji końcowej (budżet 1 poprawka + 1 re-recenzja, potem `AskUserQuestion`).
7. Build na 5 lub mniej zadań nie ma checkpointu; build na dokładnie 10 zadań ma jeden (po zadaniu 5), a jego recenzja końcowa dostaje `since` równe SHA po zamknięciu ostatniego checkpointu i `prior` równe ostatniemu raportowi tego checkpointu (recenzji albo re-recenzji).

Historia D - recenzja końcowa integracyjna z budżetem (użytkownik obu torów)
8. Recenzja końcowa kodu wchodzi z `stage: final`; jej mandat zapisany w `superbuild-reviewer-change` i `simplebuild-reviewer` to: weryfikacja po ID znalezisk z `prior`, pełne czytanie `git diff <since>..HEAD` (nowe Critical/Important dozwolone dla dowolnego defektu w tej delcie) oraz nad całym buildem szwy między zadaniami (kontrakty z `### Contracts` konsumowane przez inne zadania, wpisy `CARRY:` z notatek) i gałęzie awaryjne przecinające zadania (nowe Critical/Important dozwolone dla szwu, także w kodzie sprzed `since`); styl i polerka nie są znaleziskami.
9. Na torze superbuild recenzja końcowa uruchamia oba forki (`superbuild-reviewer-spec`, potem `superbuild-reviewer-change`) przed pierwszą dyspozycją poprawek; jedna dyspozycja poprawek dostaje oba raporty, po niej każdy fork, który miał Critical/Important, robi jedną re-recenzję (`stage: re-review`); gdy jakakolwiek re-recenzja nie daje PASS, orkiestrator wywołuje `AskUserQuestion` z listą otwartych ID i opcjami (kolejna runda / zaakceptuj z otwartymi / przerwij) i powtarza to pytanie po każdej kolejnej rundzie, którą użytkownik zleci.
10. Recenzja kodu (checkpoint, final i re-review) uruchamia pełny zestaw (build, wszystkie `Test Commands` planu, integracja i e2e, gdy host je ma) i zapisuje wynik w raporcie; po rundzie poprawek, która dotknęła plik spoza testów, re-recenzja ponawia e2e/integrację; gdy host ma zestaw e2e/integracyjny (komenda w planie lub w pamięci hosta), a nie da się go uruchomić w tym środowisku, recenzent zwraca `BLOCKED` z powodem, nigdy PASS; host bez takiego zestawu dostaje jedno zdanie w raporcie i nie jest blokowany.

Historia E - stałe ID i etykiety rund (użytkownik czytający raporty)
11. Recenzenci buildu (`superbuild-reviewer-spec`, `superbuild-reviewer-change`, `simplebuild-reviewer`) przyjmują etykiety `stage: checkpoint|final|re-review`, `prior: <ścieżka poprzedniego raportu>` i `since: <SHA>`; `stage` i `since` są obowiązkowe zawsze (dla pierwszej rundy builda `since` to SHA bazy), `prior` jest obowiązkowe dla `stage: re-review` i dla każdej rundy po wcześniejszym raporcie, a pomijane tylko w pierwszej rundzie builda; brak `stage` lub `since`, albo brak `prior` przy `stage: re-review`, to błąd wejścia zwracany jako `VERDICT: FAIL` z powodem.
12. Każde znalezisko w raporcie ma stałe ID `C<n>`, `I<n>`, `M<n>` nadane w rundzie, w której powstało, i zachowane w kolejnych; raport nie ma sekcji `Strengths`.
13. Minor każdej rundy recenzent dopisuje z ID do `<workdir>/implementation/debt.md` (dopisywanie, nie nadpisywanie) i nie wpływają one na werdykt; `cleanup-run.sh` usuwa ten plik razem z katalogiem runu bez osobnej obsługi.

Historia F - re-recenzja czyta tylko poprawkę (użytkownik czytający raporty)
14. Raport `stage: re-review` zaczyna się od tabeli werdyktów per ID z `prior` (`ADDRESSED` / `NOT ADDRESSED` z file:line), a recenzja obejmuje wyłącznie `git diff <since>..HEAD`.
15. W re-recenzji nowe Critical/Important pojawiają się tylko dla defektów wprowadzonych przez poprawkę, a znalezisko, które w `prior` było Minor, nie może wrócić jako Important.
16. Werdykt re-recenzji to FAIL wyłącznie przy `NOT ADDRESSED` dla Critical/Important albo przy nowym Critical/Important wprowadzonym przez poprawkę; wszystko inne daje PASS.

Historia G - poprawka udowodniona i zadeklarowana (użytkownik obu torów)
17. `agents/superbuild-task-implementor.md` i `agents/simplebuild-task-implementor.md` w trybie listy znalezisk naprawiają wyłącznie ID Critical/Important z raportów, a Minor tylko z jawnie wskazanej listy w wejściu; każde naprawione Critical/Important ma test, który pada przed poprawką i przechodzi po niej, albo linię w notatkach `no test: <powód>` przy tym ID.
18. Notatki poprawek zawierają dla każdego ID z raportów jedną linię statusu (`C1: fixed` / `I3: no test: <powód>` / `I4: skipped: <powód>`) oraz jedną linię `touched: <ścieżka>` na każdy dotknięty plik; ten sam format `touched:` piszą implementorzy zadań dla plików spoza `### Files`.
19. Implementor zadania zapisuje znany problem poza `### Files` zadania jako linię `CARRY: <plik> - <opis>` w notatkach, a recenzja końcowa i implementor poprawek czytają te linie jako wejście (recenzja: do domknięcia w mandacie integracyjnym; implementor: jako część listy do naprawy, gdy raport je wskazuje).

Historia H - recenzja spec uruchamia zestaw i umie powiedzieć „to decyzja” (użytkownik superbuild)
20. `superbuild-reviewer-spec` jako pierwszy krok uruchamia pełny zestaw (build, wszystkie `Test Commands` planu, integracja i e2e, gdy host je ma) i zapisuje wynik w raporcie przed sekcją pokrycia kryteriów.
21. Wszystkie trzy recenzenty buildu zwracają `VERDICT: BLOCKED` + `REVIEW: <ścieżka>`, gdy kryterium jest niespełnione przez decyzję zapisaną w planie lub notatkach (nie przez brak kodu) albo gdy istniejący zestaw e2e/integracyjny nie da się uruchomić; raport ma wtedy sekcję `### Needs decision` z ID i powodem.
22. Orkiestrator na `BLOCKED` nie dispatchuje implementora, tylko `AskUserQuestion` (zaakceptuj kryterium jako zmienione / napraw / przerwij); zaakceptowane kryterium zostaje zapisane w `<workdir>/implementation/decisions.md` i kolejna runda dostaje ten plik etykietą `decisions:` jako decyzję o mocy planu.

Historia I - orkiestrator tylko orkiestruje (użytkownik obu torów)
23. `superbuild/SKILL.md` i `simplebuild/SKILL.md` nie mają `Edit`, `Write` ani `NotebookEdit` w `allowed-tools` i mają je w `disallowed-tools`; żaden krok procedury nie każe orkiestratorowi pisać ani edytować pliku (notatki, raporty, `debt.md`, `decisions.md` i status piszą agenci, forki i skrypty).
24. Uruchomienie agenta lub forka, które kończy się bez wykonania pracy z powodu limitu wydatków, limitu sesji lub błędu API, jest traktowane jako stan „przerwany limitem”, a fork recenzenta bez linii `VERDICT:` lub bez raportu na dysku jako stan „brak raportu”; w obu stanach jedyną akcją orkiestratora jest `AskUserQuestion` (retry po resecie / abort), nigdy dokańczanie pracy z dysku ani recenzja własnoręczna, a stan „przerwany limitem” nie liczy się jako runda ani jako FAIL implementacji.
25. Każda komenda orkiestratora działa identycznie niezależnie od cwd, w którym uruchomiono sesję (build uruchomiony z `src/` daje ten sam wynik co z korzenia repo).

Historia J - commit stawia w indeksie tylko zbiór zadeklarowany (użytkownik pracujący równolegle)
26. `scripts/commit-task.sh` stawia w indeksie wyłącznie: ścieżki z `### Files` pliku zadania (gdy podany), ścieżki z linii `touched:` pliku notatek (gdy podany) i katalog runu; `.temp/` traktuje jak ignorowany niezależnie od `.gitignore` hosta.
27. Przy każdej innej zmianie w drzewie (zmodyfikowany lub usunięty plik śledzony, plik nieśledzony poza `.gitignore` i poza `.temp/`) `commit-task.sh` nic nie commituje, wypisuje listę tych ścieżek i kończy się niezerowo, a orkiestrator na ten wynik eskaluje `AskUserQuestion` (dołącz / odrzuć / przerwij).
28. Po udanym commicie `commit-task.sh` wypisuje linię `commit: <sha>`, której orkiestrator używa jako `since` kolejnej rundy; `scripts/decompose.sh` stawia w indeksie tylko katalog runu, który sam utworzył; commity raportów i close-outu dostają jawny pathspec (katalog runu plus ścieżki z linii `NODE:`/`RULE:`/`ADR:`/`CHANGELOG:` writerów).

Historia K - skrypty przetestowane (właściciel pluginu)
29. `tests/superdev/commit-task.test.ts` ma przypadki: obca zmiana w pliku śledzonym → brak commitu, lista, exit niezerowy; plik nieśledzony poza `.gitignore` → to samo; plik pod `.temp/` → commit przechodzi; `touched:` z notatek wchodzi do commitu; linia `commit: <sha>` w wyjściu.
30. `tests/superdev/decompose.test.ts` ma przypadek: dekompozycja przy brudnym drzewie nie wciąga obcych plików do commitu dekompozycji; `tests/superdev/resolve-input.test.ts` ma przypadek z cwd w podkatalogu repo, w którym ścieżka względna od korzenia repo rozwiązuje się poprawnie.
31. `node --test "tests/**/*.test.ts"` przechodzi w całości pod bash i Git-Bash.

Historia L - preloady i pliki robocze (użytkownik z cwd poza korzeniem)
32. `scripts/resolve-input.sh` rozwiązuje ścieżkę względną względem korzenia repozytorium (poza repo: względem cwd, jak dziś), więc fork wywołany z cwd `src/` czyta `docs/.workflows/<run>/plan.md` poprawnie.
33. Recenzenci i implementorzy mają zapisany zakaz plików roboczych poza `.temp/` (sonda, log, tymczasowy plik testowy), a raport recenzji trafia wyłącznie pod ścieżkę `report:`.

Historia M - plugin dokumentuje sam siebie (właściciel pluginu)
34. `superdev/.claude-plugin/plugin.json`, `superdev/README.md`, root `CLAUDE.md` i `superdev/hooks/content/manifest.md` opisują nowy łańcuch (bramka per-task z failure pass, checkpoint co 5 zadań, recenzja końcowa integracyjna z budżetem 1+1, etykiety `stage`/`prior`/`since`/`decisions`, werdykt `BLOCKED`, pliki `checkpoint-NN.md`, `debt.md`, `decisions.md`) spójnie z treścią skilli i agentów.
35. Żaden plik pluginu nie zawiera em ani en dasha (sprawdzalne grepem po U+2013 i U+2014).

## Constraints / assumptions
- Oba tory dostają wszystkie zmiany, o ile dana warstwa istnieje na torze (simplebuild nie ma bramki per-task ani recenzenta spec; jego `simplebuild-reviewer` pełni rolę recenzenta kodu i przyjmuje werdykt `BLOCKED` dla kryteriów z nagłówka planu).
- Zwrot recenzentów do orkiestratora zostaje w postaci linii `VERDICT: PASS|FAIL|BLOCKED` (+ `REVIEW:`); format raportu na dysku może się zmieniać dowolnie, bo jedynym konsumentem jest implementor poprawek.
- Etykiety wejścia forków są zawsze ścieżkami lub krótkimi wartościami (SHA, nazwa etapu), nigdy treścią (treść psuje preload); każda nowa etykieta z wartością-ścieżką jest obsługiwana przez `resolve-input.sh` albo przez ten sam wzorzec `printf | tr | sed` co `report:`.
- Kształt sygnału limitu (fakt dla planu, nie wymaganie): wynik narzędzia Agent ma status `failed` i tekst „Agent terminated early due to an API error: You've hit your monthly spend limit …” lub „You've hit your session limit …” (error type rate_limit, HTTP 429); po resecie harness sam wstrzykuje komunikat „Your claude.ai usage limit has reset. Continue the task…”. Dokładne brzmienie może się zmieniać między wersjami Claude Code, więc plan traktuje je jako przykład sygnału (status `failed` plus błąd API o limicie), nie jako kontrakt dopasowania co do znaku.
- W żadnym skrypcie pluginu nie ma bare `git add -A` ani `git add .`; orkiestrator nie używa `cd` w Bash (ścieżki absolutne, `-C`/`--prefix`); `resolve-input.sh` ustala korzeń przez `git rev-parse --show-toplevel`.
- Zadania planu tej pracy nakazują implementorowi użycie `supercc:skill-designer` do tworzenia i zmiany plików SKILL.md i agentów.
- Konwencje repo: CLAUDE.md i skrypty po angielsku; skille stack-agnostic (żadnych założeń o konkretnym stacku ani heurystyk rozpoznawania plików testowych); żadnych em/en dashów; testy skryptów w `tests/superdev/` pod `node --test`, zielone pod bash i Git-Bash; `allowed-tools` nie ogranicza puli narzędzi, do zakazu służy `disallowed-tools`; skrypty preloadowane z exec bitem i shebangiem, wywoływane bezpośrednio; skill preloadujący skrypt nie może zakazywać `Bash`.
- Zmiana skilla lub agenta aktualizuje `superdev/.claude-plugin/plugin.json` i właściwe `CLAUDE.md`; manifest tylko przy zmianie grupy lub udokumentowanego łańcucha (tu: łańcuch buildu się zmienia).
- Edycja źródeł nie zmienia zainstalowanej wersji pluginu; weryfikacja treści skilli odbywa się przez czytanie i testy skryptów, nie przez uruchomienie zmienionego skilla w tej sesji.
- Bez ADR w tym repo.
- Stała „co 5 zadań” jest zapisana w treści obu orkiestratorów; nie ma przełącznika konfiguracji.
