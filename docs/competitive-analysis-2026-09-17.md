# superdev na tle ekosystemu: analiza porównawcza (stan na 2026-09-17, wersja 2, po zmianach z tego dnia)

Notatka deweloperska. Nie jest częścią żadnego pluginu. Nazwy zewnętrznych projektów pojawiają się tu
wyłącznie jako materiał porównawczy; do skilli, referencji i agentów nic z tego nie trafia dosłownie.

Wersja 2 zastępuje poranną wersję tego samego pliku. Między nimi superdev przeszedł pięć buildów i dwa
refaktory (wydania 0.46.0 - 0.46.3 plus commity po bumpie, HEAD `7747cd4`). Część zaleceń z wersji 1 została
wdrożona, część zmieniła kształt, a kilka nowych faktów zmienia ocenę. Tam, gdzie porównanie z ekosystemem
nie zmieniło się od rana, tekst jest skondensowany, nie przepisany.

## 1. Metoda i zakres

- Ekosystem: wyniki porannego przebiegu (10 subagentów, około 40 projektów przebadanych z plików SKILL.md,
  agentów, szablonów i changelogów, osobny przebieg dla zmian po 2026-06-01) są przeniesione bez powtórnego
  researchu. Minęło kilka godzin, nie tygodni; nic z tej listy nie wydało w tym czasie nowej wersji, którą
  warto by sprawdzać.
- superdev: zmapowany na nowo z plików źródłowych na HEAD: `superdev/CLAUDE.md` i oba węzły podrzędne,
  `review-contract.md`, `plan-review-checklist.md`, `qa-format.md`, skille `superbuild`, `simplebuild`,
  `superplan`, `intent`, `vibe`, `e2e`, `setup`, dwanaście agentów, skrypty, hooki, manifest, szablon
  `settings.json`, changelog builda `build-cost-cuts`, intenty pięciu buildów z tego dnia i dwa raporty
  `stats` z realnych przebiegów.
- Fakty o Claude Code (2.1.274, ta sama wersja co rano) zweryfikowane ponownie w schemacie narzędzi tej
  sesji: `Agent` nadal przyjmuje tylko `description`, `isolation`, `model`, `prompt`, `subagent_type`.
- Ograniczenie projektowe zapisane przez użytkownika w `docs/notes.md` po wersji 1: zmiany wynikające z tej
  analizy nie mogą wydłużać czasu fazy build, a praca dodatkowa może iść w tle, gdy jej wynik nie jest
  potrzebny w następnym kroku. Sekcja 9 klasyfikuje każde zalecenie pod tym kątem.

## 2. Krajobraz po czerwcu 2026 (bez zmian od rana)

| Projekt | Status | Filozofia w jednym zdaniu |
|---|---|---|
| superpowers (obra) | aktywny, v6.3 (sierpień), main cichy od 08-12 | interview -> plan z kodem w krokach -> subagent per task w worktree -> jeden reviewer, 5 rund, "rulings not stalls" |
| spec-kit (github) | bardzo aktywny, v1.0.7 (09-15) | ciężkie artefakty (constitution, spec, plan, tasks, checklist, analyze, converge), wykonanie w jednej sesji |
| BMAD-METHOD | bardzo aktywny, v6.12 (09-04) | jedna jednostka: spec per zmiana 900-1600 tokenów, ceremonia dobierana po zbadaniu zmiany, lenses w review |
| compound-engineering (Every) | bardzo aktywny, v3.26 (09-15) | plan -> praca -> review -> "compound": wiedza jako docs/solutions z pasem odświeżania i usuwania |
| gstack (garrytan) | bardzo aktywny | brama na wyniku (browser QA, ledger dowodów związany z fingerprintem drzewa), nie na ocenie diffu |
| gsd-core (następca get-shit-done) | bardzo aktywny, oryginał zarchiwizowany po kompromitacji | plany XML 2-3 taski, fale równoległe, verifier "goal-backward", integration-checker |
| beads (gastownhall) | bardzo aktywny, v1.3 | graf zadań zamiast planu, ready-queue, dziedziczenie odkryć, decay pamięci |
| cc-sdd, task-master, ralph, ccpm, Pimzino | martwe od wiosny | |
| agent-os v3 | utrzymanie | świadomie porzucił spec i orkiestrację: "plan mode Claude Code to załatwia", zostały tylko standardy |
| humanlayer OSS | zdeprecjonowany przez autora | esej ACE-FCA nadal ważny: "review planu daje więcej dźwigni niż review kodu" |
| ruflo, SuperClaude | dużo gwiazdek, mało substancji | audyty: stuby, prompt-text bez bram |
| nowe (po czerwcu): anneal, tyran, claudex-loop, flow, openspec-plus, ultrapowers | małe, ale technicznie najciekawsze | hooki jako bramy, cross-model review, script-as-coordinator, role x model x effort |

Anthropic opublikował 2026-08-21 "AI-Native SDLC playbook": łańcuch intent.md -> spec.md -> plan.md -> diff ->
findings, ludzki osąd na bramach, guardrails jako deterministyczne hooki. Kierunek superdev jest potwierdzony
z góry; to, czego playbook wymaga, a superdev nadal nie ma, to guardrails jako hooki (sekcja 8).

## 3. Co zmieniło się w superdev od wersji 1

Pięć buildów i dwa refaktory w jednym dniu. Tabela wiąże każdą zmianę z punktem wersji 1, na który
odpowiada, i mówi, czy odpowiedź jest pełna.

