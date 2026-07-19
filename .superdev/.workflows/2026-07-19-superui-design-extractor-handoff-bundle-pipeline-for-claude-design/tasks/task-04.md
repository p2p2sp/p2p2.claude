
## Task 4 — feat(superui): add measuring agents foundation-analyst and spec-writer
- Covers: criteria #3, #6

### Dependencies
- Task 1, Task 2 — blocks: Task 6

### Files
- add - `superui/agents/foundation-analyst.md`
- add - `superui/agents/spec-writer.md`

### Test Commands
*Build*
- none — markdown artifacts, no build step in this repo

*Tests*
- `grep -n 'measure_geometry\|sample_colors' superui/agents/foundation-analyst.md superui/agents/spec-writer.md` — expect both named in each agent's input contract as dispatched script paths
- `grep -n 'CLAUDE_PLUGIN_ROOT' superui/agents/*.md` — expect no match; the variable is documented for hook and skill bodies only, and no agent in this repo uses it
- `grep -n 'AskUserQuestion\|ask the user' superui/agents/*.md` — expect no match
- Read both files against `.claude/rules/_skills.md` — no tables, no italics, no emoji, no caller narrative in the body

### Approach
1. Write `foundation-analyst.md` with frontmatter `name`, `description` ending "Invoked only by superui design-extractor skills, never directly.", `model: sonnet`, `tools: Read, Write, Glob, Grep, Bash`. Every script path arrives as a dispatched input, never as a `${CLAUDE_PLUGIN_ROOT}` reference in the body — that variable is documented for hook and skill bodies only, and the direct precedent is `.temp/superui-legacy/agents/foundation-analyst.md`, which takes the sampler path as an input. Body states the input contract (foundation name, source dir, source-map path, optional intake-answers path, absolute sampler path, absolute geometry script path, runtime command, output fragment path, and an optional re-dispatch pair — the previous fragment path plus findings to honor, on which it regenerates the fragment in full rather than patching it), the per-foundation duty split (colors covers sections 3.1 to 3.4 and 3.10 and always reads every screen; typography 3.5; dimensions 3.6 and 3.7; effects-motion 3.8 and 3.9), and the output contract: one `notes-<foundation>.json` fragment in the Task 2 shape. Every token name it proposes and every `textStyles[].name` is DOTTED (`color.surface.base`, `radius.control`, `text.body`) — a bare name is rejected by `validateShape` and would escape spec-reference validation entirely.
2. State the measurement law without exception: every value comes from an invocation of the dispatched sampler or geometry script, or from a stated in-image reference. Never a round number by habit, never a value from memory or a template. Every token carries its `evidence` object naming the screen, the method and the detail.
3. State the three exits for anything unmeasurable: an `unknowns` entry with a reason, a `> NEEDS INPUT` marker carried in the final message, or omission — never a fabricated value. Name the two legitimate non-pixel judgments: font-family identity by letterform (and say so explicitly when the family is unlabeled) and motion that is state-implied rather than observable.
4. For the colors foundation, mandate `--regions` over every major region background and transcribing the printed luminance rank verbatim into `surfaceOrder` — the analyst never ranks by eye. Mandate the accent-usage inventory as a per-screen enumeration.
5. Write `spec-writer.md` with the same frontmatter shape and `tools: Read, Write, Glob, Grep, Bash`. Input: one inventory entry line, source dir, `registry.json`, output spec path, script paths, runtime command, and an optional re-dispatch pair (previous spec path plus findings to honor, regenerating in full). It reads the entry's kind to choose its section list: a component entry yields Anatomy, a per-part table-free breakdown giving each part its own property-to-token lines (bg, text, border, radius, padding, font — one line per property, never several tokens lumped into one cell), every state as token deltas documenting both form and measured color, and a size-and-variant matrix with values per size; a pattern entry yields Composition, layout and arrangement with the tokens driving spacing and alignment, and whole-pattern states, with no size-and-variant matrix. Both kinds carry the canonical screen line plus an optional bbox crop hint. Every value is a token NAME from the registry; an unmatched value returns as a `MISSING-TOKENS:` block in the final message and never as a raw value in the spec.
6. Restate the variant-versus-state boundary: a variant is author-time configuration, a state is a runtime condition, never mixed. Restate that a state's color maps to the token that actually matches, often the ink token rather than the accent, never inferred from a typical pattern.
7. Pin the spec file's machine-readable surface in the agent body exactly as the Contracts block below states it — the `canonical: <filename>.png` line and the backticked dotted token form are parsed by `build_meta.ts` and `validate_bundle.ts`, so the agent must emit them verbatim rather than in a prose variant.

