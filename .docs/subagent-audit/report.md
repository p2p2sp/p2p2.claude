# Audyt konfiguracji subagentów — raport

Data: 2026-07-04 · Zakres: definicje subagentów + instrukcje delegacji · Tryb: audit-only (żaden plik źródłowy nie został zmieniony)

## 1. Stan faktyczny — co w tym repo jest "setupem subagentów"

Katalog `.claude/agents/` **nie istnieje** (ani w projekcie, ani na poziomie użytkownika `~/.claude/agents/`).
Faktyczne definicje subagentów tego repo żyją w pluginach:

| Plik | Model | Tools | Dyspozytor |
|---|---|---|---|
| `superdev/skills/superbuild/agents/coder.md` | opus/xhigh | Read, Glob, Grep, Edit, Write, Bash, **Skill, Workflow** | `task-pipeline.workflow.js` (`agentType: superdev:coder`) |
| `superdev/skills/superbuild/agents/runner.md` | haiku/low | Read, Bash | workflow (`superdev:runner`) |
| `superdev/skills/superbuild/agents/task-reviewer.md` | opus/xhigh | Read, Glob, Grep, Write, Bash, **Skill** | workflow (`superdev:task-reviewer`) |
| `superdev/skills/superbuild/agents/improver.md` | sonnet/medium | Read, Glob, Grep, **Edit**, Write, Bash, **Skill** | workflow (`superdev:improver`) |
| `superdev/skills/superbuild/agents/commiter.md` | haiku/low | Bash | workflow (`superdev:commiter`) |
| `superfix/agents/scout.md` | haiku | Read, **Write**, Grep, Glob, Bash | `code-auditor` (Task tool, main context) |
| `superfix/agents/detective.md` | opus | Read, Write, Grep, Glob, Bash, Edit | `code-auditor` (Task tool, main context) |
| `superui/skills/design-audit/agents/design-scout.md` | haiku | Read, Grep, Glob, Bash | `design-audit` (Task tool, main context) |
| `superui/skills/design-audit/agents/design-detective.md` | opus | Read, Grep, Glob, Bash, Write | `design-audit` (Task tool, main context) |

Instrukcje delegacji (druga część zakresu):

- `CLAUDE.md` (sekcje o pipeline superbuild, "Script vs. fork", taksonomia skilli),
- `.claude/rules___/skill-fork-dispatch.md` — reguła delegacji forków; katalog `rules___` jest obecnie
  **wyłączony** (rename z `rules/`, pliki usunięte z indeksu git), ale to nadal jedyny dokument
  kodyfikujący model delegacji i agenci wciąż są napisani według niego.

Standard weryfikacji przyjęty w audycie (zgodnie ze zleceniem): **subagent działa jeden poziom w głąb
i nie może spawnować kolejnych workerów** — ani przez Task/Agent, ani przez `Skill`-fork, ani przez `Workflow`.

---

## 2. Ustalenia — A. Założenia delegacji rekurencyjnej (najpoważniejsze)

### A1. `coder` — obowiązkowa bramka przez zagnieżdżony fork `superbuild-runner` — KRYTYCZNE

