
## Task 2 - Wire the adr skill into the intent synthesis
- TDD: none
- Model: opus
- Effort: high
- Covers: `Trzy kryteria` (#1), `Bramka konfiguracji` (#2), `Resume` (#12)

### Dependencies
- `Add the adr skill and register it` (Task 1) - blocks: the `## ADR` block shape, the `decision: <n>` argument and the `ADR:` output line this task wires

### Files
- modify - superdev/skills/intent/SKILL.md (frontmatter `allowed-tools`; new `## Config` after `## Run`; `## Resume from a file` reopened branch; `## Synthesis`)
- modify - superdev/skills/intent/references/intent-template.md (`## Content rules` and `## Template`)

### Test Commands
#### Build
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/intent` - exit 0, last line `FAIL=0 WARN=<n>`

#### Tests
- `grep -c 'Bash(${CLAUDE_PLUGIN_ROOT}/scripts/read-config.sh:\*)' superdev/skills/intent/SKILL.md` - prints `1`
- `grep -c 'read-config.sh' superdev/skills/intent/SKILL.md` - prints at least `2` (the pattern entry and the preload)
- `grep -c 'decision: <n>' superdev/skills/intent/SKILL.md` - prints at least `1`
- `grep -c '^## ADR' superdev/skills/intent/references/intent-template.md` - prints `1`
- `! LC_ALL=C grep -q $'\xe2\x80[\x93\x94]' superdev/skills/intent/SKILL.md superdev/skills/intent/references/intent-template.md` - exit 0

### Approach
1. Frontmatter `allowed-tools`: append `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/read-config.sh:*)` (pattern entry, the preload rule of the root `CLAUDE.md`).
2. New section `## Config` directly after `## Run`: the preload `` !`"${CLAUDE_PLUGIN_ROOT}/scripts/read-config.sh"` `` (invoked directly, never through an interpreter) and one sentence: the ADR step below runs ONLY when the `adr:` line reads exactly `true`; anything else (`false`, absent, an unresolved block, a missing config file) means skip and nothing below breaks on it.
3. `## Synthesis`, on a fresh run only - scope its existing `Resume:` overwrite bullet to say the ADR step below does not fire there, so the fresh-run gate cannot be read as covering the resume path too, and step 4 below stays the single owner of the ADR call on a resume - after the user confirms and before the `intent-template.md` Read: `adr: true` -> invoke the `adr` Skill with no arguments; `ADR: <k> accepted` -> the returned blocks are the `## ADR` section of the file about to be written; `ADR: none` -> the file has no `## ADR` section. `adr:` not `true` -> the skill is not invoked and the file has no `## ADR` section.
4. `## Resume from a file`, reopened-decision branch: after the branch re-interview and before the overwrite, `adr: true` -> invoke the `adr` Skill with `decision: <n>`; remove every existing `## ADR` block whose `Decision:` line names decision `<n>` and insert the returned blocks in their place (an empty section is dropped); `adr:` not `true`, or no decision reopened -> the existing `## ADR` section is carried into the overwrite verbatim.
5. `intent-template.md`: add the optional section `## ADR` between `## Out of scope` and `## History` with a placeholder pointing at the `adr` skill's block shape; add one content rule: `## ADR` is present only when the `adr` skill returned at least one accepted block, copied verbatim from that output; it is the single exception to the no-rationale rule above and covers the ADR text alone; on an overwrite it is carried over unchanged unless the `adr` skill re-judged its decision.

### Failure modes
- when the `read-config.sh` preload block is unresolved or `.claude/superdev.yml` is missing -> response: the `adr:` line is not `true`, the `adr` skill is not invoked and the file has no `## ADR` section, log: nothing, test: `grep -c 'exactly `true`' superdev/skills/intent/SKILL.md` prints at least `1`

### Contracts
- none

### DoD
`intent/SKILL.md` preloads the config, gates the `adr` Skill call on `adr: true` in `## Synthesis` and on the reopened branch of `## Resume from a file`, the template carries the optional `## ADR` section, the lint returns zero FAIL and the test commands pass.


### Covered criteria
1. Trzy kryteria - przy `adr: true`, po potwierdzeniu syntezy, użytkownik otrzymuje propozycję ADR wyłącznie dla decyzji spełniających wszystkie trzy kryteria (trudna do odwrócenia, zaskakująca bez kontekstu, realny trade-off); run, w którym żadna decyzja ich nie spełnia, kończy się bez propozycji i bez sekcji `## ADR` w `intent.md`.
2. Bramka konfiguracji - przy `adr: false` lub braku `.claude/superdev.yml` żadna propozycja ADR nie pada i `intent.md` nie ma sekcji `## ADR`.
12. Resume - wznowienie intentu bez otwierania decyzji zachowuje sekcję `## ADR` bez zmian, niezależnie od aktualnej wartości przełącznika `adr`; otwarcie decyzji przy `adr: true` ponownie poddaje ją osądowi trzech kryteriów i sekcja `## ADR` odzwierciedla nowy wynik, a otwarcie decyzji przy `adr: false` zostawia sekcję bez zmian.
