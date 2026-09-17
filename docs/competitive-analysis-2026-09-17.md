# superdev na tle ekosystemu: analiza porównawcza (stan na 2026-09-17)

Notatka deweloperska. Nie jest częścią żadnego pluginu. Nazwy zewnętrznych projektów pojawiają się tu
wyłącznie jako materiał porównawczy; do skilli, referencji i agentów nic z tego nie trafia dosłownie.

## 1. Metoda i zakres

- 10 równoległych subagentów: 1 mapował superdev z plików źródłowych, 9 badało GitHub i sieć.
- Przebadane bezpośrednio z plików (SKILL.md, agenty, szablony, changelogi): superpowers, oficjalne
  pluginy Anthropic, spec-kit, claude-code-spec-workflow, cc-sdd, agent-os, BMAD-METHOD,
  claude-task-master, ruflo (claude-flow), SuperClaude, ralph i pochodne, compound-engineering,
  humanlayer ACE-FCA, gstack, beads, tdd-guard, gsd-core, ralphex, codex-build, trzy różne "shipyard",
  anneal, tyran, claudex-loop, flow, openspec-plus, ultrapowers i około 20 mniejszych.
- Osobny przebieg tylko dla zmian po 2026-06-01 (nowe repozytoria, nowe wydania znanych projektów,
  zmiany w samym Claude Code). Twierdzenia o platformie zweryfikowałem sam w CHANGELOG i docs.
- Liczby gwiazdek są przybliżone (API GitHub i blogi rozjeżdżają się nawet 2x); traktuj je jako rząd wielkości.

## 2. Krajobraz po czerwcu 2026

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
findings, ludzki osąd na bramach, guardrails jako deterministyczne hooki. To dosłownie kształt superdev,
więc kierunek jest potwierdzony z góry.

## 3. Faza planowania: esencja u innych vs superdev

### Co robią inni (skondensowane)

1. **Triaż głębokości przed researchem.** superpowers: spike / bounded / architectural, ogłaszany na głos,
   z eskalacją w trakcie. compound-engineering: Direct / Chat brief / Durable. BMAD v6.12: "Build decyduje
   o ceremonii po zbadaniu zmiany, nie przed". cc-sdd: discovery ma wyjście "B: no spec needed".
2. **Ograniczona gramatyka doprecyzowań.** spec-kit clarify: max 5 pytań, odpowiedź wielokrotnego wyboru
   lub do 5 słów, każde logowane jako `Q -> A` pod datą sesji i od razu wpisywane do specu. superpowers: jedno
   pytanie na wiadomość. tyran: paczki po 4 pytania, każde z rekomendacją. claudex-loop: pytaj tylko o
   nierozstrzygnięte decyzje, które zmieniają wynik, podając koszt złego zgadnięcia.
3. **Kontrakty między taskami w planie.** superpowers: blok `Interfaces: Consumes / Produces` per task,
   bo "implementer widzi tylko swój task". codex-build: interfaces ledger dopisywany po każdym zielonym
   commicie i wstrzykiwany do następnego briefu.
4. **Mechaniczna trasowalność.** spec-kit analyze: każde FR musi mapować na task, sieroty flagowane,
   klasa `unrequested` dla kodu, o który nikt nie prosił. gsd plan-checker: brak dowolnego ID wymagania
   w planach = blocker. cc-sdd: "every requirement ID must appear in at least one task".
5. **Sufit wielkości jednostki handoffu.** BMAD: spec 900-1600 tokenów, powyżej brama podziału
   ("context rot"). gsd: 2-3 taski na plan, ~50% kontekstu. superpowers: "task = najmniejsza jednostka,
   którą reviewer mógłby odrzucić, aprobując sąsiadów".
6. **Wykonywalne kryteria akceptacji przed buildem.** Acendas/shipyard: każdy task musi nieść
   `acceptance_probe`, uruchamiany PRZED implementacją i musi wtedy FAILować; bez probe task nie może być
   wysłany. Blog "acceptance tests first, agents second": człowiek pisze testy, "done is green".
7. **Równoległe kontr-plany.** feature-dev Anthropic: 2-3 architektów z kontrastującymi briefami
   (minimal / clean / pragmatic) naraz, orkiestrator rekomenduje. compound-engineering v3.25: "Bake-off".
8. **Regiony planu należące do człowieka.** BMAD: blok `<frozen-after-approval reason="human-owned intent">`
   obok sekcji, które maszyna może zmieniać. Approval związany z SHA256 planu (claudex-loop, flow).
9. **Budżet testów.** agent-os: 2-8 testów na grupę, reviewer flaguje "exhaustive testing". Odpowiedź na
   skargę #75 spec-kit ("setki niepotrzebnych testów").
10. **Decyzje z ceną błędu.** superpowers: `Ruling: <decision> - <why> - <cost if wrong>`, lista "Rulings I
    made" na koniec. anneal: decisions.md z odrzuconymi alternatywami, żeby świeży kontekst dziedziczył "dlaczego".

### Jak wypada superdev

Mocne, bez odpowiednika u innych:
- otwarty wywiad w prozie z rozdzieleniem "pytania o fakty" i "decyzje jedna na turę", plus historia
  (changelog, ADR) czytana jako kontekst, nigdy jako wymagania; `refresh.md` przy wznowieniu,
