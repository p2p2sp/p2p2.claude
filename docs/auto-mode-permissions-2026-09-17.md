# Auto-mode i permissions: handoff sesji (2026-09-17)

Notatka deweloperska. Nie jest częścią żadnego pluginu i nie jest czytana w runtime. Powstała przy
konfigurowaniu `.claude/settings.json` tego repo pod szybkie, bezpromptowe działanie agentów superdev.
Stan narzędzia w chwili pisania: Claude Code 2.1.274.

## 1. Co zostało zmienione

Jeden plik: `.claude/settings.json` (śledzony w gitcie, wszedł w commicie `0a58866`).

Stan końcowy bloku `permissions`:

- `defaultMode: "acceptEdits"` - Edit/Write nie pytają.
- `additionalDirectories: ["C:/Users/dariu/.claude-p2p2/plugins"]` - żeby agenci czytali skrypty i
  `references/` pluginów bez promptu. Wpis jest zależny od maszyny.
- `allow`: 35 pozycji. Gołe nazwy narzędzi (`Read`, `Edit`, `Write`, `Skill`, `Agent`, `Task*`,
  `AskUserQuestion`, `WebSearch`, `WebFetch`, `LSP`, `Monitor`, `BashOutput`, `KillShell`,
  `EnterWorktree`/`ExitWorktree`, `SendMessage`, `ListAgents`, `ToolSearch`, tooly MCP) plus **gołe
  `Bash`**.
- `ask`: puste.
- `deny`: 72 pozycje - `rm -rf`, `sudo`, `dd`, `mkfs`, destrukcyjny git (`reset --hard`, `clean`,
  `restore`, `checkout --`, `rebase`, `filter-branch`, `branch -D`, `stash drop`, `config --global`),
  force push w czterech wariantach, destrukcyjne `gh`, `npm publish`, `terraform`, `aws|az|gcloud`,
  odczyt `.env` / `*.pem` / `~/.ssh` / `~/.aws`, zapis do `.git/**` i do katalogu konfiguracji Claude.

Świadomie **poza** allow (mają pytać): `Artifact*`, `DesignSync`, `Cron*`, `PushNotification`,
`RemoteTrigger` (i tak martwy przez `disableRemoteControl: true`), `EndConversation`.

## 2. Jak działa auto-mode

Auto-mode to **drugi gate, po** systemie permissions, nie zamiast niego. Kolejność rozstrzygania:

1. `permissions.deny` - blokuje, zanim klasyfikator zostanie w ogóle zapytany. Nie da się tego przebić
   ani intencją usera, ani konfiguracją klasyfikatora.
2. `permissions.ask` - wymusza prompt. Klasyfikator nie może auto-zatwierdzić pasującej akcji.
3. `permissions.allow` - **wąskie** reguły (`Bash(git status:*)`) są rozstrzygane *przed* klasyfikatorem,
   więc nie kosztują nic.
4. Wszystko pozostałe idzie do modelu klasyfikującego.

Wewnątrz samego klasyfikatora precedencja jest czterowarstwowa: `hard_deny` (bezwzględnie) →
`soft_deny` → `allow` (wyjątki od `soft_deny`) → jawna intencja usera (przebija pozostałe soft-blocki,
ale tylko gdy wiadomość opisuje **konkretnie tę** akcję; "posprzątaj repo" nie autoryzuje force pusha).

## 3. Kluczowy wniosek: gołe `Bash` w allow jest kontrproduktywne

To najważniejsza rzecz z tej sesji. Auto-mode **zawiesza szerokie reguły dające dowolne wykonanie kodu** -
`Bash(*)`, wildcardowane interpretery, a także każdą regułę nazywającą `Monitor` (bo komendy Monitora idą
przez shell). Gołe `"Bash"` należy do tej klasy.

Skutek: konfiguracja z gołym `Bash` posyła **każdą** komendę do klasyfikatora, czyli działa **wolniej** niż
lista kilkudziesięciu wąskich prefiksów, z których każdy rozstrzyga się lokalnie i natychmiast. Intuicja
"dam szerzej, będzie szybciej" jest tu odwrotna do prawdy.

Wniosek operacyjny: pod auto-mode optymalizuje się przez **enumerację wąskich prefiksów**, nie przez
poszerzanie. Wyjątkiem jest praca poza auto-mode (tryb normalny / acceptEdits), gdzie gołe `Bash` faktycznie
zdejmuje prompty.

Odwrotnością jest `autoMode.classifyAllShell: true`, które zawiesza **wszystkie** reguły Bash i wysyła każdą
komendę do klasyfikatora. Świadomy trade-off pokrycia za latencję. Nie włączać, jeśli zależy nam na tempie.

## 4. Reguła Self-Modification

