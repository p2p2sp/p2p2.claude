---
name: mem-doc
description: Project memory — the `.superdev/documentation/` layer (current functional/behavioural truth, addressable by concept-slug). Discovers existing features and generates the documentation set from scratch (bootstrap), authors one new feature doc, or syncs slugs for an existing feature — and owns the canonical contract for any single doc file. Use this skill whenever the user wants to document what a feature does today, initialize / regenerate `.superdev/documentation/`, write or update a functional doc, record current behaviour, or sync a feature doc after a change. Triggers include "document this feature", "what does X do (write it down)", "init docs", "functional documentation", "update the docs for X", "sync the feature doc", "regenerate `.superdev/documentation`". Also defines the canonical contract for authoring or editing a single `.superdev/documentation/` file — its `feature:` + `source:` frontmatter, kebab `[concept-slug]` discipline, present-tense current-state rule (no changelog, link-ADRs-never-restate), and the `<domain>/<feature>.md` + `index.md` layout — for any tool that propagates feature-behaviour changes into the documentation library. Do NOT write `.superdev/documentation/*` files by hand — use this skill first; it enforces discovery-from-code, the slug discipline, and the current-state rule rather than memory. Do NOT use for the `why` of a decision (that is an ADR / `dev-adr-analyzer`) or for future intent (that is a spec / `dev-spec`). Trigger applies in any language and to descriptive phrasing too.
allowed-tools: EnterPlanMode, Read, Glob, Grep, Write, Edit, Bash(ls), Bash(git log), Bash(git diff), Skill
model: opus
effort: medium
user-invocable: true
---

# mem-doc — the `.superdev/documentation/` layer of project memory

This skill owns **layer 5** of the project memory system and is the **single source of truth** for the shape and discipline of a `.superdev/documentation/` file. Invoked as `/superdev:mem-doc` for interactive authoring, or engaged by any tool that syncs a single feature doc (e.g. the per-task memory propagator) to obtain the canonical contract below. This skill runs in the **main context** — it is interactive (bootstrap proposes before it writes); it is NOT a fork.

## Where this fits (orientation)

The project memory system divides current truth across five non-overlapping layers:

1. **General-rules manifest** — force-injected every session by a SessionStart hook (behavioural rules).
2. **CLAUDE.md cascade** — hierarchical agent-facing orientation; owned by the `mem-init` skill.
3. **`.claude/rules/*`** — path-scoped convention rules; owned by the `mem-rules` skill.
4. **`.superdev/adr/`, `.superdev/layout/`** — architectural decisions (*why*) and the design system.
5. **`.superdev/documentation/*`** — current functional/behavioural truth (*what each feature does today*), addressable by concept-slug. **This skill owns layer 5.**

**This skill owns layer 5 only.** It captures *what a feature does now* — not *why* a decision was made (that is an ADR; **link** to it, never restate it), not *future intent* (that is a spec; specs archive at ship time, this layer carries the realized behaviour), and not a terse agent pointer (that is `CLAUDE.md`). Do not author layers 1–4 here.

## Mode gate — decide this first

Decide the mode before anything else, exactly as `mem-rules` does:

- **Bootstrap** — you were invoked to initialize / regenerate / reset the whole documentation set for a repo (no `documentation/` subtree yet, or an explicit "regenerate all docs") → run the **Bootstrap procedure** below. It enters plan mode and proposes before writing (like `mem-init`).
- **Author-new** — you were asked to document ONE feature that has no doc yet → run the **Author-new procedure**: write its `<domain>/<feature>.md` and add its `index.md` entry. No repo-wide investigation.
- **Sync-existing** — you were engaged to update ONE feature's doc after a change (add / edit / **retire** slugs) → apply **The doc-file contract** to that one file and STOP. Do **NOT** enter plan mode, do **NOT** investigate the whole repo. When a tool engages this mode only to obtain the contract, the contract is the deliverable; the engaging tool performs the write.

## The doc-file contract (always applies)

A `.superdev/documentation/<domain>/<feature>.md` file is the current functional truth for one feature, addressable bullet-by-bullet via concept-slug. Every doc — bootstrapped, authored new, or synced — obeys this contract.

- **§A — Layout.** Files live at `.superdev/documentation/<domain>/<feature>.md`, where `<domain>` is a coarse area (e.g. `auth`, `billing`, `pipeline`) and `<feature>` is the named feature in kebab-case. A single `.superdev/documentation/index.md` maps every feature to its file. Use real paths / commands / names from the codebase — never generic boilerplate.

- **§B — Frontmatter.** Exactly two keys:
  - `feature:` — human-readable feature name (one line).
  - `source:` — a glob (or list of globs) for the production code that implements this feature. This is the **load-bearing** key: it is what `mem-guardian` and the pipeline use to detect that a code change touches this feature and the doc must move with it. Set it to the **narrowest** glob(s) that actually cover the feature's code (e.g. `src/auth/**`, `skills/dev-*/**`), never broader. A doc with no `source:` is a gap, not a valid doc.

- **§C — Concept-slug discipline (the central principle).** Every behavioural bullet that another doc, task, or agent may need to point at is tagged with a `[concept-slug]` at the **start** of the bullet. Slug rules, all mandatory:
  1. **kebab-case** — lowercase, hyphen-separated (`token-refresh`, `idle-timeout`).
  2. **name the concept** — describe the behaviour, not a sequence number (`session-expiry`, never `feature-3`).
  3. **unique within its file** — no two bullets in one doc share a slug.
  4. **retired-never-repurposed** — when a behaviour is removed, delete its bullet and never reuse that slug for a different concept. A retired slug is permanently burned.
  5. **no counter** — never `concept-1` / `concept-2`; a counter is the no-name anti-pattern.
  - A bullet is referenced from elsewhere as `domain/feature#slug` (e.g. `auth/login#token-refresh`).