- najbogatszy kształt taska w całym zbiorze: Files, Task Checks, Failure modes (stały kształt), Contracts
  (closed-set consumer lists, matryce), DoD, Covers, TDD, Model/Effort/Review,
- `## Gate commands` z podziałem Build / Tests / Integration i własnością per etap review,
- reviewer planu jako read-only fork z checklistą B1-B17 i regułą dowodu; ExitPlanMode bramkowany hookiem,
- phases bez zagnieżdżania, ADR z trzema kryteriami i kalibracją "zero ADR to norma".

Słabsze niż u najlepszych:
- brak trzeciego, lżejszego toru poniżej Simple (jedno zdanie diffu nadal przechodzi przez intent + plan
  + reviewer); docs Anthropic mówią wprost "if you could describe the diff in one sentence, skip the plan",
- wywiad bez limitu pytań i bez logu `Q -> A`; rejected options celowo nie są zapisywane (to jest decyzja
  projektowa, ale odbiera świeżemu kontekstowi "dlaczego"),
- kontrakty między taskami: `### Contracts` + `CARRY:` są prozą, brak jawnego Consumes / Produces
  i brak mechanicznego ledgera interfejsów,
- brak sufitu wielkości taska i brak tripwire'a rozrostu zakresu (gstack: 8+ plików lub 2+ nowe klasy),
- brak kryteriów akceptacji jako wykonywalnych testów pisanych na czerwono zanim ruszy build,
- hook ExitPlanMode jest heurystyczny i fail-open, a superbuild ufa mu jako jedynemu punktowi kontroli
  planu; nic po stronie decompose.sh nie sprawdza, że plan, który buduje, to ten, który przeszedł review.

## 4. Faza build: esencja u innych vs superdev

### Co robią inni

1. **Świeży kontekst per jednostka + commit per task** to standard (superpowers, gsd, cc-sdd, ralphex,
   Acendas, codex-build). superdev jest tu w głównym nurcie.
2. **Orkiestrator sprawdza prawdę z gruntu, nie raport.** Acendas: `git cat-file -e <sha>`, `PROBE_EXIT: 0`,
   skan stubów, "at most one extra iteration". codex-build: orkiestrator sam uruchamia testy, "red gate ->
   no commit", allowlist plików egzekwowany skryptem dwa razy. tyran: SubagentStop przepuszcza raport
   tylko z cyfrą obok słowa kluczowego (`12 passed`, `EXIT=0`); reviewer "odrzuca na widok raport bez
   surowego outputu". gstack: ledger dowodów związany z fingerprintem drzewa roboczego, FRESH / STALE / MISSING,
   `/ship` cytuje świeże dowody zamiast ponownie uruchamiać suite.
3. **Reviewer nie uruchamia ponownie testów.** superpowers v6: czyta dowody implementera i zgłasza ich
   nieczytelność jako lukę; dwa reviewery per task scalono w jeden (~50% mniej tokenów). BMAD: lenses
   dostają `{diff_file}` + `{claims_file}`, triage weryfikuje każde znalezisko w miejscu.
4. **Filtr fałszywych pozytywów.** Oficjalny code-review Anthropic: 4 reviewery równolegle, potem osobny
   subagent na każde znalezisko "udowodnij albo wyrzuć", próg pewności 80/100, jawna lista wykluczeń.
   BMAD: severity `high | medium | low | false | maybe-false` z obowiązkowym tekstem obalenia.
   compound-engineering: znalezisko, które tylko woli inne podejście, jest odrzucane; prawdziwa wada
   w ustalonym podejściu zachowuje pełną wagę.
5. **Ograniczone pętle napraw z eskalacją siły.** superpowers: rundy 1-3 wznawiają tego samego
   implementera (SendMessage), 4-5 świeży na mocniejszym modelu, potem kontroler orzeka. cc-sdd:
   2 rundy fix -> debugger w czystym kontekście -> 2 rundy -> `_Blocked_`. claudex-loop: MAX_FIX 2.
6. **"Rulings, not stalls".** superpowers v6.3 (po sesji zablokowanej 9 godzin na pytaniu): kontroler
   zatrzymuje się tylko przy operacjach nieodwracalnych, bezpieczeństwie, efektach poza worktree i planie
   "tak zepsutym, że każda ścieżka to zgadywanie"; resztę orzeka i loguje. anneal: "the human is not
   watching", Inbox tylko dla naprawdę blokujących decyzji.
7. **Blind review i zakaz samoaprobaty.** anneal: drugi reviewer nie może czytać znalezisk pierwszego.
   tyran: jeśli dotknąłeś diffu, APPROVE nie jest dla ciebie dostępne. claude-code-guardrails: reviewer
   nigdy nie widzi briefu taska.
8. **Cross-model review jako domyślne.** gstack (Codex default-on), compound (cross-model peers),
   claudex-loop (inspector zawsze drugi dostawca), flow ("same-model subagent does not satisfy").
9. **Worktree per task i fale równoległe.** gsd: "same-wave tasks must have zero file overlap".
   anneal: 8 równoległych dzieci, jedno długożyjące jako merger. compound v3.23: fale w wspólnym workspace
   ze sprawdzaniem wierności snapshotu.