Agent nie może sam poszerzyć własnych uprawnień. Blokuje to wbudowana reguła `soft_deny` o etykiecie
`Self-Modification` (pełne brzmienie: `claude auto-mode defaults --label 'Self-Modification'`). Obejmuje
edycje w `.claude/settings*.json`, `CLAUDE.md`, `.claude/rules/`, `.claude/hooks/`, `.claude/agents/`,
`.claude/skills/`, `.mcp.json` i pokrewnych, gdy **dodają lub poszerzają uprawnienia** albo osłabiają
zabezpieczenia - nawet w trakcie edycji, o którą user poprosił.

Reguła jest klasy "named+specifics": czyści ją dopiero wiadomość, która nazywa **tę konkretną** zmianę
uprawnień. W tej sesji:

- zawężanie `deny` (usunięcie blanket `git push`) przeszło bez oporu,
- dopisanie 15 pozycji do `allow` zostało zablokowane trzykrotnie, także po jawnym "dopisz",
- odblokowało dopiero ręczne zatwierdzenie w `/permissions`.

Zachowanie jest poprawne i nie warto go wyłączać wpisem w `autoMode.allow`. Praktyczny obieg: poszerzenia
allow robić samemu albo zatwierdzać przez `/permissions`, agentowi zostawić resztę.

## 5. Gdzie konfigurować sam klasyfikator

Blok `autoMode` czytany jest **wyłącznie** z user settings (`~/.claude/settings.json`, w tej instalacji
`~/.claude-p2p2/settings.json` przez `CLAUDE_CONFIG_DIR`), z managed settings i z flagi `--settings`.
Klasyfikator **celowo nie czyta** `.claude/settings.json` ani `.claude/settings.local.json` z repo - żeby
repo lub krok builda nie mogło samo sobie dopisać zaufania. To znaczy, że `autoMode` **nie ma sensu** w
pliku, który skonfigurowaliśmy w tej sesji; tam działają tylko `permissions`.