`coder.md` (Step 5, `coder.md:103-134`) nakazuje agentowi — który sam jest już subagentem workflow —
wywołać `superdev:superbuild-runner` przez tool `Skill`, i czyni z tego **obowiązkową** weryfikację
przed każdym PASS ("Returning PASS without this invocation is the failure mode this whole machinery
exists to prevent"). Anty-wzorce (`coder.md:189`) dodatkowo **zakazują** uruchamiania build/test przez
surowy `Bash` — jedyną legalną drogą jest zagnieżdżony fork.

To samo założenie sięga głębiej: work-order `shared/coder-modes/mode-tdd.md` każe coderowi wywołać
skill `superdev:tdd` przed pierwszym testem oraz `superdev:superbuild-runner` przy **każdym**
checkpointcie VERIFY-RED / VERIFY-GREEN / po refaktorze (3 wystąpienia); `mode-tests-none.md` ma 1 wzmiankę.

**Skutek w modelu jednopoziomowym:** wywołanie albo zawiedzie, albo rozwinie treść skilla inline
w kontekście codera — znikają wszystkie projektowane własności forka: izolacja kontekstu (długie
outputy testów miały nie zaśmiecać kontekstu opus/xhigh), tańszy model (haiku) i osobny effort.
W wariancie "zawiedzie" coder jest w klinczu: nie wolno mu użyć Bash do testów, a jedyna dozwolona
droga nie działa → albo FAIL każdego zadania, albo (gorzej) PASS bez fizycznej weryfikacji.

**Rekomendacja (diff `diffs/coder.diff`):** spłaszczyć — coder uruchamia bramkę sam, wyłącznie przez
verby recepty (`bash <recipePath> verify` → `test-filtered <pattern>`), z klasyfikacją werdyktu
in-scope/out-of-scope inline. To dokładnie ten ruch, który repo już wykonało dla agenta `runner`
(CLAUDE.md: "no longer nesting a `superbuild-runner` fork") — migracja jest w połowie drogi;
coder i improver to dwaj pozostali pasażerowie starego modelu. Z `tools:` znikają `Skill` i `Workflow`.

### A2. `improver` — zagnieżdżone `Skill(superdev:memory-rules)` — KRYTYCZNE

`improver.md` (Step 3, `improver.md:52-83`) nakazuje subagentowi wywołać `memory-rules` Mode C przez
tool `Skill` ("Call `memory-rules` exactly once"). Cała sekcja "Division of labour" jest zbudowana na
tym zagnieżdżeniu. W modelu jednopoziomowym dyspozycja nie zajdzie — a jeśli rozwinie się inline,
autorowanie reguł odbędzie się w kontekście i na modelu improvera (sonnet), bez separacji, którą
architektura deklaruje.

**Rekomendacja (diff `diffs/improver.diff`):** podnieść dyspozycję o poziom. Improver zostaje czystym
sędzią: ocenia learningi (§G 1/2/4), zbiera listę zmienionych plików (`git diff --name-only HEAD`
+ filtr `rule_extensions`) i emituje w swoim raporcie maszynowo-czytelny blok `## Kept for promotion`.
Wywołanie `memory-rules` Mode C wykonuje **dyspozytor** (superbuild, main context) po powrocie
workflow, przekazując blok verbatim. Z `tools:` improvera znikają `Skill`, `Edit`, `Glob`, `Grep`
(patrz B4). Wymaga zmiany towarzyszącej w superbuild — patrz §6.

### A3. `skill-fork-dispatch.md` — reguła kodyfikuje model, którego nie ma — KRYTYCZNE (dokumentacyjnie)

`.claude/rules___/skill-fork-dispatch.md` twierdzi wprost:

- "Nesting is depth-capped at **5 levels** below the main conversation" (`:30`),
- fork "MAY invoke other fork-skills via the `Skill` tool" (`:23`) i "MAY also dispatch subagents via the `Agent` tool" (`:28`),
- "a fork cannot spawn a fork … applies to the `Agent`/`Task` tool, **never to `Skill`**" (`:29`).

Wszystkie trzy tezy są sprzeczne z jednopoziomowym modelem delegacji. Dodatkowo cytowany precedens
jest **przestarzały**: "superplan-reviewer dispatches one `general-purpose` agent per checklist group
via the `Agent` tool" (`:32`) — tymczasem `superplan-reviewer/SKILL.md` nie ma `Agent` w
`allowed-tools` (ma za to nieużywany `Skill`) i w body nie dyspozytoruje żadnych agentów.
Reguła jest dziś wyłączona (katalog `rules___`), ale definicje agentów wciąż odzwierciedlają jej model.

**Rekomendacja (diff `diffs/skill-fork-dispatch.diff`):** przepisanie na regułę "Worker dispatch —
one level deep": dyspozycja wyłącznie z main context; workerom nie przyznaje się `Skill`/`Agent`/`Workflow`;
potrzebny krok innego workera → podnieść do dyspozytora albo wchłonąć inline. Sekcja o kaskadzie
narzędzi (intersekcja, scoped `Bash`, diagnostyka strip) zostaje — jest poprawna i cenna także
w modelu płaskim (dotyczy `!`-injection przy load-time).

### A4. `CLAUDE.md` — instrukcje delegacji opisujące łańcuchy zagnieżdżone — WYSOKIE

CLAUDE.md jako orientacja dev-time utrwala te same założenia:

- łańcuch codera: "recipePath is threaded into every per-task Workflow invocation so each fork sources its verbs" z listą konsumentów zawierającą `superbuild-runner` wywoływany przez codera,
- `improver → memory-rules` Mode C jako łańcuch in-pipeline,
- fan-out `superbuild-reviewer` (sam będący forkiem poziomu 1) na **6 forków** przez `Skill` — fork→fork, poziom 2. To ten sam problem po stronie skilli; poza formalnym zakresem audytu agentów, ale to instrukcja delegacji, więc odnotowuję: przy modelu jednopoziomowym fan-out lens-ów musi wykonywać superbuild (main context), nie fork reviewer-a,
- jednocześnie CLAUDE.md sam dokumentuje spłaszczenie runnera — sprzeczność wewnętrzna: jeden worker już przemigrowany, dwa (coder, improver) + fan-out reviewer-a nie.

Do aktualizacji po przyjęciu diffów (§6).

---

## 3. Ustalenia — B. Allowlisty szersze niż praca

| Agent | Nadmiarowy grant | Dowód | Diff |
|---|---|---|---|
| `coder` | `Workflow` | zero użyć w body; agent nie orkiestruje niczego | `coder.diff` |
| `coder` | `Skill` | jedyne użycie to zagnieżdżenie z A1 — po spłaszczeniu zbędny | `coder.diff` |
| `task-reviewer` | `Skill` | body nie zawiera żadnego wywołania skilla (rubryki czyta przez `Read`) — martwy grant, prawdopodobnie relikt | `task-reviewer.diff` |
| `scout` (superfix) | `Write` | body: "Never edit files. You are read-only triage"; wynik idzie stdoutem ("The orchestrator appends your line(s) to scores.jsonl"). Bliźniaczy `design-scout` poprawnie NIE ma `Write` — asymetria potwierdza przeoczenie | `scout.diff` |
| `improver` | `Edit`, `Glob`, `Grep` | własne anty-wzorce ich zakazują ("Editing any file other than Report path", "Grep-ing `.claude/rules/**`"). To granty kaskadowe pod zagnieżdżone `memory-rules` (Mode C potrzebuje Edit/Grep/Glob) — czyli koszt architektury z A2; po podniesieniu dyspozycji do superbuild stają się czysto nadmiarowe | `improver.diff` |

Przyległe (skille-forki, nie agenci — poza formalnym zakresem, ale ten sam wzorzec):

- `superbuild-runner/SKILL.md` — `allowed-tools: Bash, Read, Skill, Workflow`; body nie używa ani `Skill`, ani `Workflow`.
- `superplan-reviewer/SKILL.md` — `Skill` w `allowed-tools` bez użycia w body.

Poprawne minimalne allowlisty (wzorce, bez zmian): `commiter` (tylko `Bash` — wzorcowy passthrough),
`runner` (`Read, Bash`), `design-detective` (`Write` tylko dla raportu, brak `Edit` przy regule
"never edits code"), `design-scout`. `detective` (superfix) zachowuje `Edit` zasadnie — body
przewiduje eksperymenty w drzewie roboczym ("Do not trust edits you made earlier in your own
session") i weryfikację na czystym worktree; diff jedynie dopisuje jedno zdanie doprecyzowujące,
że `Edit` służy wyłącznie eksperymentom, nigdy shippowaniu poprawki.

---

## 4. Ustalenia — C. Nakładające się opisy

### C1. `scout` ↔ `design-scout` oraz `detective` ↔ `design-detective` — ŚREDNIE

Dwie pary między pluginami mają niemal identyczne opisy ("Cheap, fast triage scout … Scores a single
file … Impact and Opportunity on a 1-5 scale … one compact line of JSON …" / "Deep, frontier-model
investigator … single high-priority hotspot as an entry point …"). Przy obu pluginach zainstalowanych
model wybierający subagenta do zadania ad-hoc widzi dwa bliźniacze wpisy różniące się jednym słowem
("Code Auditor" vs "Design Audit") — a **żaden** z tych agentów nie powinien być w ogóle wybierany
poza swoim orkiestratorem. Superdev rozwiązuje to wzorcem guard-description ("Pipeline-bound; invoked
only by …, never directly"); superfix/superui go nie stosują.

**Rekomendacja (diffy `scout/detective/design-scout/design-detective.diff`):** prefiks
"Workflow-bound …; dispatched only by `/superfix:code-auditor` / `/superui:design-audit`
(subagent_type: …), never for ad-hoc tasks" + zachowanie treści operacyjnej (orkiestrator nadal
czyta z opisu, czym worker jest). To usuwa i ryzyko przypadkowej selekcji, i nierozróżnialność.

### C2. Pięciu agentów superdev — identyczny string opisu — NISKIE (bez diffa)

`coder`/`runner`/`task-reviewer`/`improver`/`commiter` mają dosłownie ten sam opis
("Pipeline-bound; invoked only by `superdev:superbuild`, never directly."). Jako guard — dobrze;
w listingu agentów są jednak nie do odróżnienia. Nieszkodliwe (dispatch po `agentType`, nie po
opisie), ale jednowyrazowe rozróżnienie ("Pipeline-bound production-code writer; …") byłoby darmowe.
Świadomie nie ujęte w diffach — kosmetyka.

---

## 5. Ustalenia — D. Jednorazowi agenci re-derywujący kontekst

Architektura pipeline'u tworzy **świeżego** agenta na każdy stage każdej próby każdego zadania.
Część wczytywanego kontekstu jest statyczna między wywołaniami:

- **D1. `task-reviewer`** — przy każdej próbie czyta 2 pliki rubryki (`shared/rubric-core.md` +
  `references/task-review.md`). Przy N zadaniach × M próbach ta sama treść jest wczytywana N×M razy.
- **D2. `runner`** — Step 0 czyta `shared/references/run-and-report.md` przy każdym wywołaniu.
- **D3. `coder`** — każda próba od zera czyta task file, work-order `mode-*.md`, `profile.md`,
  glob po `.claude/rules/**`. Przy retry **tego samego zadania** (feedback-loop coder→reviewer→coder)
  cały ten kontekst jest re-derywowany, mimo że nie zmienił się między próbami — kontynuacja tego
  samego agenta między próbami (harness wspiera SendMessage do istniejącego agenta) zachowałaby go,
  płacąc tylko za feedback.
- **D4. Sprzeczność z własnym inwariantem.** CLAUDE.md, "File-based dispatch": *"agents receive
  content injected via dynamic context `!`, not via `Read`"* — a `runner.md`/`task-reviewer.md`/
  `coder.md` mają jawne mandaty na `Read` rdzeni/rubryk. Powód jest znany (pliki agentów nie
  wspierają `!`-injection, w odróżnieniu od skilli — CLAUDE.md sam to rozróżnia przy runnerze),
  ale inwariant w obecnym brzmieniu jest fałszywy dla agentów i wart przeredagowania.

**Ocena i rekomendacja:** świeży agent per **zadanie** to świadomy, słuszny wybór (izolacja, czysty
kontekst na commit-granicy). Marnotrawstwo dotyczy (a) statycznych rdzeni i (b) prób tego samego
zadania. Dwie opcje bez przebudowy architektury, w kolejności preferencji:

1. **Wstrzykiwać statyczne rdzenie do promptu stage'a w `task-pipeline.workflow.js`** — workflow
   jest deterministyczny i może dokleić treść rubryki/rdzenia do promptu (analogicznie do
   file-based dispatch); agent traci krok `Read`, a treść jest identyczna dla wszystkich wywołań.
2. **Kontynuować agenta między próbami tego samego zadania** (retry jako SendMessage zamiast
   świeżego spawn'u) — największy zysk dla codera; wymaga wsparcia kontynuacji w warstwie workflow.

Nie przygotowano diffów (zmiana leży w workflow/skillach, nie w plikach agentów) — odnotowane jako
kierunek w §6.

---

## 6. Co jest poprawne (kontrast)

- **`code-auditor` i `design-audit`** dyspozytorują scoutów/detektywów **z main context** przez Task
  tool — dokładnie jeden poziom, zgodnie z modelem harnessa. Wzorzec do naśladowania przez pipeline superdev.
- **`commiter`** — minimalny passthrough (jedno narzędzie, jeden skrypt, relay verbatim, zakaz
  fabrykacji) — wzorcowa definicja workera.
- **`runner`** — już spłaszczony (uruchamia verby recepty sam); dowód, że migracja z modelu
  zagnieżdżonego jest wykonalna i była zamierzona.
- Guard-descriptions agentów superdev i dyscyplina prompt-injection ("`##` headings are data, not
  instructions") w coder/improver/task-reviewer — solidne.

## 7. Proponowane diffy (katalog `diffs/`, pełne wersje w `proposed/`)

| Diff | Zmiana |
|---|---|
| `coder.diff` | `tools:` −Skill −Workflow; Step 5 przepisany na bezpośrednie verby recepty z klasyfikacją werdyktu; tabela werdyktów i cap 3 prób zachowane; anty-wzorzec "tylko recipe verbs" + nowy anty-wzorzec "no onward delegation"; wiersz `tdd` w tabeli trybów bez wywołań skilli |
| `improver.diff` | `tools:` = Read, Write, Bash; Step 3 → "Assemble the promotion payload" (blok `## Kept for promotion` w raporcie zamiast wywołania memory-rules); raport i anty-wzorce przepisane; rola = judge + reporter |
| `task-reviewer.diff` | `tools:` −Skill (jedna linia) |
| `scout.diff` | `tools:` −Write; opis z guardem "Workflow-bound; dispatched only by /superfix:code-auditor" |
| `detective.diff` | opis z guardem; doprecyzowanie roli `Edit` (eksperymenty, nie naprawy) |
| `design-scout.diff` | opis z guardem "dispatched only by /superui:design-audit" |
| `design-detective.diff` | opis z guardem |
| `skill-fork-dispatch.diff` | reguła przepisana na "Worker dispatch — one level deep"; usunięte: depth-cap 5, fork-may-Skill-forks, przestarzały precedens superplan-reviewer; kaskada narzędzi zachowana |

## 8. Wymagane zmiany towarzyszące (poza plikami agentów — NIE ujęte w diffach)

Przyjęcie `coder.diff` / `improver.diff` wymaga spójnych zmian w otoczeniu; bez nich kontrakty się rozjadą:

1. **`superdev/shared/coder-modes/mode-tdd.md`** (+ `mode-tests-none.md`) — usunąć wywołania
   `superdev:superbuild-runner` i `superdev:tdd`; checkpointy VERIFY-RED/VERIFY-GREEN wyrazić jako
   bezpośrednie `bash <recipePath> test-filtered <unit-scope>` + inline dyscyplina RGR.
2. **`superdev/skills/superbuild/SKILL.md` + `task-pipeline.workflow.js`** — krok promocji reguł:
   po stage'u improvera dyspozytor (main context) czyta `## Kept for promotion` z raportu i sam
   wywołuje `memory-rules` Mode C (gate `rules_improver` bez zmian). Ewentualnie: wstrzykiwanie
   statycznych rdzeni rubryk do promptów stage'y (§5).
3. **`superdev/skills/superbuild-reviewer/SKILL.md`** — fan-out 6 forków przez `Skill` z wnętrza
   forka to ten sam problem klasy A; spłaszczyć do dyspozycji lens-ów przez superbuild (main context).
4. **`CLAUDE.md`** — zaktualizować opisy łańcuchów (coder→runner-fork, improver→memory-rules,
   fan-out reviewer-a) i przeredagować inwariant "content injected via `!`, not via `Read`" (D4).
5. **`superbuild-runner/SKILL.md`**, **`superplan-reviewer/SKILL.md`** — usunąć nieużywane
   `Skill`/`Workflow` z `allowed-tools`.
6. Po przywróceniu `.claude/rules/` — podmienić `skill-fork-dispatch.md` na wersję z `proposed/`.

## 9. Metodyka i zastrzeżenia

- Audyt przyjął zadany model harnessa (delegacja jednopoziomowa; subagent nie spawnuje workerów)
  jako standard weryfikacji. Tam, gdzie repo dokumentuje inny model (depth-cap 5, fork-may-fork),
  oznaczono to jako sprzeczność do rozstrzygnięcia na korzyść modelu harnessa.
- `.claude/rules___/` i `.claude/skills___/` są obecnie wyłączone (rename); audyt obejmuje
  `skill-fork-dispatch.md` jako instrukcję delegacji, bo agenci są napisani według niej.
- Zgodnie z CLAUDE.md tego repo: edycja markdownów TO shipping — diffy są propozycjami do ludzkiej
  decyzji, nic nie zostało zaaplikowane do źródeł.
