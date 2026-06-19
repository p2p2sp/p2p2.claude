---
name: mem-rules
description: Project memory — the `.claude/rules/` layer. Discovers existing codebase conventions and generates `.claude/rules/*` from scratch (full reset), and owns the canonical contract for any single rules file. Use this skill whenever the user wants to initialize project conventions, regenerate `.claude/rules/`, discover coding/naming/testing conventions for a codebase, reset the project's rule library, or set up project memory rules. Triggers include "init rules", "memory rules", "initialize conventions", "regenerate `.claude/rules`", "discover conventions", "reset project rules". Also defines the canonical contract for authoring or editing a single `.claude/rules/` file — its `paths:` narrowest-glob scoping, size cap, single-topic targeting, frozen `_` convention, append-only edit discipline, and the relevance filter for deciding what is worth a rule — for any tool that promotes learnings into the rules library. Do NOT write `.claude/rules/*` files by hand — use this skill first; it enforces discovery-from-code and the path-scoping discipline rather than memory. Do NOT use for generating CLAUDE.md project-memory files — use the `mem-init` skill. Trigger applies in any language and to descriptive phrasing too.
allowed-tools: EnterPlanMode, Read, Glob, Grep, Bash(ls), Bash(git log), Skill
model: opus
effort: medium
user-invocable: true
---

# mem-rules — the `.claude/rules/` layer of project memory

This skill owns **layer 3** of the project memory system and is the **single source of truth** for the shape and discipline of a `.claude/rules/` file. Invoked as `/superdev:mem-rules` for a full bootstrap, or engaged by any tool that authors a single rule (e.g. a learning-promoter) to obtain the canonical contract below.

## Where this fits (orientation)

The project memory system has three layers, each loaded differently:

1. **General-rules manifest** — force-injected every session by a SessionStart hook (behavioural rules).
2. **CLAUDE.md cascade** — hierarchical project memory; owned by the `mem-init` skill (root loads always, deeper files on demand).
3. **`.claude/rules/*`** — path-scoped convention rules, loaded by the native loader **only when the files you touch match a rule's `paths:` globs**.

**This skill owns layer 3 only.** It does not touch layers 1–2 (CLAUDE.md → the `mem-init` skill; the manifest → the SessionStart hook).

## Mode gate — decide this first

- **Bootstrap (full reset)** — you were invoked to initialize / regenerate / reset the whole rules library → run the **Bootstrap procedure** below (it enters plan mode).
- **Single-rule authoring** — you were engaged only to write or edit ONE rule (e.g. promoting a learning) → apply **The rules-file contract** below and STOP. Do **NOT** enter plan mode, do **NOT** investigate the repo. The contract is the deliverable; the engaging tool performs the actual write.

## The rules-file contract (always applies)

A `.claude/rules/<topic>.md` file is a small, path-scoped unit of project convention. Every rule — discovered in bootstrap or promoted from a learning — obeys this contract.

- **§A — Shape.** Flat naming `{topic}.md` or `{prefix}-{topic}.md` (e.g. `frontend-styling.md`). YAML frontmatter with a `paths:` list. One `# Title`. Body in bullets. Use real paths / classes / commands from the codebase — never generic boilerplate.

- **§B — `paths:` scoping (the central principle).** The native loader injects a rule **only when the files being touched match its `paths:` globs**. This — not session-wide loading — is what keeps the rules library out of context when its knowledge is not needed. Therefore set `paths:` to the **narrowest** glob that covers the topic's files (e.g. `src/api/**`, `**/*.test.ts`, `plugins/foo/**`), never broader. `paths: ["**"]` is **forbidden** except for a genuine *global-posture* rule that must inform every edit regardless of area (e.g. a repo-wide commit convention). A rule about one area MUST be scoped to that area. (Size and single-topic are the *editorial* levers; `paths:` is the *load-time* lever and matters most.)

- **§C — Size & single-topic.** 10–25 lines of content (excluding frontmatter) for a discovered rule; a freshly-seeded rule stays **under 15 lines**. One area per file — if a rule spans two areas, split it into two narrowly-scoped files.

- **§D — No duplication.** Do not repeat what `CLAUDE.md` or an existing rule already says. Before adding, `Grep` `.claude/rules/**/*.md` for 2–3 distinctive keywords; if an existing bullet already says it, skip.

- **§E — Frozen `_` convention.** A basename with a leading underscore (`_{topic}.md`) is **frozen**: the native loader still loads it, but self-learning tools must never read, score, edit, or create it. Reserve it for hand-authored or bootstrap meta-rules that must stay immutable.

- **§F — Write / edit discipline (incremental authoring).** Prefer extending an existing thematically-matching file over creating a new one. To **edit**: append 1–3 bullets in the file's existing style; under 5 lines added per file per run; append-only — never rewrite, reorder, or delete existing content. To **create**: only when no existing file is a clear thematic match; write a seed under 15 lines with the narrowest justified `paths:` (§B). Each bullet ≥ 5 words, concrete, no slogan ("write clean code", "be careful", "use best practices").

- **§G — Worth-recording filter.** Record a convention or learning as a rule only if all four hold: (1) **reusable** beyond the immediate task; (2) **non-obvious** to an engineer competent in the stack (not a textbook/framework fact); (3) **not a duplicate** of an existing rule (§D); (4) **actionable & concrete** (names a specific pattern, file shape, or guardrail). If any fails, do not write it.

## Bootstrap procedure (full reset)

Run only in **Bootstrap** mode.

1. **Enter plan mode** — call `EnterPlanMode`.

2. **Investigate** the codebase:
   - Tech stack, frameworks, key deps (config files, package.json, *.csproj…).
   - Directory structure (top 2 levels per layer).
   - Architecture / naming / error-handling patterns (read 3–5 source files per layer).
   - Testing: framework, naming, runner commands (2–3 test files).
   - Code-style tooling (.editorconfig, eslint, prettier, Directory.Build.props…).
   - Git commit conventions (`git log --oneline -20`).
   - CLAUDE.md hierarchy: glob `**/CLAUDE.md` — count and note which directories have them.

3. **Plan the `.claude/rules/*` files** per **The rules-file contract** above — each with its narrowest `paths:` (§B), 10–25 lines, specific, no duplication, passing §G. Common topics: architecture, code-style, database, testing, validation, styling — add/skip by what the codebase actually needs.

4. **claude-md-maintenance rule.** If 2+ CLAUDE.md files exist, also plan `claude-md-maintenance.md`:
   - `paths:` — source-root glob (e.g. `src/**`) so it loads whenever code is touched.
   - **Ownership map** — table of `File → what it owns` for every existing CLAUDE.md.
   - **Update triggers** — which code events require updating which CLAUDE.md (new file, new event type, new dependency, new CLI command, new context variable, new test class…).
   - **Format conventions** — title (`# CLAUDE.md — relative/path`), back-link to parent, ~40-line root / ~80-line deeper budgets, split threshold (~10 non-trivial lines for a module → move out + one-line stub + link).
   - **When to create a new sub-CLAUDE.md** — criteria derived from the project's actual structure.

5. **Write the plan** listing each rule file (filename, `paths:` globs, content bullets; for existing files, what to add/change). The rule files themselves are written after approval — this skill **plans** the library, it does not write rule files.
