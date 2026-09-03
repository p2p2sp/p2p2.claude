---
name: setup-permissions
description: Configure Claude Code permission rules in the user's own settings (~/.claude/settings.json) - deny reading credential files (SSH/GPG keys, .env, cloud and registry tokens, keychains) and deny shutting down or rebooting the machine, write the base allow list of tools so routine work stops prompting, plus optional blocks for destructive commands, system config, network egress, global installs and git push checkpoints. Rules are written in a form valid on Linux, macOS and Windows alike. Use whenever the user wants to set up, harden, review or repair permissions, or complains that Claude keeps asking for approval - "skonfiguruj uprawnienia", "zablokuj dostęp do kluczy/haseł", "żeby Claude nie czytał .env", "żeby nie mógł restartować kompa", "co Claude ma wolno", "czemu ciągle pyta o zgodę", "set up permissions", "block secrets", "deny rules", "permission hardening", "stop asking me for approval", "audit my settings.json permissions". Starts by asking which path to take: apply the defaults in one shot with no further questions, or go area by area in a guided interview over what to allow or block.
allowed-tools: Bash, Read, Edit, AskUserQuestion
---

# Konfiguracja uprawnień Claude Code

Ustala, czego Claude Code nie ma prawa dotknąć na tej maszynie, i zapisuje to w **ustawieniach użytkownika** (`~/.claude/settings.json`, na Windows `%USERPROFILE%\.claude\settings.json`) — a nie w ustawieniach projektu, bo reguły mają obowiązywać we wszystkich repozytoriach, a `autoMode` z ustawień projektu klasyfikator w ogóle nie czyta.

Dwie rzeczy są **zawsze blokowane**, niezależnie od wybranej ścieżki: **odczyt miejsc, w których leżą klucze, hasła i tokeny** oraz **wyłączanie i restartowanie maszyny**. Reszta to wybór użytkownika.

Bloki z sekcją `memory` (dziś: `shell-path-hygiene`) skrypt zapisuje dodatkowo do **pamięci użytkownika** (`~/.claude/CLAUDE.md`) w oznaczonym bloku `supercc` — nadpisywany jest wyłącznie ten blok, reszta pliku zostaje nietknięta.

## Zanim zaczniesz

Pokaż najpierw stan wyjściowy — to jedno wywołanie i chroni przed opisywaniem zmian, których nie było:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/apply-permissions.mjs" --audit
```

Potem **zapytaj o ścieżkę**: jedno `AskUserQuestion`, jedno pytanie, pojedynczy wybór (`header: "Ścieżka"`), dwie opcje:

1. **Ustaw domyślne** *(zalecane)* — preset `fast`, jedno polecenie, **żadnych dalszych pytań**.
2. **Krok po kroku** — wywiad nad blokami, potwierdzeniami, dodatkami i trybem startowym.

W opisach opcji powiedz, co użytkownik dostaje: domyślne to sekrety, zasilanie maszyny, bazowa lista dozwolonych narzędzi, reguła higieny ścieżek i `hard_deny` dla trybu auto, bez zmiany `defaultMode`; krok po kroku otwiera cztery pytania i pozwala dołożyć m.in. `destructive`, `git-remote`, `network`.

**Nie zadawaj tego pytania, gdy użytkownik już rozstrzygnął ścieżkę w swojej prośbie**: „szybko", „domyślnie", „bez pytań", `--fast` → ścieżka szybka; „chcę wybrać", wskazanie konkretnych obszarów do zablokowania lub dopuszczenia, prośba o przegląd tego, co ma teraz → wywiad. To pytanie ma rozstrzygać niepewność, a nie ją inscenizować.

## Ścieżka szybka

```bash
node "${CLAUDE_SKILL_DIR}/scripts/apply-permissions.mjs" --preset fast
```

Preset `fast` to `secrets-core` + `power` + `tools-allow` + `shell-path-hygiene` + `auto-mode-hardening`: sekrety, zasilanie maszyny, bazowa lista dozwolonych narzędzi w `allow`, reguła higieny ścieżek w pamięci użytkownika i prozatorskie `hard_deny` dla klasyfikatora trybu auto. **Nie rusza `defaultMode`** — tryb pracy to osobna decyzja i skrypt zmienia go tylko na jawne `--mode`.

Po tym poleceniu **praca jest skończona**: nie dopytuj o bloki, nie proponuj dokładek, nie proś o potwierdzenie. Przejdź prosto do „Po zapisie" i zamelduj wynik.

Preset `hardened` dokłada `secrets-strict`, `system-config`, `destructive` i `git-remote`, a odejmuje `tools-allow`. Wybierz go zamiast `fast`, gdy użytkownik **już wcześniej** powiedział, że to maszyna z danymi produkcyjnymi albo praca bez nadzoru — a nie w osobnym pytaniu po zapisie.

## Ścieżka z wywiadem

Bloki i ich koszt wypisuje `--list` — **przeczytaj to przed zadaniem pytań**, żeby opisać kompromis własnymi słowami, a nie zgadywać:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/apply-permissions.mjs" --list
```

