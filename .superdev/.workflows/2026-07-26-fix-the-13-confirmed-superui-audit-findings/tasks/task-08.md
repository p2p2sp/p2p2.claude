
## Task 8 - fix(superui): state the real fragment schema in the foundation-analyst prompt
- Covers: criteria #8
- TDD: none

### Dependencies
- none - blocks: nothing

### Files
- modify - superui/agents/foundation-analyst.md (`## Output - one fragment`)
- modify - superui/scripts/build_registry.ts (header comment block, `validateShape` doc comment - comment text only, no code)
- modify - superui/scripts/validate_bundle.ts (header comment block - comment text only, no code)

### Test Commands
*Build*
- `node superui/scripts/build_registry.ts` - exit 2 with usage (proves the comment edit did not break parsing)

*Tests*
- `grep -rl "Task 2" superui/` - expect no output at all (four sites match today)
- `grep -c "primitive" superui/agents/foundation-analyst.md` - expect at least 1
- `grep -c "lineHeight" superui/agents/foundation-analyst.md` - expect at least 1

### Approach
1. Replace the "in the Task 2 fragment shape" pointer at `foundation-analyst.md:54` with the fragment shape spelled out inline - there is no Task 2 document anywhere in the plugin.
2. Add the five fields `build_registry.ts` requires and the prompt currently omits, each as a bullet, no table, per `.claude/rules/_skills.md`: every token needs `type`; a `section: "3.2"` token additionally needs `primitive` and `usedFor`; every `accentUsage[]` entry needs `token` alongside `screen` and `where`; every `unknowns[]` entry needs `section` alongside `what` and `reason`; every `textStyles[]` entry needs `lineHeight`, `letterSpacing` and `usedFor` alongside `name`, `family`, `size` and `weight`. Mirror the wording `agents/design-synthesizer.md:54,61-68` already uses for the same contract.
3. Keep the existing dotted-name, `evidence` and re-dispatch bullets as they are - they are correct.
4. Note in the same section that `unknowns[].section` uses the section id the gap belongs to, since the current prompt describes the entry as "what and why" only (`:42`).
5. Retire the same phantom pointer from the three script comments that keep it alive - `build_registry.ts:10` ("see the Task 2 Contracts block"), `build_registry.ts:335` ("the Task 2 fragment contract") and `validate_bundle.ts:3` ("Task 2's merged token/style namespace"). Comment text only; touch no code. Both files are also edited by Tasks 3 and 6, which change function bodies rather than header comments.

### Edge cases
- Do not add an `evidence` requirement to textStyles - the field does not exist in their schema.
- Section ids the prompt already states (3.3/3.4 field-backed, no 3.10 token, 3.1/3.2/3.5-3.9 token-legal) match `section-model.ts` exactly and must not be restated or altered.
- Keep the section short: this is a worker prompt, and `.claude/rules/_skills.md` requires deltas over completeness.

### Contracts
Consumes nothing new. Produces a fragment `{foundation, tokens, surfaceOrder, accentUsage, textStyles, unknowns}` that satisfies `validateShape` on the first attempt.

### DoD
A colors fragment written strictly from this prompt merges through `build_registry.ts` with exit 0 on the first run, with no re-dispatch round consumed.


### Covered criteria
8. A colors fragment authored strictly from `agents/foundation-analyst.md`'s stated output schema passes `build_registry.ts` on the first run, and no file in the plugin points at the nonexistent "Task 2" document.
