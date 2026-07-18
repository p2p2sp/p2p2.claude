---
name: design-system-auditor
description: Read-only consistency audit of the implementation against the project's OWN design system (.superui/design-system/) — finds DRIFT (code contradicting existing tokens/specs: hardcoded colors/spacing/fonts/radii/shadows/motion a token covers, off-spec component states or variants, accent misuse, hardcoded dark-mode values), GAPs (needs the system does not define, routed to extractor/completer) and UNTRACKED components missing from inventory.md.
allowed-tools: Write, Bash(sh:*), Bash(node:*), Bash(mkdir:*), Bash(date:*), Agent
user-invocable: true
disable-model-invocation: true
---

# Design System Auditor — orchestrator

Verify a project's implementation against its own design system and report the findings — DRIFT,
GAP, UNTRACKED. You are the ORCHESTRATOR: classifying findings is the audit agents' job; you run
the gate, one scope question, the deterministic pre-pass, the fan-out, and the report assembly —
nothing else. The audit can only tell, never touch: the single artifact this skill produces is the
report file.

Input contract: the design-system dir defaults to `.superui/design-system/` (`<sys>` below); the
audit scope (paths/globs, surface labels) comes from the invocation when present, else from step 2.

Today: !`date +%F`

## Ground rules

- READ-ONLY toward the implementation AND `<sys>` — never create, edit, or delete anything in
  either. Your only writes: `<run>` state files and the report file.
- NEVER classify a finding inline — the three audit agents do (Agent tool,
  `subagent_type: superui:<agent-name>`), even when the call looks small.
- Never assume a framework, technology, or platform — scope globs and surface labels come from the
  user, free-form; nothing in this audit is stack-specific.
- Fan-out steps run agents in parallel, batched (about 5 concurrent); wait for a batch before
  dispatching the next.
- Workers never talk to the user; they return `> NEEDS INPUT` markers you carry into step 6.
- Trust the scripts: each verifies its own result — do not re-check or hand-edit script output.
- Paths: `<run>` = `.temp/design-system-auditor/<date>/` (run state); the report =
  `.superui/reports/design-system-auditor-<date>.md`; `<date>` = the Today line above.

## Checklist — execute in order, never skip a step or a gate

### 1 — Gate [you]
Run `sh "${CLAUDE_PLUGIN_ROOT}/scripts/check_node.sh"`. `NODE_MISSING` -> the pre-pass `*.ts`
steps need Node.js >= 22.6; point the user at `/superui:setup` and stop. `NODE_OK <cmd>` -> use `<cmd>`
in place of `node` everywhere below.
Check `<sys>/DESIGN.md` exists (Glob). ABSENT -> there is no design system to audit against; say so
and stand down (suggest `design-system-extractor` / `design-system-creator` only if the user asks).
PRESENT -> `mkdir` `<run>`.

### 2 — Scope interview [you + user] — one question
Ask in prose, one message: which implementation paths/globs to audit, and whether to audit one
platform surface or several (free-form labels in the user's own words — never a hardcoded platform
list). Skip only what the invocation already answered. GATE: scope resolved and non-empty.

### 3 — Deterministic pre-pass [you + scripts]
- Resolve the scope globs (Glob) and Write the resulting file list, one path per line, to
  `<run>/scope-files.txt` (one list per surface when several: `scope-files-<label>.txt`).
- System validators — their output lines go into the report's System health section verbatim (a
  broken system is itself a finding, not a stop):
  - `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate_tokens.ts" <sys>/dtcg.yml`
  - `node "${CLAUDE_PLUGIN_ROOT}/scripts/check_spec_tokens.ts" <sys>`
  - Contrast — two runs, one per theme, same pair-selection rule applied to both: build the
    text-on-background pairs that `DESIGN.md`'s accessibility/theming sections name (when they name
    none: each text role on each surface role, and each `on-<bg>` text role on its own `<bg>`
    instead; skip alpha-bearing values). Build them once from `<sys>/tokens.css` `:root` values into
    `<run>/contrast-pairs-light.json`, once from the `.dark` block into `<run>/contrast-pairs-dark.json`
    (a token with no dark override takes its inherited `:root` value). `tokens_to_css.ts` emits alias
    tokens as `var(--target-path)` in BOTH blocks and `check_contrast.ts`'s `parse_color()` accepts
    only `#rgb`, `#rrggbb`, `rgb(r,g,b)` — dereference every `var(--x)` chain to its literal before
    writing a pair; a value that resolves to no literal is skipped exactly like an alpha-bearing one,
    never handed to `check_contrast.ts`. Resolution is THEME-AWARE: a `var(--x)` in the dark set
    resolves to `.dark`'s `--x` when `.dark` declares it, else falls back to `:root`'s (resolving a
    dark alias straight against `:root` would silently re-check the light value). `tokens.css` carries
    no `.dark` block, or the block declares nothing -> record a one-line skip note for the dark run
    and continue (never a failure, never a stop). Run
    `node "${CLAUDE_PLUGIN_ROOT}/scripts/check_contrast.ts" --json <run>/contrast-pairs-light.json`
    and, when the dark run was not skipped,
    `node "${CLAUDE_PLUGIN_ROOT}/scripts/check_contrast.ts" --json <run>/contrast-pairs-dark.json`.
