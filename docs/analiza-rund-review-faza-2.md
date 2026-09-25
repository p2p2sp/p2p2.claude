# Dlaczego tyle rund review - faza 2 (Odporność cyklu zamówienia)

Run: `docs/_specs/2026-09-25-19-54-02_faza-2-odporno-cyklu-zam-wienia`
Źródło: 15 raportów `work/review-T*-*.md`, 26 znalezisk blokujących.

## Kategorie

- A - wada planu (sprzeczność DoD z kontraktem, brakująca zależność, weryfikacja niemożliwa przed innym zadaniem)
- B - brak testu dowodzącego klauzuli DoD
- C - naruszenie reguł stylu testów (pętla, `switch`, `?:`, kilka aktów w jednym teście)
- D - prawdziwy błąd w kodzie
- E - wyjście poza zakres zadania
- F - nadgorliwość recenzenta

## Znaleziska blokujące wg raportu

- T1-1: ADR zawęża zakres `Cancelled` do 3 stanów - D; ADR sam sobie przeczy co do indeksu unikalnego - D (dokument, TDD: none)
- T7-1: `foreach` po 8 adresach w teście - C; autor na wierszach zwrotu nieprzetestowany w serwisach - B
- T9-1: DoD.1-4 (spóźniona płatność) bez testu, notatka kodera "no unit seam, proof is T25" - B (u źródła plan: brak szwu w Files)
- T10-1: `NotFound` poszerza C16 - A; DoD.2 nieprzypięta - B; DoD.3 bez testu - B; DoD.1 (zamiatania pomijają `Cancelled`) bez testu - B
- T10-2: C16 nadal poszerzony, plan nieuzgodniony - A
- T10-3: DoD.3 niezrealizowana, decyzja właściciela zapisana tylko w notatce - A
- T11-1: DoD.5 wywołania `BlockAsync` bez testu - B; DoD.2/3 nazwa bieżącej próby w `PrintJob` bez testu - B
- T14-1: DoD.4 (wpis historii z autorem) bez testu - B
- T18-1: wiersz ponownego druku utyka na zawsze w `Queued`/`Running` - D (współprzyczyna A: `PrintQueueSweep.cs` poza Files)
- T18-2: `switch` w teście napisanym przy poprawce - C
- T19-1: NRE daje 500 zamiast `400 note-required` - D; decyzja `address-invalid` i kolejność kontroli bez testu - B
- T19-2: zagnieżdżone `?:` w lokalnej funkcji testu - C
- T23-1: pętle `for` - C; kilka aktów w teście - C; trzy akcje w jednym teście - C
- T23-2: trzy testy z dwoma cyklami akt/asercja - C x3
- T23-3: jeden test z dwoma cyklami - C

## Liczby

| Kategoria | Liczba |
|---|---|
| C - styl testów | 10 |
| B - brak testu klauzuli DoD | 9 |
| D - błąd w kodzie | 4 |
| A - wada planu | 3 |
| E - zakres | 0 |
| F - nadgorliwość recenzenta | 0 |

Nadgorliwości recenzenta nie ma: każde znalezisko C cytuje regułę oznaczoną w `test-strategy.md` jako `(blocking)`.
Z 6 dodatkowych rund 4 wynikają z C w testach dopisanych przy poprawce (T18-2, T19-2, T23-2, T23-3), a 2 z A (T10-2, T10-3).

## Trzy główne przyczyny

### 1. Koder nie ma przed oczami reguł stylu testów, zwłaszcza w rundach poprawkowych (C)

`task-coder.md` każe czytać `test-strategy.md` tylko "Before the first test you write" i zawęża temat do "what never gets a test and test isolation". Reguł "one act" i "No control flow" tam nie wymienia, a skill `tdd` ich nie powtarza. Rundy poprawkowe produkowały nowe testy łamiące te reguły (T23 trzy razy z rzędu, T18, T19).

### 2. Brak symetrii między koderem a recenzentem (B)