| Zmiana (build lub commit) | Co dokładnie weszło | Punkt z wersji 1 | Stopień domknięcia |
|---|---|---|---|
| `qa-scenarios-and-e2e` | trzy przełączniki `qa`, `e2e-ui`, `e2e-api`; agent `qa-writer` w fali 1 Close Out; dwa pliki write-once `docs/qa/<run>.md` (dla człowieka) i `docs/qa/<run>.e2e.md` (handoff dla maszyny) spięte jednymi ID `QA-nn`; indeks `docs/qa/README.md` z regułą `supersedes`; skill `e2e` (tylko user) + agent `e2e-writer` per scenariusz; `check-playwright.sh` w setup | sekcja 10 (oba dodatki), P3.19 (lista weryfikacji manualnej) | pełne dla scenariuszy manualnych; E2E dostarczone jako osobny przebieg po buildzie, nie jako ostatni task planu (sekcja 11) |
| `underspecified-decision-lines` | rozdzielenie `UNDERSPECIFIED:` (implementor ma obronną odpowiedź, bierze ją i loguje) od `DECISION:` (twardy stop, `VERDICT: BLOCKED`, ID `D<n>`, jedno pytanie per linia, `record-decision.sh`, ponowny dispatch); reviewer per task ocenia każdą linię `UNDERSPECIFIED:` w trzech krokach; final review pisze `## Decisions taken`; trzy nowe klasy planu B18-B20 (kontrakt endpointu, tekst dla człowieka, awaria w połowie operacji) | P2.14 (autonomy ask / rule) w wariancie na poziomie implementora; P1.7 częściowo (osąd nad decyzjami implementora) | to jest "rulings, not stalls" zaimplementowane tam, gdzie powstaje najwięcej decyzji; orkiestrator nadal pyta na każdym BLOCKED reviewera |
| `vibe-track` | trzeci tor `vibe`: jawna prośba o pominięcie ceremonii, jedno zdanie, rekonesans Grep/Glob, brief w `.temp/superdev/vibe/`, jeden agent `vibe-implementor` (sonnet/high), sprawdzenia z pamięci hosta, `vibe-guard.sh` (5 plików / 1 nowy / 200 linii / globy wrażliwe z pamięci hosta), jeden commit, trzy opcje na każdym stopie, każdy override zapisany | P2.10 (tor "Direct"), P2.11 (tripwire zakresu) | pełne dla toru; tripwire istnieje tylko na vibe, plan nadal nie ma sufitu wielkości taska poza B16 |
| `build-cost-cuts` | `Review: none` jako trzeci stan markera; oś `Kind: code / scaffold / text` wyprowadzana z `### Task Checks` (B22), domyślnie `sonnet` + `Review: none` dla `scaffold` / `text`; effort przestał być przekazywany do `Agent` (dispatch niesie tylko `model`), stats renderuje `-`; B21 (komenda całego repo poza bramą final); osiem skryptów runtime z bitem exec i jedną literalną postacią wywołania + wzorzec w `allowed-tools`; krok `## Permissions` w setup z `merge-settings.sh` i szablonem `settings.json` | P0.1 (effort) w wariancie (b), P2 (koszt ceremonii), P0 (klasyfikator uprawnień) | effort jest teraz uczciwy, ale nie działa: marker `Effort:` pozostał wymagany (B6) i nie ma żadnego konsumenta w runtime |
| `task-gate-blocked-on-plan-defect` | intent i spec napisane, planu i builda nie ma | nowy, poza wersją 1 | 0%: reviewer per task nadal nie dostaje `refs:` i nosi ręcznie odbitą kopię szkieletu (kontrakt to wciąż deklaruje) |
| `refactor(intent)` | usunięty krok "gap questions" (rundy do trzech pytań o fakty); wywiad wrócił do jednego pytania na turę dla wszystkiego | punkt "mocne" z wersji 1 (rozdzielenie pytań o fakty od decyzji) | cofnięcie; ekosystem idzie w stronę ograniczonych, paczkowanych doprecyzowań (spec-kit max 5, tyran paczki po 4) |
| `refactor(superdev): move reviewer skills to agents` | trzej recenzenci budowy (`superbuild-reviewer-spec`, `superbuild-reviewer-change`, `simplebuild-reviewer`) to agenty; usunięte `resolve-input.sh`, `label.sh`, `lib_label.sh`; wspólny `lib_touched.sh` | P0 (pomiar) pośrednio | od teraz każdy dispatch builda ma `subagent_tokens`, `duration_ms`; dwa wymiary final biegną równolegle w jednej wiadomości |
| `chore: add orphan-tags test` | `tests/orphan-tags.test.ts` + guard read-back w każdym agencie piszącym | nowy | jedyny deterministyczny test zachowania artefaktów pisanych przez agentów |
| `chore(settings)` (repo, nie plugin) | `disableAutoMode`, gołe `Bash` w allow, `ask` na push / PR / release, rozbudowany deny | P0 (prompty uprawnień) | opisane w `docs/auto-mode-permissions-2026-09-17.md`; deny prefiksowe jest z natury dziurawe, twarda granica to hook `PreToolUse` |

Dwa liczbowe fakty z raportów `stats` (jedyne realne pomiary superdev; oba przebiegi biegły PRZED
`Review: none` i przed przeniesieniem recenzentów do agentów, więc recenzenci budowy nie mają tokenów):

| Przebieg | Tasków | Wall | Tokeny | Implementor + fix | Reviewer per task | Recenzenci budowy (rundy) | Udział review w wall |
|---|---|---|---|---|---|---|---|
| `build-cost-cuts` | 15 | 109:27 | 2,02 M | 44:24 (1,33 M) | 21:41 (0,69 M, 16 dispatchy, średnio 1:21) | 36:36 (7 rund) | 53% |
| `vibe-track` | 5 | 79:54 | brak dla agentów | 39:55 | 14:42 (5 dispatchy, średnio 2:56) | 16:53 (3 rundy) | 40% |

