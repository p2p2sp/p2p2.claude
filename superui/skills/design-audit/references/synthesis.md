# Synthesis — verify, classify, cluster, assemble the report

The detective sweep produces many candidate findings of mixed quality. This phase turns them into one trustworthy report. Cardinal rule: never file a finding you have not confirmed against the design system on disk. Cheap to generate, expensive to be wrong.

## Detective report schema

Each detective writes one file to `.temp/superui-audit/<run-id>/reports/<rank>-<slug>.md`. It carries two kinds of entry — Wave 1 findings and Wave 2 candidates — plus the fixed tail defined below. These schemas are duplicated verbatim in the `design-detective` agent definition (which cannot read this file at runtime) — keep the two copies identical.

### Wave 1 — compliance finding

```
BUCKET: Drift | Gap
LOCATION: path/to/file.ext:Lstart-Lend
SIGNAL: <the exact literal / class / variant, e.g. `#111827`, `bg-[#0af]`, sx={{color:'#111'}}>
RULE: <the documented token/component it maps to, OR "no documented equivalent">
ACTION: <Drift -> "replace with <token/component>"; Gap -> "candidate extension: <what is missing>">
CONFIDENCE: low | medium | high
```

Rule for the bucket: read `tokens.css` / `design-tokens.yaml` and `components/inventory.md` before deciding. A literal that resolves to an existing semantic token/component is Drift with the exact replacement named. A literal with no documented equivalent is a Gap — never propose a mechanical swap for a Gap; route it to `superui:extract-design-system` / `superui:create-component`.

### Wave 2 — library candidate

```
CANDIDATE: Type I | Type II
NAME: <short component name, e.g. MetricTile>
OCCURRENCES:
  - path/to/a.ext:Lx-Ly
  - path/to/b.ext:Lx-Ly
INVENTORY: <matching components/inventory.md entry, OR "absent">
PROPOSAL: <Type I -> "centralize into the shared library"; Type II -> "author via superui:create-component, then reuse">
```

Type I = the structure maps onto an existing `inventory.md` entry but is re-implemented inline in >= 2 places. Type II = a recurring component-like structure with NO inventory match, repeated in >= the recurrence threshold (default 3; passed to the detective by the orchestrator). Grouping is semantic and supra-idiomatic — a Flutter widget, a JSX block, and an HTML fragment that render the same thing are one candidate.

### Fixed tail — the report's mandatory last line

```
CHECKED: <one line on what you examined and ruled out>
```

Every detective report ends with this line, findings or not — it is the coverage evidence.

### No finding

If nothing real survives, the detective writes a file whose entire body is `NO FINDING` followed by the fixed tail (`CHECKED: …`). Keep these — they are coverage evidence.

## Confirm before you report (anti-slop)

The design-audit oracle is the design system on disk, not a clean git checkout. Before filing:

- For a Drift finding: open `tokens.css` / `design-tokens.yaml` and confirm the named token actually exists with a matching role. If it does not, it is a Gap, not Drift.
- For a Gap finding: confirm no semantic token / inventory entry covers it — grep the token file for the value and near-synonyms first.
- For a Wave 2 candidate: confirm the occurrences are genuinely the same shape (not just similar names) and that the count clears the threshold.

## Deduplicate

- Wave 1: group findings by the same offending token/value across files; report once with all locations, keep the clearest replacement.
- Wave 2: group by component identity, not by file; the same candidate surfacing from several detectives is one entry with the union of occurrences.

## Final report (`.superui/layout/audit/design-audit-<timestamp>.md`)

Assemble every surviving finding into one document. Structure:

```markdown
# Design system audit — <project> (<yyyyMMdd-HHmm>)

## Metadata
Target: react-mui (family js-theme) · Root: .superui/layout/design-system/ · Scope: src/** · Files swept: 214

## Summary
Drift: 38 · Gaps: 6 · Library candidates: 9 (Type I: 5, Type II: 4) · Health: moderate

## Wave 1 — Compliance
### Drift (fixable, ranked by Impact x Opportunity)
| # | File:line | Signal | Replace with | Impact x Opp |
| 1 | src/ui/Card.tsx:42 | sx={{color:'#111'}} | theme.palette.text.primary | 20 |
### Gaps (need a design decision)
- src/ui/Toast.tsx:15 — no token for `#7a5cff` → candidate extension (extract-design-system)

## Wave 2 — Component library
### Type I — scattered known components
- Button (inventory: atomic/button) — inline in 6 files: … → centralize
### Type II — undocumented patterns
- MetricTile — 4 occurrences, absent from inventory → create-component, then reuse
### Extraction blueprint
<see below>

## Recommended next steps
1) … 2) …
```

The Metadata `Target:` line names the active target plus its idiom family — one of `css` (pure-css / tailwind / react-shadcn), `js-theme` (react-mui), `flutter`, or `agnostic` (no target adapted).

Write the report in the host project's documentation language; keep the section structure above.

### Extraction blueprint

A document, never an action. Render, for the active target's family:

- Sibling library layout: a package dir next to the project root (e.g. `../<project>-ui/`) or a monorepo `packages/ui/`.
- Referencing mechanism, family-correct:
  - CSS/markup + JS theme-object (families css, js-theme): an npm/pnpm/yarn workspace entry, or a `file:` path dependency (e.g. `"@app/ui": "file:../<project>-ui"`).
  - Flutter (family flutter): a `path:` dependency in `pubspec.yaml` (e.g. `app_ui: { path: ../<project>_ui }`).
  - pure-css: a shared CSS package/import.
- Move list: each candidate (Type I + promoted Type II) → its current scattered locations → its target path in the library.
- Migration ordering, a summary of the import rewrites at the call sites, risks, and a rough effort — written so it can be pasted into `superplan` / `superbuild` as the next step.

### Agnostic-mode variant (no active target)

When no target is adapted: the Metadata line reads `Target: (none) — agnostic mode`; Wave 1 and Wave 2 still fill (token/variant level and Type I/II candidates), but the blueprint's "Referencing" line reads `Referencing: deferred — run superui:adapt-target` instead of a concrete mechanism. Note in Summary that idiom checks were skipped and Wave 2 detectability is partial.
