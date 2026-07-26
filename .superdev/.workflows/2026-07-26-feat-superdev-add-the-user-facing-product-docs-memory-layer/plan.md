# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "feat(superdev): add the user-facing product-docs memory layer"

---
<!-- HEADER -->

## Goal
superdev ships a third memory layer aimed at humans: a `superdev-docs` interactive front plus a `superdev-docs-writer` fork maintain per-feature user documentation in `docs/product/<feature-slug>.md` inside host repos (host-project language, distilled "how the feature works", never a spec copy). Docs are USER INTENT: the entry interview and both planners detect doc-vs-code divergence and surface it as a requirement, never overwrite it. A new opt-in `docs` config switch wires the writer into both build close-outs, mirroring the existing `memory` / `rules` pattern.

## Context
superdev already has two memory layers (CLAUDE.md cascade for the agent, `.claude/rules/` for conventions), each built as an interactive front + a fork writer, both invoked at build close-out behind config switches. The user wants a third, user-editable layer describing product features from the user's perspective, which will later feed a published product knowledge base. The design was confirmed in interview: dedicated `docs/product/` directory, one file per feature, host-project language, docs treated as intent (divergence is flagged, not silently overwritten), init/audit skill plus a post-build writer step behind a `docs` switch, divergence detection in the `superdev` Explore phase plus one Verify bullet in each planner self-review.

## Acceptance criteria
1. `superdev/skills/superdev-docs/SKILL.md` exists as the interactive front: `user-invocable: true`, CSO trigger description, Run ID preload, detect-and-route workflow (init when `docs/product/` has no docs, maintenance when it does), a capture file written to `.superdev/.docs/capture-<RUN_ID>.md` whose format carries `## Language`, `## Docs` directives (feature slugs, optional `delete:` lines) and `## Facts`, a handoff that invokes `superdev-docs-writer` with a labeled-line args block, and a verbatim relay of the writer's VERDICT/DOC lines.
2. `superdev/skills/superdev-docs-writer/SKILL.md` exists as the fork writer with the same frontmatter shape as `superdev-rules-writer` (`context: fork`, `model: opus`, `effort: high`, `user-invocable: false`, `resolve-input.sh` preload with `capture` and quoted `'?spec'`), dual-shape input (capture document vs change material), a qualification filter restricted to user-visible behavior, an update-existing-only rule for change material (uncovered feature -> `GAP:` line, never a new file), a language rule (init from `## Language`, updates follow the target file's language), and the output contract `VERDICT:` / `DOC: <path> (created|updated|deleted)` / `DOCS: none` / `GAP:` / `REASON:`; `superdev/skills/superdev-docs-writer/references/doc-format.md` carries the doc template and tone rules.
3. The `docs` switch resolves through the whole config chain: `superdev/skills/setup/assets/config.yml` carries `docs: false`, `read-config.sh` outputs a fourth `docs:` line, `bootstrap.sh` greps and reports the `docs` key, `setup/SKILL.md` offers `docs` in the enable question, and both suites pass: `bash superdev/scripts/read-config.test.sh` prints `ALL PASS (5/5)` and `bash superdev/skills/setup/scripts/bootstrap.test.sh` prints `ALL PASS (8/8)`.
4. superbuild Step 5 and simplebuild Step 4 carry a `docs: true` delegation to `superdev-docs-writer` (superbuild passes `spec:`, simplebuild does not), the Config gating sentences name `docs`, and both Done steps relay `DOC:` lines verbatim and route docs `GAP:` lines to `-> run superdev-docs`.
5. `superdev/skills/superdev/SKILL.md` Explore-first carries a docs-divergence bullet (docs are user intent; divergence enters the interview as an open requirement), and `superdev/skills/superplan/SKILL.md` and `superdev/skills/simpleplan/SKILL.md` each carry one Self-Review Verify bullet checking the plan against `docs/product/` for the affected feature.
6. Self-documentation is in sync: `superdev/.claude-plugin/plugin.json` `skills[]` lists both new skills, the root `CLAUDE.md` superdev description mentions the product-docs layer, and the root `README.md` superdev section documents the new pair and the `docs` switch.

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - feat(superdev): add the docs config switch across setup and both test suites
- Covers: criteria #3
- TDD: none

### Dependencies
- none - blocks: Task 4

### Files
- modify - superdev/skills/setup/assets/config.yml (add `docs:    false   # Product docs system` line)
- modify - superdev/scripts/read-config.sh (key loop `for key in adr rules memory`, header key list comment)
- modify - superdev/scripts/read-config.test.sh (cases 1, 2, 5 and header contract comment)
- modify - superdev/skills/setup/scripts/bootstrap.sh (present-path `grep -E` alternation, seeded defaults string, header contract comment)
- modify - superdev/skills/setup/scripts/bootstrap.test.sh (case 4 fixture, filter and assertions; header contract comment)
- modify - superdev/skills/setup/SKILL.md (Enable opt-in switches option list)

### Test Commands
*Build*
- none (markdown + JSON + bash repo; no build step)

*Tests*
- `bash superdev/scripts/read-config.test.sh` - last line `ALL PASS (5/5)`
- `bash superdev/skills/setup/scripts/bootstrap.test.sh` - last line `ALL PASS (8/8)`
- `grep -cE '^docs:' superdev/skills/setup/assets/config.yml` - prints `1`

### Approach
- Append the `docs` line to the config asset, aligned with the existing three (key, padded `false`, trailing `# Product docs system` comment).
- In `read-config.sh`, extend the `for key in adr rules memory` loop to `adr rules memory docs` and extend the header comment key list (`klucze:`) the same way.
- In `read-config.test.sh`: Case 1 adds `grep -qxF "docs: false"`; Case 2 fixture gains `docs: true` plus the matching assertion; Case 5 `expected` block gains a fourth `docs: false` line; update the header `cases` comment from three keys to four.
- In `bootstrap.sh`: extend the present-path alternation to `(adr|rules|memory|docs)`, extend the seeded report string to `defaults: adr=false, rules=false, memory=false, docs=false`, and update the header comment's documented key list.
- In `bootstrap.test.sh`: Case 4 fixture gains a `docs: true` line, the `config_lines` filter alternation gains `docs`, and the presence assertions gain a `docs:` check; update the header `cases` comment.
- In `setup/SKILL.md`, add a `docs` bullet (`docs` - Product docs system) to the single multiSelect enable question.

### Edge cases
- `read-config.test.sh` Case 5 compares the non-comment body exactly; the `docs: false` line must be appended last so key order stays `adr, rules, memory, docs`.
- `bootstrap.test.sh` Case 1 greps the seeded report as a substring (`defaults: adr=false, rules=false`); extending the string keeps it matching - do not reorder the existing keys.
- Legacy keys `artifacts|help|ui` must stay excluded from the bootstrap report (Case 4 keeps asserting they never leak).

### Contracts
- `.superdev/config.yml` key set becomes `adr, rules, memory, docs`; `read-config.sh` stdout gains exactly one line `docs: <true|false>` after `memory:`, fail-open semantics unchanged.

### DoD
Both test suites print their final `ALL PASS` line; the asset, both scripts, and `setup/SKILL.md` all name the `docs` key.

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 - feat(superdev): add docs-divergence touchpoints to the entry interview and both planners
- Covers: criteria #5
- TDD: none

### Dependencies
- none - blocks: none

### Files
- modify - superdev/skills/superdev/SKILL.md (Explore first section)
- modify - superdev/skills/superplan/SKILL.md (Self-Review section)
- modify - superdev/skills/simpleplan/SKILL.md (Self-Review section)

### Test Commands
*Build*
- none (markdown + JSON + bash repo; no build step)

*Tests*
- `grep -q 'docs/product' superdev/skills/superdev/SKILL.md && grep -q 'docs/product' superdev/skills/superplan/SKILL.md && grep -q 'docs/product' superdev/skills/simpleplan/SKILL.md && echo OK` - prints `OK`

### Approach
- superdev Explore first: add one bullet - when the host repo carries `docs/product/`, have one of the parallel Explore agents read the affected feature's doc(s); docs are user intent, so any doc-vs-code divergence is reported into the interview as an open requirement (fix the code or, only on the user's explicit choice, amend the doc) - never treated as text the code overrides.
- superplan Self-Review: add one Verify bullet - when the host repo carries `docs/product/`, verify the plan does not contradict the affected feature's doc; a contradiction is an unresolved design decision -> STOP, run `superdev` skill.
- simpleplan Self-Review: the same Verify bullet, inserted alongside the existing Verify bullets.

