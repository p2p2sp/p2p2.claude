Title: "Odświeżenie kontekstu przy wznowieniu intentu"
Intent: docs/.workflows/2026-09-16-intent-resume-refresh/intent.md


## Goal
Każdy zapis `intent.md` przez skill `intent`, świeży i wznowiony, produkuje obok niego plik `refresh.md`: przy wznowieniu z deltą od jego `Date:` (changelog i ADR-y, weryfikacja `Delivers:` oraz `## Constraints`, ruch w gicie), przy świeżym runie z tego, co znalazło `## Explore first`. `superspec` i `simpleplan` odmawiają pracy nad intentem spod `docs/.workflows/`, przy którym takiego pliku nie ma, odsyłając do `intent` z tą samą ścieżką.

## Context
Gałąź `## Resume from a file` w `superdev/skills/intent/SKILL.md` pomija `## Explore first`, więc wznowiony intent nie widzi ani historii, ani stanu kodu. Dla fazy N+1 splitu oznacza to spec pisany bez wiedzy o tym, co zbudowała faza poprzednia. Żaden skill niżej tego nie nadrabia: `superspec`, `superplan` i `simpleplan` nie czytają `docs/changelog/` ani `docs/adr/`, a `superplan` i `simpleplan` mają `Agent` w `disallowed-tools`. Drugi defekt jest po stronie routingu: wejście free-formem prowadzi prosto w `superspec`, z pominięciem bramki, na której track wybiera użytkownik. Naprawa dokłada jeden krok w `intent` i po jednej bramce wejściowej w obu skillach planujących.

## Out of scope
- Zmiany w skillu `phases`.
- Pin ważności `refresh.md` na SHA HEAD albo na datę.
- Zmiany w tym, jak `superplan` bada kod.
- Absolutne ścieżki w sekcji `## History` przenoszonej z master intentu do intentów faz.
- Zmiany w `superdev/hooks/content/manifest.md` (nie przybywa ani nie ubywa grupa, zakres grupy ani udokumentowany łańcuch).

## Acceptance criteria
1. Każdy zapis `intent.md` przez skill `intent`, świeży i wznowiony, kończy się zapisanym obok plikiem `refresh.md`, także gdy nie ma czego porównać - wtedy plik jawnie stwierdza brak zmian od `Date:`. Żadna ścieżka wyjścia z `intent` nie prowadzi do handoffu bez tego pliku.
2. Niepusty `refresh.md` zapisany przy wznowieniu niesie deltę od `Date:` intentu z trzech źródeł: wpisów `docs/changelog/` wraz z ich ADR-ami, weryfikacji deklaracji `Delivers:` oraz `## Constraints` wobec repo, i listy tematów z `git log --since`.
3. `superspec` i `simpleplan`, dostając `intent:` wskazujący plik pod `docs/.workflows/` bez `refresh.md` obok, nie tworzą ani nie modyfikują żadnego pliku i uruchamiają `intent` z tą samą ścieżką.
4. Stan zastany w sekcji `## Problem / context (Why)` specu jest jawnie dopuszczony przez `superdev/skills/superspec/templates/spec.md` i `superdev/skills/superspec/references/checklist.md`, a reviewer nadal ma regułę na prawdziwy przeciek „How”.
5. `superdev/README.md` i root `CLAUDE.md` opisują krok odświeżenia oraz plik `refresh.md` jako zawartość katalogu runu.