W obu przebiegach zero linii `DECISION:` i od 1 do 7 linii `UNDERSPECIFIED:` na task: reguła podziału
działa w praktyce jako "orzekaj i loguj", stop nie zdarzył się ani razu. Review zajmuje od 40 do 53% czasu
ściany. To jest jedyna liczba, którą trzeba mieć przed oczami przy czytaniu sekcji 9: pod ograniczeniem
"nie wydłużać builda" każdy dodatkowy krok musi wejść do tych 40-53% albo iść w tle.

## 4. Faza planowania: esencja u innych vs superdev

### Co robią inni (skondensowane, bez zmian)

1. Triaż głębokości przed researchem (superpowers spike / bounded / architectural; compound Direct / Chat
   brief / Durable; BMAD "ceremonia po zbadaniu zmiany"; cc-sdd wyjście "no spec needed").
2. Ograniczona gramatyka doprecyzowań (spec-kit clarify: max 5 pytań, odpowiedź do 5 słów, log `Q -> A`;
   tyran paczki po 4 z rekomendacją; claudex-loop pyta tylko o decyzje zmieniające wynik, z ceną błędu).
3. Kontrakty między taskami (superpowers `Interfaces: Consumes / Produces`; codex-build ledger interfejsów
   dopisywany po każdym zielonym commicie).
4. Mechaniczna trasowalność (spec-kit analyze: każde FR mapuje na task, klasa `unrequested`; gsd: brak ID
   wymagania = blocker).
