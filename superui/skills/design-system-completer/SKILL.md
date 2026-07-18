---
name: design-system-completer
description: Validates an EXTRACTED design system (.superui/design-system/) for completeness gaps and, only with explicit user approval, designs the missing pieces with marked provenance.
allowed-tools: Write, Edit, Bash(sh:*), Bash(python:*), Bash(python3:*), Bash(py:*), Bash(mkdir:*), Agent
user-invocable: true
disable-model-invocation: true
---

# Design System Completer — orchestrator

Fill the gaps an extraction could not measure. You are the ORCHESTRATOR: judging facts against
checklists, designing missing pieces, merging tokens, and rendering sheets are all done by dedicated
agents/scripts; you run the checklist, the gates, and the conversation with the user — nothing else.

Input contract: the design-system dir comes from the invocation prompt/arguments, defaulting to
`.superui/design-system/` when unstated.

## Ground rules

- NEVER do a worker's job inline — no judging facts, no designing a fill value, no writing tokens or
  sheets yourself. Spawn the owning agent (Agent tool, `subagent_type: superui:<agent-name>`) even when
  the task looks small. The sole exception is step 8 (bookkeeping): a mechanical transcription of
  already-approved entries into two ledger files, with no judgment involved.
- Fan-out steps run agents in parallel, batched (about 5 concurrent); wait for a batch before
  dispatching the next.
- One writer per file: `dtcg.yml` is written only by `token-composer` (step 6); each sheet has exactly
  one producer at a time.
- Workers never talk to the user. All questions happen at the step-4 approval gate and when
  presenting; workers return `> NEEDS INPUT` markers you carry to the user.
- RE-DISPATCH CONVENTION (lint hits, gate failures): spawn the same agent type again with its normal
  inputs PLUS its previous output path and the findings as additional constraints; it regenerates its
  artifact in full honoring them. Cap remediation at two rounds per gate — after that, surface the
  remaining findings to the user instead of looping.
- Trust the scripts: each verifies its own result — do not re-check or hand-edit script output.
- Plugin-root path convention (stated once, used throughout): shared scripts/references/assets are
  addressed as `${CLAUDE_PLUGIN_ROOT}/scripts/...`, `${CLAUDE_PLUGIN_ROOT}/references/...`, and
  `${CLAUDE_PLUGIN_ROOT}/assets/...`; pro-designer references stay sibling-relative as
  `${CLAUDE_SKILL_DIR}/../pro-designer/references/`.
- Paths: `<out>` = `.superui/design-system/` (the user may override). `<run>` =
  `.temp/design-system-completer/<out-dir-basename>/` (run state: facts, gap report, synthesized
  tokens; basename = the last path segment of `<out>`).

## Checklist — execute in order, never skip a step or a gate

### 1 — Gate [you]
Run `sh "${CLAUDE_PLUGIN_ROOT}/scripts/check_python.sh"`. `PYTHON_MISSING` -> tell the user the
pipeline's `*.py` steps need Python 3 and point them at `/superui:setup`; stop before any
`python ...` step. `PYTHON_OK <cmd>` -> use `<cmd>` in place of `python` everywhere below, and state
it as the interpreter command when spawning the Bash-bearing agent (`token-composer`).

Confirm `<out>/DESIGN.md` and `<out>/dtcg.yml` both exist (Glob). MISSING EITHER -> this skill does
not apply here; point the user at `design-system-extractor` and stop — never scaffold `<out>`
yourself. PRESENT -> `mkdir` `<run>`.

### 2 — Facts [script]
```
python "${CLAUDE_SKILL_DIR}/scripts/check_completeness.py" <out> <run>/completeness-facts.md
```
GATE: exit 0 and the facts file exists (exit 1 means `dtcg.yml` is missing/unreadable — treat as a
step-1 gate failure and stop).

### 3 — Judge [gap-analyst, x1]
Spawn `superui:gap-analyst` with: the facts-file path, the design-system dir, checklist reference
paths (`${CLAUDE_PLUGIN_ROOT}/references/design-system-foundations.md`,
`${CLAUDE_PLUGIN_ROOT}/references/component-spec.md`,
`${CLAUDE_SKILL_DIR}/../pro-designer/references/components-states.md`), output path
`<run>/gap-report.md`, and — when `<out>/completions.md` exists (a re-apply run) — its path too. GATE:
gap-report exists.

### 4 — Approval GATE [you + user]
Present the gap report to the user, grouped by category (`## States`, `## Token tiers`,
`## Dark coverage`, `## Re-apply` when present), each gap shown with its `[G<n>]` id. The user
approves per gap or per whole category. NOTHING approved -> present the report and STOP; a
validation-only run that surfaces gaps without synthesizing anything is a successful run, not a
failure. Record the approved `[G<n>]` ids and their scope (component/pattern slug or token category)
before continuing.

### 5 — Synthesis fan-out [design-synthesizer, xN parallel, ~5 per batch]
Spawn `superui:design-synthesizer` once per approved scope, each with: that scope's approved `[G<n>]`
entries, the design-system dir, the pro-designer references dir path
(`${CLAUDE_SKILL_DIR}/../pro-designer/references/`), the extractor's spec template reference
(`${CLAUDE_PLUGIN_ROOT}/references/component-spec.md`) and filled example
(`${CLAUDE_PLUGIN_ROOT}/assets/example-component-spec.md`) when the scope
includes spec content, and output paths (a spec file for spec work, a synthesized-tokens list file
always). Collect every `SYNTHESIZED-TOKENS:` block (skip `none`) into `<run>/synthesized-tokens.md`.
GATE: one output set per approved scope.