10. **Script-as-coordinator.** ultrapowers przeniósł pętlę superpowers do deterministycznego skryptu na
    Workflow tool: okno koordynatora 52K vs 184K tokenów, ~2x taniej przy 12-24 taskach.
11. **Detektory młócenia.** ralph-cursor: ta sama komenda pada 3x z rzędu, plik pisany 5+ razy w 10 min,
    rotacja kontekstu przy 80k. gstack: budżet "WTF-likelihood" (+15% per revert, twardy cap).
12. **Wykrywanie stubów i "istnienie to nie integracja".** gsd verifier: exists -> substantive -> wired,
    "Do NOT trust SUMMARY.md", integration-checker śledzi Component -> API -> DB -> Response -> Display.

### Jak wypada superdev

Mocne, unikalne albo najlepsze w zbiorze:
- słownik review w jednym pliku-kontrakcie: stabilne ID C/I/M przez rundy, `## Debt` jako jedyny dom
  Minorów, raport "tylko nowa informacja", rozłączne mandaty per etap (task / checkpoint / final z mandatem
  integracyjnym), `VERDICT: BLOCKED` = decyzja użytkownika zapisana w `decisions.md` i wiążąca później
  jak tekst planu. Nikt inny nie ma tak czystej semantyki BLOCKED,
- orkiestrator nie pisze żadnego pliku, `commit-task.sh` stage'uje tylko zadeklarowany zbiór, każda
  niezadeklarowana zmiana eskaluje. To jest odpowiednik "allowlist" codex-build, tylko po fakcie,
- checkpoint co 5 tasków na oknie diffu: nikt inny nie ma cadence między task-gate a final,
- executor jako fork haiku tylko na DEVIATION, logi poza kontekstem reviewera,
- Model/Effort/Review dobierane przez planistę per task: w całym zbiorze rzadkość (inni robią tiery per rola).

Słabsze:
- **Effort per task nie jest w ogóle stosowany przy dispatchu** (szczegóły w sekcji 6). To defekt, nie wybór.
- dowód wykonania Task Checks to proza w `## Runs`; reviewer ma je "sprawdzić", ale nie ma stampa
  związanego z drzewem; checkpoint i final uruchamiają gate ponownie zamiast cytować świeże dowody,
- brak jakiegokolwiek filtru fałszywych pozytywów poza severity; przy "review theater" (badania:
  reviewery LLM błędnie klasyfikują poprawny kod, quoty produkują 54% odrzuconych znalezisk w BMAD)
  to najdroższa dziura,
- 20 punktów pytania użytkownika; ekosystem poszedł w "orzekaj i loguj, pytaj o nieodwracalne",
- brak eskalacji siły modelu w pętli napraw (5 rund tego samego implementera, potem FAIL), brak etapu
  debuggera przed pytaniem użytkownika, brak detektora młócenia,
- brak równoległości i worktree: `### Dependencies` i `### Files` już są, więc fale dałoby się policzyć
  skryptem, ale nic tego nie robi,
- egzekwowanie prawie wyłącznie prozą: jedyny hook to ExitPlanMode; "a skill is advice, a hook is a gate",
- reviewer per task nosi ręcznie mirrorowaną kopię skeletonu raportu (sam kontrakt to przyznaje).

## 5. Rozwiązania w kontrze do superdev i ich najsilniejsze argumenty

| Kontr-teza | Najsilniejszy argument | Co superdev ma na to |
|---|---|---|
| **Ralph loop**: 3 pliki (prd.json, progress.txt, AGENTS.md) + cap, testy jako backpressure | $297 API za kontrakt $50k; fresh context per iteracja; "files and git are a better memory than context" | dokładnie ten sam rdzeń (fresh implementor, commit per task), plus review; ale Ralph pisze learnings co iterację, superdev tylko na close-out |
| **Agent OS 3.0**: porzucić spec i orkiestrację, zostawić standardy | "plan mode, extended thinking i lepsze modele załatwiają scaffolding" | plan mode nie daje gate commands, siły per task, łańcucha review ani decisions.md; ale argument o wygasaniu założeń harnessu jest prawdziwy: każdy etap powinien być wyłączalny |
| **gstack**: brama na wyniku, nie na diffie | browser QA, regression test per fix, evidence ledger; "6 z 35 komend przeżyło miesiąc" | superdev nie ma żadnej bramy wynikowej; `#### Integration` mógłby ją nieść, gdy host deklaruje przepis uruchomienia |
| **beads**: graf zamiast planu liniowego | "konkurujące dokumenty = demencja"; discovered-from; decay pamięci | superdev eskaluje odkrytą pracę do użytkownika zamiast filować węzeł; changelog i rules tylko rosną, nic nie wygasa |
| **hooks-first** (tyran, shapeup, specforge, guardrails) | "a skill is advice, a hook is a gate"; hook widzi akt, review widzi diff (osłabienie asercji, edycja przez Bash są niewidoczne w review) | superdev ma jeden hook; wszystko inne to instrukcja, którą model może "zracjonalizować" |
| **script-as-coordinator** (ultrapowers, anneal) | koordynator 52K zamiast 184K, ~2x taniej, deterministyczne bramy | superbuild jest skillem na sonnet/low, więc tani, ale nadal LLM parsuje `VERDICT:` z prozy |
| **Krytyka "plany gniją, review je pompuje"** | agent-infra #790: 11 cykli review planu dało 11,10,7,11,7,12,10,18,16,17,17 znalezisk, plan urósł do 1050 linii, "długość to dominujące źródło defektów" | cap 3 rund istnieje, ale brak reguły "kasuj powtórzenia zamiast poprawiać" i "znalezisko, którego jedyne remedium to rozszerzenie zakresu, to rozmowa o zakresie, nie fix" |

