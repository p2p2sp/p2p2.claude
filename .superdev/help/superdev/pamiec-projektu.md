# Pamięć projektu

Pamięć projektu to wiedza, którą Claude wczytuje za każdym razem, gdy pracuje w Twoim repozytorium:
jak nazywać rzeczy, jakich narzędzi używać, jakich konwencji się trzymać. Dzięki niej kolejne zmiany
są spójne z resztą kodu.

## Dwie warstwy pamięci

| Warstwa | Do czego służy |
|---------|----------------|
| **Orientacja projektu** (`CLAUDE.md`) | Zwięzły opis projektu: stos technologiczny, sposób uruchamiania, najważniejsze zasady. To pierwsze, co Claude czyta. |
| **Reguły zależne od ścieżek** (`.claude/rules/`) | Konwencje przypisane do konkretnych obszarów kodu — obowiązują tylko tam, gdzie mają sens. |

## Jak z tego korzystać

- **Utrwal zasadę.** Poproś Claude, by zapisał konwencję albo ważny fakt o projekcie — trafi do
  właściwej warstwy pamięci.
- **Niech projekt uczy się sam.** Po włączeniu ustawienia `rules_improver` (zob.
  [Konfiguracja superdev](../pierwsze-kroki/konfiguracja-superdev.md)) wnioski z przeglądu kodu po
  każdym zadaniu mogą automatycznie zasilać reguły projektu. Zapisywane są tylko te, które naprawdę
  warto zachować.

## Dlaczego to ważne

Dobrze utrzymana pamięć projektu oszczędza powtarzania tych samych uwag. Zamiast za każdym razem
przypominać o konwencji, zapisujesz ją raz — a Claude stosuje ją w kolejnych zmianach.

## Powiązane tematy

- [Planowanie i implementacja](./planowanie-i-implementacja.md) — gdzie reguły są stosowane i
  uzupełniane.
- [Dokumentacja użytkownika](./dokumentacja-uzytkownika.md) — pamięć jest dla Claude; dokumentacja
  jest dla ludzi korzystających z produktu.
