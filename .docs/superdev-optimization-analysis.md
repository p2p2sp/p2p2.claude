# Analiza optymalizacyjna pluginu `superdev`

> Data: 2026-06-27 · Zakres: szybkość działania, zużycie tokenów, treść skills/agents/references, wykorzystanie aktualnych możliwości harnesu Claude Code.
> Charakter dokumentu: analiza i propozycje (nie wdrożenie).

## 1. Punkt wyjścia — co już jest zrobione dobrze

Plugin jest architektonicznie dojrzały. Poniższe wzorce realizują już większość „oczywistych" optymalizacji, więc nie są przedmiotem propozycji:

- **Deterministyczna pętla per-task** w `skills/orchestrator/scripts/task-pipeline.workflow.js` — pętla retry/BLOCKED/loop-guard nie jest już interpretowana przez Opusa co turę, tylko wykonuje się jako JS. Największa pojedyncza oszczędność tokenów w pipeline.
- **Dispatch przez ścieżki plików** — agenci dostają ścieżki, nie wklejoną treść; raporty żyją na dysku, dispatcher czyta tylko strukturalny return `{status, attempts, lastFailureReportPath, outputTokens, commit?}`.
- **Częściowy routing modeli**: `runner`/`commiter` = haiku, `improver` = sonnet, `coder`/`task-reviewer`/`decomposer` = opus, `orchestrator` = opus **effort: low** (słusznie — to cienki dyspozytor).
- **`context: fork`** wszędzie gdzie trzeba; **`!`-injection** do preloadu configu i listingu reguł; **mode-router** `route.sh` w `memory-rules` (jeden playbook do kontekstu zamiast czterech).
- **Schema `VERDICT`** w workflow + **`budget.spent()`** do metryki — nowe możliwości harnesu już użyte.
- **Skrypty self-verifying** (`commit-task.sh`, `recipe.sh`) z kontraktem trust-without-recheck.

Optymalizacje poniżej dotyczą warstwy, która została: **rozmiar ciał skills (ładowane per-fork, czasem wielokrotnie), duplikacja treści, dostrojenie modeli/effort oraz dwa miejsca, gdzie da się pójść za istniejącym wzorcem Workflow**.

---

## 2. Najwyższy priorytet — koszt mnożony przez liczbę uruchomień

Pozycje, których ciało ładuje się **wielokrotnie w jednym przebiegu planu** (każda próba coder/reviewer) albo **co sesję w każdym projekcie**. Oszczędność tokenów jest tu mnożona.

### 2.1. Redundancja Steps ↔ Self-check ↔ Anti-patterns w dużych skillach
Najbardziej kosztowny wzorzec w pluginie. W `coder.md` (2757 słów), `agent-decomposer/SKILL.md` (5932 słów) i `task-reviewer.md` (1842 + rubryka 2182) te same reguły podane są **trzy razy**: raz jako krok, raz w `## Step 6/8 — Self-check`, raz w `# Anti-patterns`.