Najlepsza synteza w źródłach (Mason, compound, ACE) to nie "bez planu", tylko: mały plan, twarde testy,
reviewer z czystym kontekstem, wiedza zapisywana z powrotem. superdev ma trzy z czterech i jest
najcięższy dokładnie tam, gdzie dowody są najsłabsze (osąd reviewera zamiast dowodu maszynowego).

## 6. Fakty o Claude Code, które zmieniają ocenę (zweryfikowane)

1. **Agent tool nie ma parametru `effort`.** Schemat narzędzia w tej sesji: description, isolation, model,
   prompt, subagent_type. Docs opisują per-call `model`, ale per-call `effort` nie istnieje.
   `effort:` we frontmatterze agenta działa (v2.1.266 naprawiło jego ignorowanie). Skutek: superbuild
   przekazuje `effort:` z kolumny planu do wywołania, które go nie przyjmuje. Każdy implementor biegnie
   na `xhigh` z frontmatteru, każdy reviewer per task na `high`. Marker `Effort:` w planie i cała sekcja
   `## Dispatch strength` są dziś fikcją po stronie effort (model działa).
2. **Fork mode jest domyślnie włączony w sesji interaktywnej i wtedy każdy subagent biegnie w tle.** Wynik
   przychodzi jako powiadomienie, orkiestrator czeka. Sekwencyjna pętla działa. Subagenty w tle dostają
   okrojony zestaw narzędzi, ale Read/Grep/Glob/Bash/Edit/Write/Skill zostają, więc implementory
   i reviewery superdev nie tracą niczego. `background: false` we frontmatterze nie ma znaczenia przy
   fork mode on. Fork mode NIE sprawia, że zwykły subagent dziedziczy kontekst (ta teza jednego z agentów
   była błędna).
3. **Dostępne i niewykorzystane**: `memory: project` na agencie (reviewer pamiętający powtarzalne znaleziska
   w projekcie), `isolation: worktree` per wywołanie, `hooks:` we frontmatterze agenta (wymaga zaufania
   folderu), hooki `SubagentStop` z matcherem `^superdev:superbuild-task-implementor$` z hooks.json pluginu
   (hooki pluginu odpalają się wewnątrz subagentów, z `agent_type` w inpucie), wznowienie subagenta przez
   SendMessage z pełną historią i ciepłym cache, zagnieżdżanie subagentów do 3 poziomów (reviewer może
   wysłać weryfikatora per znalezisko).
4. **Nowe wbudowane**: `claude plugin eval` (v2.1.269, gradery, baseline bez pluginu, brama CI),
   `/skill-doctor` (v2.1.261), `maxEffortLevel` (v2.1.266), `/code-review`, dynamic workflows, `/goal`,
   cross-session messaging. `claude plugin eval` jest najważniejsze: repo ma tylko `node --test` skryptów,
   zero ewaluacji zachowania skilli.
5. Codex CLI od v0.146 (lipiec) jest plugin-native z tym samym układem plugin.json / skills, więc
   jeden layout może celować w oba CLI. Nie priorytet, ale zdejmuje część ryzyka "tylko Claude Code".

## 7. Ocena: lepiej czy gorzej

Skala 1-10 względem najlepszego zaobserwowanego rozwiązania w danym wymiarze.

| Wymiar | superdev | Najlepszy w zbiorze | Komentarz |
|---|---|---|---|
| Zbieranie wymagań | 8 | superpowers / spec-kit clarify | otwarty wywiad z historią jako kontekstem; brak limitu, logu Q->A, toru bez planu |
| Artefakt planu | 9 | superdev | najbogatszy kształt taska; brakuje Consumes/Produces, sufitu wielkości, testów akceptacyjnych RED |
| Review planu | 8 | gsd plan-checker / superdev | checklista B1-B17 + fork read-only; hook fail-open, brak kontr-planu |
| Wykonanie | 6 | codex-build / Acendas | fresh context i declared-set commits tak; Effort nie działa, brak bramy mechanicznej, brak równoległości |
| Review kodu | 8 | superdev (słownik) / Anthropic code-review (filtr) | najlepsza semantyka verdictów; brak filtra fałszywych pozytywów, gate uruchamiany ponownie per etap |
| Human-in-the-loop | 6 | superpowers v6.3 | 20 punktów pytania; BLOCKED jest dobre, reszta to "stalls" |
| Wiedza po buildzie | 8 | compound-engineering | jedyny z memory/rules/changelog jako agentami; brak decay/refresh i przechwytywania per task |
| Koszt i skalowanie ceremonii | 5 | BMAD v6.12 / superpowers 6.3 | brak toru "Direct", gate re-runs, każda runda to kilka dispatchy |
| Egzekwowanie (hooki) | 3 | tyran / shapeup | jeden hook, reszta proza |
| Ewaluacja pluginu | 2 | superpowers / compound / `claude plugin eval` | tylko testy skryptów |
| Przenośność i zależności | 8 | superdev / gstack | bash-only, stack-agnostic, zero runtime deps; tylko Claude Code |

