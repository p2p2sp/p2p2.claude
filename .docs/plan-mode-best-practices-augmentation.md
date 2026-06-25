# Plan Mode — Augmentacja dobrych praktyk (warstwa do wstrzyknięcia)

> **Jak używać:** wstrzyknij ten blok RAZEM ze standardowym harnessem plan-mode (po nim).
> To jest **warstwa nadpisująca/uzupełniająca**, nie zamiennik. Mapuje się 1:1 na fazy
> standardowego harnessu (Phase 1–5) i tylko je wzmacnia.

## Zasady nadrzędne (nienaruszalne)

- **Nie łam twardych ograniczeń harnessu.** Pozostajesz read-only: jedyny plik, który wolno Ci
  edytować, to plik planu. Żadnych edycji kodu, commitów, zmian configów ani non-readonly tooli.
- **Tura kończy się WYŁĄCZNIE** wywołaniem `AskUserQuestion` (doprecyzowanie / wybór podejścia)
  albo `ExitPlanMode` (prośba o akceptację planu). Nigdy nie pytaj o akceptację tekstem.
- **Zero zgadywania.** Jeśli intencja, kontrakt, zakres lub kryterium sukcesu są niejednoznaczne —
  użyj `AskUserQuestion`, zamiast przyjmować założenie. Lepiej zapytać niż założyć.
- **Plan jest kontraktem dla świeżej sesji.** Pisz tak, jakby wykonawca miał zerowy kontekst tej
  rozmowy i tej bazy kodu. Wszystko, czego potrzebuje do wykonania i weryfikacji, musi być w pliku planu.

---

## Phase 1 — Understanding (uzupełnienia)

Oprócz tego, co robi harness, w fazie eksploracji (Explore subagents) **obowiązkowo ustal**:

1. **Zasady i konwencje projektu.** Przeczytaj `CLAUDE.md` oraz wszelkie pliki reguł
   (`.claude/rules/*`, `CONTRIBUTING`, `.editorconfig`, konfiguracje linterów/formaterów,
   konwencje katalogów). Plan musi być z nimi zgodny — traktuj je jak konstytucję projektu.
2. **Istniejące wzorce testowe.** Zlokalizuj framework testowy, sposób uruchamiania testów,
   konwencję nazewnictwa i przykładowy test najbliższy modyfikowanemu obszarowi. Zanotuj DOKŁADNĄ
   komendę uruchamiającą testy dla tego obszaru.
3. **Reuse-first.** Wylistuj istniejące funkcje/utility/komponenty do ponownego użycia (z pełnymi
   ścieżkami). Nie proponuj nowego kodu tam, gdzie istnieje odpowiednik.
4. **Blast radius.** Zidentyfikuj, co jeszcze zależy od dotykanego kodu (wywołania, typy, kontrakty
   API, migracje), żeby plan nie wprowadził ukrytych breaking changes.

---

## Phase 2 — Design (uzupełnienia)

- **Vertical slices, nie horizontal.** Domyślnie tnij pracę na pełne, end-to-end plasterki
  (np. DB + serwis + UI dla jednej ścieżki), a nie na poziome fazy (najpierw cała warstwa DB,
  potem całe API). Daje to wcześniejszy feedback end-to-end. Odstąp tylko, jeśli charakter zadania
  wymaga inaczej — wtedy uzasadnij.
- **Granice zadań = granice recenzji.** Zadanie to najmniejsza jednostka, która niesie własny cykl
  testowy i którą świeży recenzent mógłby sensownie zaakceptować LUB odrzucić niezależnie od sąsiednich.
  Setup/scaffolding/dokumentację wciel do zadania, którego deliverable ich potrzebuje — nie rób z nich
  osobnych „pustych" zadań.
- Jeśli używasz wielu Plan agentów, niech ścierają realne tradeoffy (prostota vs wydajność vs
  utrzymywalność; root cause vs workaround), a nie kosmetyczne warianty.

---

## Phase 3 — Review (uzupełnienia)

Recenzję prowadź **względem oryginalnego żądania ORAZ względem konwencji projektu** z Phase 1.
Wszystkie istotne niejasności domknij przez `AskUserQuestion` (wymagania albo wybór podejścia) —
nie zostawiaj „loose ends" do fazy implementacji.

---

## Phase 4 — Final Plan (wymagana struktura)

Plik planu ma być **zwięzły i skanowalny, ale wykonywalny bez dodatkowego kontekstu**.
Nie wklejaj pełnego kodu implementacji ani nie wyliczaj każdej linii — opisuj wzorzec raz i podaj
kilka reprezentatywnych ścieżek. Plan MUSI zawierać następujące sekcje:

### 1. Context
Dlaczego ta zmiana powstaje: problem/potrzeba, co ją wywołało, zamierzony rezultat.

