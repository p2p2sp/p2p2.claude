# Składnia reguł uprawnień — ściąga

Stan na Claude Code 2.1.259. Tu jest tylko to, co zmienia decyzję przy pisaniu reguły.

## Gdzie to zapisać

| Zakres | Plik | Uwaga |
|---|---|---|
| Użytkownik | `~/.claude/settings.json` (Windows: `%USERPROFILE%\.claude\settings.json`) | **Jedyne miejsce dla tego skilla.** Także jedyne, z którego klasyfikator czyta `autoMode`. |
| Projekt | `.claude/settings.json` | Wersjonowane, dzielone z zespołem. `autoMode` stąd jest ignorowane. |
| Projekt lokalnie | `.claude/settings.local.json` | Nie wersjonowane. `autoMode` stąd też ignorowane (od 2.1.207). |
| Organizacja | managed settings | Nie do nadpisania niczym, nawet flagą CLI. |

Zmienna `CLAUDE_CONFIG_DIR` przenosi katalog konfiguracji — skrypt to respektuje.

**Kolejność rozstrzygania: `deny` → `ask` → `allow`, pierwsze trafienie wygrywa.** Precyzja nie bije kolejności: `Bash(aws s3 ls)` w `allow` nie przebije `Bash(aws *)` w `deny`. `deny` z dowolnego zakresu blokuje `allow` z każdego innego, w każdym trybie — także w `bypassPermissions`.

## Kształt reguły

`Narzędzie` albo `Narzędzie(specyfikator)`.

- Sama nazwa (`Bash`, `WebFetch`) w `deny` **usuwa narzędzie z kontekstu** Claude'a. `Bash(*)` znaczy to samo co `Bash`.
- Sama nazwa w `allow` dopuszcza **każde** wywołanie tego narzędzia — to kanoniczna forma bazowej listy dozwolonych narzędzi. Nazwa nieznana Claude Code dostaje ostrzeżenie o literówce przy starcie (pomijane, gdy nazwa zawiera `_` albo `*`).
- Z nawiasem (`Bash(rm *)`) narzędzie zostaje, blokowane są konkretne wywołania.
- `deny` i `ask` przyjmują globy w pozycji nazwy narzędzia (`mcp__*`, `*`). `allow` — tylko po literalnym prefiksie `mcp__<serwer>__`; niezakotwiczony glob w `allow` jest pomijany z ostrzeżeniem.
- Dopasowanie po parametrze: `Agent(model:opus)`, `Bash(run_in_background:true)` — tylko `deny`/`ask`, tylko pola najwyższego poziomu, jedno pole na regułę. **Głównego pola treści dopasować się nie da**: `Bash(command:...)`, `Read(file_path:...)`, `WebFetch(url:...)` są ignorowane z ostrzeżeniem przy starcie.

## Ścieżki (`Read`, `Edit`, `Cd`)

Semantyka gitignore, cztery kotwice:

| Wzorzec | Znaczy | Przykład |
|---|---|---|
| `//ścieżka` | Bezwzględna od korzenia systemu plików | `Read(//**/.env)` |
| `~/ścieżka` | Od katalogu domowego | `Read(~/.ssh/**)` |
| `/ścieżka` | **Względem źródła ustawień** — w `~/.claude/settings.json` to `~/.claude/ścieżka` | pułapka |
| `ścieżka`, `./ścieżka` | Względem bieżącego katalogu | `Read(*.env)` |

**Pojedynczy `/` to nie ścieżka bezwzględna.** `Read(/secrets/**)` w ustawieniach użytkownika blokuje `~/.claude/secrets/**`, a nie katalog `secrets` w projekcie. W ustawieniach użytkownika używaj wyłącznie `//` albo `~/`.

**Windows**: ścieżki są normalizowane do postaci POSIX przed dopasowaniem — `C:\Users\alice` staje się `/c/Users/alice`. Dlatego `//**/.env` łapie wszystkie dyski, a `//c/**/.env` tylko dysk C. Jeden zapis z `//**/` działa identycznie na Linuksie, macOS i Windowsie — i to jest domyślna forma w `rules.json`.

Głębokość dopasowania zależy od kształtu wzorca **i od rodzaju reguły**:

