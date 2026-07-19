
## Task 6 — feat(superui): add design-extractor-builder fork worker
- Covers: criteria #1, #2, #3, #4, #6

### Dependencies
- Task 2, Task 3, Task 4, Task 5 — blocks: Task 7

### Files
- add - `superui/skills/design-extractor-builder/SKILL.md`

### Test Commands
*Build*
- none — markdown artifact

*Tests*
- `grep -n 'AskUserQuestion' superui/skills/design-extractor-builder/SKILL.md` — expect no match
- `grep -n 'context: fork\|user-invocable: false' superui/skills/design-extractor-builder/SKILL.md` — expect both present
- `grep -n 'superui:foundation-analyst\|superui:spec-writer\|superui:bundle-reviewer' superui/skills/design-extractor-builder/SKILL.md` — expect at least one match for each of the three agent names
- Read against `.claude/rules/_skills.md`

### Approach
1. Frontmatter: `name: design-extractor-builder`, `description` carrying only the routing guard "Invoked only by the design-extractor skill, never directly.", `context: fork`, `model: sonnet`, `user-invocable: false`, `allowed-tools: Read, Write, Glob, Grep, Bash, Bash(sh:*), Bash(node:*), Bash(mkdir:*), Agent`. No `!` preload, so no `Bash(<path>:*)` pattern entry is required.

A forked skill dispatching agents is settled, not novel — do not re-open it. The direct in-repo precedent is `.temp/superui-legacy/skills/design-system-generator/SKILL.md`: its frontmatter (line 6) carries `context: fork` plus `user-invocable: false` plus `Agent` in `allowed-tools`, and its body dispatches agents from inside that fork — line 27 "Spawn the owning agent (Agent tool, `subagent_type: superui:<agent-name>`)" and line 28 "Fan-out steps run agents in parallel, batched (about 5 concurrent)". That is exactly this task's shape. Note that the fork spawns only agents, never another fork. If the implementer wants the harness nesting-depth limit confirmed before building, resolve it via `claude-code-guide` per `.claude/rules/_research.md` rather than by inspection — but the precedent above already establishes that the pattern works.
2. Body opens with the labeled-args input contract, one `label: value` per line: `run:`, `out:`, `source:`, `source-map:`, `inventory:`, optional `intake:`. Then a numbered step checklist with an explicit gate per step, written as input-to-output with no mention of who invoked it.
3. Steps: resolve the Node command via `check_node.sh` as an explicit early step, and resolve `${CLAUDE_PLUGIN_ROOT}` into absolute paths for `sample_colors.ts` and `measure_geometry.ts` — a SKILL.md body is where that variable is valid, and the agents receive the resolved absolute paths plus the Node command in every dispatch, together with the `intake:` path in every `foundation-analyst` dispatch when that label is present, so the workers resolving an ambiguity actually see the user's answer to it; fan out `superui:foundation-analyst` four times in parallel (colors, typography, dimensions, effects-motion) writing fragments into `<run>/notes/`; run `build_registry.ts`; run `render_design_md.ts` into `<out>/design.md`; copy `inventory.md` into `<out>`; copy `<run>/intake-answers.md` into `<out>/intake-answers.md` when the `intake:` label is present, and skip silently when it is not; fan out `superui:spec-writer` one per inventory entry, batched about five concurrent, waiting for each batch, passing each dispatch an output path under `<out>/components/` or `<out>/patterns/` according to the entry's kind; collect every `MISSING-TOKENS:` block and re-dispatch the affected analyst to measure and re-run `build_registry.ts` and `render_design_md.ts`; copy every canonical screen into `<out>/screens/` verbatim with its source filename, deduplicating when several entries share one canonical screen — every source is PNG by the head's intake gate, so no conversion is possible or needed; run `build_meta.ts`; run `validate_bundle.ts`; dispatch `superui:bundle-reviewer` once; run `pack_bundle.ts`.
4. State the ground rules: never do a worker's job inline; trust every script's self-verified result and never re-check it; one writer per file; re-dispatch on a failed gate means spawning the same agent again with its previous output path and the findings as added constraints, regenerating in full, capped at two rounds per gate after which the residue is carried out as `> NEEDS INPUT`. Scope re-dispatch to the two agents this skill owns: `foundation-analyst` for a token or value finding, `spec-writer` for a spec finding. `bundle-reviewer` findings are never a gate here — `dedup` and `accent-sprawl` originate in the inventory, which arrives as an input and whose author this skill cannot dispatch, so every reviewer finding is carried verbatim into the return message for the user to act on.
5. Close with the return contract: one message carrying the bundle dir, the zip path, component and pattern counts, every `FINDING:` line from validator and reviewer, and every collected `> NEEDS INPUT` item.

### Edge cases
- `NODE_MISSING` from the env check: stop before any `node` step and return that as the single failure line pointing at `/superui:setup`.
- `validate_bundle.ts` exiting 1: carry every finding into the return message and still pack the bundle, since a finding is information for the user rather than a reason to withhold the artifact — state this explicitly so the step is not read as a hard stop.
- An inventory with zero entries: return a failure line rather than packing an empty bundle.
- A canonical screen named in the inventory but absent from the source dir: carried as a `missing-screen` finding by the validator, not silently skipped at copy time.

### Contracts
Input: the labeled-args block above. Output: a single return message; artifacts at `<out>/` and `<out>/../handoff.zip`.

### DoD
The file exists with the stated frontmatter, contains every step and gate, carries no user-facing question and no caller narrative in the body, and names each of the three dispatched agents by `superui:` prefix.

Plus the single cross-branch reconciliation, mandatory here because Tasks 3, 4 and 5 are parallel branches that meet only at runtime and this repo has no runtime test, so a format mismatch would ship silently and void criterion #4: before claiming this DoD, re-read the Contracts blocks of Tasks 3, 4 and 5 together and confirm both script-parsed surfaces agree verbatim — the SPEC surface (`canonical: <filename>.png` line, backticked dotted token form) and the INVENTORY surface (`·` field order, exact-filename `canonical:` value).


### Covered criteria
1. Running the head skill on a screenshots directory produces `.temp/design-extractor/<run>/handoff/` with all required members present and a sibling `handoff.zip` that unpacks to the same tree.
2. The bundle contains no `*.json` token file, no `*.css`, no `*.js` and no `*.html` — verified by listing the bundle.
3. `design.md` carries sections 3.1 through 3.10, each non-empty, with every value table rendered by `render_design_md.ts` from `registry.json` rather than authored by an agent.
4. `validate_bundle.ts` exits 1 with a named finding when a spec cites a token absent from the registry, when a spec or inventory entry cites a CANONICAL screen absent from `screens/`, or when a required section of `design.md` is empty; it exits 0 on a clean bundle, including one whose inventory `appears:` lists screens that do not ship.
6. The head SKILL.md performs no measuring and authors no measured or generated artifact inline — `design.md`, the specs, `inventory.md`, `screens/`, `meta.yml` and the zip all originate elsewhere. Transcribing the user's own intake answers to `<run>/intake-answers.md` is the one write it owns, and necessarily so, since `AskUserQuestion` runs only in the main context. The fork worker SKILL.md contains no user-facing question and no `AskUserQuestion`.
