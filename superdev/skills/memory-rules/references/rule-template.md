# Rule Templates & Examples

On-demand companion to the `memory-rules` SKILL.md. Load when seeding a new `.claude/rules/<topic>.md` or appending to an existing one. The SKILL.md body owns the contract (§A–§G); this file is the concrete shape plus worked examples. Analogous to `memory-layers`' `templates.md` + `node-examples.md`.

## Seed-rule template

A freshly-seeded rule stays **under 15 lines** of content (excluding frontmatter), one `# Title`, body in bullets, narrowest justified `paths:` (§B). Use real paths / classes / commands from the codebase — never the placeholders below verbatim.

```markdown
---
paths:
  - "<narrowest glob covering the topic's files, e.g. src/api/**>"
---
# <Topic Title>

- <Concrete convention bullet — names a specific pattern, file, or guardrail; ≥ 5 words.>
- <Another bullet — the should/must a future edit in this area follows.>
- <Anti-pattern bullet — what NOT to do here, with the real reason.>
```

Rules may live **flat** (`.claude/rules/<topic>.md`) or in **nested per-domain directories** (`.claude/rules/<domain>/<topic>.md`, e.g. `frontend/styling.md`, `api/errors.md`) — nested rules are first-class (the loader and `detect_state.sh` walk the tree at any depth). Prefer a `<domain>/<topic>.md` layout that mirrors the codebase's real architectural units (§A).

Frontmatter rules:
- `paths:` is a YAML list of globs. Set it to the **narrowest** glob that covers the topic's files. `paths: ["**"]` is forbidden except for a genuine global-posture rule (e.g. a repo-wide commit convention).
- A leading-underscore basename (`_<topic>.md`) marks a **frozen** rule: the loader still injects it, but self-learning tools must never read, score, edit, or create it. Reserve it for hand-authored / meta rules.

## Worked example 1 — a discovered convention turned into a rule

During bootstrap you read 3 source files under `src/api/` and notice every handler returns errors through one helper. That is reusable, non-obvious, not a duplicate, and actionable — it passes §G. Seed a new file:

```markdown
---
paths:
  - "src/api/**"
---
# API error handling

- Return every handler error through `src/api/errors/to-problem.ts` (RFC-7807 shape); never `res.status().json()` an ad-hoc body.
- Validation failures map to 422 via `to-problem.ts`; only `to-problem.ts` sets the HTTP status.
- Do NOT throw raw `Error` out of a handler — wrap it in `AppError` so the error middleware can classify it.
```

`paths:` is scoped to `src/api/**` (the area the convention governs), not `**` — so the loader injects it only when an API file is being touched.

## Worked example 2 — appending to an existing rule

A task review surfaces a new learning: API list endpoints must paginate. A thematically-matching file (`api-error-handling.md`, or a broader `api-conventions.md`) already exists, so **extend it** rather than create a new file — append-only, 1–3 bullets, under 5 lines added, in the file's existing style (§F):

```markdown
- List endpoints under `src/api/**/list-*.ts` MUST paginate via `?cursor=`; an unbounded list response is a review-blocker.
```

Do not rewrite, reorder, or delete existing bullets when appending. If no existing file is a clear thematic match, seed a new one under 15 lines instead.

## Quick checklist before writing

- Place the file flat (`<topic>.md`) or nested under its domain (`<domain>/<topic>.md`, §A) — pick the layout that mirrors the codebase's real architectural units.
- `paths:` is the narrowest glob (§B) — not `**` unless genuinely global-posture.
- Content fits the size budget — under 15 lines seeded, 10–25 lines for a discovered rule (§C).
- One area per file; split if it spans two (§C).
- No duplication of `CLAUDE.md` or an existing rule — `Grep` `.claude/rules/**/*.md` for 2–3 keywords first (§D).
- Every bullet ≥ 5 words, concrete, no slogan; passes the §G worth-recording filter.
- Never touch a `_`-prefixed frozen file (§E).
