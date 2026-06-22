---
name: mem-claudemd
description: Use ALWAYS when the user wants to create, initialize, regenerate or bootstrap CLAUDE.md project-memory files for a repository (e.g. "create CLAUDE.md", "initialize project memory", "bootstrap Claude context"). Generates a general-to-specific CASCADE of CLAUDE.md files, not a single root file.
user-invocable: true
---

# mem-claudemd — generate a CLAUDE.md CASCADE (general → specific)

This skill ships in the `superdev` plugin and is invoked as `/superdev:mem-claudemd` or auto-triggered from natural language ("create CLAUDE.md", "initialize project memory"). As a plugin skill it is namespaced — it does **not** override Claude Code's built-in `/init`; a bare `/init` still resolves to the built-in.

Do **not** produce a single root `CLAUDE.md`. Produce a **hierarchical cascade** of `CLAUDE.md` files: one general root file plus progressively more specific files in subdirectories that are genuine architectural units.

## Why a cascade (the empirical principle)

An agent works most efficiently when context is laid out **hierarchically**: the root file gives orientation and loads into every session; deeper files supply local detail and are pulled in only when working inside that directory. A single monolith forces every session to carry detail it does not need and buries the orientation that it does. Distribute memory — root broad, leaves narrow.

## Hard generation rule — "from general to specific"

1. **Root `CLAUDE.md`** — GENERAL information only:
   - what the project is;
   - a short high-level architecture sketch;
   - key commands (build / lint / test / run);
   - global conventions;
   - a map of modules / directories (where to find what).

   Keep it **small** — target **≤ ~40 lines** — it is loaded into every session (see *File-size budget* below).

2. **Subdirectory `CLAUDE.md` files** — progressively more DETAILED, depending on that directory's content. Each file describes **only its own area** (a module, a frontend app, a package) and does **not** repeat what the root already states.

3. The **deeper** in the tree, the **narrower and more technical** the file's scope — these specific files may run a bit longer (up to **~80 lines**), because they load only when working in that area, not into every session.

4. Place a `CLAUDE.md` in a directory **only** when that directory is a meaningful, self-contained architectural unit (a module, an application, a significant library). **Do not clutter every folder.**

5. Prefix **every** generated file with this exact header:

   ```
   # CLAUDE.md

   This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
   ```

## File-size budget — general small, specific larger

Concrete caps, because the root loads into **every** session while deeper files load only on demand:

| File | Scope | Target size |
| --- | --- | --- |
| Root `CLAUDE.md` | general orientation | **≤ ~40 lines** |
| Subdirectory `CLAUDE.md` | one specific unit | **≤ ~80 lines** |

**If a file would exceed its budget, do NOT let it grow.** Rewrite the over-large file and slim it back under the cap, then push the overflow detail DOWN into new, more specific `CLAUDE.md` files in the relevant subdirectories — leaving at most a one-line pointer in the parent. A too-large file is a signal to split, never to raise the cap.

## Procedure the agent MUST follow

1. **Discovery-first.** Before writing anything, inspect the repo: the directory tree, `README*`, any existing `CLAUDE.md` files, and configuration / manifest files (package.json, pyproject.toml, Cargo.toml, go.mod, *.csproj, etc.).

2. **Propose the architectural units.** Present the user a list of directories where `CLAUDE.md` files will be created, each with a one-sentence justification. **Ask for approval before writing.**

3. **If files already exist.** Do not blindly overwrite — propose improvements to the existing files instead.

4. **Generate the cascade.** Root = general; subdirectories = specific; no repetition between levels.

5. **Quality rules** (inherited from the original `/init` — keep them):
   - Do not repeat yourself; do not state the obvious ("Provide helpful error messages", "Write unit tests for all new utilities", "Never include secrets").
   - Do not enumerate every file/component that is trivially discoverable on its own.
   - Do not invent filler sections like "Common Development Tasks" or "Tips for Development" — write only what follows from files you actually read.
   - Fold in relevant excerpts from `README*` when it exists.

## Output discipline

- Always run discovery and present the proposed unit list **before** writing files.
- Never write a CLAUDE.md for a directory that is not a real architectural boundary.
- Never duplicate content across cascade levels — each fact lives at exactly one level (the broadest that fits).
- Keep each file within its size budget (root ≤ ~40 lines, subdirectory ≤ ~80 lines); when content overflows, split it down into a new subdirectory `CLAUDE.md` rather than letting any file bloat.