| Reguła | Łapie `src/app.ts` | Łapie `vendor/pkg/src/lib.js` |
|---|---|---|
| `Edit(src/**)` w `allow` | tak | nie |
| `Edit(src/**)` w `deny`/`ask` | tak | tak |
| `Edit(/src/**)` | tak | nie |
| `Edit(**/src/**)` | tak | tak |

Goła nazwa pliku łapie na każdej głębokości: `Read(.env)` ≡ `Read(**/.env)` — ale tylko **pod bieżącym katalogiem**. Żeby złapać wszędzie, potrzebne jest `Read(//**/.env)`.

`*` dopasowuje w obrębie jednego segmentu ścieżki, `**` przez katalogi.

**Nazwy narzędzi, które nie działają w regułach ścieżkowych**: `Write(...)`, `Glob(...)`, `MultiEdit(...)`, `NotebookEdit(...)` są wczytywane, ale **nigdy sprawdzane** (Claude Code ostrzega przy starcie). Pisz `Edit(...)` zamiast `Write(...)`/`MultiEdit(...)` i `Read(...)` zamiast `Glob(...)`.

`Read` w `deny` blokuje też `Edit` i `Write` na tej ścieżce, ale **nie `NotebookEdit`** — dla ścieżek, których nic nie ma prawa zmienić, dopisz osobno `Edit(...)`.

Dowiązania symboliczne: `deny` trafia, gdy pasuje **albo** dowiązanie, **albo** cel; `allow` wymaga, żeby pasowały oba.

## Komendy powłoki (`Bash`, `PowerShell`)

Reguła dopasowuje **cały tekst komendy**, `*` zastępuje dowolny tekst — łącznie ze spacjami.