### Edge cases
- Host repos without `docs/product/` see zero behavior change (every bullet is conditional on the directory's presence).
- Planners have `disallowed-tools: Bash, Task, Agent`, so the bullets must direct Read/Grep/Glob checks only - no agent fan-out, no commands.

### Contracts
- none

### DoD
All three SKILL.md files carry their conditional `docs/product` bullet; grep assertion green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 6 - chore(superdev): sync self-documentation for the docs layer
- Covers: criteria #6
- TDD: none

### Dependencies
- Task 2, Task 3 - blocks: none

### Files
- modify - superdev/.claude-plugin/plugin.json (skills[] array)
- modify - CLAUDE.md (superdev bullet in "What this repo is")
- modify - README.md (superdev section: setup switch list and Project memory row)

### Test Commands
*Build*
- none (markdown + JSON + bash repo; no build step)

*Tests*
- `grep -c 'superdev-docs' superdev/.claude-plugin/plugin.json` - prints `2`
- `grep -q 'superdev-docs' README.md && grep -q 'docs/product' CLAUDE.md && echo OK` - prints `OK`

### Approach
- plugin.json: append `"./skills/superdev-docs/"` and `"./skills/superdev-docs-writer/"` to `skills[]` (after the superdev-rules-writer entry, keeping the memory/rules grouping).
- Root CLAUDE.md: extend the superdev bullet in "What this repo is" with the product-docs layer (per-feature user docs in the host repo's `docs/product/`, docs-as-intent, `docs` switch).
- Root README.md, Super Dev section: in the "Entry interview & environment" row extend the switch list to `(adr, rules, memory, docs - all false by default)`; in the "Project memory (agent-facing)" row add the `superdev-docs` + `superdev-docs-writer` pair (user-facing product docs in `docs/product/`) - rename that row label to cover both audiences (e.g. "Project memory & product docs").
- No manifest change: `superdev/hooks/content/manifest.md` documents behavioral guardrails only, no artifact layers or skill groups (verified during exploration).

### Edge cases
- A worker must never appear in both `skills[]` and `agents[]` - superdev has no `agents[]`, so only `skills[]` changes.
- Keep README table wording consistent with the existing rows (short role descriptions, backticked skill names).

### Contracts
- none

### DoD
plugin.json parses (valid JSON) and lists both new skills; README and root CLAUDE.md name the new layer; grep assertions green.

<!-- /TASK -->
