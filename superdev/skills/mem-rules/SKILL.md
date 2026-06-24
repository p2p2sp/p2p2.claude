---
name: mem-rules
description: Project memory — the `.claude/rules/` layer. Discovers existing codebase conventions and generates `.claude/rules/*` from scratch (full reset), and owns the canonical contract for any single rules file. Use this skill whenever the user wants to initialize project conventions, regenerate `.claude/rules/`, discover coding/naming/testing conventions for a codebase, reset the project's rule library, or set up project memory rules. Triggers include "init rules", "memory rules", "initialize conventions", "regenerate `.claude/rules`", "discover conventions", "reset project rules". Also defines the canonical contract for authoring or editing a single `.claude/rules/` file — its `paths:` narrowest-glob scoping, size cap, single-topic targeting, frozen `_` convention, append-only edit discipline, and the relevance filter for deciding what is worth a rule — and is the sole authoring engine that promotes learnings into the rules library. Do NOT write `.claude/rules/*` files by hand — use this skill first; it enforces discovery-from-code and the path-scoping discipline rather than memory. Do NOT use for generating CLAUDE.md project-memory files — use the `mem-layers` skill. Trigger applies in any language and to descriptive phrasing too.
allowed-tools: EnterPlanMode, Read, Glob, Grep, Bash, Write, Edit, Skill
model: opus
effort: medium
user-invocable: true
---

# mem-rules — the `.claude/rules/` layer of project memory

Owns **layer 3** of project memory and is the single source of truth for the shape and discipline of a `.claude/rules/` file.

## Where this fits

Three agent-facing memory layers, each loaded differently:

1. **General-rules manifest** — force-injected every session by a SessionStart hook (behaviour).
2. **CLAUDE.md cascade** — hierarchical project memory; owned by `mem-layers`.
3. **`.claude/rules/*`** — path-scoped conventions, loaded **only when the files you touch match a rule's `paths:` globs**. ← this skill owns layer 3 only.

**Conventions, not behaviour.** Rules hold **conventions** — how to write code in an area (naming, error shape, the path-scoped *should/must* a future edit follows). *What a feature does today* is behaviour and does **not** belong in a rule — drop any candidate that reads like "feature X behaves like Y".

## The rules-file contract (always applies — every mode)

A `.claude/rules/` file is a small, path-scoped unit of project convention. Every rule — discovered in bootstrap or promoted from a learning — obeys this contract.

- **§A — Shape.** Flat `{topic}.md` / `{prefix}-{topic}.md` **or** nested `{domain}/{topic}.md` (e.g. `frontend/styling.md`, `api/errors.md`) — `detect_state.sh` counts non-frozen `*.md` recursively, so nested rules are first-class. YAML frontmatter with a `paths:` list. One `# Title`. Body in bullets. Real paths / classes / commands from the codebase — never generic boilerplate.
- **§B — `paths:` scoping (central principle).** The loader injects a rule **only when the touched files match its `paths:` globs** — this, not session-wide loading, keeps the library out of context when unneeded. Set `paths:` to the **narrowest** glob covering the topic's files (e.g. `src/api/**`, `**/*.test.ts`), never broader. `paths: ["**"]` is **forbidden** except for a genuine *global-posture* rule that must inform every edit (e.g. a repo-wide commit convention). (`paths:` is the load-time lever and matters most; size / single-topic are editorial.)
- **§C — Size & single-topic.** 10–25 content lines (excluding frontmatter) for a discovered rule; a freshly-seeded rule stays **under 15 lines**. One area per file — split a two-area rule into two narrowly-scoped files.
- **§D — No duplication.** Don't repeat what `CLAUDE.md` or an existing rule says. Before adding, `Grep` `.claude/rules/**/*.md` for 2–3 distinctive keywords; if an existing bullet already says it, skip.
- **§E — Frozen `_` convention.** A leading-underscore basename (`_{topic}.md`) is **frozen**: the loader still loads it, but self-learning tools must never read, score, edit, or create it. Reserve for hand-authored / bootstrap meta-rules.
- **§F — Write / edit discipline.** Prefer extending a thematically-matching file over creating one. **Edit:** append 1–3 bullets in the file's style; under 5 lines added per file per run; append-only — never rewrite, reorder, or delete. **Create:** only when no existing file is a clear match; seed under 15 lines with the narrowest justified `paths:` (§B). Each bullet ≥ 5 words, concrete, no slogan.
- **§G — Worth-recording filter.** Record a convention/learning only if ALL four hold: (1) **reusable** beyond the immediate task; (2) **non-obvious** to an engineer competent in the stack; (3) **not a duplicate** (§D); (4) **actionable & concrete** (names a specific pattern, file shape, or guardrail). Any fail → don't write it.

## Mode gate

This skill has three modes — **A** (uninitialized bootstrap), **B** (initialized gap-fill), **C** (improver-driven authoring fork). The mode is decided **deterministically** by the router below from your `$ARGUMENTS` (the `Mode: improver` marker → C; otherwise `detect_state.sh` on the target path → `none`=A / `has-rules`=B). It injects the **one** matching playbook — follow it exactly and ignore the other two modes. The `MODE:` / `state:` header is already-resolved context: do **not** re-run `detect_state.sh`.

--- playbook ---
!`"${CLAUDE_PLUGIN_ROOT}/skills/mem-rules/scripts/route.sh" "$ARGUMENTS"`
--- playbook ---

## Resources

**Scripts:**
- `scripts/route.sh` — mode router; injects the one matching `references/mode-*.md` (above).
- `scripts/detect_state.sh` — `.claude/rules/` state (`none | has-rules`); counts non-frozen `*.md` recursively at any depth.
- `scripts/scan_extensions.sh` — extension histogram over tracked source files, for resolving / appending `rule_extensions` in `.superdev/config.yml` (Mode A/B).
- `scripts/scan_conventions.sh` — stack-agnostic convention scanner (signal files + git history + CLAUDE.md inventory + directory tree; `-- <ext-globs>` adds per-extension file listings).

**References:**
- `references/mode-{a,b,c}.md` — the per-mode playbooks (injected by `route.sh`, not read directly).
- `references/rule-template.md` — seed-rule template + worked examples + pre-write checklist.