- `*` stawiaj **po podkomendzie**: `Bash(git log *)` dopuszcza tylko `git log`, `Bash(git *)` dopuszcza wszystko z gitem (w tym `git -c core.fsmonitor=<skrypt> ...`).
- Końcowe ` *` (ze spacją) łapie też samą komendę: `Bash(reboot *)` łapie `reboot`. Bez spacji `Bash(ls*)` łapie także `lsof`.
- `Bash(ls:*)` to równoważny zapis `Bash(ls *)`. Dwukropek działa tylko na końcu wzorca.
- **Komendy złożone** są rozbijane po `&&`, `||`, `;`, `|`, `|&`, `&` i nowych liniach; reguła musi trafić w **każdą** podkomendę.
- **Opakowania są zdejmowane przed dopasowaniem**: `timeout`, `time`, `nice`, `nohup`, `stdbuf`, `command`, `builtin`, `noglob`, bezflagowy `xargs`. Dlatego `Bash(npm test *)` łapie `timeout 30 npm test`.
- **Nie są zdejmowane**: `npx`, `docker exec`, `devbox run`, `mise exec`, `direnv exec`, `watch`, `setsid`, `ionice`, `flock`, `find -exec/-delete`. Reguła `allow` na `Bash(npx *)` albo `Bash(docker exec *)` to zgoda na dowolne wykonanie kodu — nie dawaj jej.
- Przypisanie zmiennej z przodu: `allow` przestaje pasować po nieznanej zmiennej, ale **`deny` i `ask` pasują mimo niej** — `Bash(rm *)` w `deny` łapie `FOO=bar rm -rf tmp/`.
- Przekierowanie (`>`, `>>`, `2>`) jest sprawdzane jak zapis do pliku, przez reguły `Edit`.
- PowerShell: aliasy są kanonizowane, więc `PowerShell(Get-ChildItem *)` łapie `gci`, `ls` i `dir`. Dopasowanie bez rozróżniania wielkości liter, rozbijanie po `|`, `;`, a na PS7+ po `&&` i `||`.
- Komendy tylko-do-odczytu (`ls`, `cat`, `grep`, `find`, `git status`…) są wbudowaną listą i **nie pytają w żadnym trybie** — dopóki ich cel da się rozstrzygnąć statycznie.
- **Nierozstrzygalna ścieżka + jakakolwiek blokada `Read(...)` = wymuszone pytanie.** `cd <katalog> && grep … plik.txt`, podpowłoka albo ścieżka ze zmiennej sprawiają, że Claude Code nie potrafi sprawdzić celu wobec reguł `deny`, więc pyta („…would search a directory that cannot be determined here, and a `Read()` deny rule is configured"). Nie zdejmuje tego żadna reguła `allow` (gołe `Bash`, `Bash(grep:*)`, `Read(//**)`) ani żaden tryb, łącznie z `auto` i `dontAsk`. Lekarstwem jest tylko nie generować takich komend: bez prefiksu `cd`, ze ścieżką bezwzględną, a do czytania plików narzędzia `Read`/`Grep`/`Glob`.

**Reguły ograniczające argumenty są kruche.** `Bash(curl http://github.com/ *)` nie złapie `curl -X GET http://…`, wersji HTTPS, przekierowania ani `URL=… && curl $URL`. Domeny filtruj przez `WebFetch(domain:…)` plus `deny` na `curl`/`wget`, albo przez hook `PreToolUse`.

## `WebFetch`

- `WebFetch(domain:example.com)` — dokładnie ten host.
- `WebFetch(domain:*.example.com)` — dowolna poddomena na dowolnej głębokości, ale **nie** `example.com`.
- `WebFetch(domain:example.*)` łapie `example.org`, ale nie `example.evil.com` — `*` poza wiodącym `*.` nie przechodzi przez kropkę.
- Goły `WebFetch` w `deny` usuwa narzędzie; `WebFetch(domain:*)` zostawia je i odrzuca każde pobranie, dodatkowo domykając listę domen sandboxa.

## Tryby i styk z trybem auto

`permissions.defaultMode`: `default` (Manual) · `acceptEdits` · `plan` · `auto` · `dontAsk` · `bypassPermissions`.

W trybie `auto` decyzje podejmuje klasyfikator, ale **`deny` i `ask` są sprawdzane przed nim** — reguła `ask` na `Bash(git push *)` pyta także w auto. Wąskie reguły `allow` (`Bash(npm test)`) rozstrzygają się przed klasyfikatorem; szerokie (gołe `Bash`/`Bash(*)`, interpretery z globem, komendy uruchamiające menedżery pakietów, `Agent`, `Monitor`) są w auto zawieszane i wracają po wyjściu z trybu. `autoMode.classifyAllShell: true` zawiesza w auto **wszystkie** reguły `allow` dla powłoki.

Blok `autoMode` przyjmuje prozę, nie wzorce: `hard_deny` (bezwarunkowe), `soft_deny` (intencja użytkownika może je zdjąć), `allow` (wyjątki od `soft_deny`), `environment` (co jest „wewnątrz" Twojej infrastruktury).

**Token `"$defaults"` jest obowiązkowy.** Lista bez niego **zastępuje w całości** wbudowany zestaw — `soft_deny` bez `$defaults` kasuje m.in. ochronę przed force pushem, `curl | bash` i wdrożeniami produkcyjnymi.

Podgląd i weryfikacja:

```bash
claude auto-mode defaults   # wbudowane reguły
claude auto-mode config     # co faktycznie obowiązuje po scaleniu
claude auto-mode critique   # ocena własnych reguł
claude auto-mode reset      # usuwa autoMode z ustawień użytkownika
```

## Czego żadna reguła nie da

- **Ścieżki chronione** nigdy nie są zatwierdzane automatycznie, niezależnie od `allow`: `.git`, `.config/git`, `.claude` (poza `.claude/worktrees`), `.vscode`, `.idea`, `.husky`, `.devcontainer`, `.cargo`, `.yarn`, `.mvn`, `.gitconfig`, `.zshrc`, `.npmrc`, `.mcp.json`.
- Reguły `Read`/`Edit` **nie sięgają dowolnego podprocesu**. Skrypt w Pythonie otworzy `.env` mimo `Read(//**/.env)` w `deny`. Egzekwowanie na poziomie systemu daje dopiero sandbox (`sandbox` w ustawieniach) — łączy `sandbox.filesystem` z regułami `Read`/`Edit`, a `sandbox.allowedDomains` z `WebFetch(domain:…)`.
- Granica postawiona zdaniem w rozmowie („nie pushuj, dopóki nie sprawdzę") **znika przy kompaktowaniu kontekstu**. Trwała jest tylko reguła w pliku.
- Hook `PreToolUse` z kodem wyjścia 2 blokuje przed regułami; decyzja `"allow"` z hooka **nie omija** `deny` ani `ask`.