- Scanner, once per scope list:
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/scan_hardcoded_values.ts" <run>/scope-files.txt <sys>/dtcg.yml > <run>/scan.txt`
  (per surface: `scan-<label>.txt`). Exit 1 (unreadable list or `dtcg.yml`) -> record it as a
  System health finding, skip the token-drift dispatch, continue with the other two agents.
- Known gap marks: Grep the scoped files for `design-system-gap:` and Write the hits, one
  `<file>:<line>: <comment>` per line, to `<run>/known-gaps.txt` (write the file even when empty).
GATE: scope list non-empty; validators and scanner ran (their failures are findings, not stops).

### 4 — Audit fan-out [3 agents per surface, parallel]
Spawn per surface (a single unlabeled surface = one trio; suffix outputs `-<label>` when several):
- `superui:token-drift-auditor` — scan-output path, `<sys>/dtcg.yml`, `<sys>/tokens.css`,
  `<sys>/DESIGN.md`, known-gaps path, surface label, output `<run>/findings-drift.md`.
- `superui:spec-fidelity-auditor` — scope-list path, the `<sys>` dir (components/, patterns/,
  DESIGN.md, dtcg.yml, inventory.md), surface label, output `<run>/findings-spec.md`.
- `superui:inventory-coverage-auditor` — scope-list path, `<sys>/inventory.md`, surface label,
  output `<run>/findings-inventory.md`.
GATE: every dispatched agent's findings file exists (an explicitly empty one counts).

### 5 — Report assembly [you]
Mechanical merge — the sole orchestrator write beyond `<run>`; no re-judging, no new findings.
`mkdir` `.superui/reports/` and write the report (structure below): deduplicate (identical
file:line + category + violated rule -> one entry, keep the more specific fix), sort every category
table by severity (high, medium, low), compute the counts. GATE: the report file exists; nothing
under `<sys>` or the scoped implementation files was written this run.

### 6 — Present [you]
Print the report path and the Executive summary section verbatim, plus every collected
`> NEEDS INPUT` item. Keep it short — the detail lives in the report.

## Contracts

### Finding entry (the ONLY thing audit agents return, one line per finding)
```
- [DRIFT/<high|medium|low>] <file>:<line> · <what was found> · violates: <`token.path`, <spec-file>#<section>, or DESIGN.md rule> · fix: <one line>
- [GAP/<high|medium|low>] <file>:<line> · <the need the system does not define> · route: <design-system-extractor | design-system-completer> · fix: <one line>[ · known]
- [UNTRACKED/<high|medium|low>] <file>:<line> · <component in code absent from inventory.md, or inventoried entry not found on the audited surface> · fix: <one line>
```
GAP routing follows the guardian's rule: measurable from the project's source screenshots ->
`design-system-extractor`; never shown in the source (a missing state, dark coverage, token role) ->
`design-system-completer`. `· known` marks a site already carrying a `design-system-gap:` comment.
Severity: high = visible brand/accessibility impact or a systemic pattern (the same violation
across many sites); medium = isolated but user-visible; low = cosmetic or edge.

### Report structure (`.superui/reports/design-system-auditor-<date>.md`)
1. `## Executive summary` — counts per category and severity, the top 3-5 systemic risks, and the
   recommended next actions: which GAP findings route to `design-system-extractor` vs
   `design-system-completer`; DRIFT and UNTRACKED findings are plain code/inventory fixes.
2. `## Operational findings` — first `### System health` (validator output verbatim, then contrast
   output as two theme-labeled verbatim blocks — light and dark, the dark block replaced by its
   skip note when `.dark` was absent or empty), then one table per category — `### DRIFT`, `### GAP`,
   `### UNTRACKED` — columns: severity, file:line, what was found, the violated token/spec rule
   (token paths in backticks), suggested fix.
3. `## Method appendix` — scope globs and surface labels, files-scanned count, validators run,
   agents dispatched, and limitations (dynamic/computed styles are not statically detectable; value
   families with no tokens are not scanned).

## Scope boundary
`design-system-guardian` owns in-session PREVENTION while UI is being written; this skill owns
after-the-fact DETECTION across an existing codebase — it only reports and routes. Filling gaps
belongs to `design-system-completer`, measuring belongs to `design-system-extractor`, and fixing
code belongs to whoever the user hands the report.