### 6 — Merge [token-composer merge, x1 — only if synthesized tokens exist]
Skip entirely when `<run>/synthesized-tokens.md` collected nothing but `none` lines. Otherwise spawn
`superui:token-composer` (merge job) with: `<out>/dtcg.yml`, `<run>/synthesized-tokens.md`, validator
path `${CLAUDE_PLUGIN_ROOT}/scripts/validate_tokens.py`, DTCG format
reference `${CLAUDE_PLUGIN_ROOT}/references/dtcg-token-format.md`, template
path `${CLAUDE_PLUGIN_ROOT}/assets/tokens.template.yaml`. Every merged entry
is flagged `$extensions.org.superui.synthesized: true`; existing flags are preserved. Then:
```
python "${CLAUDE_PLUGIN_ROOT}/scripts/tokens_to_css.py" <out>/dtcg.yml <out>/tokens.css
python "${CLAUDE_PLUGIN_ROOT}/scripts/check_spec_tokens.py" <out>
```
If the composer reported renames, re-dispatch `spec-writer` (design-system-extractor's agent) for each
affected spec with the rename map, then re-run the checker — identical handling to the extractor's
step 11. GATE: composer reports 0 errors; the checker exits 0.

### 7 — Sheets [script, html-visualizer xN parallel, scripts]
```
cp "${CLAUDE_PLUGIN_ROOT}/assets/doc-chrome/docs.css" <out>/docs.css
cp "${CLAUDE_PLUGIN_ROOT}/assets/doc-chrome/components.js" <out>/components.js
```
Spawn `superui:html-visualizer` once per new-or-changed spec from step 5, each with: sheet kind + spec
path, the preview data format reference `${CLAUDE_PLUGIN_ROOT}/references/preview-data-format.md`,
output `<out>/components|patterns/<slug>.data.js`. Then:
```
python "${CLAUDE_PLUGIN_ROOT}/scripts/build_foundation_data.py" <out>
python "${CLAUDE_PLUGIN_ROOT}/scripts/build_sheets.py" <out>
python "${CLAUDE_PLUGIN_ROOT}/scripts/build_index.py" <out>
python "${CLAUDE_PLUGIN_ROOT}/scripts/lint_previews.py" <out>
```
`build_foundation_data.py` re-derives foundation data straight from the merged `dtcg.yml`, so a token
change from step 6 reaches the foundation sheets with no LLM step. Lint violations name the offending
file. A violation in `components/*.data.js` or `patterns/*.data.js` — re-dispatch that spec's
`html-visualizer` per the re-dispatch convention, then re-run `build_sheets.py` and the lint. A violation
in `foundations/*.data.js` is a `build_foundation_data.py` bug, never an LLM re-dispatch target — surface
it to the user instead. GATE: lint exits 0.

### 8 — Bookkeeping [you]
Mechanical transcription only — no judgment, the sole orchestrator-write exception in this pipeline.
Append the applied entries to `<out>/completions.md` (format below) and the synthesized
components/patterns to `<out>/inventory.md`'s `## Synthesized` section (format below). Re-apply run:
drop every `now-measured` ledger entry from `completions.md` during this pass; re-synthesize and
re-append only the `still-missing` approved entries. Both files are written by you alone in this
step — never let a parallel step-5/7 worker touch either.

### 9 — Present results [you]
Give the user: the artifact paths touched (`dtcg.yml` when step 6 ran, changed/new specs, changed/new
sheets, `completions.md`, `inventory.md`), applied-gap count vs declined-gap count, and every
collected `NEEDS INPUT` item. Keep it short.

## Contracts

### Gap-report entry format (gap-analyst output, consumed by you at step 4)
```
- [G<n>] <state|tier|dark> · <component-slug or token.path> · <what is missing> · basis: <checklist source or fact line>
```
`[G<n>]` ids number sequentially across the whole report (never restart per section) — they are what
the user approves and what design-synthesizer receives per scope.

### Synthesized-tokens list format (design-synthesizer output, token-composer merge input)
```
SYNTHESIZED-TOKENS:
- <proposed.token.name> = <value> (evidence: synthesized — <basis rationale>) [G<n>]
```
Or `SYNTHESIZED-TOKENS: none` when a scope's approved gaps carried no token work.

### `completions.md` ledger format (you write this at step 8)
```
## Tokens
- <token.name> = <value> (synthesized — <rationale>; run: <run-slug>)

## Specs
- <slug> — <whole spec | sections: <list>> (run: <run-slug>)
```
`<run-slug>` = the `<out>` dir basename used for `<run>` this pass. A re-apply pass drops
`now-measured` entries wholesale before appending the current pass's `still-missing` entries.

### `inventory.md` `## Synthesized` entry format (you append this at step 8)
```
- <slug> — <Display name> · atomic|composite · synthesized (no canonical screen) · states: <list>
```