Werdykt: superdev jest w ścisłej czołówce w projektowaniu artefaktów i słownika review (tu jest lepszy
od każdego przebadanego projektu), a za czołówką w tym, co ekosystem robił od czerwca: mechaniczne
dowody zamiast osądu, hooki zamiast instrukcji, skalowanie ceremonii w dół, eskalacja siły w pętlach,
ewaluacje pluginu. Jedna rzecz jest po prostu zepsuta (Effort).

## 8. Co poprawić, zmienić, dodać (priorytetyzowane)

### P0: defekty i fałszywe założenia

1. **Effort per task.** Trzy drogi: (a) warianty agenta per siła (np. implementor-standard = high,
   implementor-deep = xhigh; reviewer analogicznie) i dispatch po `subagent_type`, przy uproszczeniu skali
   `Effort:` do dwóch wartości; (b) zostawić `Effort:` jako sygnał dla planisty, a przy dispatchu stosować
   tylko `model`; (c) czekać na parametr w harnessie. Rekomendacja: (a) dla implementora, (b) dla reszty.
   W każdym wariancie `review-contract.md ## Dispatch strength` i CLAUDE.md muszą przestać twierdzić, że
   effort jest przekazywany. Bez tej zmiany `stats` też raportuje nieprawdziwy effort.
2. **Związać build z zaaprobowanym planem.** Reviewer planu (albo hook review-plan.sh po PASS) zapisuje
   w nagłówku `Reviewed: <sha256 pliku planu>`; `decompose.sh` liczy hash i odmawia przy niezgodności.
   Zamyka lukę "fail-open hook + superbuild nie sprawdza planu". Wzorzec: claudex-loop i flow wiążą
   aprobatę z SHA256.
3. **Udokumentować fork mode / background.** W CLAUDE.md i w superbuild: subagenty biegną w tle, wynik
   to powiadomienie; `background: false` we frontmatterze nic nie daje przy fork mode on. Nic do naprawy,
   ale opis "Await it" powinien odpowiadać rzeczywistości.

### P1: dowód maszynowy zamiast osądu (największy zysk jakości na token)

4. **Stamp dowodowy z run.sh / Task Checks.** Każde uruchomienie zapisuje rekord (komenda, exit, czas,
   fingerprint drzewa: `git write-tree` po tymczasowym `add -A` w skrypcie albo hash `git diff HEAD` + HEAD)
   do `implementation/task-NN-runs.jsonl`. Reviewer per task i checkpoint porównują fingerprint z bieżącym
   drzewem zamiast wierzyć prozie `## Runs` i zamiast uruchamiać gate ponownie; gate biegnie realnie tylko
   w final i re-review. Wzorce: gstack evidence ledger (FRESH/STALE), tyran, agent-verification-kit.
5. **Hook SubagentStop na implementorze** (matcher `^superdev:.*-task-implementor$`): odmawia zakończenia,
   gdy brak stampa dla każdej linii Task Checks z exit 0 świeższego niż ostatnia edycja. Deterministyczny,
   sub-sekundowy, "blokuje milczenie, nie fałszerstwo". Nigdy nie uruchamia suite w hooku (wszystkie
   raporty o hookach z suite na Stop kończą się pętlami i kosztem).