Recenzent musi dla każdej klauzuli DoD wskazać kod i test, który by padł bez niej. Koder w `tdd` sam wybiera zachowania ("Decide ... which behaviors matter") i sam ocenia `DOD: met/total`, bez mapy klauzula -> test. Plan często nie dawał szwu do testu bez bazy danych, choć `test-strategy.md` mówi "The seam is a deliverable":

- T9: Verification tylko na czystym `PaymentArrival.Decide`,
- T14-1: "The test file is not listed in the task's Files",
- T11: `PrintJob` wymaga bazy, unit-seamu nie ma.

Reguły nie każą koderowi pisać testów na poziomie DoD, więc koder zatrzymuje się na liście testów z `Verification`, a ta pokrywa głównie domenę.

### 3. Sprzeczności w planie i brak ścieżki na decyzję właściciela (A)

- **T10:** `T10.md` DoD.3 "wiersz nieznany odpowiada `NotFound`" kontra C16 "`Cancelled` ... or no row at all".
  - Koder zrobił to, co mówi jego reguła ("the clause wins").
  - Recenzent zablokował to jako poszerzenie kontraktu.
  - Decyzja właściciela trafiła tylko do `T10-coder.md`, a recenzent ma regułę, że taka notatka jest znaleziskiem blokującym. Pętla zamknęła się dopiero akceptacją bez przeglądu.
- **T23:** `Depends-on: T22`, ale `Uses: C21, C25`. `Verification` uruchamia `check-operator-vocabulary.mjs`, który czyta `OrderCancellation.cs` (T12) i `ComplaintService.ReprintableFrom` (T19).
  - W trzech pierwszych rundach bramka padała na ENOENT.
  - Przyciski T23 wołają też trasy z T14 i T18, których w zależnościach również nie ma.
  - Przegląd przeszedł dopiero po zatwierdzeniu T12 i T19.

## Uwaga poboczna

Koderzy pracujący równolegle w jednym drzewie psuli sobie nawzajem kompilację (T9, T10), więc recenzent czasem sprawdzał przez czytanie zamiast przez uruchomienie.

## Rekomendacje

### Planista i planner-review

- Każde `Uses Cx` wymusza `Depends-on` na zadaniu, które produkuje Cx. Dodać to jako sprawdzenie w `planner-review`.
- Sprawdzać zgodność DoD z blokami kontraktów (nazwy wariantów, kody odmów).
- Przy `TDD: required` każda klauzula DoD ma w `Verification` nazwany test, a jego plik jest w `Files`.
- Dla serwisów z bazą (`OrderPaymentService`, `PrintJob`, `OperatorOrderService`, `AdminOrderEndpoints`) plan zakłada czystą funkcję decyzyjną jako szew, albo mówi wprost w `Out of scope` "dowód w T25/T26".
- Pliki ratunkowe (np. `PrintQueueSweep.cs` dla ponownego druku) trafiają do `Files`.

### Koder

- Czytać sekcję "Writing tests" z `test-strategy.md` przy każdym uruchomieniu, także z `report`.
- Przed PASS samokontrola testów z diffu: `for`/`foreach`/`switch`/`if`/`?:` w ciele testu i więcej niż jedno wywołanie aktu. Prosty grep albo hook oszczędziłby około 4 rund.
- W notatkach obowiązkowa mapa `DoD.n -> nazwa testu`, identyczna z tą, którą buduje recenzent.
- W `tdd` krok 1 zmienić na "zachowania = klauzule DoD".

### Konflikty i decyzje właściciela

- Konflikt DoD z kontraktem kończy zadanie na `VERDICT: FAIL` z numerem klauzuli, zamiast rozstrzygnięcia przez kodera.
- Implementor dopisuje decyzję właściciela do `tasks/T*.md` i `plan.md` przed ponownym wysłaniem, nigdy tylko do notatek.

### Harmonogram

- Zadania frontu z bramką czytającą pliki backendu idą dopiero po ich producentach.

## Niepewność

Skali nadmiarowych rund nie rozdzielam na minuty ani koszty, bo raporty ich nie podają. Klasyfikacja T9-1 i T18-1 jest graniczna (B/A i D/A), więc liczę je według dominującej przyczyny.
