
## Task 4 - feat(superdev): wire the docs writer into both build close-outs
- Covers: criteria #4
- TDD: none

### Dependencies
- Task 1, Task 3 - blocks: none

### Files
- modify - superdev/skills/superbuild/SKILL.md (Config gating sentence, Step 5 - Close Out, Step 6 - Done)
- modify - superdev/skills/simplebuild/SKILL.md (Config gating sentence, Step 4 - Close Out, Step 5 - Done)

### Test Commands
*Build*
- none (markdown + JSON + bash repo; no build step)

*Tests*
- `grep -q 'docs: true' superdev/skills/superbuild/SKILL.md && grep -q 'docs: true' superdev/skills/simplebuild/SKILL.md && echo OK` - prints `OK`
- `grep -q 'run superdev-docs' superdev/skills/superbuild/SKILL.md && grep -q 'run superdev-docs' superdev/skills/simplebuild/SKILL.md && echo OK` - prints `OK`

### Approach
- superbuild Config sentence: extend "(Step 5: `rules`, `memory`)" to include `docs`; simplebuild Config sentence: same for its Step 4 list.
- superbuild Step 5 item 2: add a third parallel delegation line - `docs: true` -> Invoke `superdev-docs-writer` (Skill) with a labeled-line `args` block - `capture: <plan-copy path>`, `spec: <spec path>`, and `notes: <workdir>/implementation/` on separate lines.
- simplebuild Step 4 item 2: same line without `spec:` (mirroring how the memory delegation differs between the two).
- Both close-out relay items: extend "`NODE:` / `RULE:` / `GAP:`" to "`NODE:` / `RULE:` / `DOC:` / `GAP:`"; extend the close-out commit message to "close out memory, rules and docs".
- Both Done steps: relay `DOC:` lines verbatim alongside `NODE:` / `RULE:`, and extend the GAP routing sentence with "or `-> run superdev-docs` (docs gaps)".

### Edge cases
- Writer failure stays non-fatal, covered by the existing "Either delegation failing is non-fatal" sentence - reword to "Any delegation failing" so it covers three.
- `adr` gating in superbuild and the "`adr` is not used here" note in simplebuild stay untouched.

### Contracts
- Labeled-line args to `superdev-docs-writer`: `capture:` + `notes:` (both tracks), `spec:` (superbuild only) - matches Task 3's input contract.

### DoD
Both SKILL.md files carry the gated `docs: true` delegation, the `DOC:` relay, and the docs GAP routing; grep assertions green.


### Covered criteria
4. superbuild Step 5 and simplebuild Step 4 carry a `docs: true` delegation to `superdev-docs-writer` (superbuild passes `spec:`, simplebuild does not), the Config gating sentences name `docs`, and both Done steps relay `DOC:` lines verbatim and route docs `GAP:` lines to `-> run superdev-docs`.
