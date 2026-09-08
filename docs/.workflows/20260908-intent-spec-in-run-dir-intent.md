# Intent: intent i spec zapisywane w katalogu runu
Date: 2026-09-08

## Request
Skille `intent` i `superspec` mają zapisywać swoje pliki wewnątrz podkatalogu runu - tego samego, w którym ląduje `status.md` (`docs/.workflows/<run>/`) - zamiast płasko obok niego.

## Decisions
### 1. Kto tworzy katalog runu i skąd bierze się jego nazwa
- Chosen: katalog zakłada `intent` jako pierwszy dokument runu - `docs/.workflows/<YYYY-MM-DD>-<slug>/` (format daty `date +%F`, ten sam co w `decompose.sh`) - i pisze tam `intent.md`; `superspec` dziedziczy ten katalog i dokłada `spec.md`; `decompose.sh` używa go jako workdiru zamiast wyliczać nowy z tytułu planu.
- Alternatives: każdy skill robi własny podkatalog - odpada, bo katalog intentu i katalog ze `status.md` pozostałyby dwoma różnymi katalogami; przenoszenie plików przez `decompose.sh` - odpada, bo `intent` i `superspec` nadal śmieciłyby płasko przez cały czas planowania, a poprawka miała dotyczyć właśnie tych skilli.
- Why: jeden katalog na cały run od pierwszego pytania wywiadu; `cleanup-run.sh` sprząta go jednym `rm -rf`, a `superdev-changelog-writer` (wyprowadza id runu z basename workdiru w formacie `<YYYY-MM-DD>-<slug>`) wpina się bez zmian.

### 2. Skąd `decompose.sh` dowiaduje się o katalogu runu
- Chosen: z `dirname` linii `Intent:` planu, a gdy jej brak - ze `Spec:`; jeśli wynik leży pod `docs/.workflows/`, to on jest workdirem. Brak obu linii albo ścieżka spoza `docs/.workflows/` -> dotychczasowe wyliczanie `docs/.workflows/<YYYY-MM-DD>-<slug-planu>/`.
- Alternatives: nowa linia `Workdir:` w preambule planu - odpada, bo wymaga pola w obu szablonach planu, w `simpleplan`, `superplan`, `plan-header.md` i walidacji, a plan bez tego pola i tak spada do tego samego fallbacku; plan zapisywany w katalogu runu - odpada, bo łamie niezmiennik "plan zapisujesz wyłącznie pod ścieżką podaną przez tryb planowania, nigdy do założonego katalogu".
- Why: `simpleplan` i `superplan` już dziś przepisują `Intent:`/`Spec:` verbatim, więc ścieżka dojeżdża do dekompozycji bez ruszania szablonów, reviewerów i orkiestratorów.

### 3. Gdzie ląduje spec, gdy handoff nie niesie ścieżki intentu
- Chosen: `superspec` zakłada katalog runu sam, tą samą konwencją co `intent` - `docs/.workflows/<YYYY-MM-DD>-<slug>/spec.md`, slug z tytułu specu.
- Alternatives: spec bez intentu zostaje płasko - odpada, bo ta sama komenda raz pisałaby do katalogu runu, raz obok, czyli dokładnie ten rozjazd, który zmiana usuwa; `superspec` zawsze wymusza `intent` - odpada, bo kasuje dziś dopuszczoną ścieżkę "brak `intent:` -> pomiń linię `Intent:`" i zawęża działające wejścia.
- Why: jedna reguła - kto pisze pierwszy dokument runu, ten zakłada katalog - i `decompose.sh` podnosi katalog ze `Spec:` dokładnie tak samo jak z `Intent:`.

### 4. Co z `cleanup-run.sh`
- Chosen: bez zmian.
- Alternatives: usunąć wyszukiwanie spec/intent - odpada, bo wymaga przepisania sześciu testów w `cleanup-run.test.ts`, a runy sprzed zmiany zostawiłyby osierocone pliki; dołożyć strażnik `docs/.workflows/` - odpada jako osobny problem bezpieczeństwa, nie ta zmiana.
- Why: kolejność usuwania to workdir, potem spec, potem intent, a `git rm --ignore-unmatch` i `rm -rf` na ścieżce zniknniętej razem z katalogiem kończą się czysto; logika staje się redundantna dla nowych runów, ale nadal poprawnie sprząta runy rozpoczęte przed zmianą.

### 5. Nazwy plików i kontrakt wznowienia
- Chosen: krótkie nazwy w katalogu - `intent.md` i `spec.md`, spójne z `plan.md`, `status.md`, `base.md`; rozpoznanie argumentu w `intent` zmienia się z "ścieżka kończąca się na `-intent.md`" na "plik o nazwie `intent.md`"; kolizja nazwy w świeżym runie -> sufiks `-2`, `-3` na katalogu, nie na pliku; wznowienie nadpisuje własny plik w miejscu.
- Alternatives: zachować w katalogu nazwy `<date>-<slug>-intent.md` - odpada jako redundancja wobec nazwy katalogu.
- Why: katalog już niesie datę i slug, więc powtarzanie ich w nazwie pliku nic nie wnosi.

## Constraints
- `simpleplan`, `superplan`, ich szablony planów, reviewerzy planów, orkiestratory `simplebuild`/`superbuild`, `resolve-input.sh` i `superdev-changelog-writer` pozostają nietknięte.
- `cleanup-run.sh` i `tests/superdev/cleanup-run.test.ts` pozostają nietknięte.
- `decompose.sh` zachowuje dotychczasowe zachowanie jako fallback, więc plany bez `Intent:`/`Spec:` działają jak dziś.
- Dokumentacja do zsynchronizowania: `superdev/README.md` (l. 35, 40, 63), `CLAUDE.md` (l. 54, 153-155, 210-213), komentarz `cleanup` w `superdev/skills/setup/assets/config.yml`, etykieta ścieżki speca w `docs/assets/superdev-flow.svg`.

## Out of scope
- Strażnik `docs/.workflows/` dla spec/intent kasowanych przez `cleanup-run.sh` (istniejąca dziura, świadomie zostawiona).
- Migracja istniejących płaskich runów do nowego układu.
- Przeniesienie samego pliku planu do katalogu runu.

## History
- none (repo nie ma ani `docs/changelog/`, ani `docs/adr/`)