Zadaj **jednym wywołaniem `AskUserQuestion`** cztery pytania (`multiSelect: true` dla trzech pierwszych). W opcjach mów, co blok kosztuje, nie tylko co blokuje:

1. **Blokady** (`header: "Blokady"`): `secrets-core` *(zalecane)* · `secrets-strict` · `power` *(zalecane)* · `system-config`
2. **Potwierdzenia** (`header: "Pytaj o"`): `destructive` *(zalecane)* · `git-remote` · `network` · `packages-global`
3. **Dodatki** (`header: "Dodatki"`): `tools-allow` *(zalecane)* · `shell-path-hygiene` *(zalecane)* · `auto-mode-hardening` *(zalecane)* · `dev-allow`
4. **Tryb startowy** (`header: "Tryb"`, pojedynczy wybór): `bez zmian` *(pierwsza opcja)* · `auto` · `default` (Manual) · `plan`

Powiedz przy pytaniu 1, że `secrets-core` i `power` odpowiadają domyślnej ochronie i ich odznaczenie zostawia te obszary otwarte. Przy pytaniu 3 powiedz, że `tools-allow` zdejmuje pytania z codziennej pracy (nie rusza blokad — `deny` zawsze wygrywa), a `shell-path-hygiene` jest jedynym lekarstwem na wymuszone pytania o `grep`/`cat` ze ścieżką po `cd`.

Potem zastosuj wybór:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/apply-permissions.mjs" --blocks <lista,po,przecinkach> [--mode <tryb>]
```

Gdy użytkownik nazwał obszar, którego nie pokrywa żaden blok (konkretny katalog, własne narzędzie, domena), dopisz regułę ręcznie po uruchomieniu skryptu — składnia i pułapki: `${CLAUDE_SKILL_DIR}/references/rule-syntax.md`. Dopisując, trzymaj się kotwic `//` i `~/`; pojedynczy `/` w ustawieniach użytkownika celuje w `~/.claude/`, nie w korzeń dysku.

## Po zapisie

Skrypt sam robi kopię każdego pliku, który rusza (`<plik>.bak-<znacznik-czasu>`), scala bez duplikatów, weryfikuje, że ustawienia są poprawnym JSON-em, i uruchamia audyt. Powtórne uruchomienie z tymi samymi blokami nie zmienia nic.

Zamelduj użytkownikowi trzy rzeczy i nic ponadto:

1. co zostało dopisane (liczby z wiersza „Zmiany"; jeśli jest tam `CLAUDE.md`, powiedz, że reguła trafiła też do pamięci użytkownika),
2. czego Claude **przestaje** móc w jego codziennej pracy — najczęściej odczyt `.env` i `.npmrc` w projektach,
3. że zmiana obowiązuje **od nowej sesji**; w bieżącej `/permissions` pokaże już nowy stan, ale wczytane reguły pochodzą sprzed edycji.

Cofnięcie bloku: `--remove <blok>` (usuwa tylko reguły należące wyłącznie do tego bloku). Jednorazowe zdjęcie blokady: usuń regułę z `permissions.deny` — `deny` wygrywa nad `allow` w każdym trybie, także w `bypassPermissions`, więc nie da się jej obejść inaczej.

## Czego ten skill nie załatwia

Powiedz to wprost, jeśli użytkownik liczy na szczelność:

- Reguły `Read`/`Edit` obejmują narzędzia plikowe Claude'a i **rozpoznawane** komendy powłoki (`cat`, `head`, `tail`, `sed`). **Nie obejmują dowolnego podprocesu** — skrypt w Pythonie czy Node otworzy plik sam. Blok `auto-mode-hardening` zamyka to na poziomie klasyfikatora w trybie auto; twardą granicą na poziomie systemu jest dopiero sandbox (`sandbox` w ustawieniach).
- `permissions.deny` blokuje próbę użycia narzędzia, nie kradzież danych już wczytanych do kontekstu.
- Przy jakiejkolwiek blokadzie `Read(...)` komenda odczytu ze ścieżką, której nie da się rozstrzygnąć statycznie (ścieżka względna po `cd`, w podpowłoce, ze zmiennej), **zawsze pyta** — nie zdejmie tego ani `allow`, ani żaden tryb pracy. Jedyne lekarstwo to nie generować takich komend: blok `shell-path-hygiene`.
- Reguły z ustawień użytkownika przegrywają z `managed settings` organizacji tylko przy `allow`; `deny` z dowolnego poziomu jest nie do nadpisania.

## Materiały

- `${CLAUDE_SKILL_DIR}/references/rule-syntax.md` — składnia reguł, kotwice ścieżek, normalizacja Windows, opakowania komend, kolejność `deny → ask → allow`, styk z trybem auto i pułapki, które cicho unieważniają regułę.
- `${CLAUDE_SKILL_DIR}/references/rules.json` — jedyne źródło reguł. Dopisując blok, edytuj ten plik, nie skrypt.
- `${CLAUDE_SKILL_DIR}/scripts/apply-permissions.mjs` — `--list`, `--audit`, `--preset`, `--blocks`, `--remove`, `--mode`, `--file`, `--dry-run`.