### Edge cases
- A canonical screen that does not show a state the inventory lists: read the other appearance screens; if still absent, emit `> NEEDS INPUT` rather than inventing the state.
- A measured value matching no registry token: `MISSING-TOKENS:` entry carrying the proposed name, the measured value and the evidence — the spec still carries the proposed NAME, never the raw value. A name arriving at `foundation-analyst` through a `MISSING-TOKENS:` entry is adopted VERBATIM — the analyst measures the value and keeps the proposed name unchanged, because the spec already holds that name and a rename would leave a dangling reference that `checkTokenRefs` reports as `unknown-token` on an otherwise clean run.
- Two analysts proposing the same token name is caught by `build_registry.ts` collision detection, not by the agents.

### Contracts
`foundation-analyst` writes the Task 2 fragment shape. `spec-writer` final message: the spec path plus `MISSING-TOKENS:` block or `MISSING-TOKENS: none`.

`spec-writer` handles both inventory kinds and the entry line selects everything. A component entry (carrying `atomic|composite` at `·` index 1) produces `components/<slug>.md`; a pattern entry (carrying `composed of:` and no `atomic|composite`) produces `patterns/<slug>.md`. This is one responsibility — write one spec from one entry — with a kind-dependent section list, not two responsibilities, since both shapes share the canonical line, the backticked dotted token form, the anatomy-or-composition breakdown and the state treatment.

Component spec sections: Anatomy, per-part property-to-token lines, every state as token deltas, size-and-variant matrix, canonical line, optional bbox.
Pattern spec sections: Composition (the component slugs it composes, by slug, matching the entry's `composed of:` list), layout and arrangement of those parts with the tokens driving spacing and alignment, whole-pattern states (data, empty, loading, error) as token deltas, canonical line, optional bbox. A pattern carries no size-and-variant matrix and no `atomic|composite` kind — those axes do not exist at pattern level.

The spec file's machine-readable surface, shared by both kinds, which `build_meta.ts` and `validate_bundle.ts` both parse — pin it exactly:
- Every spec carries one line matching `canonical: <filename>.png` at the top of the file, one screen only, the filename exactly as it appears in `screens/`. `build_meta.ts` reads this line for the `canonical` field; `checkScreenRefs` resolves it against `screens/`.
- Every token name in a spec is written in backticks and in the dotted `<group>.<name>` form. A value not expressed as a backticked dotted token is either a `MISSING-TOKENS:` entry or a prose note, never a bare raw value. `checkTokenRefs` resolves exactly these against the registry.
- The optional bbox crop hint is a separate line matching `bbox: x,y,w,h` and is never parsed by any script.

Two surfaces here are script-parsed and must agree verbatim with Task 3: the SPEC surface (the `canonical: <filename>.png` line and the backticked dotted token form) and, in Task 5, the INVENTORY surface (the `·` field order and the exact-filename `canonical:` value). Task 6's DoD carries the single mandatory reconciliation of both.

### DoD
Both agent files exist with the stated frontmatter and body contracts, name both measurement scripts as dispatched absolute-path inputs and never via `${CLAUDE_PLUGIN_ROOT}`, contain no user-facing question, and comply with `.claude/rules/_skills.md` formatting.


### Covered criteria
3. `design.md` carries sections 3.1 through 3.10, each non-empty, with every value table rendered by `render_design_md.ts` from `registry.json` rather than authored by an agent.
6. The head SKILL.md performs no measuring and authors no measured or generated artifact inline — `design.md`, the specs, `inventory.md`, `screens/`, `meta.yml` and the zip all originate elsewhere. Transcribing the user's own intake answers to `<run>/intake-answers.md` is the one write it owns, and necessarily so, since `AskUserQuestion` runs only in the main context. The fork worker SKILL.md contains no user-facing question and no `AskUserQuestion`.
