---
name: setup
description: Setup superdev environment.
allowed-tools: Read, Glob, Grep, Bash, Write, AskUserQuestion
user-invocable: true
disable-model-invocation: true
---

## Setup

Runs in the **main session** (NOT a fork) so it can ask the user about the opt-in switches via
`AskUserQuestion`. The block below runs at skill load (working dir = the project root) and is idempotent —
re-running `/setup` never overwrites anything that already exists. It:

- creates `.superdev/` and `.temp/` when they are missing,
- seeds `.gitignore` from the bundled template when the project has none,
- seeds `.claude/settings.json` from the bundled template when the project has none,
- reports whether `.superdev/config.yml` already exists (and its current switches if so).

The bootstrap logic lives in a bundled deterministic script (one command, so Claude Code's Bash
permission checker approves it as a unit instead of demanding approval for each sub-operation):

```!
bash "${CLAUDE_SKILL_DIR}/scripts/bootstrap.sh"
```

## Configure the opt-in switches

Read the `config.yml:` line the block above printed.

**If `config.yml` already exists** — do **NOT** overwrite it; it is the user's choice record. Report its
current switch values (printed above) and note that they can change them by editing `.superdev/config.yml` by
hand (or deleting it and re-running `/setup`). Skip straight to **Output**.

**If `config.yml` is MISSING** — ask the user which optional areas to enable, then write the file:

1. Call `AskUserQuestion` **once** with two `multiSelect` questions (the five switches don't fit one
   four-option picker, and they split cleanly by where each takes effect). The user **checks the areas to
   ENABLE**; anything left unchecked is disabled. Every area defaults to enabled — recommend keeping them on
   unless the project clearly does not need it (e.g. leave `ui` off for a no-UI backend, `adr` off for a
   constantly refactored repo, `help` off when the product ships no end-user docs).
   - **"Which pipeline areas to enable? (unchecked = disabled)"** — switches the orchestrator honors:
     - `adr` — ADR capture (records the architectural *why* of structural decisions).
     - `rules_improver` — auto-promote per-task review learnings into `.claude/rules/`.
   - **"Which main-session areas to enable? (unchecked = disabled)"** — switches the injected manifest honors:
     - `artifacts` — Claude Code Artifacts (publish previews / plans as shareable claude.ai links).
     - `ui` — UI/design layer (the `ui-*` skills).
     - `help` — end-user help layer (`mem-help` writes the product's user documentation under `.superdev/help/`).
2. Map each area to `true` when the user selected it, else `false`.
3. `Write` `.superdev/config.yml` with this exact shape, substituting each `<true|false>` with the mapped value:

   ```
   # .superdev/config.yml — superdev opt-in switches (managed by /superdev:setup)
   # A missing file or key = enabled (fail-open). Flip a value to `false` to disable that area.
   adr:            <true|false>   # ADR capture — orchestrator runs dev-adr-analyzer
   artifacts:      <true|false>   # Claude Code Artifacts — cc-artifact publisher
   help:           <true|false>   # end-user help layer — mem-help writes .superdev/help/
   rules_improver: <true|false>   # auto-promote review learnings → .claude/rules/ (dev-improver step)
   ui:             <true|false>   # UI/design layer — ui-* skills
   ```

## Output

Emit exactly one message to the user in this shape:

```
## superdev setup complete

<one line per setup-block result — e.g. ".superdev/ created", ".temp/ already present", ".gitignore seeded from template", "settings.json already present">
<config line — e.g. "config.yml written: adr=on, artifacts=on, help=on, rules_improver=on, ui=off" OR "config.yml already present (left untouched): <current values>">

### Recommended next steps
- Run `/superdev:mem-claudemd` — bootstrap the CLAUDE.md project-memory cascade (general → specific).
- Run `/superdev:mem-rules` — author the `.claude/rules/` conventions layer.
```

Rules:
- Report the actual results from the block above — do not invent or assume them.
- **Never overwrite an existing `.superdev/config.yml`** — it records the user's choices.
- Do NOT invoke `mem-claudemd` / `mem-rules` (or any other skill) yourself — they are interactive and the user
  decides when to run them. Your job is to bootstrap the environment + recommend, not to chain.
