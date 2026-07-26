
## Task 14 - docs: correct the stale superui claims in the repo-root docs
- Covers: criteria #14
- TDD: none

### Dependencies
- Task 13 - blocks: nothing

### Files
- modify - README.md (the `pro-designer` table row, the superui pipeline paragraph)
- modify - CLAUDE.md (the plugin-layout sentence, the self-documentation invariant, the no-build/test/lint claim, the top-level layout tree)

### Test Commands
*Build*
- none - markdown only; this repo has no build step

*Tests*
- `grep -c "five agents" README.md` - expect 0
- `grep -c "60-30-10" README.md` - expect 0
- `grep -n "five" CLAUDE.md` - expect no hit describing a superui agent count (lines 67 and 197 today)
- `grep -c "design-synthesizer" README.md` - expect at least 1 (the omitted sixth role is now listed)
- `grep -c "build / test / lint at any level" CLAUDE.md` - expect 0 (the claim wraps across lines 71-72, so match the single-line half; the full sentence never appears on one line and would grep to 0 either way)
- `grep -c "^tests/" CLAUDE.md` - expect 1 (the layout tree now lists it)

### Approach
1. In `README.md:72-73`, correct "fans out to five agents" - there are six, and two of them (`source-scout`, `component-scout`) are dispatched by `design-extractor` itself, not by the builder. Add the missing `design-synthesizer` role (proposed-token synthesis) to the enumerated list, and attribute the roles to the right dispatcher per Task 13.
2. In `README.md:66`, drop "60-30-10 color discipline" from the `pro-designer` row. The skill's own reference opens with "Do not default to a 60-30-10 split for product UI" (`superui/skills/pro-designer/references/color.md:7`), so the row markets the skill by the exact heuristic it rejects. Use plain "color discipline", matching `superui/README.md:25`.
3. In the same row, correct "bundles topic reference docs + a WCAG contrast script": `skills/pro-designer/` bundles `references/` only; the contrast script lives at the plugin root and is shared.
4. In `CLAUDE.md:67` and `CLAUDE.md:197`, correct "five agents" and "superui's five `design-extractor-builder` workers" to six. `:197` sits inside the self-documentation invariant that tells editors to keep `agents[]` in sync, so a wrong count there is the most load-bearing instance.
5. Reconcile the same file with the `tests/` tree Tasks 1-7 introduce, or this plan ships the very defect class it is closing. The claim "there is no build / test / lint at any level" (wrapping across `CLAUDE.md:71-72`) becomes false: narrow it to what stays true - no build step and no lint, and no test tooling inside any plugin - while naming the repo-root `tests/` suites run with `node --test`. Add a `tests/` row to the top-level layout tree (near `.claude/rules/` at `:108`), stating that it holds dev-time regression suites for plugin scripts and ships with no plugin.

### Edge cases
- `superui/README.md` is already correct on all three points and must not be touched.
- The `tests/` tree sits outside every plugin dir, so no `plugin.json` and no marketplace entry changes - the layout note must say so explicitly.
- Root `CLAUDE.md` and root `README.md` never reach the plugins at runtime; this is published-accuracy work, and `README.md` is the user-facing one.
- Keep the existing table structure in `README.md` - it is a catalog, not skill prose, so the no-tables rule in `.claude/rules/_skills.md` does not apply here.

### Contracts
No interface change.

### DoD
No repo-root document states an agent count or a pipeline ownership that contradicts `superui/.claude-plugin/plugin.json` and the two pipeline SKILL.md files, and none advertises a heuristic the skill argues against.


### Covered criteria
14. Root `README.md` and root `CLAUDE.md` state six agents under the correct dispatcher, root `README.md` no longer advertises `pro-designer` as teaching 60-30-10, and root `CLAUDE.md` reflects the new `tests/` tree instead of claiming the repo has no test tooling at any level.