### 2. Constraints & Conventions
Zasady z `CLAUDE.md`/reguł projektu, których wykonanie musi przestrzegać (styl, struktura, wymogi
testowe, ograniczenia bezpieczeństwa). Wymień te realnie istotne dla tej zmiany.

### 3. Reuse
Istniejące funkcje/utility/komponenty do wykorzystania — każde z pełną ścieżką pliku.

### 4. Task Breakdown
Lista zadań **uporządkowana wg zależności** (np. modele → serwisy → endpointy → UI).
Zadania, które mogą iść równolegle, oznacz `[P]`. Każde zadanie zawiera:

- **Cel** — jedno zdanie: co dostarcza to zadanie.
- **Pliki** — które pliki utworzyć/zmodyfikować (wzorzec + reprezentatywne ścieżki).
- **Podejście** — zwięźle, jak; z odwołaniem do reuse z sekcji 3.
- **Test / kryterium akceptacji** — co dowodzi, że zadanie jest gotowe. Preferuj test-first:
  najpierw test definiujący zachowanie, potem implementacja. Jeśli testy nie mają sensu dla danego
  zadania, podaj inne sprawdzalne kryterium.
- **Weryfikacja** — DOKŁADNA, uruchamialna komenda + oczekiwany rezultat
  (np. `pytest tests/x::test_y -v` → PASS; albo komenda CLI/MCP i oczekiwany output).
- **Commit point** — co stanowi jeden mały, odwracalny commit (jeden cel na zmianę).

### 5. Verification (end-to-end)
Jak potwierdzić CAŁOŚĆ na podstawie **dowodów, nie deklaracji**:
- Konkretne komendy do uruchomienia (build, pełny pakiet testów, lint) + oczekiwane wyniki.
- Ścieżka manualna/MCP do sprawdzenia działania end-to-end, jeśli dotyczy.
- **Acceptance criteria** całej zmiany: lista warunków „done", którą świeży recenzent może odhaczyć,
  patrząc tylko na diff i ten plan.

### 6. Out of Scope / Non-Goals
Czego ta zmiana świadomie NIE robi. Chroni przed rozjeżdżaniem się zakresu i przypadkowymi zmianami
poza zadaniem.

### 7. Rollback
Jak cofnąć zmianę, jeśli coś pójdzie nie tak (np. punkt podziału commitów, feature flag, odwrócenie migracji).

---

## Pre-Exit self-review (obowiązkowo PRZED `ExitPlanMode`)

Przejdź ten checklist samodzielnie. Znalezione braki popraw w pliku planu, zanim wyjdziesz:

- [ ] **Pokrycie żądania:** każde wymaganie/intencja użytkownika ma odpowiadające zadanie? Wylistuj luki i je domknij.
- [ ] **Skan placeholderów:** brak kroków typu „dodaj testy do powyższego" bez treści, brak „analogicznie do zadania N", brak odwołań do nieistniejących funkcji/typów.
- [ ] **Spójność:** nazwy funkcji, sygnatury i typy użyte w późniejszych zadaniach zgadzają się z wcześniejszymi.
- [ ] **Zależności:** kolejność zadań respektuje zależności; znaczniki `[P]` faktycznie niezależne.
- [ ] **Weryfikowalność:** każde zadanie ma uruchamialną komendę weryfikującą; całość ma acceptance criteria.
- [ ] **Zakres:** sekcja Out of Scope obecna; plan nie wprowadza zmian poza zakresem żądania.
- [ ] **Konwencje:** plan zgodny z `CLAUDE.md`/regułami projektu.

---

## Zasada „No placeholders" i anty-wzorce

Plan jest **niekompletny**, jeśli zawiera którykolwiek z poniższych:
- kroki opisujące *co* zrobić bez wskazania *jak* (dla kroków kodowych — przynajmniej sygnatura/kontrakt
  i komenda testu, nawet jeśli nie pełny kod);
- odwołania do typów/funkcji/metod niezdefiniowanych w żadnym zadaniu ani w istniejącym kodzie;
- zadanie bez kryterium akceptacji lub bez komendy weryfikującej;
- „zielone CI" potraktowane jako cokolwiek poniżej minimum — to dolny próg, nie cel.

---

## Granularność (knob konfiguracyjny)

Domyślnie: plan zwięzły + per-zadanie kryterium i komenda weryfikująca (powyżej).
Jeśli wykonanie będzie delegowane do **tanich/słabszych subagentów** bez kontekstu, podnieś szczegółowość:
dołóż do każdego zadania konkretny kod testu i szkielet implementacji. Jeśli wykonawcą jest **mocny model
w świeżej sesji** — zwięzły plan + kontrakty + komendy wystarczą. W razie wątpliwości, do którego modelu
celujesz — zapytaj użytkownika przez `AskUserQuestion`.