6. **Hook PreToolUse zakresu plików** dla implementora: deny Edit/Write poza `### Files` + ścieżką notatek
   + `.temp/`, plus skan komend Bash pod kątem ścieżek spoza zbioru (bez tego brama jest teatrem, bo
   `sed -i` omija Write). `commit-task.sh` zostaje jako kontrola po fakcie. Edycja istniejącego pliku
   testowego, którego task nie tworzy, wymaga deklaracji w Task Checks; inaczej Critical (reguła "read the
   test change first").
7. **Walidator per znalezisko.** Zanim reviewer zwróci raport z Critical/Important, każdy taki punkt
   dostaje zagnieżdżony subagent haiku "udowodnij w kodzie albo wyrzuć" (zagnieżdżanie jest dostępne).
   Do kontraktu: werdykt `false | maybe-false` z obowiązkowym tekstem obalenia (BMAD) i reguła
   "znalezisko, którego jedyne remedium to zmiana specu/planu, nie jest fixem" (#66, BMAD "reject any
   finding whose fix edits the spec"). Do stats: findings opened / closed / reopened per runda oraz odsetek
   Task Checks zielonych za pierwszym razem; superdev jako jedyny ma stabilne ID, więc to jest darmowe
   i unikalne w ekosystemie.
8. **Testy akceptacyjne jako pierwszy task (tor Super).** Planista, dla każdego kryterium ze specu, każe
   Taskowi 1 napisać test czerwony i wpisuje jego komendę do `#### Tests`/`#### Integration`. Ten sam
   mechanizm co ADR-jako-Task-1. Zamienia "test, który nie może paść" (B13) z heurystyki reviewera
   w artefakt VERIFY-RED w gicie. Wzorce: Acendas acceptance_probe (bez probe brak dispatchu),
   "acceptance tests first, agents second".
9. **Consumes / Produces + ledger interfejsów.** Pole `### Interfaces` (Consumes / Produces z nazwami
   i typami) w szablonie taska; klasa checklisty: każde Consumes ma Produces we wcześniejszym tasku.
   Implementor dopisuje `PROVIDES:` do notatek; `commit-task.sh` agreguje je do
   `implementation/interfaces.md`, przekazywanego kolejnym implementorom przez `refs:`. `CARRY:` zostaje
   dla problemów, nie dla kontraktów.

### P2: skalowanie ceremonii i koszt

10. **Tor "Direct".** Czwarta opcja na bramie intent (albo przed intentem, jak superpowers "spike / bounded"):
    brak pliku planu, tylko Task Checks + cap rund + commit; reviewer tylko przy dotknięciu ścieżek
    oznaczonych w host CLAUDE.md jako wrażliwe. Kryterium jak w docs: diff opisywalny jednym zdaniem.
    Superpowers, compound, BMAD i cc-sdd wszystkie dołożyły ten tor w 2026.
11. **Reguły zbieżności review planu.** Do checklisty: sufit długości planu (linie lub tokeny), "kasuj
    powtórzenie zamiast je poprawiać", "znalezisko wymagające rozszerzenia zakresu = rozmowa o zakresie".
    Tripwire zakresu jak gstack: >N plików lub >M nowych klas w jednym tasku = FINDING podziału.
12. **Sufit wielkości taska.** Klasa B18: task powyżej progu (np. >8 plików w Files lub plik taska >N linii)
    do podziału. BMAD mierzy to tokenami (900-1600) z powodu context rot; superpowers "najmniejsza
    jednostka, którą reviewer może odrzucić osobno".
13. **Eskalacja siły w pętlach.** Implementor: po 3 nieudanych rundach Task Checks wznowienie na wyższej
    sile (SendMessage zachowuje historię i cache) zamiast 5 rund tego samego. Reviewer per task: po
    2 FAIL dispatch `simpledebug` jako fork w czystym kontekście przed pytaniem użytkownika (drabina
    cc-sdd). Detektor młócenia: ta sama komenda pada 3x z rzędu lub ten sam plik pisany 5+ razy =
    przerwanie i eskalacja, nie kolejna runda.
14. **Przełącznik `autonomy: ask | rule`.** Domyślnie `ask` (dzisiejsze zachowanie). Przy `rule`
    orkiestrator na BLOCKED bez elementu nieodwracalnego zapisuje `Ruling: <decision> - <why> - <cost if
    wrong>` przez record-decision.sh i jedzie dalej; lista orzeczeń trafia do podsumowania close-out
    i do changelogu. Cztery warunki stopu z superpowers (nieodwracalne, bezpieczeństwo, efekty poza
    repo, plan bez sensownej ścieżki) zostają twarde.
15. **Zdjąć re-run gate z checkpointu**, gdy stampy z P1.4 są FRESH dla całego okna diffu. Gate biegnie
    w final i w re-review. Superpowers i gstack poszły dokładnie tą drogą z powodu kosztu.

### P3: wiedza i pamięć

16. **Przechwytywanie per task.** Linie `LEARNED:` w notatkach implementora (jak progress.txt Ralpha),
    promowane na close-out przez memory-writer z bramą kontrfaktyczną compound: "gdyby ten zapis zniknął,
    czy przyszły inżynier powtórzyłby błąd?" (wszystkie trzy: nieoczywiste, trwałe, istotne).
17. **Pas odświeżania.** `superdev-memory` i `superdev-rules` dostają tryb audytu: Keep / Update /
    Consolidate / Delete względem obecnego kodu (compound-refresh, beads decay). Rules mają próg
    tworzenia, ale nie mają progu usuwania; "bez okresowego przejścia magazyn bardziej myli niż pomaga".
18. **Retro z kontrolą poprzedniego.** changelog-writer zapisuje liczbę otwartych Debt i orzeczeń;
    History agent w następnym intent podnosi Debt z poprzednich buildów i sprawdza, czy action items
    z poprzedniego wpisu zostały zrobione (BMAD). Do changelogu opcjonalny rekord błędu z polem
    "Why Missed" (SuperClaude pm-agent), gdy final review znalazł Critical.
19. **Lista weryfikacji manualnej dla człowieka** w final review (humanlayer: Automated / Manual
    Verification). Superdev ma Task Checks i gate, ale nigdy nie mówi użytkownikowi, co ma kliknąć sam.

### P4: platforma

20. **`claude plugin eval` dla superdev.** Zestaw fixture'ów: intent -> oczekiwane pytania, plan -> werdykt
    reviewera z klasami B-x, diff -> stabilne ID i severity. Baseline bez pluginu. Brama CI. Compound,
    superpowers i gstack już to mają; tdd-guard padł na wycofaniu modelu bez ewaluacji.
21. **`memory: project` na reviewerach** (powtarzalne znaleziska per projekt) i **`isolation: worktree`**
    jako przełącznik `parallel: true`: decompose.sh liczy fale z `### Dependencies` przy zerowym
    nakładaniu `### Files` w fali, orkiestrator wysyła falę w jednej wiadomości. To jest największa zmiana
    architektoniczna i wymaga rozwiązania merge'y; zaczynać od fal tylko dla tasków bez wspólnych plików.
22. **Prototyp script-as-coordinator** dla pętli build na dynamic workflows (agent()/pipeline()), gdy
    P1 dostarczy deterministyczne bramy. Zysk mierzony przez ultrapowers to ~2x. Nie teraz; po P0-P2.

### Czego nie robić (ekosystem to już przetestował)

- Fan-out 4-7 reviewerów per task: koszt 4-7x za przypomnienie, które jeden validator per znalezisko daje taniej.
- Quoty znalezisk ("znajdź co najmniej dziesięć"): 54% odrzuconych, spadek do 106 P3 w czwartym przejściu.
- Walidator LLM na każdą edycję (tdd-guard): autor sam go wycofuje; hook ma być deterministyczny i sub-sekundowy.
- Uruchamianie całego suite w hooku Stop: pętle, koszt, osłabianie asercji "żeby przeszło".
- Zależności runtime (Python/uv, MCP w repo, drugi dostawca): superdev bash-only to realny wyróżnik.
- Plany z pełnym kodem w krokach (superpowers): precyzja kosztem odporności na dryf; obecny kształt
  Files + Task Checks + Failure modes jest lepszy.
- Zmiany nazewnictwa: BMAD zmienił nazwę pętli trzy razy w rok; jeden plik-kontrakt superdev chronić.

## 9. Trendy do obserwowania

- Cross-model review jako brama finalna (Codex/Grok jako inspector). Dziś poza zasięgiem bash-only,
  ale `Review:` marker mógłby w przyszłości przyjąć dostawcę.
- Codex CLI plugin-native: jeden layout dla dwóch CLI.
- Permission rules dopasowujące parametry narzędzia (`Agent(model:opus)`): jeden agent twierdził, że
  istnieją, w CHANGELOG nie znalazłem; jeśli się pojawią, dadzą twardy sufit siły z poziomu settings.
- Dynamic workflows i agent teams jako natywna orkiestracja: gdy dojrzeją, superbuild jako skill
  stanie się cieńszą warstwą nad nimi.

## 10. Dwa nowe dodatki (propozycja użytkownika): ocena i miejsce w pipeline

Oba włączane w `.claude/superdev.yml`, jak `adr`, `changelog`, `stats`.

### 10.1 Scenariusze testów manualnych dla działu QA

**Czym jest.** Krok po kroku wykonywalny przez człowieka scenariusz: ID, tytuł, warunki wstępne, dane
testowe, kroki "akcja -> oczekiwany wynik", pokrywane kryterium akceptacji (`Covers:`), wynik
(pass / fail / blocked) do wypełnienia przez testera.

**Pozycja na tle ekosystemu.** Nikt tego nie robi jako warstwy wiedzy. Najbliżej: humanlayer (lista
"Manual Verification" per faza dla człowieka), cc-sdd (`MANUAL_VERIFY_REQUIRED`), gsd
(`checkpoint:human-verify`), BMAD ("passing tests do not substitute for running the system"). Wszystkie
to jednorazowe listy w czacie lub w planie, żadna nie jest artefaktem dla działu testów z trasowalnością
do kryteriów. Ocena jako wyróżnik: 8/10. Tanie (jeden agent close-out, proza), stack-agnostic, pasuje
do modelu "docs/<layer>/ = wiedza dla ludzi".

**Źródło prawdy.** Kryteria akceptacji ze specu (Super) lub z nagłówka planu (Simple), sekcja
`## User scenarios` specu, `### Failure modes` i `### Contracts` z planu (dają przypadki negatywne),
tabela `## Coverage` z raportu `superbuild-reviewer-spec` (mówi, które kryteria są met / partial), plus
kod po buildzie (realne ścieżki UI, nazwy ekranów, komunikaty). Dlatego generacja musi być PO buildzie:
tester potrzebuje "otwórz X, kliknij Y", a to istnieje dopiero po implementacji.

**Miejsce.** Czwarty writer close-out (`qa-writer`), wave 1 obok memory-writer i rules-writer, gated
`qa: true`. Wyjście: `docs/qa/<feature-slug>.md` (jeden plik per build; przy phases jeden per faza)
plus linia indeksu w `docs/qa/README.md`, analogicznie do changelogu. Commit przez `commit-task.sh --path`.

**Reguły warte ustalenia od razu.**
- Jeden scenariusz na kryterium plus jeden negatywny na każdy `### Failure modes`, którego użytkownik
  może wywołać z UI; nic dla wewnętrznych trybów awarii.
- Krok = jedna akcja i jeden obserwowalny wynik; zakaz "sprawdź, że działa poprawnie".
- Brak UI w zakresie buildu (biblioteka, migracja, API bez klienta) = skip-with-note, nie scenariusze
  "uruchom curl". Ewentualnie tryb API z krokami "wyślij żądanie / oczekiwana odpowiedź", jeśli QA takie wykonuje.
- Dokument write-once per build jak changelog, albo aktualizowany per feature? To rozstrzyga, czy QA
  ma "regresję" (żyjący zbiór) czy "protokół odbioru" (per build). Wymaga decyzji użytkownika.
- Podlega pasowi odświeżania z P3.17: scenariusz, którego ekran zniknął, ma zostać usunięty.

**Ryzyka.** Jakość kroków zależy od tego, czy agent zna realny UI (musi czytać kod widoków i routing,
nie tylko spec); dryf po kolejnych buildach; dla Simple track bez `## User scenarios` scenariusze będą
uboższe. Żadne z tych nie jest blokerem.

### 10.2 Testy maszynowe E2E (Playwright) uruchamiane w CI

**Czym jest.** Skrypty testów end-to-end generowane z tych samych kryteriów, uruchamiane w CI hosta.
Narzędzie wskazane przez użytkownika: playwright-cli (CLI Microsoftu dla agentów kodujących: `open`,
`snapshot`, `click`, `fill`, tryb `plan / generate / heal` generujący testy Playwright ze specu, tańszy
tokenowo od Playwright MCP). Artefaktem do CI są pliki `@playwright/test` uruchamiane `npx playwright test`;
playwright-cli jest narzędziem agenta do eksploracji UI i generacji, nie tym, co biegnie w CI.

**Pozycja na tle ekosystemu.** Agenty piszące testy Playwright to codzienność (Playwright MCP, gstack
`/qa`, Ralph "frontend story not complete until browser verification"). Nikt jednak nie robi dwóch rzeczy
naraz: nie wiąże testów E2E z kryteriami akceptacji specu przez stabilne ID i nie czyni ich bramą
`#### Integration` w tym samym buildzie. Ocena jak zaproponowano (osobny dodatek, playwright-cli
na sztywno): 6/10. Ocena po przeformułowaniu poniżej: 8/10.

**Dwa napięcia z zasadami superdev.**
1. Stack-agnostic: plugin nie może zakładać Playwrighta ani nawet aplikacji webowej. Rozwiązanie: switch
   nazywa się `e2e`, a host deklaruje w CLAUDE.md framework, katalog testów, komendę uruchomienia
   i przepis startu aplikacji z użytkownikiem testowym. Playwright jest domyślnym odniesieniem
   w referencji, nie założeniem w skillu. Brak deklaracji = skip-with-note (jak kontrast checker w superui).
2. Kiedy generować: close-out (jak changelog) czy task planu? Test wygenerowany na close-out nie jest
   nigdy zweryfikowany przez review tego buildu. Rekomendacja: ostatni task planu ("napisz testy E2E dla
   kryteriów #1..#n, uruchom je"), a jego komenda trafia do `#### Integration`. Wtedy final review
   uruchamia je jako bramę i "test, który nie może paść" (B13) dotyczy też E2E. To jest wariant P1.8
   (testy akceptacyjne jako task) dla warstwy UI, tylko na końcu planu zamiast na początku, bo UI musi
   istnieć. Mechanizm dokładnie jak ADR-jako-Task-1: szablon taska w `references/`, planista dokleja.

**Wspólny szkielet z 10.1.** Oba dodatki powinny czytać jedną listę scenariuszy z ID (`QA-01`, `QA-02`)
mapowaną na kryteria. Scenariusz manualny i test E2E o tym samym ID to ten sam przypadek w dwóch
renderach. Daje to trasowalność kryterium -> przypadek manualny -> test w CI, której nie ma nikt
w przebadanym zbiorze, i pozwala QA wiedzieć, co CI już pokrywa, a co trzeba kliknąć ręcznie.
Praktycznie: `qa-writer` na close-out generuje scenariusze manualne z tej listy, a task E2E w planie
implementuje te z listy, które są automatyzowalne, i oznacza resztę `manual-only`.

**Ryzyka.** Testy E2E wymagają uruchomionej aplikacji, danych i użytkownika testowego w CI: to jest
praca hosta, nie pluginu; bez tego switch generuje testy, których CI nie odpali. Flaky tests: reguła
"assert semantic postcondition, nie sam klik" i tryb `heal` z playwright-cli pomagają, ale utrzymanie
zostaje po stronie hosta. Implementor piszący E2E musi mieć narzędzie do eksploracji UI (playwright-cli
lub MCP) dostępne w sesji; jeśli nie ma, generuje na ślepo z kodu, co obniża jakość.

### 10.3 Pytania do rozstrzygnięcia przed planowaniem

1. Scenariusze manualne: protokół odbioru per build (write-once, jak changelog) czy żyjący zbiór
   regresji per feature (aktualizowany kolejnymi buildami, z pasem odświeżania)?
2. E2E: osobny dodatek na close-out (jak proponowano) czy ostatni task planu z komendą w
   `#### Integration` (rekomendacja)?
3. E2E: Playwright na sztywno czy `e2e` z frameworkiem deklarowanym przez hosta i Playwrightem jako
   domyślnym odniesieniem (rekomendacja, wynika z zasady stack-agnostic)?
4. Czy oba dodatki mają dzielić jedną listę scenariuszy z ID (rekomendacja), czy pozostać niezależne?
5. Zakres bez UI (API, biblioteka): skip-with-note czy tryb API dla scenariuszy manualnych?
