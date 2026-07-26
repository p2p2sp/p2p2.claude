
## Task 3 - feat(superdev): add the superdev-docs-writer fork skill
- Covers: criteria #2
- TDD: none

### Dependencies
- Task 2 - blocks: Task 4, Task 6 (capture contract fixed in Task 2)

### Files
- add - superdev/skills/superdev-docs-writer/SKILL.md (new skill dir under the existing superdev/skills/)
- add - superdev/skills/superdev-docs-writer/references/doc-format.md (doc template + tone rules)

### Test Commands
*Build*
- none (markdown + JSON + bash repo; no build step)

*Tests*
- `grep -qx 'context: fork' superdev/skills/superdev-docs-writer/SKILL.md && echo OK` - prints `OK`
- `grep -q "resolve-input.sh" superdev/skills/superdev-docs-writer/SKILL.md && grep -q "'?spec'" superdev/skills/superdev-docs-writer/SKILL.md && echo OK` - prints `OK`
- `grep -q 'DOCS: none' superdev/skills/superdev-docs-writer/SKILL.md && test -f superdev/skills/superdev-docs-writer/references/doc-format.md && echo OK` - prints `OK`

### Approach
- Model the file on `superdev/skills/superdev-rules-writer/SKILL.md` (same body order: title, one-line job + "Input is fully resolved - never ask the user; on ambiguity prefer updating an existing doc over creating one", Input, Notes dir, qualification filter, Write rules, Validate, Output format).
- Frontmatter: copy the rules-writer's eight fields verbatim, changing only `name: superdev-docs-writer` and `description: Invoked only by superdev-docs, superbuild or simplebuild skill.`
- Input preload: `resolve-input.sh "$ARGUMENTS" capture '?spec' 2>&1` (single-quoted `?spec` - zsh nomatch); Notes dir via the same `printf | tr | sed | head` one-liner the sibling writers use.
- Dual-shape `## capture`: (a) a capture document - has `## Docs`; create or update exactly the listed `docs/product/<slug>.md` files from their `## Facts`, in the `## Language`, and remove files named on `delete:` lines; (b) change material (a build plan) - no `## Docs`; map onto EXISTING `docs/product/*.md` files only, update only those whose described user-visible behavior changed, create nothing, delete nothing; an implemented feature no doc covers -> `GAP: <feature> - <one-line user-visible behavior>`; nothing affected -> `VERDICT: PASS` with `DOCS: none`.
- `## spec` (when present): the approved What & Why - use it to phrase user-visible behavior; the plan carries only the How.
- Qualification filter for change material: code is TRUTH for WHAT shipped (confirm every described change against the actual code; a change the code does not show did not happen), but the doc body is USER INTENT - fold in changed behavior, preserve the user's own wording wherever the change does not contradict it; folds in ONLY user-visible behavior (flows, commands, screens, messages, limits); never folds in internals, refactors, dev tooling, or implementation detail; when in doubt -> not docs, `DOCS: none` is a normal verdict.
- Language rule: a capture document's `## Language` sets the language for created files; updates always follow the language of the target file.
- `docs/product/` absent entirely on change material -> `VERDICT: PASS`, `DOCS: none`, plus one `GAP: docs/product - layer not initialized` line.
- Validate (every touched doc): lives at `docs/product/<slug>.md`; < 2k tokens (bytes/4 via `wc -c`); describes behavior from the user's perspective, no code symbols or file paths; format and tone per `references/doc-format.md`.
- Output format section verbatim in the sibling writers' shape: line 1 `VERDICT: PASS|FAIL`; on PASS one `DOC: <path> (created|updated|deleted)` per touched file or `DOCS: none`; change material only: `GAP:` lines; on FAIL line 2 `REASON: <one line>`.
- `references/doc-format.md`, modeled on the rules-writer's `references/rule-format.md`: file skeleton (`# <Feature name>` title, short "what it does" paragraph, "How to use it" section, "Behavior and limits" section) and tone rules (address the user, present tense, concrete outcomes, no marketing, no jargon, no implementation vocabulary).

### Edge cases
- Change material naming a feature whose doc the user hand-edited: update only the sentences the shipped change contradicts; everything else stays verbatim.
- `delete:` lines are honored only from a capture document, never inferred from change material.
- A capture without `## Language` and with no existing file to inherit from -> `VERDICT: FAIL` with `REASON:` (the front always asks the language, so this signals a malformed capture).

### Contracts
- Consumes Task 2's capture format; labeled-line args `capture:` (required), `spec:` (optional), `notes:` (optional dir).
- Emits `VERDICT:` / `DOC: <path> (created|updated|deleted)` / `DOCS: none` / `GAP: <feature> - <detail>` / `REASON:` - consumed by Task 4's build close-outs.

### DoD
Both files present with all grep assertions green; frontmatter and body structure line up with the sibling writers.


### Covered criteria
2. `superdev/skills/superdev-docs-writer/SKILL.md` exists as the fork writer with the same frontmatter shape as `superdev-rules-writer` (`context: fork`, `model: opus`, `effort: high`, `user-invocable: false`, `resolve-input.sh` preload with `capture` and quoted `'?spec'`), dual-shape input (capture document vs change material), a qualification filter restricted to user-visible behavior, an update-existing-only rule for change material (uncovered feature -> `GAP:` line, never a new file), a language rule (init from `## Language`, updates follow the target file's language), and the output contract `VERDICT:` / `DOC: <path> (created|updated|deleted)` / `DOCS: none` / `GAP:` / `REASON:`; `superdev/skills/superdev-docs-writer/references/doc-format.md` carries the doc template and tone rules.
