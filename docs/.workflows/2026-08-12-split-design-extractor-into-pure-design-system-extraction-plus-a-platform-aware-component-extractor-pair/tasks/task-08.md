
## Task 8 - feat(superui): add component-extractor head and builder skills
- Covers: criterion #8
- TDD: none

### Dependencies
- Task 1 - blocks: `parse_design_md.ts` step
- Task 3 - blocks: `--mode platform` validation step
- Task 4 - blocks: platform reference paths the head resolves
- Task 5 - blocks: agent contracts the skills dispatch against

### Files
- add - superui/skills/component-extractor/SKILL.md
- add - superui/skills/component-extractor-builder/SKILL.md

### Test Commands
*Build*
- none (no build step in this repo)

*Tests*
- `node --test "tests/**/*.test.ts"` (regression only - no script touched)

### Approach
1. Head frontmatter: `name: component-extractor`; `description:` states what it does plus the guard "Invoked from the design-extractor ending loop or by the user command, never spontaneously." (simpleplan precedent - model-invocable so the Skill-tool chain works, NO `disable-model-invocation`); `user-invocable: true`; `argument-hint: <screenshots-dir> <platform> [<target>]`; `allowed-tools: Read, Write, Glob, Bash(sh:*), Bash(mkdir:*), Bash(rm:*), Skill, Agent, AskUserQuestion`.
2. Head body mirrors design-extractor's shape: Step 1 intake gate - three args (`platform` must be `web-app`|`mobile`|`website`, else stop naming the legal values; missing screenshots dir -> `AskUserQuestion`); resolve `<design>` = `docs/design-system/[<target>/]DESIGN.md`, absent -> hard stop pointing at `/superui:design-extractor`; `<out>` = `docs/design-system/[<target>/]<platform>/`, non-empty -> `AskUserQuestion` wipe/abort; PNG-only gate identical to design-extractor's; `<run>` = `.temp/component-extractor/<run-slug>-<platform>/`, stale -> silent `rm -rf`; resolve `<platform-ref>` = `references/<platform>.md` under this skill's own base directory. Step 2 dispatch `superui:source-scout` -> `<run>/source-map.md` (GATE non-empty). Step 3 ambiguities -> `AskUserQuestion` -> `<run>/intake-answers.md`. Step 4 dispatch `superui:component-scout` with source, source-map, `<platform-ref>`, optional intake -> `<run>/inventory.md`; list components, patterns, GAPS and inconsistencies to the user; objections or gap strikes -> re-dispatch with constraints, cap 2. Handoff labeled block: `run`, `out`, `source`, `design`, `source-map`, `inventory`, `platform-ref`, optional `intake`; relay the return verbatim. Final report: `<out>` path, observed vs invented counts, every `> NEEDS ATTENTION` spec named for review, `MISSING-TOKENS` entries flagged as design-system gaps ("re-run `/superui:design-extractor` or extend `DESIGN.md`, never hand-edit the satellites"), findings and NEEDS INPUT items, commit reminder.
3. Builder frontmatter mirrors `design-extractor-builder` (`context: fork`, `model: sonnet`, `effort: medium`, `user-invocable: false`, guard description, same `allowed-tools`). Steps: 0 `check_node.sh` (NODE_MISSING -> one-line stop) + resolve sampler/geometry script paths; 1 `parse_design_md.ts <design> <run>/registry.json` GATE exit 0 (failure -> one-line return naming the parse error); 2 guard - zero entries across `## Components`, `## Patterns` AND `## Gaps` -> `EMPTY-INVENTORY` one-line return; 3 spec-writer fan-out per observed entry (batched ~5, platform-ref passed, re-dispatch cap 2); collect `MISSING-TOKENS:`/`NEEDS-INPUT:` blocks - MISSING-TOKENS are NOT re-dispatched anywhere (no analysts here): they carry into the return as design-system gaps; 4 component-synthesizer fan-out per `## Gaps` entry (batched ~5, registry + platform-ref, output `<run>/specs/components/<slug>.md`, re-dispatch cap 2); 5 `copy_screens.ts <run>/inventory.md <source> <out>`; 6 `assemble_specs.ts` x2 (components -> `<out>/DESIGN.components.md`, patterns -> `<out>/DESIGN.patterns.md`); 7 `validate_bundle.ts <out> <run>/registry.json --mode platform` (informational); 8 bundle-reviewer (`<out>`, inventory, registry, platform-ref) - never a gate, carried verbatim. Return: `<out>` path, observed component/pattern counts, invented count with slugs, `MISSING-TOKENS` list, `FINDING:` lines, `> NEEDS INPUT` and `> NEEDS ATTENTION` items.

### Edge cases
- `## Gaps` empty or absent (no platform checklist misses, or user struck all) -> step 4 skipped, zero invented specs, report says so.
- Zero observed entries but non-empty `## Gaps` -> pipeline proceeds invention-only (satellite from invented specs; `copy_screens` copies nothing).
- `DESIGN.md` present but unparseable (hand-mangled) -> step 1's one-line return tells the user to re-run `/superui:design-extractor`.
- Same platform re-run -> `<out>` wipe/abort gate protects the previous platform bundle.

### Contracts
- Head-to-builder labeled block: `run`, `out`, `source`, `design`, `source-map`, `inventory`, `platform-ref`, optional `intake` (paths only, never content).
- Both skills reuse existing plugin-root scripts and agents exclusively; no new scripts beyond Task 1's.

### DoD
Both SKILL.md files exist with the contracts above and pass a read-through against `.claude/rules/_skills.md` (no caller narrative in bodies, no tables/italics/emoji); regression suite green.


### Covered criteria
8. `superui/skills/component-extractor/SKILL.md` (head: model-invocable for chaining, guarded description, `argument-hint: <screenshots-dir> <platform> [<target>]`, hard stop when `docs/design-system/[<target>/]DESIGN.md` is absent) and `superui/skills/component-extractor-builder/SKILL.md` (fork worker: parse DESIGN.md -> registry, spec-writer fan-out batched ~5, component-synthesizer per gap batched ~5, copy_screens, assemble_specs x2, validate `--mode platform`, bundle-reviewer) exist and follow the labeled-args handoff convention.
