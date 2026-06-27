# supergh — analiza optymalizacyjna

Data: 2026-06-27
Zakres: plugin `supergh` (skills, agents, references, hooks, manifest) — optymalizacja pod kątem szybkości, zużycia tokenów i jakości treści, z wykorzystaniem aktualnych możliwości harnesu Claude Code (stan: czerwiec 2026).

---

## 1. Streszczenie wykonawcze

`supergh` jest zaprojektowany solidnie i już dziś stosuje kilka mocnych wzorców oszczędnościowych: forki (`agent-committer`, `cli-executor`) trzymają surowy JSON / diff poza głównym kontekstem i zwracają jedną otagowaną linię; `commit` używa deterministycznego `route.sh` zamiast rozgałęzień LLM; referencje `cli` ładują się leniwie (`Read` na żądanie); model/effort są ustawiane per skill (`haiku` dla committera, `sonnet` dla executora, `effort: low/medium`). Wykorzystanie natywnego `gh` zamiast serwera MCP to również optymalny wybór (zero narzutu na listę narzędzi).

Największe rezerwy:

1. **Latencja preconditions** — `create-issue`, `create-pr` i `cli-executor` wykonują 2–5 sekwencyjnych wywołań `gh`/`git` na starcie. Można je zastąpić jednym `!`-wstrzykniętym skryptem preflight (wzorzec `superui/shared/scripts/check_python.sh`).
2. **Brak deterministycznego skryptu dla slugify + body-path** — algorytm slugify (7 kroków, transliteracja PL) jest opisany prozą i **zduplikowany** w `create-issue` i `create-pr`. To podręcznikowy przypadek na bundled script (zgodnie z regułą „Use Scripts whenever possible").
3. **Rozmiar i redundancja `create-issue` / `create-pr`** — 229 i 230 linii (~17 KB / ~19 KB). Ładują się do głównego kontekstu i tam zostają na całą sesję. Sekcje „Contents", duplikowane „Safety rules" i powtórzenia kroków to realny, stały koszt tokenów.
4. **Always-on koszt opisów** — opisy 5 model-routowalnych skills (~5 KB) ładują się co sesję do kontekstu routingu. Zawierają boilerplate do przycięcia.
5. **Sekcje „Sources" w referencjach `cli`** — listy URL-i (po ~6–10 linii × 8 plików) mają niewielką wartość runtime dla LLM, a doliczają się przy każdym `Read`.

Szacowane oszczędności: ~750–1000 tokenów always-on/sesję, ~2000 tokenów on-invoke przy użyciu create-issue+create-pr, oraz redukcja 4–6 round-tripów narzędzi na każdym uruchomieniu create-pr.

---

## 2. Inwentarz i mapa kosztów

### 2.1 Rozmiary plików (linie / słowa / znaki)

| Plik | Linie | Znaki | Kategoria kosztu |
|---|---|---|---|
| skills/create-pr/SKILL.md | 230 | 19 374 | on-invoke (główny kontekst, trwa całą sesję) |
| skills/create-issue/SKILL.md | 229 | 17 311 | on-invoke (główny kontekst, trwa całą sesję) |
| skills/cli/references/issues.md | 134 | 6 092 | on-read |
| skills/cli/references/pr-review-threads.md | 120 | 4 267 | on-read |
| skills/cli/references/pull-requests.md | 112 | 4 739 | on-read |
| skills/agent-committer/SKILL.md | 106 | 5 666 | on-invoke (fork — izolowany) |
| skills/cli/references/graphql-patterns.md | 105 | 4 887 | on-read |
| skills/cli/references/auth-and-scopes.md | 102 | 4 417 | on-read |
| skills/cli/references/projects-v2.md | 101 | 4 338 | on-read |
| skills/cli/references/sub-issues.md | 95 | 3 632 | on-read |
| hooks/scripts/session-start.sh | 94 | 4 446 | runtime hook (bash, ~50ms) |
| skills/cli/references/discussions.md | 91 | 3 055 | on-read |
| skills/create-pr/references/auto-fill.md | 73 | 6 595 | on-read |
| skills/cli-executor/SKILL.md | 60 | 5 794 | on-invoke (fork — izolowany) |
| skills/cli/SKILL.md | 56 | 5 848 | on-invoke (główny kontekst) |
| skills/create-issue/references/auto-fill.md | 38 | 2 411 | on-read |
| hooks/content/manifest.md | 25 | 1 865 | **always-on** (wstrzykiwany co sesję) |
| skills/commit/SKILL.md | 24 | 1 255 | on-invoke (główny kontekst) |
| skills/commit/references/mode-session.md | 19 | 2 197 | on-read (jedna z 3, router wybiera) |

### 2.2 Trzy klasy kosztu tokenów

- **Always-on (każda sesja, niezależnie od użycia):** manifest (1 865 znaków) + opisy frontmatter wszystkich model-routowalnych skills. Opisy: `commit` (~600), `create-issue` (~1 130), `create-pr` (~1 130), `cli` (~1 050), `cli-executor` (~990); `agent-committer` ma malutki opis (~70 — wzorowo). Razem always-on ≈ 7 KB ≈ **~1 800 tokenów/sesję**. To jest budżet, który płaci każdy host z zainstalowanym supergh, nawet jeśli nigdy nie dotknie GitHuba.
- **On-invoke:** ciało SKILL.md ładuje się przy wywołaniu i zostaje do końca sesji (lub kompakcji). Forki (`agent-committer`, `cli-executor`) są tu uprzywilejowane — ich ciało żyje w izolowanym kontekście forka i NIE obciąża głównej sesji. Główny koszt to `create-issue` + `create-pr` w głównym kontekście.
- **On-read:** referencje `cli/references/*` i `*/references/auto-fill.md` doliczają się tylko, gdy skill je `Read`-uje. To poprawny, leniwy wzorzec — koszt płacony „za użycie".

Wniosek architektoniczny: najtańsze do poprawy jest **always-on** (dotyczy każdej sesji) i **on-invoke create-issue/create-pr** (duże, trwałe ciała w głównym kontekście).

---

## 3. Rekomendacje optymalizacyjne

### A. Szybkość (latencja) — preflight przez `!`-injection

**Problem.** Sekwencyjne wywołania narzędzi na starcie skilla to round-tripy, każdy z osobnym opóźnieniem:

- `create-pr` Krok 1–2: `gh --version` → `gh auth status` → `git rev-parse --abbrev-ref HEAD` → `git rev-parse --abbrev-ref @{u}` → (dalej) `gh pr list`, `git rev-parse --verify`. To ~5 sekwencyjnych wywołań, zanim cokolwiek się wydarzy.
- `create-issue` Krok 1: `gh --version` → `gh auth status` → `Glob` szablonów.
- `cli-executor` Krok 1: `gh --version` → `gh auth status`.

**Rozwiązanie.** Wprowadzić `supergh/shared/scripts/preflight.sh` (nowy katalog `shared/`, zgodny z konwencją `superui/shared/scripts/` i `superdev/shared/scripts/`) `!`-wstrzykiwany na początku ciała skilla. Skrypt deterministycznie zbiera fakty read-only i wypisuje je w jednym bloku, np.:

```
GH_PRESENT=1
GH_AUTH=ok
BRANCH=feature/task.42-add-config
UPSTREAM=origin/feature/task.42-add-config
REPO=owner/name
```

Skill czyta wstrzyknięty blok zamiast wykonywać 2–5 wywołań. Logika STOP (np. „bieżąca gałąź to base") zostaje w skillu — preflight tylko dostarcza fakty.

Wzorce już udowodnione w repo: `superui/shared/scripts/check_python.sh` (`!`-injection preflightu), `agent-committer` (`!`git diff --cached --stat`` + `!`git rev-parse --abbrev-ref HEAD``). To rozszerzenie istniejącej praktyki, nie nowy mechanizm.

**Efekt.** create-pr: ~4–5 round-tripów → 1 wstrzyknięcie; create-issue i cli-executor: ~2 → 0 (preload). Mniej latencji, mniej tokenów na narrację wywołań, jeden wspólny punkt prawdy o auth.

**Uwaga.** `!`-injection wymaga whitelisty interpretera w `allowed-tools` (np. `Bash(sh:*)`) — `commit` już to robi dla `route.sh`. Wstrzyknięcie odpala się przy każdym ładowaniu skilla, ale preconditions i tak muszą się wykonać jako pierwsze, więc nie ma marnotrawstwa.

---

### B. Determinizm — slugify + body-path jako bundled script

**Problem.** Algorytm slugify jest opisany jako 7-krokowa procedura LLM (lowercase → transliteracja PL `ą→a…ż→z` → zamiana znaków → kolaps `-` → trim → truncate 40 z cofnięciem do `-` → fallback `untitled`) i jest **zduplikowany dosłownie** w `create-issue` (Krok 8.1) i `create-pr` (Krok 8.1). Obok niego: `date +%Y%m%d-%H%M%S` (osobne wywołanie Bash) i tworzenie katalogu.

To narusza regułę projektu „Use Scripts whenever possible" (determinizm, szybkość, brak generowania tokenów na transformację) oraz „Audit for Contradictions and Redundancy" (ta sama logika w dwóch plikach rozjedzie się przy edycji).

**Rozwiązanie.** `supergh/shared/scripts/body-path.sh "<prefix>" "<title>"` — robi w jednym wywołaniu: timestamp + slugify (z transliteracją PL) + `mkdir -p` + wypisanie gotowej ścieżki `.temp/<prefix>/<ts>-<slug>.md`. Skill wywołuje go w Kroku 8 (tytuł znany dopiero po interaktywnym przepływie, więc to wywołanie `Bash`, nie `!`-preload).

Z obu SKILL.md znika ~15 linii prozy slugify + krok z `date`. Transliteracja polskich znaków staje się deterministyczna (LLM-owy slugify z diakrytykami bywa zawodny). Wymaga dodania `Bash(sh:*)` do `allowed-tools` obu skills — spójne z wzorcem `commit`/`route.sh`; bezpieczeństwo zachowane (skrypt bundled, nie ogólny `Bash`).

**Efekt.** Mniej tokenów on-invoke w głównym kontekście (×2 skille), determinizm nazw plików, koniec duplikacji.

---

### C. Tokeny on-invoke — odchudzenie `create-issue` / `create-pr`

Oba skille żyją w **głównym** kontekście (muszą — używają `AskUserQuestion`, którego fork nie wywoła; to świadomie poprawna decyzja, patrz sekcja 5). Dlatego ich ciało zostaje w kontekście całą sesję i każdy zaoszczędzony znak liczy się wielokrotnie.

Konkretne cięcia (bez utraty precyzji instrukcji — zgodnie z „Shortening the text cannot mean less precise instructions"):

1. **Usunąć sekcję „Contents"** (spis treści, ~12 linii w każdym). To nawigacja dla człowieka; LLM jej nie potrzebuje. Reguła `_skills.md`: „Do not use excessive formatting".
2. **Skonsolidować „Safety rules"** — wiele reguł powtarza treść kroków (np. „NEVER use `--body` inline" jest w Kroku 8 i ponownie w Safety rules; „NEVER cache templates" w opisie i w Safety). Zostawić tylko delty, których nie ma w krokach. Reguła: „Remove mercilessly. Everything in a skill file has a cost."
3. **Po wdrożeniu A i B** — usunąć z ciała prozę preconditions (→ preflight) i prozę slugify/body-path (→ skrypt).
4. **`create-issue`: tabelę błędów issue-type** (Krok 8.5) rozważyć przeniesienie do `references/` (ładowana tylko gdy `frontmatter.type` istnieje i PATCH zawiedzie — rzadko). `create-pr` już przeniósł heurystyki auto-fill do referencji — ten sam wzorzec.

**Efekt.** Realistycznie 20–25% redukcji ciała każdego skilla (~1 000–1 100 tokenów on-invoke każdy), bez utraty zachowania. Treść potrzebna co uruchomienie (body format) zostaje; treść rzadka idzie do referencji; treść deterministyczna idzie do skryptu.

---

### D. Tokeny always-on — opisy frontmatter i manifest

**Opisy.** Opisy `cli`, `create-issue`, `create-pr` zawierają powtarzalny boilerplate: „Trigger applies in any language and to descriptive phrasing too." (3×), rozbudowane listy triggerów i klauzule „Do NOT use for…". Klauzule „Do NOT use" i kluczowe triggery zostawić (poprawiają trafność routingu, mniej mis-fire'ów). Przyciąć: powtarzane zdanie o językach (manifest i tak egzekwuje regułę 1%), nadmiarowe synonimy triggerów. Cel: ~20–30% krótsze opisy bez pogorszenia routingu. Oszczędność always-on ~300–400 tokenów/sesję.

**`cli` — rozważyć `disable-model-invocation: true` (kompromis).** Dziś `cli` ma `user-invocable: false`, ale pozostaje model-routowalny, więc jego długi opis (~1 050 znaków) ładuje się do kontekstu routingu **co sesję**. Realnym konsumentem tablicy decyzyjnej `cli` jest fork `cli-executor`, który i tak wkleja heurystykę warstw inline i `Read`-uje konkretne referencje samodzielnie — NIE ładuje `cli/SKILL.md`. Główna sesja routuje do `cli` tylko przy rzadkiej, nowatorskiej operacji `gh` bez dedykowanego skilla.

- Ustawienie `disable-model-invocation: true` usuwa opis `cli` z kontekstu routingu każdej sesji (~260 tokenów/sesję), kosztem utraty auto-routingu do `cli` przy nowatorskiej operacji w głównej sesji.
- Trade-off jest realny, dlatego to opcja do decyzji, nie blankietowa rekomendacja. Jeśli zostaje model-routowalny — przynajmniej przyciąć opis. (Precedens dla `disable-model-invocation` na user-only komendach: `setup`, `superfix:audit`.)

**Manifest.** `manifest.md` (1 865 znaków) jest always-on. Tabela „These thoughts mean STOP" (4 wiersze) dubluje filozofię manifestu superdev. Można ją skrócić do 2 najważniejszych wierszy. Oszczędność ~100 tokenów/sesję. Niski priorytet (manifest to celowy guardrail behawioralny).

---

### E. Tokeny on-read — sekcje „Sources" w referencjach `cli`

Każda z 8 referencji `cli` kończy się sekcją „Sources" (6–10 linii URL-i). Dla LLM w runtime te linki mają znikomą wartość (nie są pobierane), a doliczają się przy każdym `Read` referencji. Łącznie ~3 KB znaków rozproszonych po plikach.

**Opcje:**
- Usunąć „Sources" z treści referencji (zachować proweniencję np. w `CHANGELOG`/komentarzu dla maintainerów), albo
- Zostawić, jeśli proweniencja jest świadomie ceniona.

Reguła `_skills.md`: „Write for Retrieval, Not for Completeness" — listy URL są completeness-oriented. Oszczędność ~100 tokenów na każdy `Read` referencji. Niski–średni priorytet.

---

### F. Strojenie model / effort

Stan obecny jest w większości dobry; drobne korekty:

| Komponent | Dziś | Rekomendacja |
|---|---|---|
| `agent-committer` | `model: haiku` | Zostaw — wzorowe (mechaniczne authorowanie z diffa). |
| `cli-executor` | `model: sonnet` | Zostaw dla GraphQL discovery→mutation. Opcjonalnie: dla trywialnych natywnych operacji `gh` sonnet jest wystarczający; nie schodzić na haiku (rozumowanie nad warstwami/silent-200 korzysta z sonnet). |
| `commit` | `effort: low`, brak `model` | Zostaw. Override `model` w skillu głównego kontekstu zmienia model na resztę tury — ryzykowne, gdy użytkownik kontynuuje. `effort: low` to właściwa dźwignia; ciężką pracę i tak robi fork (haiku). |
| `create-issue` / `create-pr` | `effort: medium` | Zostaw — interaktywne, `medium` rozsądne. (Override `model` ryzykowny w głównym kontekście, jak wyżej.) |
| `cli` | brak | Jeśli zostaje model-routowalny, rozważ `effort: low` (skill tylko dostarcza tekst referencyjny do decyzji). |

Zasada: forki mogą agresywnie obniżać model (izolowane); skille głównego kontekstu strójcie przez `effort`, nie `model` (override modelu „przykleja się" do reszty tury).

---

## 4. Najnowsze możliwości harnesu — co warto, a co nie

| Możliwość | Werdykt dla supergh |
|---|---|
| Per-skill `model` / `effort` | **Już używane** dobrze. Drobne korekty w sekcji F. |
| `context: fork` + izolacja kontekstu | **Już używane** wzorowo (`agent-committer`, `cli-executor`) — surowy JSON/diff nie wpada do głównego kontekstu, wraca jedna otagowana linia. To poprawny wzorzec „compress at the boundary". |
| `!`-injection (dynamic context) | **Niedostatecznie używane.** Rekomendacja A i B — preflight + preload. Wzorzec już w `commit`/`agent-committer`. |
| Bundled scripts dla determinizmu | **Niedostatecznie używane.** Rekomendacja B (slugify/body-path) i A (preflight). |
| `disable-model-invocation` | Rozważyć dla `cli` (sekcja D) — kompromis routing↔tokeny. |
| Natywne `gh` zamiast serwera MCP | **Optymalny stan obecny.** `gh` jako preferowane CLI nie dolicza listy narzędzi do kontekstu (deferred/tool-search). NIE dodawać serwera GitHub MCP — byłby to regres (2–5 KB listy narzędzi). |
| Tool search / deferred tools | Korzystne „za darmo" dzięki użyciu `gh` przez `Bash`. Brak akcji. |
| Structured output | Forki już emitują jedną otagowaną linię (`STATUS: DONE …`, `✓ <hash> …`) — de facto kontrakt strukturalny parsowany przez wywołującego. Formalny structured-output dałby niewiele; niski priorytet. |
| `paths:` (ładowanie skilla wg edytowanych ścieżek) | **Nie dotyczy** — skille supergh są intencyjne (commit/issue/PR), nie path-driven. |
| Workflow tool (orkiestracja wieloetapowa) | **Nie dotyczy** — supergh nie ma pipeline'u wieloetapowego; forki + Skill wystarczają. |
| Worktree isolation / background agents | **Nie dotyczy** — operacje GitHub nie edytują równolegle plików roboczych. |

---

## 5. Czego NIE zmieniać (świadome decyzje projektowe)

- **`create-issue` / `create-pr` w głównym kontekście (nie forki).** Wymagają `AskUserQuestion` (interaktywny preview/edit loop) — fork nie może pytać użytkownika. Pozostają w głównym kontekście; optymalizujemy ich rozmiar (sekcja C), nie lokalizację.
- **`session-start.sh` z ręcznym escaperem JSON.** Deterministyczny bash, fail-open, ~50 ms, poprawny (top-level `systemMessage`, `additionalContext` tylko gdy manifest czytelny, matcher wyklucza `resume`, re-inject na `compact`). Bez zmian.
- **Forkowe kontrakty jednolinijkowe** (`cli-executor`, `agent-committer`). To już docelowa optymalizacja kontekstu — affirmacja, nie zmiana.
- **`route.sh` w `commit`.** Wzorcowy mode-router (wstrzykuje tylko wybrany `mode-*.md`, pozostałe nie wchodzą do kontekstu). Wzór do naśladowania, nie do ruszania.
- **Brak serwera MCP.** Użycie natywnego `gh` jest tańsze tokenowo niż MCP. Utrzymać.
- **`agent-committer` malutki opis** (~70 znaków, „Invoked only by `commit`, never the user"). Wzorcowo — forki pipeline-bound nie potrzebują triggerów routingu.

---

## 6. Priorytetyzacja

| # | Rekomendacja | Wpływ | Koszt wdrożenia | Klasa oszczędności |
|---|---|---|---|---|
| 1 | B. Bundled script slugify + body-path | Wysoki | Niski | determinizm + tokeny on-invoke + koniec duplikacji |
| 2 | A. Preflight `!`-injection (`shared/scripts/preflight.sh`) | Wysoki | Średni | latencja (−4–5 round-tripów/run create-pr) + tokeny |
| 3 | C. Odchudzenie create-issue/create-pr (Contents, Safety dedup) | Średni–wysoki | Niski | tokeny on-invoke (główny kontekst) |
| 4 | D. Przycięcie opisów frontmatter | Średni | Niski | tokeny always-on (każda sesja) |
| 5 | D. `cli` → `disable-model-invocation` (z trade-offem) | Średni | Niski | tokeny always-on; kompromis routingu |
| 6 | E. Usunięcie „Sources" z referencji `cli` | Niski–średni | Niski | tokeny on-read |
| 7 | F. Drobne strojenie effort/model | Niski | Niski | tokeny on-invoke |
| 8 | D. Skrócenie tabeli STOP w manifeście | Niski | Niski | tokeny always-on |

Sugerowana kolejność: 1 → 2 → 3 (te trzy dotykają tych samych dwóch plików i wzajemnie się wzmacniają: skrypty wyciągają logikę, a odchudzenie domyka cięcie), następnie 4/5 (always-on), potem 6/7/8 (porządkowe).

---

## 7. Konkretne następne kroki

1. Utworzyć `supergh/shared/scripts/` z `preflight.sh` (IN: brak / OUT: bloki `KEY=VALUE` z faktami auth+git, fail-open) oraz `body-path.sh` (IN: prefix, title / OUT: gotowa ścieżka `.temp/<prefix>/<ts>-<slug>.md`, `mkdir -p` po drodze). Każdy z nagłówkowym kontraktem `IN:`/`OUT:` i samo-weryfikacją (wzorzec `route.sh`).
2. Zaktualizować `create-issue`/`create-pr`: `!`-inject preflight na początku, wywołanie `body-path.sh` w Kroku 8, usunięcie prozy preconditions/slugify, dodanie `Bash(sh:*)` do `allowed-tools`.
3. Wpiąć preflight do `cli-executor` (Krok 1 → `!`-preload).
4. Przejść „Safety rules" obu skills i usunąć reguły dublujące kroki; usunąć sekcje „Contents".
5. Przyciąć opisy frontmatter; podjąć decyzję o `cli`/`disable-model-invocation`.
6. (Opcjonalnie) Usunąć „Sources" z `cli/references/*`.
7. Zaktualizować dokumentację kontraktów: `supergh/.claude-plugin/plugin.json` nie wymaga zmian (brak dodanych/usuniętych skills), ale dopisać nowy `shared/scripts/` w głównym `CLAUDE.md` repo (sekcja layout) zgodnie z inwariantem „Self-documentation".

---

### Uwaga metodologiczna

Każda rekomendacja opiera się na wzorcach **już obecnych i działających w tym repo** (forki, `!`-injection, mode-router, per-skill model/effort, plugin-level `shared/scripts/`), więc nie wprowadza spekulatywnych pól frontmatter. Liczby tokenowe są szacunkami (~4 znaki/token) służącymi do priorytetyzacji, nie pomiarem. Zmiany w plikach źródłowych pluginu wchodzą w życie dopiero po publikacji (commit + push do źródła marketplace, następnie `/plugin update`) — bieżąca sesja działa na zainstalowanej, zamrożonej wersji.
