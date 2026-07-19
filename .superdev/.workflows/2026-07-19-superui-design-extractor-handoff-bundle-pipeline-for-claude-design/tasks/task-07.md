
## Task 7 — feat(superui): add design-extractor head skill
- Covers: criteria #1, #6

### Dependencies
- Task 5, Task 6 — blocks: Task 8

### Files
- add - `superui/skills/design-extractor/SKILL.md`

### Test Commands
*Build*
- none — markdown artifact

*Tests*
- `grep -n 'disable-model-invocation: true\|user-invocable: true' superui/skills/design-extractor/SKILL.md` — expect both
- `grep -n 'measure_geometry\|sample_colors\|render_design_md\|build_registry\|build_meta\|validate_bundle\|pack_bundle' superui/skills/design-extractor/SKILL.md` — expect no match, since the head owns no measurement or artifact-generation script
- `grep -n 'design-extractor-builder' superui/skills/design-extractor/SKILL.md` — expect one Skill-tool handoff
- Read against `.claude/rules/_skills.md`

### Approach
1. Frontmatter: `name: design-extractor`, a `description` stating the purpose (turn a folder of UI screenshots into a Claude Design handoff bundle) — routing is user-only, so the description serves the slash command rather than model routing, `allowed-tools: Read, Write, Glob, Bash(sh:*), Bash(mkdir:*), Bash(rm:*), Skill, Agent, AskUserQuestion` — `rm` is needed solely to clear a previous run's `<out>` in step 1, `user-invocable: true`, `disable-model-invocation: true`, `argument-hint: <screenshots-dir>`.
2. Body is four user-facing steps plus a handoff, each with a gate. Step 1 intake: take the directory from the arguments or ask for it, confirm it exists and holds images, then create `<run>` and `<out>` FRESH — the run slug is the source dir basename and therefore deterministic, and re-running on a changed source is the documented path, so an existing `<out>` must be removed before any write rather than written into. Otherwise a spec, pattern or screen from a previous run survives for an entry the new inventory no longer contains, `build_meta.ts` picks it up from the files actually present, and the stale member ships in `meta.yml` and the zip; `validate_bundle.ts` cannot catch this, since a stale spec's tokens and canonical screen still resolve. Require PNG sources by file extension using Glob, and stop with the reason when the directory holds anything else — JPEG is rejected because its lossy compression corrupts exact pixel sampling and would silently undermine the measurement law, WebP and AVIF because the decoders do not read them. The gate is extension-based on purpose: the head runs no script, and interlacing is visible only in the IHDR byte, so an interlaced PNG passes intake and surfaces later as the decoder's exit-1 message carried out in the fork's return. This keeps the bundle's `screens/<file>.png` contract true by construction, so no conversion step is ever needed downstream. Step 2: dispatch `superui:source-scout` for the source map. Step 3: read only the ambiguities section of the source map, ask the user those questions in prose, write the answers to `<run>/intake-answers.md`. Step 4: dispatch `superui:component-scout` for the inventory, passing `<run>/intake-answers.md` when step 3 wrote one so the scout sees the user's clarifications, then list the inventory to the user (components, then patterns, then flagged inconsistencies) so they see it before specs are written.
3. Handoff step: invoke `design-extractor-builder` via the Skill tool with the labeled-args block, then relay its return verbatim without re-verifying it.
4. Final step: report the bundle path, the zip path, the counts, every finding and every `> NEEDS INPUT`, then give the explicit next action on the Claude Design side — hand the zip over, and state that the bundle is one-shot input material, that iterating in Claude Design supersedes it, and that a changed source means re-running this skill rather than patching the bundle.
5. State the ground rules: never do a worker's job inline, no measuring and no artifact authoring here; paths are `<run>` = `.temp/design-extractor/<run-slug>/` with the slug from the source dir basename, `<out>` = `<run>/handoff/`.

### Edge cases
- No directory in the arguments: ask for one before doing anything else.
- Source dir empty, or holding no PNG, or holding a JPEG, WebP or AVIF: stop at the step 1 gate naming the offending files and the reason, before any run state is created.
- Re-running on a source directory already extracted: `<out>` exists from the previous run. Remove it wholesale before any write; never merge into it and never patch it. Confirm the removal in the step-1 gate, since every later step assumes an empty output tree.
- An interlaced PNG passes the extension gate by design and fails inside the fork at first decode; the fork carries the decoder's exit-1 message verbatim into its return, and this step reports it to the user with the file named.
- Source map reporting no ambiguities: skip step 3 entirely and write no intake-answers file.
- User objecting to the inventory: re-dispatch `component-scout` with the objection as an added constraint before handing off, capped at two rounds.

### Contracts
Consumes a screenshots directory path. Produces `.temp/design-extractor/<run-slug>/handoff/` and `.temp/design-extractor/<run-slug>/handoff.zip`.

### DoD
The file exists with the stated frontmatter, owns only the four user-facing steps plus the handoff, contains no measurement instruction and authors no measured or generated artifact — transcribing the user's intake answers is its sole write, exempt by criterion #6 — and complies with `.claude/rules/_skills.md`.


### Covered criteria
1. Running the head skill on a screenshots directory produces `.temp/design-extractor/<run>/handoff/` with all required members present and a sibling `handoff.zip` that unpacks to the same tree.
6. The head SKILL.md performs no measuring and authors no measured or generated artifact inline — `design.md`, the specs, `inventory.md`, `screens/`, `meta.yml` and the zip all originate elsewhere. Transcribing the user's own intake answers to `<run>/intake-answers.md` is the one write it owns, and necessarily so, since `AskUserQuestion` runs only in the main context. The fork worker SKILL.md contains no user-facing question and no `AskUserQuestion`.