- **§D — Present-tense current-state discipline.** Document **what the feature does now**, in present tense. No changelog, no "previously…", no "we changed X to Y", no dated history. A doc is a snapshot of the live behaviour, not a story of how it got there. When the *why* matters, **link** to the ADR (`see .superdev/adr/NNNN`); never restate the decision's rationale inline. When future intent matters, that is a spec — it does not belong here.

- **§E — No duplication / right altitude.** Do not repeat what `CLAUDE.md` (agent pointers), an ADR (the *why*), a spec (*future intent*), or `.claude/rules/` (conventions) already owns. This layer is functional *what*, at human-readable altitude. Before adding a feature, `Grep` `.superdev/documentation/**/*.md` for the feature's distinctive terms; if a doc already covers it, sync that doc rather than create a second.

- **§F — Write / edit discipline.** Prefer extending the matching existing doc over creating a new file. **Sync** = add / edit / retire bullets in the file's existing style, keeping every slug rule in §C intact; never silently collide or repurpose a slug (a rename is a deliberate, breaking change — flag it, never auto-collide). **Create** = only when no existing doc covers the feature; write the `feature:` + `source:` frontmatter, the behavioural bullets each with a `[concept-slug]`, and add the matching `index.md` entry in the same pass. Each bullet is concrete and names the real behaviour — no slogans, no placeholders.

- **§G — `index.md` format.** `.superdev/documentation/index.md` is the feature registry: one `# Documentation index` title, then a row per feature mapping `feature → domain/feature.md → source: glob`. Every authored or bootstrapped doc has exactly one index row; retiring a feature removes its row. The index is what lets a task resolve "which doc covers this code" from a `source:` glob without scanning every file.

## Bootstrap procedure (full reset)

Run only in **Bootstrap** mode. Approval-first, propose-then-write — exactly like `mem-init`.

1. **Enter plan mode** — call `EnterPlanMode`. Nothing is written until the user approves.

2. **Investigate** the codebase to recover the *current* behaviour to document:
   - Feature surface: entry points, public APIs / commands / routes / CLI verbs, top-level modules (read 3–5 source files per area).
   - Directory structure (top 2 levels) → candidate `<domain>` groupings.
   - Existing `CLAUDE.md` / `.superdev/adr/` to know what is already owned elsewhere (do not duplicate; link ADRs).
   - `git log --oneline -20` and `git diff` only to orient on what the live code does — **document the present state, not the history** (§D).

3. **Plan the documentation set** per **The doc-file contract** above: the list of `<domain>/<feature>.md` files, each with its `feature:` name, narrowest `source:` glob(s) (§B), and the concept-slugged behavioural bullets (§C–§D), plus the `index.md` registry (§G). One feature per file; no duplication of layers 1–4 (§E).

4. **Propose the file set for approval.** Present the user the list of docs to create — each `domain/feature.md` with a one-line justification and its `source:` glob — and the index. **Ask for approval before writing.** If docs already exist, propose improvements to the existing files rather than overwriting blindly.

5. **Write the set after approval.** Write each `<domain>/<feature>.md` and the `index.md` registry. The bootstrap is delivered as the capability; the writes happen only post-approval.

## Author-new procedure (one feature)

Run in **Author-new** mode (one undocumented feature, no repo-wide reset).

1. Confirm no existing doc already covers the feature (§E — `Grep` `.superdev/documentation/**`). If one does, switch to **Sync-existing** on that file.
2. Read the feature's production code to capture its *current* behaviour.
3. Write `.superdev/documentation/<domain>/<feature>.md` per the contract: `feature:` + narrowest `source:` (§B), present-tense behavioural bullets each with a unique `[concept-slug]` (§C–§D), ADR links not restatements (§D).
4. Add the matching `index.md` row (§G) in the same pass.

## Anti-patterns (forbidden)

- **Changelog / history.** "Previously…", "we changed X", dated entries — §D forbids it; document only the present state.
- **Restating an ADR.** Pasting a decision's *why* inline instead of linking `.superdev/adr/NNNN` — §D; link, never restate.
- **Future intent.** Documenting what a feature *will* do (that is a spec, archived at ship); this layer is realized behaviour only.
- **Counter slugs / repurposed slugs.** `concept-1`, `feature-3`, or reusing a retired slug for a new concept — §C(2,4,5).
- **A doc with no `source:`** — §B; the `source:` glob is what makes the doc syncable and guardable. A doc without it is a gap.
- **Overlapping a sibling layer.** Re-stating a `CLAUDE.md` pointer, a `.claude/rules/` convention, or a design-system token here — §E; each fact lives at exactly one layer.
- **Writing in sync-existing without the contract.** Editing slugs by hand instead of per §C–§F (silently colliding a slug, dropping the `[concept-slug]` tag, rewriting history).
- **Bootstrapping without approval.** Writing the doc set before the plan-mode proposal is approved — Bootstrap is propose-then-write (§4).

# Constraint — technology-agnostic

Operates in any language and any framework. Never assume a stack from file extensions or directory names. Every project-specific fact (what the features are, where their code lives, the domain groupings) is read from the project's own code, `CLAUDE.md`, `.claude/rules/`, and `.superdev/` — never from a default.
