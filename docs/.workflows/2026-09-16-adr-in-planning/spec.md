# Spec: ADR rozstrzygany w fazie planowania, zapisywany jako zadanie planu
Intent: docs/.workflows/2026-09-16-adr-in-planning/intent.md

## Problem / context (Why)
ADR w superdev powstaje dziś w close-oucie buildu: agent `adr-writer` czyta gotowy plan i spec i odtwarza z nich decyzje architektoniczne. W tym momencie nie ma już alternatyw ani powodów wyboru, bo szablon `intent.md` celowo ich nie zapisuje, spec niesie tylko `What & Why`, a plan tylko `How`. Efekt: ADR pisze agent, który uzasadnienia nie zna i musi je odtwarzać, powstaje po kodzie (a nie jako zapis decyzji), ma rozbudowany szablon (Context, Decisions, Rationale, Consequences) wypełniany dla każdej „istotnej” decyzji i nikt nie pyta użytkownika, czy decyzja w ogóle zasługuje na zapis. Użytkownik chce, żeby ADR wynikał z decyzji: był oceniany i szkicowany tam, gdzie decyzja zapada (wywiad `intent`), oferowany rzadko, krótki, a zapisywany jako zwykłe zadanie planu.

## Goal (What)
- Osąd „czy to zasługuje na ADR” i szkic treści padają w skillu `intent` po potwierdzeniu syntezy, wyłącznie gdy przełącznik `adr` w `.claude/superdev.yml` jest włączony, i wyłącznie dla decyzji spełniających wszystkie trzy kryteria: trudna do odwrócenia, zaskakująca bez kontekstu, wynik realnego trade-offu.
- Użytkownik akceptuje lub odrzuca każdą propozycję; zaakceptowany szkic trafia do `intent.md` w sekcji `## ADR`.
- Plan napisany z takiego intentu zaczyna się jednym zadaniem zapisującym pliki ADR; build zapisuje je do `docs/adr/<YYYY-MM-DD-HHMMSS>-<slug>.md` ze stemplem chwili zapisu.
- Wpis changelogu po buildzie nadal linkuje każdy zapisany ADR.
- Agent `adr-writer` znika z pluginu i z close-outu buildu; nowy skill `superdev:adr` jest zarejestrowany i udokumentowany.

## Out of scope
- `docs/assets/superdev-flow.svg` (ręczny diagram, nie odświeżany w tej zmianie).
- Agent historii w `intent` (dalej czyta `docs/adr/` i linki `ADR:` changelogu, bez zmian).
- `superspec` i `superspec-refine`.
- Format wpisu changelogu (`changelog-entry-format.md`) poza jednym punktem: bullet `ADR:` może wystąpić raz na każdy plik ADR zapisany w buildzie.
- Migracja istniejących ADR nazwanych stemplem `YYYYMMDDHHMMSS`.
- Usunięcie klucza `adr` z konfiguracji, `read-config.sh`, `config.yml`, `bootstrap.sh` i ich testów: klucz zostaje.

## User scenarios
1. Jako użytkownik superdev z `adr: true` chcę, żeby po potwierdzeniu syntezy w `intent` zaproponowano mi ADR tylko dla decyzji, które naprawdę na to zasługują, żeby `docs/adr/` zawierał wyłącznie decyzje, o które przyszły czytelnik faktycznie zapyta.
2. Jako użytkownik superdev chcę, żeby zaakceptowany ADR stał się pierwszym zadaniem planu, żeby decyzja została zapisana przed kodem i przeszła przez zwykły build, commit i review, bez osobnego agenta.
3. Jako przyszły czytelnik repozytorium chcę znaleźć ADR w `docs/adr/` pod nazwą ze stemplem czasu zapisu i dotrzeć do niego z wpisu changelogu, żeby zrozumieć, dlaczego coś zrobiono tak, a nie inaczej, w jednym akapicie.
4. Jako opiekun pluginu chcę, żeby po zmianie nie został żaden ślad agenta `adr-writer`, a nowy skill był zarejestrowany, udokumentowany i przechodził lint skill-designera, żeby katalog pluginu i dokumentacja zgadzały się z zachowaniem.
5. Jako użytkownik wznawiający intent lub dzielący go na fazy chcę, żeby zaakceptowany ADR nie ginął ani nie dublował się, żeby jeden ADR był zapisany dokładnie raz.

## Acceptance criteria
Scenariusz 1:
1. Trzy kryteria - przy `adr: true`, po potwierdzeniu syntezy, użytkownik otrzymuje propozycję ADR wyłącznie dla decyzji spełniających wszystkie trzy kryteria (trudna do odwrócenia, zaskakująca bez kontekstu, realny trade-off); run, w którym żadna decyzja ich nie spełnia, kończy się bez propozycji i bez sekcji `## ADR` w `intent.md`.
2. Bramka konfiguracji - przy `adr: false` lub braku `.claude/superdev.yml` żadna propozycja ADR nie pada i `intent.md` nie ma sekcji `## ADR`.
3. Kształt szkicu - każdy zaakceptowany ADR w sekcji `## ADR` pliku `intent.md` składa się obowiązkowo z nagłówka `# <krótki tytuł decyzji>` i 1-3 zdań (kontekst, decyzja, powód); frontmatter `status` występuje tylko gdy ADR zastępuje lub uchyla wcześniejszy ADR z `docs/adr/`, `Considered Options` tylko gdy wywiad ważył więcej niż jedną opcję, którą użytkownik chce zapamiętać, `Consequences` tylko gdy użytkownik wskazał w wywiadzie skutek downstream do zapamiętania; brak każdej z tych sekcji jest poprawny, a odrzucona propozycja nie zostawia w `intent.md` żadnego śladu.

