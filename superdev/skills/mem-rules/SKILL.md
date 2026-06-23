---
name: mem-rules
description: Project memory — the `.claude/rules/` layer. Discovers existing codebase conventions and generates `.claude/rules/*` from scratch (full reset), and owns the canonical contract for any single rules file. Use this skill whenever the user wants to initialize project conventions, regenerate `.claude/rules/`, discover coding/naming/testing conventions for a codebase, reset the project's rule library, or set up project memory rules. Triggers include "init rules", "memory rules", "initialize conventions", "regenerate `.claude/rules`", "discover conventions", "reset project rules". Also defines the canonical contract for authoring or editing a single `.claude/rules/` file — its `paths:` narrowest-glob scoping, size cap, single-topic targeting, frozen `_` convention, append-only edit discipline, and the relevance filter for deciding what is worth a rule — for any tool that promotes learnings into the rules library. Do NOT write `.claude/rules/*` files by hand — use this skill first; it enforces discovery-from-code and the path-scoping discipline rather than memory. Do NOT use for generating CLAUDE.md project-memory files — use the `mem-layers` skill. Trigger applies in any language and to descriptive phrasing too.
allowed-tools: EnterPlanMode, Read, Glob, Grep, Bash, Skill
model: opus
effort: medium
user-invocable: true
---

# mem-rules — the `.claude/rules/` layer of project memory

Owns **layer 3** of project memory and is the single source of truth for the shape and discipline of a `.claude/rules/` file. Invoked as `/superdev:mem-rules` for a full bootstrap, or engaged by any learning-promoter tool to obtain the contract below.

## Where this fits

Three memory layers, each loaded differently:

1. **General-rules manifest** — force-injected every session by a SessionStart hook (behaviour).
2. **CLAUDE.md cascade** — hierarchical project memory; owned by `mem-layers` (root always, deeper on demand).
3. **`.claude/rules/*`** — path-scoped conventions, loaded **only when the files you touch match a rule's `paths:` globs**.

This skill owns **layer 3 only** (CLAUDE.md → `mem-layers`; the manifest → the SessionStart hook).

**Conventions, not behaviour.** Rules hold **conventions** — how to write code in an area (naming, error shape, the path-scoped *should/must* a future edit follows). *What a feature does today* is behaviour and does **not** belong in a rule — if a candidate reads like "feature X behaves like Y," drop it. Rules stay NARROW (§B), TARGETED (§C), IMPORTANT-ONLY (§G); behaviour would blow all three.

## Mode gate — decide first

- **Bootstrap (full reset)** — invoked to initialize / regenerate / reset the whole library → run the **Bootstrap workflow** below (it enters plan mode).
- **Single-rule authoring** — engaged only to write or edit ONE rule (e.g. promoting a learning) → apply **the rules-file contract** and STOP. Do **NOT** enter plan mode, do **NOT** investigate the repo. The contract is the deliverable; the engaging tool performs the write.

## The rules-file contract (always applies)

A `.claude/rules/<topic>.md` file is a small, path-scoped unit of project convention. Every rule — discovered in bootstrap or promoted from a learning — obeys this contract.

- **§A — Shape.** Flat naming `{topic}.md` or `{prefix}-{topic}.md` (e.g. `frontend-styling.md`). YAML frontmatter with a `paths:` list. One `# Title`. Body in bullets. Real paths / classes / commands from the codebase — never generic boilerplate.

- **§B — `paths:` scoping (central principle).** The native loader injects a rule **only when the files being touched match its `paths:` globs** — this, not session-wide loading, keeps the library out of context when unneeded. Set `paths:` to the **narrowest** glob covering the topic's files (e.g. `src/api/**`, `**/*.test.ts`, `plugins/foo/**`), never broader. `paths: ["**"]` is **forbidden** except for a genuine *global-posture* rule that must inform every edit regardless of area (e.g. a repo-wide commit convention). A rule about one area MUST be scoped to that area. (`paths:` is the load-time lever and matters most; size / single-topic are the editorial levers.)

- **§C — Size & single-topic.** 10–25 lines of content (excluding frontmatter) for a discovered rule; a freshly-seeded rule stays **under 15 lines**. One area per file — if a rule spans two areas, split into two narrowly-scoped files.

- **§D — No duplication.** Do not repeat what `CLAUDE.md` or an existing rule already says. Before adding, `Grep` `.claude/rules/**/*.md` for 2–3 distinctive keywords; if an existing bullet already says it, skip.

- **§E — Frozen `_` convention.** A leading-underscore basename (`_{topic}.md`) is **frozen**: the native loader still loads it, but self-learning tools must never read, score, edit, or create it. Reserve for hand-authored / bootstrap meta-rules that must stay immutable.

- **§F — Write / edit discipline (incremental authoring).** Prefer extending an existing thematically-matching file over creating a new one. To **edit**: append 1–3 bullets in the file's existing style; under 5 lines added per file per run; append-only — never rewrite, reorder, or delete existing content. To **create**: only when no existing file is a clear thematic match; seed under 15 lines with the narrowest justified `paths:` (§B). Each bullet ≥ 5 words, concrete, no slogan ("write clean code", "be careful").

- **§G — Worth-recording filter.** Record a convention or learning only if all four hold: (1) **reusable** beyond the immediate task; (2) **non-obvious** to an engineer competent in the stack (not a textbook/framework fact); (3) **not a duplicate** (§D); (4) **actionable & concrete** (names a specific pattern, file shape, or guardrail). If any fails, do not write it.

## Bootstrap workflow (full reset only)

1. **Detect state**
   `scripts/detect_state.sh /path/to/project`
   → `state: none | has-rules` (frozen `_*.md` files do not count toward the rule count).

2. **Enter plan mode** — call `EnterPlanMode`.

3. **Scan conventions**
   `scripts/scan_conventions.sh [signal-file …]`
   Pass any linter / formatter / CI / build config paths as args; the script always also dumps `git log --oneline -20`, the CLAUDE.md inventory, and a depth-2–3 directory tree. Read 3–5 source + 2–3 test files per layer to confirm architecture / naming / error-handling / testing patterns.

4. **Plan the `.claude/rules/*` files** per the contract above — each with its narrowest `paths:` (§B), 10–25 lines, specific, no duplication (§D), passing §G. Common topics: architecture, code-style, database, testing, validation, styling — add / skip by what the codebase actually needs. Use `references/rule-template.md` for the concrete shape + worked examples.

5. **Write the plan** listing each rule file (filename, `paths:` globs, content bullets; for existing files, what to add). Rule files are written after approval — this skill **plans** the library, it does not write rule files.

## Resources

**Scripts:**
- `scripts/detect_state.sh` — `.claude/rules/` state (`none | has-rules`).
- `scripts/scan_conventions.sh` — stack-agnostic convention scanner (signal files + git history + CLAUDE.md inventory + directory tree).

**References:**
- `references/rule-template.md` — seed-rule template + worked examples + pre-write checklist.