Pola: `environment` (co jest wewnątrz granicy zaufania - repo, org, domeny, buckety, rejestry; domyślnie
tylko katalog roboczy i remote'y repo), `allow`, `soft_deny`, `hard_deny`, `classifyAllShell`. Pierwsze
cztery to tablice **prozy**, nie wzorców - klasyfikator czyta je jak zdania.

Literalny `"$defaults"` w tablicy wstawia w tym miejscu wbudowane reguły. **Pominięcie go kasuje całą
wbudowaną listę tej sekcji**, łącznie z blokadami force pusha, `curl | bash`, deployu na produkcję i
obchodzenia auto-mode. Sekcje są niezależne, więc ustawienie samego `environment` nie rusza pozostałych.

Klasyfikator czyta też `CLAUDE.md` projektu, więc zdanie w pamięci projektu steruje jednocześnie modelem i
klasyfikatorem.

## 6. Ograniczenia dopasowania reguł Bash

Warto pamiętać przy pisaniu kolejnych reguł:

- Dopasowanie jest **prefiksowe**, nie globowe. `Bash(git push --force:*)` łapie `git push --force ...`,
  ale **nie** `git push origin main --force`.
- Komenda z pipe'em, redirectem albo `&&` jest rozbijana na części i każda musi trafić w allow, więc
  złożone one-linery i tak potrafią wywołać prompt.
- Deny na shellu jest z natury dziurawy: `rm -r -f`, `find . -delete`, `git -C <dir> push`,
  `git -c <k>=<v> push` czy podstawienie zmiennej ominą regułę prefiksową.
- Twarda granica, która ma patrzeć na pełny tekst komendy, wymaga hooka `PreToolUse`, nie listy deny.

## 7. Koszt i latencja klasyfikatora

Klasyfikator to realne wywołanie modelu, ale rachunek wygląda inaczej, niż sugeruje intuicja.

**Model i treść zapytania.** Chodzi domyślnie na Sonnet 5, niezależnie od wyboru w `/model` (przy sesji na
modelu Fable spada na Opusa; konfiguracja server-side Anthropic ma pierwszeństwo nad tym domyślnym
wyborem). Każde sprawdzenie wysyła fragment transkryptu plus oczekiwaną akcję i dokłada round-trip przed
wykonaniem. Wewnętrznie jest dwustopniowy: najpierw szybki filtr jednotokenowy, chain-of-thought dopiero
gdy pierwszy stopień coś zaznaczy, więc większość akcji nie dochodzi do drogiego etapu.

**Kto płaci tokenami.** Dokumentacja wylicza to wprost i lista jest zamknięta: plany Enterprise oraz konta
na Claude API, Claude Platform on AWS, Bedrock, Google Cloud Agent Platform i Microsoft Foundry.
Subskrypcje Pro/Max/Team nie są na tej liście, więc tam wywołania klasyfikatora nie dociążają zużycia
tokenów. Na trzech providerach chmurowych da się dodatkowo przenieść przegląd do zapytań modelu sesji
(server-side classifier review).

**Realny koszt to latencja, nie tokeny.** Dla nas istotniejsze jest to, co klasyfikator robi przy
subagentach, bo superdev jest pipeline'em dispatchowym. Każdy subagent płaci trzy dodatkowe punkty
kontrolne:

1. przed startem oceniany jest **opis zadania** (blokada na etapie spawnu),
2. **każda akcja subagenta** przechodzi przez klasyfikator na tych samych zasadach co sesja rodzica, a
   `permissionMode` z frontmattera agenta jest **ignorowany**,
3. po zakończeniu klasyfikator czyta **wynik i raport końcowy**, zanim zobaczy go rodzic.

Przy superbuildzie (implementor plus reviewer na task, checkpointy co 5 tasków, closeout writers) to
mnoży się przez liczbę dispatchy. `disallowed-tools` w skillu ani `tools:` w agencie tego nie zdejmują.

**Co omija klasyfikator w całości:**

- odczyty i edycje w katalogu roboczym poza ścieżkami chronionymi - stąd `defaultMode: "acceptEdits"` i
  gołe `Read`/`Edit`/`Write` w allow nie kosztują nic,
- wąskie reguły Bash, rozstrzygane przed klasyfikatorem,
- ruch sieciowy w sandboxie: hosty są oceniane raz, razem z komendą, bez zapytań per połączenie.

Narzut bierze się więc prawie wyłącznie z **komend shellowych i operacji sieciowych**. Przy gołym `"Bash"`
w allow oznacza to: z każdej komendy w sesji. To drugie, niezależne uzasadnienie wniosku z sekcji 3 -
enumeracja prefiksów nie tylko skraca czekanie, ale w ogóle nie generuje wywołań modelu.

**Ścieżka bez klasyfikatora** (Manual mode plus sandbox Basha w trybie auto-allow: `claude
--permission-mode default`, potem `/sandbox`) istnieje, ale działa tylko na macOS, Linux i WSL2, więc na
natywnym Windowsie odpada. Deny nadal obowiązuje, a reguły `ask` nadal pytają.

## 8. Rekomendacje na dalej

1. **Wrócić do enumerowanych prefiksów Bash** zamiast gołego `"Bash"` (patrz sekcje 3 i 7). To największy
   pojedynczy zysk na tempie przy pracy w auto-mode: każda trafiona reguła to jedno wywołanie modelu i
   jeden round-trip mniej.
2. Dodać `autoMode.environment` w **user settings** z `"$defaults"` plus: org GitHub tego repo, katalog
   cache pluginów, ewentualne domeny dokumentacji odpytywane przez `WebFetch`. To zdejmuje powtarzalne
   blokady bez luzowania czegokolwiek globalnie.
3. `permissions.deny` zostawić jako warstwę twardą - działa przed klasyfikatorem i jest deterministyczny.
4. Wpis `additionalDirectories` ze ścieżką maszynową rozważyć do przeniesienia do
   `.claude/settings.local.json`, jeśli repo ma być przenośne między maszynami.
5. Jeśli któryś prompt wraca uporczywie: `/permissions` → zakładka **Recently denied**, klawisz `r`
   oznacza akcję do ponowienia.

## 9. Otwarte, niezweryfikowane

- Czy reguła `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/foo.sh:*)` w `permissions.allow` jest dopasowywana
  **dosłownie** (tak jak w `allowed-tools` skilli), czy wymaga ścieżki rozwiniętej. Pierwsza wersja pliku
  miała oba warianty plus ścieżki absolutne, ale nie zdążyliśmy tego przetestować, zanim allow zostało
  zastąpione gołym `Bash`. Do sprawdzenia przy realizacji rekomendacji 1.
- Czy `permissions.ask` z sekcji "human checkpoint" zachowuje się tu tak samo jak w dokumentacji - nie
  testowaliśmy, `ask` zostało puste.

## 10. Przydatne komendy

```bash
claude auto-mode defaults                        # wbudowane reguły klasyfikatora jako JSON
claude auto-mode defaults --label 'Git Destr'    # jedna reguła po prefiksie etykiety
claude auto-mode config                          # reguły efektywne, z rozwiniętym "$defaults"
claude auto-mode critique                        # przegląd własnych reguł pod kątem fałszywek
claude auto-mode reset                           # usuwa blok autoMode z user settings
```

Do tego `/permissions` (zakładki **Auto mode** i **Recently denied**) oraz `/auto-mode-setup`, które samo
drafuje wpisy `environment` z repo i historii sesji i zapisuje je do user settings.