5. Sufit wielkości jednostki (BMAD 900-1600 tokenów; gsd 2-3 taski; superpowers "najmniejsza jednostka,
   którą reviewer mógłby odrzucić osobno").
6. Wykonywalne kryteria akceptacji przed buildem (Acendas `acceptance_probe` uruchamiany na czerwono przed
   implementacją; "acceptance tests first, agents second").
7. Równoległe kontr-plany (feature-dev Anthropic: 2-3 architektów; compound "Bake-off").
8. Regiony planu należące do człowieka i approval związany z SHA256 planu (BMAD, claudex-loop, flow).
9. Budżet testów (agent-os 2-8 na grupę; skarga spec-kit #75 o setkach niepotrzebnych testów).
10. Decyzje z ceną błędu (`Ruling: <decision> - <why> - <cost if wrong>`; anneal decisions.md z odrzuconymi
    alternatywami).

### Jak wypada superdev (stan na HEAD)

Mocne, bez odpowiednika u innych:
- najbogatszy kształt taska w całym zbiorze, dziś jeszcze bogatszy: Files, Task Checks, Failure modes w
  stałym kształcie (z awarią w połowie operacji, B20), Contracts (closed-set consumer lists, matryce, kształt
  endpointu B18, tekst dla człowieka lub jawna delegacja `copy: implementor, after ...` B19), DoD, Covers,
  TDD, Kind, Model / Effort / Review,
- `Kind:` wyprowadzany mechanicznie z dowodu taska (tabela B22 czytana top-down), nie wybierany dowolnie:
  jedyny w zbiorze system, w którym rodzaj taska wynika z tego, co task uruchamia jako proof,
- `## Gate commands` z podziałem Build / Tests / Integration, B21 wypycha komendy całego repo do bramy final,
- reviewer planu jako read-only fork z checklistą B1-B22 i regułą dowodu; ExitPlanMode bramkowany hookiem,
- historia (changelog, ADR) czytana jako kontekst, nigdy jako wymaganie; `refresh.md` przy wznowieniu,
- tor `vibe` jako świadomy trzeci tor: wchodzi tylko na jawną prośbę, nigdy jako skrót wybrany przez
  model, i jest jedynym w zbiorze torem bez planu, który ma deterministyczny strażnik zakresu ze stopem
  trzyopcjowym i zapisanym override.

Słabsze niż u najlepszych (nadal):
- wywiad bez limitu pytań i bez logu `Q -> A`; po usunięciu kroku gap-questions każde pytanie o fakt znów
  kosztuje jedną turę; rejected options nadal nie są zapisywane,
- kontrakty między taskami: `### Contracts` + `consumed by` + `CARRY:` są prozą; brak jawnego Consumes /
  Produces i ledgera interfejsów,
- brak sufitu wielkości taska w planie (B16 dotyczy tylko `TDD: required`; oversized `TDD: none` jest tylko
  NOTĄ) i brak tripwire'a rozrostu poza torem vibe,
- brak kryteriów akceptacji jako testów czerwonych zanim ruszy build; E2E weszło jako przebieg PO buildzie,
- hook ExitPlanMode nadal heurystyczny i fail-open; `decompose.sh` nadal nie sprawdza, że buduje plan, który
  przeszedł review (brak hasha),
- `Effort:` jest markerem wymaganym przez B6, którego nie czyta żaden konsument w runtime: planista go
  wypełnia, reviewer planu go sprawdza, dispatch go ignoruje. Uczciwość została przywrócona, zdolność nie.

## 5. Faza build: esencja u innych vs superdev

### Co robią inni (skondensowane, bez zmian)

1. Świeży kontekst per jednostka + commit per task (standard).
2. Orkiestrator sprawdza prawdę z gruntu (Acendas `PROBE_EXIT: 0`, codex-build allowlist egzekwowany
   skryptem, tyran SubagentStop przepuszcza tylko raport z cyfrą, gstack ledger FRESH / STALE / MISSING).
3. Reviewer nie uruchamia testów ponownie (superpowers v6 czyta dowody implementera; BMAD `{claims_file}`).
4. Filtr fałszywych pozytywów (Anthropic code-review: subagent per znalezisko "udowodnij albo wyrzuć", próg
   80/100; BMAD severity `false | maybe-false` z tekstem obalenia).
5. Ograniczone pętle napraw z eskalacją siły (superpowers rundy 4-5 na mocniejszym modelu; cc-sdd debugger w
   czystym kontekście; claudex-loop MAX_FIX 2).
6. "Rulings, not stalls" (superpowers v6.3 po sesji zablokowanej 9 godzin; anneal Inbox tylko dla naprawdę
   blokujących).
7. Blind review i zakaz samoaprobaty (anneal, tyran, claude-code-guardrails).
8. Cross-model review jako domyślne (gstack, compound, claudex-loop, flow).
9. Worktree per task i fale równoległe (gsd zero file overlap; anneal 8 dzieci + merger).
10. Script-as-coordinator (ultrapowers: 52K vs 184K okna koordynatora, ~2x taniej).
11. Detektory młócenia (ralph-cursor; gstack budżet "WTF-likelihood").
12. Wykrywanie stubów i "istnienie to nie integracja" (gsd verifier exists -> substantive -> wired).

### Jak wypada superdev (stan na HEAD)

Mocne, unikalne albo najlepsze w zbiorze:
- słownik review w jednym pliku-kontrakcie: stabilne ID C/I/M, `## Debt` jako jedyny dom Minorów, raport
  "tylko nowa informacja", rozłączne mandaty per etap, `VERDICT: BLOCKED` jako decyzja użytkownika zapisana
  w `decisions.md` i wiążąca później jak tekst planu. Dziś dochodzi `D<n>` dla stopu implementora i
  `## Decisions taken` na final. Nikt inny nie ma tak czystej semantyki decyzji,
- reguła podziału `UNDERSPECIFIED:` / `DECISION:` po stronie implementora to najlepsza w zbiorze wersja
  "rulings, not stalls": decyzja z obronną odpowiedzią jest brana i logowana, stop jest tylko dla spraw,
  których nikt poza użytkownikiem nie zamknie, a reviewer per task ma jawny mandat, żeby złą decyzję
  odesłać jako Important, a decyzję należącą do planu jako `NOTE: plan defect`. Pomiar potwierdza: 0 stopów,
  1-7 orzeczeń per task,
- `Review: none` + `Kind:` to pierwsze realne skalowanie ceremonii w dół wewnątrz jednego planu (inni robią
  tiery per rola albo per cały przebieg),
- orkiestrator nie pisze żadnego pliku, `commit-task.sh` stage'uje tylko zadeklarowany zbiór, wszystkie
  wywołania skryptów w jednej literalnej postaci pre-approved przez wzorce; checkpoint co 5 tasków; executor
  jako fork haiku tylko na DEVIATION,
- dwa wymiary final review (spec i change) jako dwa agenty w jednej wiadomości, blind względem siebie: to
  jest "blind review" z anneal, zrobiony tanio,
- `stats: true` mierzy każdy dispatch (model, tokeny, tool uses, czas, werdykt) i renderuje anomalie
  (UNDERSPECIFIED / DECISION / CARRY / touched / plan defect / dodatkowe rundy). Poza gstack i ultrapowers
  nikt w zbiorze nie mierzy własnej pętli; superdev jako jedyny mierzy ją per dispatch.

Słabsze:
- dowód wykonania to nadal proza w `## Runs`, bez stampa związanego z drzewem; checkpoint i final uruchamiają
  gate ponownie, a na final dwa wymiary uruchamiają go równolegle dwa razy. W `build-cost-cuts` rundy
  recenzentów budowy to 36 minut ze 109,
- brak filtru fałszywych pozytywów poza severity; przy 0,69 M tokenów recenzenta per task w jednym buildzie
  to nadal najdroższa dziura jakościowa,
- brak eskalacji siły w pętli napraw (5 rund tego samego implementora, potem FAIL), brak etapu debuggera,
  brak detektora młócenia,
- brak równoległości i worktree; `### Dependencies` i `### Files` już są, nic ich nie liczy,
- egzekwowanie prawie wyłącznie prozą: nadal dwa hooki (SessionStart, ExitPlanMode); `vibe-guard.sh` jest
  skryptem doradczym wołanym przez skill, nie hookiem; szablon `settings.json` przenosi twardą granicę do
  statycznego deny, które sam raport z `docs/auto-mode-permissions-2026-09-17.md` nazywa dziurawym,
- reviewer per task nadal nosi ręcznie mirrorowaną kopię szkieletu (intent `task-gate-blocked-on-plan-defect`
  ma to naprawić, ale nie został zbudowany),
- `Review: none` jako domyślne dla `text` jest ślepe na stack: w tym repo `text` (markdown skilli) jest
  kodem produkcyjnym, a domyślna reguła zdejmuje z niego bramę per task; planista może dopisać `Review:`
  z jednym zdaniem uzasadnienia, ale nic w pamięci hosta nie może tego domyślnego ustawić inaczej,
- tor Simple nie ma bramy per task w ogóle (tylko checkpoint i final); to jest wybór, nie defekt, ale po
  wejściu `Review: none` różnica między "Simple" a "Super z `Review: none` na każdym tasku" sprowadza się
  do specu i dwóch wymiarów final.

## 6. Rozwiązania w kontrze do superdev i ich najsilniejsze argumenty

| Kontr-teza | Najsilniejszy argument | Co superdev ma na to (HEAD) |
|---|---|---|
| **Ralph loop**: 3 pliki + cap, testy jako backpressure | $297 API za kontrakt $50k; "files and git are a better memory than context" | ten sam rdzeń plus review; tor vibe to Ralph bez pętli (jeden przebieg, jeden commit); learnings nadal tylko na close-out |
| **Agent OS 3.0**: porzucić spec i orkiestrację | "plan mode i lepsze modele załatwiają scaffolding"; każdy etap harnessu powinien być wyłączalny | dziś wyłączalne: reviewer per task (`Review: none`), cały plan (vibe), każdy writer (config). Niewyłączalne: gate re-run na checkpoint, dwa wymiary final |
| **gstack**: brama na wyniku, nie na diffie | browser QA, evidence ledger; "6 z 35 komend przeżyło miesiąc" | `e2e` istnieje, ale poza buildem i nigdy jako brama; `#### Integration` może wskazać komendę e2e hosta, nic tego nie sugeruje planiście |
| **beads**: graf zamiast planu liniowego | "konkurujące dokumenty = demencja"; decay pamięci | bez zmian: odkryta praca eskaluje do użytkownika, nic nie wygasa; QA dostało regułę `supersedes`, to pierwszy mechanizm wygaszania w superdev |
| **hooks-first** (tyran, shapeup, specforge, guardrails) | "a skill is advice, a hook is a gate"; hook widzi akt, review widzi diff | dwa hooki, reszta proza; zamiast hooka weszło statyczne deny w `settings.json` (szybkie, deterministyczne, prefiksowe, dziurawe) |
| **script-as-coordinator** (ultrapowers, anneal) | koordynator 52K zamiast 184K, deterministyczne bramy | superbuild na sonnet/low, skrypty pre-approved jedną postacią: prompt jest już blisko skryptu, ale `VERDICT:` nadal parsuje LLM |
| **"plany gniją, review je pompuje"** | agent-infra #790: 11 cykli, plan urósł do 1050 linii | cap 3 rund istnieje; B-klas jest już 22 i rośnie; brak reguły "kasuj powtórzenie" i sufitu długości planu |

Synteza z wersji 1 stoi: mały plan, twarde testy, reviewer z czystym kontekstem, wiedza zapisywana z
powrotem. superdev ma trzy z czterech i nadal jest najcięższy tam, gdzie dowody są najsłabsze (osąd
reviewera zamiast dowodu maszynowego). Nowe od rana: superdev jako jedyny mierzy, ile ta ciężkość kosztuje.

## 7. Fakty o Claude Code, które zmieniają ocenę (zweryfikowane ponownie)

1. **Agent tool nie ma parametru `effort`** (schemat bez zmian). superdev przestał go przekazywać i
   dokumentuje to w kontrakcie, README i obu CLAUDE.md. Otwarte: marker `Effort:` nadal wymagany (B6), a
   frontmatter każdego agenta jest statyczny (implementor Super opus/xhigh, implementor Simple sonnet/xhigh,
   reviewer per task sonnet/high, reviewer change opus/high, reviewer spec sonnet/high, vibe sonnet/high,
   qa-writer i e2e-writer opus/high). Jedyny sposób na siłę per task poza modelem to warianty agenta
   (wersja 1, P0.1 wariant a), nadal nie zrobiony.
2. **Fork mode**: subagenty biegną w tle, wynik jako powiadomienie. Siedem z dwunastu agentów nadal nosi
   `background: false`, które przy fork mode nic nie znaczy; CLAUDE.md nadal tego nie opisuje.
3. **Dostępne i niewykorzystane** (bez zmian): `memory: project` na agencie, `isolation: worktree` per
   wywołanie, `hooks:` we frontmatterze agenta, `SubagentStop` z matcherem agenta z hooks.json pluginu,
   wznowienie subagenta przez SendMessage, zagnieżdżanie do 3 poziomów.
4. **`claude plugin eval`** nadal niewykorzystane. Zestaw `tests/` urósł (22 suity dla skryptów superdev plus
   `orphan-tags` i `portability`), ale to nadal testy skryptów, nie zachowania skilli.
5. **Klasyfikator auto mode** (nowa wiedza z `docs/auto-mode-permissions-2026-09-17.md`): każdy subagent
   płaci trzy dodatkowe punkty kontrolne (opis zadania przed spawnem, każda akcja, raport końcowy), gołe
   `Bash` w allow pod auto mode kieruje każdą komendę do klasyfikatora, a blok `autoMode` czytany jest tylko
   z user settings. Szablon setup wyłącza auto mode w repo hosta i daje gołe `Bash` w allow: spójne z tą
   wiedzą, szybkie, ale bezpieczeństwo zależy wtedy wyłącznie od listy deny.

## 8. Ocena: lepiej czy gorzej

Skala 1-10 względem najlepszego zaobserwowanego rozwiązania w danym wymiarze. Kolumna "rano" to wersja 1.

| Wymiar | rano | teraz | Najlepszy w zbiorze | Co zmieniło ocenę |
|---|---|---|---|---|
| Zbieranie wymagań | 8 | 8 | superpowers / spec-kit clarify | usunięcie gap-questions upraszcza, ale cofa rozdział faktów od decyzji; nadal bez limitu i logu |
| Artefakt planu | 9 | 9 | superdev | B18-B22 i `Kind:` wzmacniają; nadal bez Consumes / Produces, sufitu, testów RED |
| Review planu | 8 | 8 | gsd plan-checker / superdev | B22 i B21 dodane; hook fail-open i brak hasha bez zmian |
| Wykonanie | 6 | 7 | codex-build / Acendas | dyscyplina per `Kind:`, stop implementora, uczciwy dispatch; nadal bez bramy mechanicznej i równoległości |
| Review kodu | 8 | 8 | superdev (słownik) / Anthropic code-review (filtr) | osąd nad `UNDERSPECIFIED:` i `## Decisions taken` w plusie; brak filtru FP i gate re-run w minusie |
| Human-in-the-loop | 6 | 7 | superpowers v6.3 | reguła podziału to "rulings, not stalls" u implementora (0 stopów w pomiarze); orkiestrator pyta jak dawniej |
| Wiedza po buildzie | 8 | 8 | compound-engineering | nowa warstwa `docs/qa/` z `supersedes`; nadal bez decay dla memory / rules / changelog |
| Koszt i skalowanie ceremonii | 5 | 7 | BMAD v6.12 / superpowers 6.3 | vibe, `Review: none`, `Kind:` -> sonnet, uprawnienia bez promptów; gate re-runs i podwójny gate na final zostały |
| Egzekwowanie (hooki) | 3 | 4 | tyran / shapeup | `vibe-guard.sh` i `commit-task.sh` to skrypty, nie hooki; deny w settings jest deterministyczne, ale prefiksowe |
| Ewaluacja pluginu | 2 | 3 | superpowers / compound / `claude plugin eval` | `orphan-tags` i nowe suity skryptów; nadal zero ewaluacji zachowania skilli |
| Pomiar własnej pętli | (brak) | 8 | gstack / ultrapowers | jedyny w zbiorze pomiar per dispatch z tokenami i anomaliami; brak: koszt bram, porównanie między przebiegami |
| Przenośność i zależności | 8 | 8 | superdev / gstack | Node dla merge-settings i Playwright dla e2e: obie opt-in ze skip-with-note, zgodnie z regułą repo |

Werdykt: superdev pozostaje w ścisłej czołówce w projektowaniu artefaktów i słownika review, a od rana
domknął trzy z pięciu luk, które ekosystem uznał za najważniejsze w 2026: tor bez planu, skalowanie
ceremonii w dół wewnątrz planu i "orzekaj i loguj" u implementora. Dwie największe luki zostały: dowód
maszynowy zamiast osądu (stampy, hooki) i ewaluacja pluginu. Jedna rzecz jest nadal na wpół zrobiona:
effort per task ma uczciwy opis i martwy marker.

## 9. Co poprawić, zmienić, dodać (przeliczone pod ograniczenie "nie wydłużać builda")

Reguła z `docs/notes.md`: zmiana nie może wydłużyć fazy build; praca, której wynik nie jest potrzebny w
następnym kroku, idzie w tle. Każdy punkt niesie etykietę: **skraca**, **neutralne** (poza buildem albo
sub-sekundowe), **w tle** (równolegle z krokiem, który i tak trwa), **wydłuża** (odrzucone albo tylko jako
opt-in).

### Zrobione od wersji 1 (do wykreślenia z listy)

- P0.1 effort: wariant (b), uczciwy opis. Reszta punktu przechodzi do P0.1 poniżej.
- P2.10 tor Direct: `vibe`. P2.11 tripwire zakresu: `vibe-guard.sh` (tylko vibe).
- P2.14 autonomy: reguła podziału `UNDERSPECIFIED:` / `DECISION:` u implementora.
- P3.19 lista weryfikacji manualnej: `qa-writer` i `docs/qa/<run>.md`.
- Sekcja 10 (QA i E2E): oba dodatki, rozliczenie w sekcji 11.
- Klasyfikator uprawnień: jedna postać wywołań skryptów + szablon `settings.json` w setup.

### P0: defekty i fałszywe założenia

1. **Domknąć effort per task** (neutralne). Dwie drogi, każda lepsza od dzisiejszej: (a) warianty agenta
   per siła (`superbuild-task-implementor` = xhigh, `superbuild-task-implementor-std` = high; reviewer per
   task analogicznie) i dispatch po `subagent_type` z uproszczoną skalą `Effort: std | deep`, albo (b) usunąć
   `Effort:` z wymaganych markerów B6 i z szablonów, skoro nikt go nie czyta. Dzisiejszy stan (marker
   wymagany, sprawdzany przez reviewera planu, ignorowany w runtime) jest gorszy od obu, bo kosztuje uwagę
   planisty i reviewera za nic.
2. **Zbudować `task-gate-blocked-on-plan-defect`** (neutralne). Intent i spec leżą gotowe. Zamyka dwie
   rzeczy z wersji 1 naraz: mirrorowaną kopię szkieletu u recenzenta per task i brak drogi dla `NOTE: plan
   defect`, którego dziś nikt nie realizuje.
3. **Związać build z zaaprobowanym planem** (neutralne, sub-sekundowe). Reviewer planu (albo hook po PASS)
   zapisuje `Reviewed: <sha256 planu>`; `decompose.sh` liczy hash i odmawia przy niezgodności. Bez zmian od
   wersji 1.
4. **Udokumentować fork mode** i usunąć martwe `background: false` z siedmiu agentów (neutralne).
5. **`Review: none` dla `text` z możliwością nadpisania przez hosta** (neutralne). Host, w którym tekst jest
   produktem (to repo), deklaruje to w pamięci; planista czyta i nie stosuje domyślnego `Review: none` dla
   `text`. Bez tego plugin ocenia własne buildy słabiej niż cudze.

### P1: dowód maszynowy zamiast osądu, ale bez wydłużania builda

6. **Stamp dowodowy z Task Checks i `run.sh`** (skraca). Każde uruchomienie zapisuje rekord (komenda, exit,
   czas, fingerprint drzewa: `git write-tree` po tymczasowym `add -A` w skrypcie) do
   `implementation/task-NN-runs.jsonl`. Checkpoint porównuje fingerprint z bieżącym drzewem i NIE uruchamia
   `#### Build` / `#### Tests`, gdy stampy są FRESH dla całego okna; gate biegnie realnie tylko w final i w
   re-review. To zdejmuje większość z 36 minut rund recenzentów budowy w `build-cost-cuts`. Wzorce: gstack
   evidence ledger, tyran, agent-verification-kit.
7. **Jeden gate na final zamiast dwóch** (skraca). Dwa wymiary final biegną równolegle i każdy uruchamia
   pełny zestaw. Z P1.6 wymiar spec czyta stampy wymiaru change (albo orkiestrator uruchamia gate raz przez
   `run.sh` przed dispatchem obu i podaje `LOG:` etykietą). Kontrakt już przewiduje, że host może zabronić
   równoległego uruchomienia; to jest ten sam problem rozwiązany od strony kosztu.
8. **Reviewer per task w tle** (skraca, największa pojedyncza dźwignia). Dziś reviewer per task blokuje
   pętlę na 1:20-3:00 per task, czyli 20% wall. Wariant: commit taska od razu po `VERDICT: PASS`
   implementora, dispatch reviewera na ten commit (etykieta `commit: <sha>`, czyta `git show`, nie drzewo
   robocze) w tej samej wiadomości co implementor następnego taska. FAIL reviewera trafia do kolejki fixów
   zamykanej na najbliższym checkpoint (albo od razu, gdy Critical). To zamienia bramę w zwiadowcę
   checkpointu i zdejmuje jej czas z pętli. Ryzyko: fix po fakcie zamiast przed commitem; przy
   deklarowanym stage'owaniu i stabilnych ID koszt jest znany. Wymaga zmiany kontraktu reviewera per task z
   "diff drzewa roboczego" na "diff commitu".
9. **Hook `SubagentStop` na implementorze** (neutralne, sub-sekundowe): odmawia zakończenia bez stampa z
   exit 0 dla każdej linii Task Checks świeższego niż ostatnia edycja. Nigdy nie uruchamia suite.
10. **Hook `PreToolUse` zakresu plików** dla implementora (neutralne, sub-sekundowe): deny Edit / Write poza
    `### Files` + notatki + `.temp/` + skan komend Bash pod kątem ścieżek spoza zbioru. `commit-task.sh`
    zostaje jako kontrola po fakcie. Ten sam hook zamyka dziurę z `docs/auto-mode-permissions`: twarda
    granica na pełnym tekście komendy, nie prefiks deny.
11. **Walidator per znalezisko** (w tle). Zanim reviewer zwróci Critical / Important, każdy taki punkt dostaje
    zagnieżdżony subagent haiku "udowodnij w kodzie albo wyrzuć". Biegnie wewnątrz reviewera, który i tak
    trwa; koszt to tokeny haiku, nie wall pętli. Do kontraktu werdykt `false | maybe-false` z tekstem
    obalenia i reguła "znalezisko, którego jedyne remedium to zmiana specu / planu, nie jest fixem". Do
    stats: findings opened / closed / reopened per runda.

### P2: plan i ceremonia

12. **Consumes / Produces + ledger interfejsów** (neutralne). Pole `### Interfaces` w szablonie taska,
    klasa checklisty "każde Consumes ma Produces we wcześniejszym tasku", `PROVIDES:` w notatkach
    agregowane przez `commit-task.sh` do `implementation/interfaces.md`. Bez zmian od wersji 1.
13. **Sufit wielkości taska i reguły zbieżności review planu** (neutralne): klasa B23 dla taska powyżej
    progu (>8 plików w Files lub >N linii), sufit długości planu, "kasuj powtórzenie zamiast poprawiać",
    "znalezisko wymagające rozszerzenia zakresu = rozmowa o zakresie".
14. **Eskalacja siły w pętlach** (neutralne lub skraca): po 3 nieudanych rundach Task Checks wznowienie
    implementora przez SendMessage na wyższej sile zamiast 5 rund tej samej; detektor młócenia (ta sama
    komenda pada 3x, ten sam plik pisany 5+ razy) przerywa zamiast dokładać rundę.
15. **Testy akceptacyjne jako Task 1 na torze Super** (wydłuża implementację, skraca review; opt-in). Dla
    każdego kryterium Task 1 pisze test czerwony, komenda trafia do `#### Tests`. Zamienia B13 z heurystyki
    w artefakt VERIFY-RED w gicie. Pod ograniczeniem z `notes.md` tylko jako przełącznik `acceptance-first`.
16. **Doprecyzowania z limitem** (poza buildem): powrót paczkowanych pytań o fakty w wersji z limitem
    (max 3 w paczce, max 2 paczki) i log `Q -> A` w `intent.md`. Ekosystem zgadza się tu jednogłośnie.

### P3: wiedza i pamięć (poza buildem albo w fali Close Out, która i tak biegnie)

17. **Przechwytywanie per task** (w tle): linie `LEARNED:` w notatkach implementora, promowane na close-out
    przez memory-writer z bramą kontrfaktyczną "gdyby ten zapis zniknął, czy przyszły inżynier powtórzyłby
    błąd?".
18. **Pas odświeżania** (poza buildem): `superdev-memory` i `superdev-rules` w trybie audytu Keep / Update /
    Consolidate / Delete. `docs/qa/` dostało już `supersedes`; memory i rules nadal tylko rosną.
19. **Retro z kontrolą poprzedniego** (w tle): changelog-writer zapisuje liczbę otwartych Debt i orzeczeń;
    History agent w następnym intent sprawdza, czy zostały zrobione.

### P4: platforma

20. **`claude plugin eval` dla superdev** (poza buildem, CI). Fixture'y: intent -> oczekiwane pytania, plan
    -> werdykt reviewera z klasami B-x, diff -> stabilne ID i severity. Baseline bez pluginu. Nadal
    największa luka względem compound, superpowers i gstack.
21. **Stats między przebiegami** (poza buildem): `stats-report.sh` renderuje jeden przebieg; brak porównania
    "ten sam host, kolejne buildy" (udział review w wall, tokeny per task, rundy per task). Dane już są w
    `.events`; brakuje agregatu. To jest tani sposób, żeby ograniczenie z `notes.md` było sprawdzalne
    liczbą, a nie wrażeniem.
22. **`memory: project` na reviewerach i `isolation: worktree` jako `parallel: true`** (skraca, największa
    zmiana architektoniczna): fale liczone z `### Dependencies` przy zerowym nakładaniu `### Files`. Po
    P1.6-P1.8, nie przed.

### Czego nie robić (bez zmian od wersji 1, plus jedno nowe)

- Fan-out 4-7 reviewerów per task; quoty znalezisk; walidator LLM na każdą edycję (tdd-guard); pełny
  suite w hooku Stop; zależności runtime bez opt-in; plany z pełnym kodem w krokach; zmiany nazewnictwa
  kontraktu.
- Nowe: nie przywracać przekazywania `effort` "gdy harness doda parametr" jako planu awaryjnego w
  dokumentacji. Albo warianty agenta dziś, albo marker znika; oczekiwanie na harness to trzecia wersja tej
  samej fikcji.

## 10. Trendy do obserwowania (bez zmian)

- Cross-model review jako brama finalna; `Review:` mógłby w przyszłości przyjąć dostawcę.
- Codex CLI plugin-native: jeden layout dla dwóch CLI.
- Permission rules dopasowujące parametry narzędzia (`Agent(model:opus)`): nadal nie w CHANGELOG.
- Dynamic workflows i agent teams jako natywna orkiestracja: superbuild jako skill stanie się cieńszą
  warstwą nad nimi. Sekcja 3 pokazuje, że superbuild już dziś jest promptem, w którym każda gałąź to
  deterministyczna decyzja na literalnym werdykcie; przeniesienie na skrypt jest bliżej niż rano.

## 11. QA i E2E: co dostarczono względem propozycji z wersji 1

Wersja 1 oceniała propozycję scenariuszy manualnych na 8/10, a E2E na 6/10 w wersji "osobny dodatek,
Playwright na sztywno" i 8/10 po przeformułowaniu na "ostatni task planu z komendą w `#### Integration`".
Zostawiła pięć pytań. Odpowiedzi, które padły w intencie `qa-scenarios-and-e2e`:

| Pytanie z wersji 1 | Decyzja | Skutek |
|---|---|---|
| Protokół odbioru per build czy żyjący zbiór regresji? | Write-once per build (jak changelog) + indeks `docs/qa/README.md` grupowany po obszarach + reguła `supersedes` (dokładna równość Route lub Endpoint i tytułu kryterium między plikami `.e2e.md`) | zbiór ma wygaszanie bez edycji starych plików; to lepsze niż obie opcje z pytania |
| E2E na close-out czy jako ostatni task planu? | Osobny, ręcznie uruchamiany skill `e2e` po buildzie; testy nigdy nie biegną w buildzie ani jako brama review | model dwuetapowy z wcześniejszego projektu użytkownika (upheld); cena: testy E2E nie są weryfikowane przez review tego builda i nigdy nie stają się bramą, chyba że host sam wpisze komendę e2e do `#### Integration` w kolejnym planie |
| Playwright na sztywno czy `e2e` z frameworkiem hosta? | Playwright (`playwright-cli` do eksploracji, `@playwright/test` jako artefakt CI) na sztywno, jako narzędzie pluginu za przełącznikiem opt-in, nie założenie o stacku hosta | zgodne z regułą repo o narzędziach pluginu; host nadal deklaruje przepis startu, URL, konta, katalog i konwencje, brak deklaracji = pytanie do operatora, nigdy zgadywanie |
| Jedna lista scenariuszy z ID? | Tak: `QA-nn` numerowane raz per build przez oba pliki, jeden tag `ui` / `api` per ID wyrażony miejscem wpisu; tytuł testu `QA-nn <title> (covers: <criterion>)` | trasowalność kryterium -> scenariusz manualny -> test w CI, której nie ma nikt w przebadanym zbiorze |
| Zakres bez UI? | `qa` i `e2e-ui` skip-with-note; `e2e-api` dla endpointów; manualne API poza zakresem | poprawne |

Ocena dostarczonego stanu:
- scenariusze manualne: 9/10. Kształt dokumentu (jedna akcja i jeden obserwowalny wynik per wiersz, zakaz
  słownika automatyzacji, brak kolumny wyniku, język intentu, "ustal z zespołem" zamiast placeholderów)
  jest bardziej rygorystyczny niż propozycja i niż cokolwiek w zbiorze. Brakujący punkt: writer generuje
  na close-out z kodu widoków, ale nie ma żadnego sprawdzenia, że ścieżki, które cytuje w krokach,
  istnieją (grep po routing / etykietach jako Validate).
- E2E: 7/10. Dwuetapowy model jest czysty (writer nigdy nie edytuje aplikacji, `blocked` usuwa plik, status
  per ID, re-run pomija `file` i ponawia `blocked`), ale jest poza pętlą jakości builda. Dwie rzeczy do
  zrobienia, obie poza buildem, więc zgodne z `notes.md`:
  1. Planista (superplan / simpleplan) czyta `docs/qa/*.e2e.md`: gdy istnieją linie `file` dla tras albo
     endpointów, których dotyka plan, `#### Integration` wskazuje komendę e2e zadeklarowaną w pamięci
     hosta. Wtedy testy z poprzedniego builda stają się bramą final następnego, bez uruchamiania czegokolwiek
     w trakcie tasków.
  2. `e2e` po commicie proponuje jednym pytaniem dopisanie komendy do pamięci hosta, gdy jej tam nie ma.
- wspólne: 0 realnych przebiegów `qa-writer` i `e2e`. W tym repo przełączniki `qa`, `e2e-ui` i `e2e-api`
  nie są ustawione w `.claude/superdev.yml`, więc `qa-writer` nie był dispatchowany w żadnym buildzie od
  rana (w stats jest tylko `memory-writer`); włączony skończyłby skip-with-note, bo repo nie ma UI ani
  endpointów. Ocena obu dodatków opiera się na czytaniu źródeł, nie na pomiarze; pierwszy host z UI
  zweryfikuje jakość kroków i lokatorów.
