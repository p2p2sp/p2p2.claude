# Intent: Odświeżenie kontekstu przy wznowieniu intentu
Date: 2026-09-16

## Request
Naprawić lukę świeżości w łańcuchu faz superdev. Po splicie na fazy run fazy N+1 wchodzi przez `intent` w trybie resume, który pomija `## Explore first`, więc ani changelog i ADR-y z poprzednich faz, ani realny stan kodu zbudowanego w tych fazach nie trafiają do spec. Naprawa ma objąć oba defekty: lukę informacyjną i obejście bramki wyboru tracku (model sam wybrał Spec zamiast oddać decyzję użytkownikowi), i ma działać dla każdego wznowienia `intent <ścieżka>`, nie tylko dla faz.

## Decisions
### 1. Gdzie mieszka odświeżenie kontekstu?
W gałęzi resume skilla `intent` jako nowy krok, plus twarda bramka wejściowa w `superspec`, która odsyła do `intent`, gdy dostaje intent z `docs/.workflows/` bez odświeżenia.

### 2. Co dokładnie czyta odświeżenie?
Dedykowany krok o mandacie delty „co się zmieniło od `Date:` tego intentu”, realizowany przez dwa równoległe agenty Explore w jednej paczce: historyczny (wpisy `docs/changelog/` nowsze niż `Date:`, ich linki `ADR:` oraz niezależny grep po `docs/adr/`, dla fazy dodatkowo wpisy wcześniejszych faz tego samego runu) i kodowy (czy `Delivers:` wcześniejszych faz i bullety `## Constraints` faktycznie istnieją w repo i w jakim kształcie).

### 3. Co się dzieje z wynikiem odświeżenia?
Wynik trafia do osobnego pliku `refresh.md` w katalogu intentu, nadpisywanego przy każdym wznowieniu. Plik intentu i `intent-template.md` pozostają nietknięte, a ścieżki do `refresh.md` nie przekazuje się nową etykietą: konsument wyprowadza ją z wartości `intent:`.

### 4. Jak zachowuje się bramka w `superspec`?
Twardo: gdy `intent:` wskazuje plik pod `docs/.workflows/`, a obok niego nie ma ważnego `refresh.md`, `superspec` nie pisze nic, tylko uruchamia `intent` z tą samą ścieżką, przez co użytkownik ląduje na handoffie i sam wybiera track.

### 5. Co czyni `refresh.md` ważnym?
Sama obecność pliku. Bez pinu na SHA i bez pinu na datę.

### 6. Gdzie w specu ląduje stan zastany?
W `## Problem / context (Why)`. `superspec/templates/spec.md` i `superspec/references/checklist.md` dostają wąskie sformułowanie, że stan zastany należy do „Why” i że nazwanie istniejącego artefaktu nie jest przeciekiem „How”.

### 7. Co się dzieje przy fazie 01, gdzie nie ma jeszcze czego odświeżać?
Krok nigdy nie jest pomijany, ale ma tani wariant pusty: gdy nie ma czego porównać, kończy się od razu, nie startuje żadnego agenta i zapisuje `refresh.md` o treści „brak zmian od `Date:`”.

### 8. Czy `simpleplan` dostaje tę samą bramkę?
Tak, ta sama bramka trafia do `superspec` i do `simpleplan`, opisana prozą w obu plikach, bez wspólnego skryptu i bez zmiany frontmattera `simpleplan`.

### 9. Czy odświeżenie patrzy też w surową historię gita?
Tak. Agent kodowy dostaje dodatkowo `git log --since=<Date intentu> --oneline` jako wskazówkę, gdzie patrzeć, i wykonuje je sam, bez zmiany `allowed-tools` skilla `intent`.

## Constraints
- Kolejną fazę uruchamia się w praktyce free-formem (ścieżka plus zdanie po polsku), nie komendą `phases <phases.md>` ani nie przez handoff, więc naprawa nie może zakładać wejścia po kontrakcie.
- Jedna faza to zamknięty przebieg builda, ale nie jest ściśle powiązana z kolejną: między fazami lądują w repo commity spoza superdev, których changelog nie widzi.
- Sprawdzenie bramki to jeden `Glob` po `<katalog intentu>/refresh.md`; `simpleplan` ma `Glob` i `Read`, ale nie ma `Bash` w `allowed-tools`.
- `phases` już dziś kieruje w `intent` (handoff „Start phase 01” i `## Resume`), więc nowy krok łapie się bez zmian w tym skillu.
- `refresh.md` leży w katalogu runu albo fazy pod `docs/.workflows/`, więc znika razem z fazą przy `cleanup-run.sh`.
- Sformułowanie w checkliście `superspec` musi być wąskie, żeby reviewer nadal łapał prawdziwe przecieki „How”.

## Out of scope
- Skill `phases` nie jest zmieniany.
- Pin ważności `refresh.md` na SHA HEAD ani na datę.
- Sposób, w jaki `superplan` bada kod.
- Absolutne ścieżki w sekcji `## History` przenoszonej z master intentu do intentów faz.

## History
- none
