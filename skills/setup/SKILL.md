---
name: setup
description: Setup superdev environment.
allowed-tools: ExitPlanMode, Read, Glob, Grep, Bash, Skill
model: haiku
context: fork
user-invocable: true
disable-model-invocation: true
---

## Setup

The block below runs at skill load (working dir = the project root) and is idempotent —
re-running `/setup` never overwrites anything that already exists. It:

- creates `.temp/` and `.docs/` when they are missing,
- flags a legacy `docs/` directory (if present) so you can recommend migrating it,
- seeds `.gitignore` from the bundled template when the project has none.
- seeds `settings.json` from the bundled template when the project has none.

```!
src_gitignore="${CLAUDE_SKILL_DIR}/assets/gitignore.txt"

if [ -d ".temp" ]; then
  echo ".temp: already present"; else mkdir -p ".temp" && echo ".temp: created";
fi

if [ -d ".docs" ]; then
  echo ".docs: already present"; else mkdir -p ".docs" && echo ".docs: created";
fi

if [ -d "docs" ]; then
  echo "docs: legacy 'docs/' directory found — RECOMMEND the user move its contents into '.docs/'"
fi

if [ -f ".gitignore" ]; then
  echo ".gitignore: already present (left untouched)"
elif [ -f "$src_gitignore" ]; then
  cp "$src_gitignore" ".gitignore" && echo ".gitignore: created from template"
else
  echo ".gitignore: template missing at $src_gitignore — skipped"
fi

if [ ! -f .claude/settings.json ]; then
  mkdir -p .claude && cp "${CLAUDE_SKILL_DIR}/assets/settings.json" .claude/settings.json && echo "settings.json: created";
else
  echo "settings.json: already present";
fi

```

## Output — your final message (returned to the main agent)

You run in a **fork** (`context: fork`): the main agent never sees the setup block above — your final
message is the ONLY thing it receives, and it relays that message to the user. So you MUST emit a complete,
self-contained recommendation here; never assume the caller can see the script output.

Read the result lines the setup block printed above, then emit exactly one message in this shape:

```
## superdev setup complete

<one line per setup result — e.g. ".temp/ created", ".docs/ already present", ".gitignore seeded from template", "settings.json already present">

### Recommended next steps
- Run `/superdev:mem-init` — bootstrap the CLAUDE.md project-memory cascade (general → specific).
- Run `/superdev:mem-rules` — author the `.claude/rules/` conventions layer.
<only when the setup block flagged a legacy `docs/` directory:>
- Migrate the contents of the legacy `docs/` directory into `.docs/`, then remove `docs/`.
```

Rules:
- Include the `docs/` migration bullet ONLY when the setup block printed the legacy-`docs/` warning; omit it otherwise.
- Report the actual results from the block above — do not invent or assume them.
- Do NOT invoke `mem-init` / `mem-rules` (or any other skill) yourself — they are interactive and the user decides when to run them. Your job is to recommend, not to chain.