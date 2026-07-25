
## Task 5 - feat(superui): add judgment agents source-scout, component-scout and bundle-reviewer
- Covers: criteria #6

### Dependencies
- none - blocks: Task 6, Task 7

### Files
- add - `superui/agents/source-scout.md`
- add - `superui/agents/component-scout.md`
- add - `superui/agents/bundle-reviewer.md`

### Test Commands
*Build*
- none - markdown artifacts

*Tests*
- `grep -n '^tools:' superui/agents/source-scout.md superui/agents/component-scout.md superui/agents/bundle-reviewer.md` - expect no `Bash` on any of the three
- `grep -n 'AskUserQuestion\|ask the user' superui/agents/*.md` - expect no match
- Read all three against `.claude/rules/_skills.md`

### Approach
1. Write `source-scout.md` - `tools: Read, Write, Glob, Grep`, no Bash by construction so it cannot measure. Input: source dir, output path. Reads every image without skipping any. Output `source-map.md` with fixed sections: screen inventory (content, viewport class, theme per file), dark-mode coverage, per-foundation reading lists (colors always reads all screens), phenomena to measure as locations only, component and pattern hotspots, and ambiguities each phrased as a question the user can answer. Hard rule stated prominently: hints, not values - never a hex, px, weight or ratio, not even an approximation.
2. Write `component-scout.md` - `tools: Read, Write, Glob, Grep`. Input: source dir, source-map path, optional intake-answers path, output `inventory.md` path, and an optional re-dispatch pair (previous inventory path plus constraints to honor, regenerating the file in full). Scans every screen, classifies each block as component (atomic or composite) or pattern, dedupes ruthlessly to one entry per distinct block with all appearance screens listed and one canonical screen chosen as the clearest and most complete. Two variants of the same job become one entry plus a flagged inconsistency. Emits the three contract sections with the exact entry line formats, and the `## Inconsistencies` section phrased for a human reader.
3. Write `bundle-reviewer.md` - `tools: Read, Glob, Grep`, cheap model. Input: bundle dir, registry path. It writes no file; every finding comes back in its return message as `FINDING: <category> <detail>` lines plus a `CLEAN` line when none, which is why it carries no `Write` tool. Reviews only what a script cannot decide: accent discipline against the accent-usage inventory, correctness of component dedup, whether each state documents a form and not only a color, and whether the surface order reads as a coherent elevation ladder. Explicitly forbidden from re-measuring anything - the values arrived from deterministic scripts and a second measurement adds nothing.
4. All three carry the routing guard in `description:` only, never in the body, and take no instruction about which skill invokes them or why.

### Edge cases
- An unreadable or cropped image: `source-scout` records it as an ambiguity, never guesses its content.
- A block appearing once across the whole set: still inventoried, with the single screen as canonical.
- `bundle-reviewer` finding a value it believes wrong: it reports the reasoning as a finding, never a corrected number, since it has no measurement authority.

### Contracts
`source-map.md` six fixed sections. `inventory.md` carries exactly three headings in this order: `## Components`, `## Patterns`, `## Inconsistencies`. Only the first two hold parseable entry lines, one per line starting with `- `; `## Inconsistencies` is prose for a human and is never parsed. Entry lines: components `- <slug> - <Display name> · atomic|composite · canonical: <screen> · appears: <screens> · states visible: <list>`; patterns `- <slug> - <Display name> · canonical: <screen> · composed of: <slugs> · states visible: <list>`. Splitting a component line on `·` puts `atomic|composite` at index 1 and `canonical:` at index 2 - the field order `build_meta.ts` depends on. The `canonical:` value is the exact source filename including its extension (`canonical: dashboard.png`), never a display name and never extension-less: `checkScreenRefs` resolves it against `screens/` verbatim and the builder copies by it, so a bare `dashboard` would yield a spurious `missing-screen` finding and a failed copy. The `appears:` list uses the same exact-filename form. `bundle-reviewer` returns findings in its message, never a file; categories: `accent-sprawl`, `dedup`, `state-form`, `surface-order`.

### DoD
All three agent files exist with the stated frontmatter, none declares Bash, none contains a user-facing question, and all comply with `.claude/rules/_skills.md`.


### Covered criteria
6. The head SKILL.md performs no measuring and authors no measured or generated artifact inline - `design.md`, the specs, `inventory.md`, `screens/`, `meta.yml` and the zip all originate elsewhere. Transcribing the user's own intake answers to `<run>/intake-answers.md` is the one write it owns, and necessarily so, since `AskUserQuestion` runs only in the main context. The fork worker SKILL.md contains no user-facing question and no `AskUserQuestion`.
