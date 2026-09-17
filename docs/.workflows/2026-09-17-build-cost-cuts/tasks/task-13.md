
## Task 13 - Add the setup permissions step
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: `Scalenie po zgodzie` (#15), `Brak node zgłoszony` (#17)

### Dependencies
- `Add the settings template and the deterministic merge script` (Task 12) - blocks: skrypt i jego linie wyjścia
- `Extend the pre-approval invariant to runtime script calls` (Task 7) - blocks: reguła postaci wywołania

### Files
- modify - superdev/skills/setup/SKILL.md (frontmatter `allowed-tools` linia 4, nowa sekcja `## Permissions` między `## Bootstrap` a `## Output`, blok `## Output`)

### Task Checks
- grep -c 'merge-settings.sh' superdev/skills/setup/SKILL.md
- grep -c 'Bash(\${CLAUDE_PLUGIN_ROOT}/skills/setup/scripts/merge-settings.sh:\*)' superdev/skills/setup/SKILL.md

### Approach
1. `allowed-tools`: dodaj `Bash(${CLAUDE_PLUGIN_ROOT}/skills/setup/scripts/merge-settings.sh:*)` - `${CLAUDE_PLUGIN_ROOT}` a nie `${CLAUDE_SKILL_DIR}` jak przy preloadzie `bootstrap.sh`, bo to wywołanie runtime i tak spelluje je precedens `run.sh` executora; istniejący wpis preloadu zostaje bez zmian.
2. Nowa sekcja `## Permissions`: po bootstrapie jedno `AskUserQuestion` (pytanie i dwie opcje w `### Contracts`); odpowiedź "Merge" -> jedno wywołanie `"${CLAUDE_PLUGIN_ROOT}/skills/setup/scripts/merge-settings.sh" "${CLAUDE_PLUGIN_ROOT}/skills/setup/assets/settings.json"` i przekazanie jego linii dosłownie (nie weryfikować, nie ponawiać); odpowiedź "Skip" -> linia `settings.json: merge declined (left untouched)`, bez wywołania.
3. `## Output`: dodaj jedną linię `<settings line - the merge script's own line, or "settings.json: merge declined (left untouched)">` po linii `@playwright/test`.

### Failure modes
- when the merge script exits non-zero -> response przekaż jego linię dosłownie w `## Output` i zakończ setup normalnie (fail-soft jak bootstrap), log ta linia, test none - prose

### Contracts
- Tekst pytania `AskUserQuestion`: "Merge superdev's recommended permissions into .claude/settings.json? It adds the tool allow-list with Bash, a deny-list of destructive commands and defaultMode acceptEdits, keeping every entry you already have." Opcje: "Merge (Recommended)" - "Deterministic merge, your own entries and other keys stay untouched; needs node on PATH, otherwise the block is printed for manual merge."; "Skip" - "Leave .claude/settings.json untouched."

### DoD
Setup pyta raz, po zgodzie woła skrypt bezpośrednio i przekazuje jego linię, po odmowie zgłasza pominięcie; grepy z `### Task Checks` zwracają co najmniej `2` i `1`.


### Covered criteria
15. Scalenie po zgodzie - Setup pyta raz przed dotknięciem `.claude/settings.json`; po zgodzie plik zawiera każdy wpis `allow` i `deny` z szablonu dokładnie raz, własne wpisy i pozostałe klucze hosta bez zmian, `defaultMode: acceptEdits` ustawiony tylko gdy go brakowało, a inny istniejący tryb jest zgłoszony zamiast nadpisany; po odmowie plik pozostaje nietknięty, setup zgłasza jedną linię o pominięciu i kończy pozostałe kroki jak dotąd.
17. Brak node zgłoszony - Bez `node` na PATH setup pomija scalenie jedną zgłoszoną linią zawierającą rekomendowany blok do ręcznego scalenia, a pozostałe kroki setup kończą się jak dotąd.