- `coder.md`: zakaz edycji poza `## Touches` w Step 4, Step 6 i jako anti-pattern; cap 3 wywołań gate'u w Step 5, Step 6 i anti-patterns; „verify-before-revert" w Step 3, Step 6 i anti-patterns.
- `agent-decomposer`: doktryna „tdd-baseline / ambiguity→tdd / binding-floor" w Step 4a, w Step 8 self-check i w anti-patterns.
- Narusza własną regułę repo `.claude/rules/_skills.md` („Write for retrieval, not completeness… Remove mercilessly").

**Propozycja:** zostawić każdą regułę w **jednym** miejscu (kroku); Self-check zredukować do krótkiej listy kontrolnej odsyłającej do kroków; anti-patterns ograniczyć do reguł niewyrażalnych jako krok pozytywny. Szacunkowo −25–35% ciała `coder`/`decomposer`/`task-reviewer`. `coder` i `task-reviewer` ładują się **raz na próbę** (przy retry — kilka razy/zadanie), więc zysk jest mnożony.

### 2.2. Potrójne lustro rubryki
`shared/rubric.md` ↔ `skills/orchestrator/agents/rubric-task-review.md` ↔ `shared/rubric-code-review.md` są **świadomie zduplikowane** (komentarze `MIRROR` w `rubric-task-review.md:3-10` to potwierdzają), bez żadnego lintera wyłapującego drift. Koszt utrzymania **i** tokenów (cztery lensy final-review każdy czyta `rubric-code-review.md` w równoległych forkach).

**Propozycja:** wydzielić sekcje stabilne (How to read Deliverable, per-Mode test rules, test anti-patterns, convention checks) do jednego `shared/rubric-core.md` i odsyłać do niego; w plikach pochodnych trzymać **tylko** różnice (severity buckets / PASS-FAIL mapping per wariant). Usuwa lustro u źródła.

### 2.3. Manifest — koszt co sesję, w każdym projekcie konsumenta
`hooks/content/manifest.md` (736 słów) jest wstrzykiwany **verbatim na starcie każdej sesji**, w każdym repo z superdev — najczęściej płacona pozycja. Tabela „These thoughts mean STOP" (13 wierszy prozy) + rozbudowany decision-flow to duża, stała narzucona objętość. Dodatkowo superui i supergh wstrzykują analogiczne tabele, więc użytkownik płaci ten wzorzec 3×/sesję.

- Ironia: manifest łamie własną regułę repo `_skills.md` („Do not use excessive formatting. Do not use italics, tables — clean text, bullets is enough").

**Propozycja (ostrożnie — behavior-critical):** skondensować tabelę 13-wierszową do ~5 wysokosygnałowych punktów i skrócić decision-flow. Jedyna pozycja oznaczona jako **wymaga walidacji** — należy zmierzyć, czy skrócenie nie pogarsza triggerowania skili. Reszta propozycji jest bezpieczna.

---

## 3. Duplikacja między skillami (DRY) — oszczędność per-run

### 3.1. Cztery audytory final-review dzielą ~90% boilerplate'u
`agent-architecture-auditor`, `agent-code-quality-auditor`, `agent-production-readiness-auditor`, `agent-testing-auditor` mają **identyczne**: blok „Input contract" (ARGUMENTS/Diff file), kroki 1–6, „Output format", „Constraint — technology-agnostic". Różni się tylko nazwa wymiaru w kroku 2.

**Propozycja:** wspólny `shared/auditor-contract.md` (input + kroki + output + constraint); każdy audytor to ~6 linii: frontmatter + „Twój wymiar: X — zastosuj rubrykę i wspólny kontrakt". Szacunek: ~1500 tokenów/przebieg final-review. Idealny kandydat na injection w stylu `route.sh`.

### 3.2. Szablon planu wstawiony dwa razy
`superplan/SKILL.md` zawiera pełny szablon §0–§10 w ciele **oraz** w `templates/plan.md`, a tekst każe „skopiować z templates/plan.md verbatim". ~1200 tokenów martwej duplikacji. → Usunąć z ciała, zostawić jedno źródło + wskaźnik.

### 3.3. Boilerplate w trzech reviewerach planu
`superplan-reviewer` / `-integrity` / `-codebase` powtarzają verbatim blok „Plan (pre-injected)" (~14 linii ×2) i wyjaśnienie parsowania `$ARGUMENTS` (×3). → `references/plan-injection-contract.md` współdzielony. ~300 tokenów/przebieg review.

---

## 4. Dostrojenie modeli i `effort` (szybkość + koszt)

| Worker | Teraz | Propozycja | Uzasadnienie |
|---|---|---|---|
| `agent-architecture-auditor` | opus / high | rozważyć sonnet | Robi ten sam bounded-diff review co production/testing-auditor, które **już** są na sonnet. Niespójność. |
| `agent-code-quality-auditor` | opus / high | rozważyć sonnet | jw. — review patcha o ograniczonym zakresie, nie głębokie rozumowanie |
| `agent-final-reviewer` | opus / high | rozważyć sonnet/high | Rola to **synteza** 6 werdyktów + reguły severity — mechaniczna; patrz §5.1 |
| `agent-production-readiness-auditor`, `agent-testing-auditor` | sonnet / high | rozważyć effort: medium | Tylko zmienione hunki; równoległe; medium przyspieszy |
| skille bez `model:` (`tdd`, `debug`, `memory-layers`, `spec-writer`) | brak | dodać jawnie `model`/`effort` | brak = dziedziczenie sesji (często opus); jawny tańszy model dla mechanicznych skili |

Uwaga: zmiany modelu w audytorach to hipoteza do zwalidowania na realnym diffie — nie zmieniać „w ciemno" wszystkich naraz.

---

## 5. Wykorzystanie możliwości harnesu, których plugin jeszcze nie używa

### 5.1. Final-review jako `Workflow` (najsilniejsza propozycja, spójna z istniejącym wzorcem)
Per-task loop został już przeniesiony z interpretacji LLM do `task-pipeline.workflow.js` — i to był słuszny ruch. **Final-review ma tę samą charakterystykę**: `agent-final-reviewer` (fork na opus) ręcznie fan-outuje 6 lensów przez `Skill`, zbiera werdykty i stosuje reguły severity. To orkiestracja deterministyczna przebrana za rozumowanie LLM.

**Propozycja:** `final-review.workflow.js` analogiczny do task-pipeline:
- `parallel()` 6 lensów zamiast forka-orkiestratora na opus → eliminuje koszt rozumowania samego `agent-final-reviewer`;
- per-lens `model`/`effort`/`schema` (jak `VERDICT` w task-pipeline);
- deterministyczna synteza severity w JS.

Usuwa cały opusowy fork-orkiestrator i czyni dispatch przewidywalnym. Najlepszy stosunek zysk/ryzyko — idzie po już zaakceptowanym w repo wzorcu.

### 5.2. `superplan-reviewer` jako `Workflow`
Ten sam kształt (dispatch 2 lensów + synteza), mniejszy payoff (2 zamiast 6). Drugi kandydat, jeśli §5.1 się sprawdzi.

### 5.3. Injection wymiaru rubryki skryptem zamiast czytania pełnej rubryki
Cztery audytory czytają **całą** `rubric-code-review.md` i same wybierają swój wymiar — LLM-branching na czymś deterministycznym. Wzorzec `route.sh` z `memory-rules` już to rozwiązuje gdzie indziej: skrypt `!`-wstrzykuje tylko właściwą sekcję. → mniej kontekstu/lens, gwarantowana właściwa sekcja.

### 5.4. Drobne
- `memory-rules` — opis we frontmatterze ~1400 znaków z podwójnym „Do NOT use…"; skrócić do ~400.
- `spec-writer`, `tdd`, `memory-layers` — brak `context: fork` mimo samodzielnej, niezanieczyszczającej pracy; dodać dla izolacji kontekstu.
- Proza→bullety (reguła `_skills.md`) w `superdev/SKILL.md`, `help-writer` (sekcja Workflow), `superplan`.

---

## 6. Szybkość wykonania (wall-clock), nie tylko tokeny

- **`agent-recipe` uruchamia pełny `test-all` (i build/lint/launch) w verify-before-claim** na drzewie bazowym, na starcie każdego przebiegu. Na dużym repo to minuty zanim cokolwiek się zacznie. Cel recipe to udowodnić, że **werb się rozwiązuje i rusza**, nie że suite jest zielony (czerwony suite = PASS wg jego własnych reguł). **Opcja:** sondować rozwiązywalność tańszym wywołaniem (`test-filtered` ze wzorcem bez dopasowań) zamiast pełnego `test-all`. Kompromis: słabszy dowód „test-all faktycznie rusza" w zamian za szybki start. Do decyzji właściciela.
- **Pełny suite biegnie dwa razy na przebieg**: raz w recipe verify (baza), raz w final-review `Scope: full` (HEAD). Oba legalne (różne stany drzewa), ale warto to mieć świadomie — jeśli pkt 1 zostanie przyjęty, redukuje się do jednego pełnego biegu.
- **Forki serialne recipe→adr→decompose** — każdy to spin-up forka; nie do zrównoleglenia (zależności danych), ale ADR jest config-gated i zwykle pominięty, więc OK.

---

## 7. Kandydaci do uproszczenia (redukcja złożoności = redukcja tokenów i utrzymania)

- **Metryka `outputTokens`** (machineria `budget.spent()` w workflow + akumulacja w dispatcherze + warunkowy `metered` w closing summary) to spora złożoność dla metryki *wyłącznie wyświetlanej*. Rozważyć usunięcie/uproszczenie.
- **Anti-patterns widgetu** w `orchestrator/SKILL.md` (≈20 gęstych bulletów obronnych, m.in. cały akapit o „stale task list reminder") — można skondensować; ciało orchestratora to 4166 słów ładowane do dispatchera co przebieg.

---

## 8. Podsumowanie priorytetów

| # | Optymalizacja | Typ zysku | Wysiłek | Ryzyko |
|---|---|---|---|---|
| 2.1 | Usunąć potrójne Steps↔Self-check↔Anti-patterns w `coder`/`decomposer`/`task-reviewer` | Tokeny ×mnożone | Średni | Niskie |
| 5.1 | Final-review → `Workflow` (fan-out 6 lensów + synteza w JS) | Tokeny + szybkość | Wysoki | Średnie |
| 3.1 | Wspólny kontrakt 4 audytorów (`shared/auditor-contract.md`) | ~1500 tok/review | Średni | Niskie |
| 2.2 | Wydzielić `rubric-core.md`, usunąć potrójne lustro | Tokeny + utrzymanie | Średni | Niskie |
| 3.2 | Usunąć zdublowany szablon planu w `superplan` | ~1200 tok | Niski | Niskie |
| 4 | Dostroić modele audytorów + `effort` | Koszt + szybkość | Niski | Średnie (walidować) |
| 5.3 | Injection wymiaru rubryki skryptem (wzorzec `route.sh`) | Tokeny/lens | Średni | Niskie |
| 3.3 | Współdzielony plan-injection dla 3 reviewerów | ~300 tok | Niski | Niskie |
| 2.3 | Skondensować manifest (tabela STOP) | Tokeny ×co sesja | Niski | **Wymaga walidacji** |
| 6 | Sondowanie recipe zamiast pełnego `test-all` | Szybkość startu | Niski | Średnie (osłabia gwarancję) |

**Rekomendacja kolejności:** zacząć od 2.1 + 3.1 + 3.2 (czyste DRY/redukcja, niskie ryzyko, natychmiastowy zysk per-run), potem 2.2/5.3 (rubryka), następnie 5.1 jako większy, ale architektonicznie spójny ruch. Manifest (2.3) i recipe (6) — na końcu, z pomiarem.

---

## Załącznik — metoda i źródła analizy

- Inwentarz: 84 pliki źródłowe pluginu (skills/agents/hooks/scripts/references) z licznikami linii/słów.
- Przeczytane bezpośrednio: manifest + hooki, `orchestrator/SKILL.md` + `task-pipeline.workflow.js`, agenci `coder`/`task-reviewer`/`improver`/`commiter`, `agent-decomposer`/`agent-recipe`/`agent-runner`, referencje `retry-policy`/`status-parsing`/`rubric-task-review`, `plugin.json`.
- Klastry zaudytowane przez równoległe agenty: final-review (4 audytory + final-reviewer + rubryki), memory/doc/spec/tdd/debug/setup, planowanie (superdev/superplan/3 reviewery).
- Możliwości harnesu zweryfikowane przez `claude-code-guide` (skills frontmatter, subagenty, hooki, Workflow/`pipeline`/`parallel`, routing modeli + `effort`, prompt caching, deferred tools). Konkretne wartości liczbowe limitów harnesu należy potwierdzić przed wdrożeniem; mechanizmy (model/effort/fork/`!`-injection/references/Workflow/schema/budget) są pewne i potwierdzone w regułach repo (`_skills.md`, `_skill-script-routing.md`, `skill-fork-dispatch.md`).
