
## Task 1 - Add the adr skill and register it
- TDD: none
- Model: opus
- Effort: high
- Covers: `Trzy kryteria` (#1), `Kształt szkicu` (#3), `Skill zarejestrowany` (#10)

### Dependencies
- none

### Files
- add - superdev/skills/adr/SKILL.md (the whole skill: frontmatter, `# Input`, `# Judge`, `# Offer`, `# Block shape`, `# Output`)
- modify - superdev/.claude-plugin/plugin.json (`skills[]` gains `"./skills/adr/"` right after `"./skills/intent/"`)

### Test Commands
#### Build
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/adr` - exit 0, last line `FAIL=0 WARN=<n>`

#### Tests
- `grep -c '"./skills/adr/"' superdev/.claude-plugin/plugin.json` - prints `1`
- `grep -c '^user-invocable: false' superdev/skills/adr/SKILL.md` - prints `1`
- `! grep -q 'context: fork' superdev/skills/adr/SKILL.md` - exit 0 (the skill runs in the main context)
- `grep -c 'decision: <n>' superdev/skills/adr/SKILL.md` - prints at least `1`
- `! LC_ALL=C grep -q $'\xe2\x80[\x93\x94]' superdev/skills/adr/SKILL.md` - exit 0 (no em dash, no en dash)

### Approach
1. Load the `supercc:skill-designer` Skill and author `superdev/skills/adr/SKILL.md` through it (new skill, English, bullets over prose). Frontmatter: `name: adr`, `user-invocable: false`, `allowed-tools: Read, Glob`, no `context:`, no `model:`. The `description:` states the work (judges the confirmed decisions of an intent interview against three ADR criteria, offers and drafts one-paragraph ADRs for the ones that pass) and carries the routing guard: invoked by the `intent` skill only, right after the user confirms the synthesis, never directly and never by the user.
2. `# Input`: `$ARGUMENTS` is empty (judge every confirmed decision) or one line `decision: <n>` (judge that decision alone). The decisions, the alternatives weighed and the user's reasons are in the conversation; the skill reads no file except `Glob docs/adr/*.md` to find an earlier ADR the decision replaces.
3. `# Judge`: the three criteria, all three required for an offer: hard to reverse (the cost of changing the decision later is meaningful), surprising without context (a future reader would ask why it was done this way), the result of a real trade-off (genuine alternatives existed and one was chosen for specific reasons). One criterion missing -> skip the decision silently. State the calibration: most runs end with zero ADRs.
4. `# Offer`: one plain-prose message per qualifying decision (never `AskUserQuestion`): the filled block from `# Block shape` and a numbered choice `1` accept, `2` rephrase (the user dictates wording, then the block is shown again), `3` skip. A skipped or declined decision leaves no trace.
5. `# Block shape`: the `## ADR` section contract, one `### <slug>` block per accepted ADR:
   ```
   ## ADR
   ### <slug>
   Decision: `<question>` (decision <n>)
   Supersedes: <repo-relative path of the earlier ADR under docs/adr/, line present only when one is replaced>
   ```markdown
   # <Short title of the decision>

   <1-3 sentences: the context, what was decided, why.>
   ```
   ```
   Inside the fence, `## Considered Options` only when the interview weighed more than one option the user wants remembered, `## Consequences` only when the user pointed at a downstream effect to remember; the fenced body opens with the YAML frontmatter `status: accepted` only when a `Supersedes:` line is present, never otherwise (the plain case carries no frontmatter at all). `<slug>`: the title lowercased, ASCII letters and digits, other characters collapsed to `-`, at most 6 words. `Decision:` uses the reference form of `superdev/references/review-contract.md` `## Naming` (the question copied from the intent's `### <n>.` heading).
6. `# Output`: the last line is `ADR: <k> accepted` or `ADR: none`; the accepted blocks are the `## ADR` section the caller writes into `intent.md`.

### Failure modes
- when `Glob docs/adr/*.md` finds no file -> response: skip the supersede check and write no `Supersedes:` line, log: nothing, test: `grep -c 'Supersedes' superdev/skills/adr/SKILL.md` prints at least `2` (the line and its absence rule)

### Contracts
- `## ADR` section shape (step 5: `### <slug>`, `Decision:`, optional `Supersedes:`, one fenced markdown file body) - consumed by `Wire the adr skill into the intent synthesis` (Task 2), `Carry the ADR section into phase 01 only` (Task 3), `Plan the ADR write as the first task` (Task 4)
- `$ARGUMENTS` line `decision: <n>` - consumed by `Wire the adr skill into the intent synthesis` (Task 2)
- output line `ADR: <k> accepted` | `ADR: none` - consumed by `Wire the adr skill into the intent synthesis` (Task 2)

### DoD
`superdev/skills/adr/SKILL.md` exists, lints with zero FAIL, is registered in `plugin.json` `skills[]`, and the test commands above pass.


### Covered criteria
1. Trzy kryteria - przy `adr: true`, po potwierdzeniu syntezy, użytkownik otrzymuje propozycję ADR wyłącznie dla decyzji spełniających wszystkie trzy kryteria (trudna do odwrócenia, zaskakująca bez kontekstu, realny trade-off); run, w którym żadna decyzja ich nie spełnia, kończy się bez propozycji i bez sekcji `## ADR` w `intent.md`.
3. Kształt szkicu - każdy zaakceptowany ADR w sekcji `## ADR` pliku `intent.md` składa się obowiązkowo z nagłówka `# <krótki tytuł decyzji>` i 1-3 zdań (kontekst, decyzja, powód); frontmatter `status` występuje tylko gdy ADR zastępuje lub uchyla wcześniejszy ADR z `docs/adr/`, `Considered Options` tylko gdy wywiad ważył więcej niż jedną opcję, którą użytkownik chce zapamiętać, `Consequences` tylko gdy użytkownik wskazał w wywiadzie skutek downstream do zapamiętania; brak każdej z tych sekcji jest poprawny, a odrzucona propozycja nie zostawia w `intent.md` żadnego śladu.
10. Skill zarejestrowany - `./skills/adr/` widnieje w `plugin.json` `skills[]`, skill ma wiersz w tabeli skilli `superdev/README.md` i opis w root `CLAUDE.md`, a `lint_skill.sh` skill-designera zwraca dla niego zero FAIL.
