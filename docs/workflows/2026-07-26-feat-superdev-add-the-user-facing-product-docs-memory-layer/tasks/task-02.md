
## Task 2 - feat(superdev): add the superdev-docs interactive front skill
- Covers: criteria #1
- TDD: none

### Dependencies
- none - blocks: Task 3, Task 6

### Files
- add - superdev/skills/superdev-docs/SKILL.md (new skill dir under the existing superdev/skills/)

### Test Commands
*Build*
- none (markdown + JSON + bash repo; no build step)

*Tests*
- `grep -qx 'user-invocable: true' superdev/skills/superdev-docs/SKILL.md && echo OK` - prints `OK`
- `grep -q 'superdev-docs-writer' superdev/skills/superdev-docs/SKILL.md && echo OK` - prints `OK`
- `grep -q '\.superdev/\.docs/capture-' superdev/skills/superdev-docs/SKILL.md && echo OK` - prints `OK`

### Approach
- Model the file on `superdev/skills/superdev-rules/SKILL.md` (same section order: frontmatter, title + one-line role, Core Principle, Run ID, Workflow, Capture file format, Capture Questions).
- Frontmatter: `name: superdev-docs`, `user-invocable: true`, and a CSO `description:` ("Use ALWAYS when the user wants to create, initialize, or maintain user-facing product documentation / a product knowledge base for a repository... Triggers include \"create product docs\", \"document features for users\", \"init docs/product\", \"audit product docs\"...") stating the output shape (one file per feature under docs/product/, host-project language, plus a maintenance mode).
- Core Principle: one file per feature at `docs/product/<feature-slug>.md`; content is the distilled "how the feature works" from the user's perspective, never implementation detail and never a spec copy; docs are USER INTENT - the user may edit them, and a doc-vs-code divergence is a requirement to surface, never text to overwrite silently.
- Run ID section: verbatim `date +%Y%m%d-%H%M%S` preload, capture path `.superdev/.docs/capture-<RUN_ID>.md`, never reuse or overwrite.
- Workflow block: 1. detect state with Glob `docs/product/*.md` (none -> Initial setup, present -> Maintenance); 2. Initial setup: inventory candidate features from the host repo, confirm the feature list with the user, ask the doc language ONCE (host-project language default), then the Capture Questions per feature; 3. Capture + hand off: write the capture, invoke `superdev-docs-writer` (Skill) with a labeled-line args block `capture: .superdev/.docs/capture-<RUN_ID>.md`, relay its VERDICT/DOC lines verbatim - do NOT re-verify or rewrite the docs yourself; 4. Maintenance: a) audit docs vs code - a divergence is reported as intent-vs-implementation and resolved WITH the user (fix the code, or, only on the user's explicit choice, update the doc), a retired feature becomes a `delete:` line; b) find undocumented features; resolved changes go through the capture + writer handoff.
- Capture file format block: `# Docs capture`, `## Language` (one line, e.g. `polski`), `## Docs` (`<feature-slug> - <one-line feature scope>` per line, plus optional `delete: docs/product/<file>.md - <reason>` lines), `## Facts` with `### <feature-slug>` headings carrying confirmed user-visible behavior.
- Capture Questions: what the feature does for the user; how the user reaches/triggers it; what observable behavior and outputs it has; limits, states, and edge behaviors a user should know.

### Edge cases
- `docs/product/` exists but is empty -> treat as state none (Initial setup).
- Do not use any `!` preload other than Run ID; detection is Glob-only, so no `allowed-tools` pattern entry is needed.

### Contracts
- Capture file format (`# Docs capture` / `## Language` / `## Docs` / `## Facts`) - consumed by Task 3's writer.
- Handoff args block: `capture: <path>` labeled line, values are always paths.

### DoD
SKILL.md present with all grep assertions green; section order and conventions match the superdev-rules front.


### Covered criteria
1. `superdev/skills/superdev-docs/SKILL.md` exists as the interactive front: `user-invocable: true`, CSO trigger description, Run ID preload, detect-and-route workflow (init when `docs/product/` has no docs, maintenance when it does), a capture file written to `.superdev/.docs/capture-<RUN_ID>.md` whose format carries `## Language`, `## Docs` directives (feature slugs, optional `delete:` lines) and `## Facts`, a handoff that invokes `superdev-docs-writer` with a labeled-line args block, and a verbatim relay of the writer's VERDICT/DOC lines.
