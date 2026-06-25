# Konfiguracja superdev

`/setup` przygotowuje projekt do pracy z superdev. Uruchamiasz je **raz** w danym repozytorium.

## Co robi `/setup`

- Tworzy katalogi robocze `.temp/` oraz `.superdev/`.
- Kopiuje szablony `.gitignore` i `.claude/settings.json`, jeśli ich brakuje.
- Zapisuje plik ustawień `.superdev/config.yml` i pyta Cię o dwa przełączniki opcjonalne.

## Kroki

1. W katalogu projektu uruchom:

   ```
   /setup
   ```

2. Odpowiedz na pytania o dwa ustawienia opcjonalne (opis poniżej). Możesz je włączyć teraz albo
   później, edytując `.superdev/config.yml`.

## Ustawienia opcjonalne

Oba są **domyślnie wyłączone** — bez `/setup` lub bez ich włączenia pozostają nieaktywne.

| Ustawienie | Co włącza |
|------------|-----------|
| `adr` | Zapis decyzji architektonicznych (ADR) w toku wdrożenia — gdy zmiana niesie istotną decyzję projektową, zostaje ona utrwalona. |
| `rules_improver` | Uczenie się konwencji projektu — po każdym zadaniu wnioski z przeglądu kodu mogą trafić do reguł projektu (zob. [Pamięć projektu](../superdev/pamiec-projektu.md)). |

Pozostawienie ich wyłączonych jest bezpieczne: tok wdrożenia działa normalnie, tylko bez tych dwóch
kroków.

> **Uwaga:** Jeśli pomijasz `/setup`, oba ustawienia opcjonalne są traktowane jak wyłączone. Włączysz
> je w dowolnym momencie, uruchamiając `/setup` ponownie.

## Co dalej

Przejdź do **[Planowania i implementacji](../superdev/planowanie-i-implementacja.md)**, aby wprowadzić
pierwszą zmianę.