Scenariusz 2:
4. Zadanie ADR w planie - plan napisany przez `simpleplan` lub `superplan` z intentu zawierającego `## ADR` zaczyna się zadaniem „Write ADR `<title>`” z `Model: sonnet`, `Effort: low`, `TDD: none`, którego `### Files` deklaruje katalog `docs/adr/` (nazwa pliku jest generowana w buildzie, więc zgodnie z regułą B1 checklisty planu deklaruje ją katalog nadrzędny z ukośnikiem), a `### Approach` niesie pełną treść każdego ADR i wzór nazwy `docs/adr/<YYYY-MM-DD-HHMMSS>-<slug>.md`; wiele ADR to wiele plików w tym jednym zadaniu.
5. Brak ADR, brak zadania - plan napisany z intentu bez sekcji `## ADR` nie zawiera zadania „Write ADR”.
6. Reviewerzy planu - `simpleplan-reviewer` i `superplan-reviewer` nie zgłaszają pełnej treści ADR w `### Approach` zadania „Write ADR” jako blokującego naruszenia reguły „no prose in Approach”.

Scenariusz 3:
7. Plik ADR - po buildzie każdy ADR z zadania istnieje pod `docs/adr/<YYYY-MM-DD-HHMMSS>-<slug>.md`, gdzie stempel to data i czas (godzina, minuty, sekundy) chwili zapisu pliku, a treść pliku jest identyczna z treścią w zadaniu planu.
8. Link w changelogu - przy `changelog: true` wpis changelogu tego buildu niesie jeden bullet `ADR: <ścieżka>` na każdy plik zapisany w buildzie pod `docs/adr/`; build, który nie zapisał tam żadnego pliku, daje wpis bez bulletu `ADR:`.

Scenariusz 4:
9. Agent usunięty - `superdev/agents/adr-writer.md` nie istnieje, a nazwa `adr-writer` nie występuje w `superdev/.claude-plugin/plugin.json`, `superbuild/SKILL.md`, `simplebuild/SKILL.md`, `superdev/README.md` ani root `CLAUDE.md`; wave 1 close-outu obu orkiestratorów wysyła wyłącznie `memory-writer` i `rules-writer`.
10. Skill zarejestrowany - `./skills/adr/` widnieje w `plugin.json` `skills[]`, skill ma wiersz w tabeli skilli `superdev/README.md` i opis w root `CLAUDE.md`, a `lint_skill.sh` skill-designera zwraca dla niego zero FAIL.
11. Konfiguracja nietknięta - `tests/superdev/read-config.test.ts` i `tests/superdev/bootstrap.test.ts` przechodzą bez zmian w treści testów, a `adr` pozostaje pierwszym kluczem w wyjściu `read-config.sh`.

Scenariusz 5:
12. Resume - wznowienie intentu bez otwierania decyzji zachowuje sekcję `## ADR` bez zmian, niezależnie od aktualnej wartości przełącznika `adr`; otwarcie decyzji przy `adr: true` ponownie poddaje ją osądowi trzech kryteriów i sekcja `## ADR` odzwierciedla nowy wynik, a otwarcie decyzji przy `adr: false` zostawia sekcję bez zmian.
13. Fazy - po podziale intentu przez `phases` sekcja `## ADR` występuje wyłącznie w `phases/01-<slug>/intent.md`; intenty pozostałych faz jej nie mają.

## Constraints / assumptions
- Skill `adr` działa w głównym kontekście sesji (musi rozmawiać z użytkownikiem), jest wywoływany tylko przez `intent` i nie jest wywoływalny przez użytkownika. Przy `adr: false` `intent` w ogóle go nie ładuje.
- `superplan` dostaje spec, nie intent; do sekcji `## ADR` dociera przez linię `Intent:` speca, która wskazuje plik intentu.
- `changelog-writer` przyjmuje etykietę `adr:` powtórzoną raz na każdy plik ADR; poza tym jego kontrakt nie zmienia się.
- Treść plików skilli, agentów i CLAUDE.md po angielsku; `intent.md` i ADR w języku wywiadu.
- Bez em dash i en dash w żadnym pliku.
- Plugin pozostaje stack-agnostic: żadnych założeń o ekosystemie hosta w treści skilla.
- Pliki skilli tworzone i refaktorowane przez `supercc:skill-designer`.
- Sekcja `## ADR` w `intent.md` jest jedynym wyjątkiem od reguły szablonu „bez uzasadnień i alternatyw” i obejmuje wyłącznie treść ADR.
