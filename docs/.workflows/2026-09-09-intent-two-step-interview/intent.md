# Intent: Dwuetapowe zbieranie informacji w skillu intent
Date: 2026-09-09

## Request
Skill `intent` robi dziś Explore, a potem od razu prowadzi wywiad pytanie po pytaniu, czekając na odpowiedź na każde. Po rozpoznaniu agent często już wie, czego mu brakuje, i mógłby najpierw wylistować serię prostych pytań uzupełniających. Zbieranie informacji ma się rozdzielić na dwa kroki: (1) jedna lista prostych pytań uzupełniających, bez rekomendacji i bez opcji do wyboru, obejmująca tylko to, co realnie poszerzy wiedzę potrzebną do zaprojektowania rozwiązania, (2) dopiero potem wywiad pytanie po pytaniu jak dziś, prowadzony już z wiedzą z Explore plus odpowiedziami użytkownika. Oczekiwany efekt: mniej pytań w kroku 2 i szybsze przejście przez cały proces.

## Decisions
### 1. Kiedy krok 1 (lista pytań uzupełniających) w ogóle się odpala?
Zawsze po Explore. Gdy Explore pokrył wszystko i nie ma luk, agent mówi to wprost i przechodzi do wywiadu. Listę obowiązuje miękki limit ok. 8 pytań.

### 2. Gdzie przebiega granica między pytaniem z kroku 1 a decyzją z kroku 2?
Test wariantów: jeśli odpowiedzią jest fakt po stronie użytkownika (cel, zakres, ograniczenie, stan istniejący, preferencja), pytanie idzie do kroku 1; jeśli odpowiedzią jest wybór między co najmniej dwoma sensownymi rozwiązaniami z kompromisami, zostaje na krok 2. Reguła zapisana w jednym zdaniu, z 2-3 przykładami po obu stronach.

### 3. Gdzie w `intent.md` lądują odpowiedzi z kroku 1?
Nie do `## Decisions`. Zasilają `## Request`, `## Constraints` i `## Out of scope`, przy twardej regule, że każda odpowiedź kształtująca rozwiązanie musi trafić do którejś z tych sekcji.

### 4. Co, gdy użytkownik odpowie tylko na część pytań albo napisze "nie wiem"?
Braki wracają do kroku 2 jako zwykłe pytania wywiadu, jedno po drugim, ale tylko te, których odpowiedź realnie kształtuje rozwiązanie.

## Constraints
- Zmiana obejmuje `superdev/skills/intent/SKILL.md` (nowa sekcja kroku 1) oraz opis przepływu skilla w `superdev/README.md`.
- Krok 1 prowadzony prozą jako numerowana lista - bez narzędzia `AskUserQuestion`, bez rekomendacji i bez opcji do wyboru.
- Reguła `asking multiple questions at once is forbidden` z sekcji `## Keep this discipline` musi zostać zawężona do wywiadu, inaczej zakazuje kroku 1.
- Mechanika kroku 2 bez zmian: jedno pytanie na turę, 2-3 numerowane opcje z rekomendacją i kompromisami.
- Format `intent.md` nie zyskuje nowej sekcji - kontrakt pliku dla `superspec`, `simpleplan` i `changelog-writer` zostaje bez zmian.

## Out of scope
- Ścieżka wznowienia `intent <path>` i ponowne otwarcie pojedynczej decyzji - nie odpalają kroku 1.
- Manifest `superdev/hooks/content/manifest.md`.
- Pozostałe skille i agenci plugina superdev.

## History
- none
