# <Tytuł funkcjonalności>

## 1. Cel i rezultat

<!-- Opisz obserwowalny rezultat, a nie nazwę funkcjonalności. Odpowiedz: co użytkownik
     może zrobić i skąd wiemy, że zadziałało? Dołącz "dlaczego" w jednej linii. -->

**Dlaczego:** Użytkownicy tracą orientację w pracy, bo zadania są rozproszone po notatkach.

**Rezultat (definicja ukończenia):** Zalogowany użytkownik może dodać zadanie z tytułem i opcjonalnym terminem. Zadanie pojawia się natychmiast na górze jego listy zadań i przetrwa przeładowanie strony. Pusty tytuł jest odrzucany z widocznym komunikatem o błędzie.

## 2. Zakres

<!-- Lista rzeczy poza zakresem jest równie ważna jak lista w zakresie. Agenci domyślnie
     rozszerzają zakres — zamknij drzwi jawnie. -->

**W zakresie**
- Dodanie pojedynczego zadania (tytuł wymagany, termin opcjonalny).
- Walidacja tytułu po stronie klienta i serwera.
- Optymistyczne wstawienie do widocznej listy.

**Poza zakresem** (NIE buduj tego, nawet jeśli wydaje się naturalne)
- Edycja lub usuwanie zadań.
- Zadania cykliczne, przypomnienia, powiadomienia.
- Współdzielenie zadań między użytkownikami ani jakakolwiek logika wielu użytkowników / współpracy.
- OAuth ani żaden nowy przepływ uwierzytelniania — zakładamy, że użytkownik jest już uwierzytelniony.

## 3. Stos technologiczny, ograniczenia i ustalone decyzje

<!-- Bądź konkretny, z wersjami. Wymień stos, wszystko co ogranicza wybory implementacyjne
     oraz każdą decyzję już ustaloną (schemat, biblioteka, wzorzec), aby agent
     nie podejmował jej ponownie. -->

- **Frontend:** React 18 + TypeScript, Vite, Tailwind CSS.
- **Backend:** Node.js 20 + Express, PostgreSQL 16, Prisma ORM.
- **Istniejące moduły do ponownego użycia:** `auth/session.ts` (udostępnia `getCurrentUserId()`), `db/client.ts` (wyeksportowany klient Prisma). Nie twórz nowych klientów bazy danych.
- **Ograniczenia:** Maksymalna długość tytułu 200 znaków. Opóźnienie API P95 < 200 ms. Brak nowych zależności firm trzecich bez zatwierdzenia.
- **Ustalone decyzje:** Trwałość to PostgreSQL przez Prisma (nie w pamięci, nie localStorage). Nowa tabela `tasks`: `id` (uuid, pk), `user_id` (fk), `title` (text), `due_date` (date, nullable), `created_at` (timestamptz, default now()). Identyfikatory są generowane po stronie serwera (uuid v4); klient nigdy nie ustawia `id`.

## 4. Kontrakt zachowania

<!-- Zdefiniuj precyzyjnie zachowanie zewnętrzne: wejścia/wyjścia, warunki początkowe/końcowe,
     przypadki błędów i ewentualne przejścia stanów. To właśnie czyni specyfikację implementowalną,
     a nie tylko czytelną. -->

**Endpoint:** `POST /api/tasks`

**Treść żądania**
```json
{ "title": "Buy milk", "dueDate": "2026-07-04" }   // dueDate opcjonalne, ISO 8601
```

**Sukces — 201 Created**
```json
{ "id": "9f1c...", "title": "Buy milk", "dueDate": "2026-07-04", "createdAt": "2026-06-30T10:00:00Z" }
```

**Przypadki błędów (dokładne kształty)**
- Pusty tytuł / same białe znaki → `400` `{ "error": "Title is required" }`
- Tytuł > 200 znaków → `400` `{ "error": "Title too long" }`
- Brak ważnej sesji → `401` `{ "error": "Unauthorized" }`

**Warunki początkowe:** Wywołujący jest uwierzytelniony; `getCurrentUserId()` zwraca niepuste id.
**Warunki końcowe:** Dokładnie jeden wiersz dodany do `tasks`, będący własnością bieżącego użytkownika.

## 5. Kryteria akceptacji

<!-- Nie "czy działa", lecz: które testy przechodzą i które przypadki brzegowe są obsłużone.
     Tam, gdzie to pomocne, podaj konkretne przykłady wejście → oczekiwane wyjście. -->

- [ ] `POST /api/tasks` z prawidłowym tytułem zwraca `201` i utworzone zadanie.
- [ ] Pusty tytuł zwraca `400` z `{ "error": "Title is required" }`.
- [ ] Tytuł o długości 201 znaków zwraca `400` z `{ "error": "Title too long" }`.
- [ ] Żądanie bez sesji zwraca `401`.
- [ ] Po pomyślnym dodaniu zadanie jest widoczne na górze listy i przetrwa przeładowanie.
- [ ] `npm test` przechodzi; `npm run lint` nie zgłasza nowych błędów.
