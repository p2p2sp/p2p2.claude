---
paths:
  - "**/skills/**"
---
# Skill script routing & dynamic-context injection

How a skill (not agents) preloads state or picks one playbook with a deterministic script instead of LLM branching. Precedent: `supergh/skills/commit` + its `scripts/route.sh`.

## `!`-injection (dynamic context) in skills

- A line `` !`command` `` in a SKILL.md body runs the command **at skill-load time** and pastes its stdout **verbatim** into the skill text the LLM reads. It is not a tool call the model decides to make — it fires on load.
- Use it to **preload state** (`!`cat .superdev/config.yml 2>/dev/null || true``, `!`git diff --cached --stat``, `!`mkdir -p .temp/.workflows`) or to **inject exactly one chosen playbook** (the mode-router case below).
- Always quote args and use `${CLAUDE_PLUGIN_ROOT}` for plugin-relative paths: `` !`"${CLAUDE_PLUGIN_ROOT}/skills/<skill>/scripts/route.sh" "$ARGUMENTS"` ``.
- The SKILL frontmatter MUST whitelist the interpreter for the call to run — e.g. `allowed-tools: …, Bash(sh:*)`.

## Argument separator convention

- The `Skill` tool `args` is a single free-form **string** — no structured object/JSON. It lands as `$ARGUMENTS` via harness-level textual substitution **before** the shell runs (not a shell env var).
- **Short / single-word fields → newline separator.** Cheapest tokens, most reliable for the model to emit, one value per line, parsed POSIX-clean (`read`). Only valid when no single value can itself contain a newline.
- **One-line fields that may contain spaces → ` ||| `** (space-pipe-pipe-pipe-space) between fields, ` ;; ` between list items. Precedent: `superplan-reviewer*`.
- **Large / multiline content → pass a PATH, not the content.** Subordinate skill injects it via `!`cat "$PATH"``. Precedent: `agent-adr-recorder` (bare absolute path → `!`-spliced plan text).
- Empty optional field still occupies its line / slot — the caller always emits the same field count (blank for absent), so positional alignment holds.
- **Never** splice `$ARGUMENTS` into a one-line quoted command as a multiline value (`route.sh "$ARGUMENTS"`); for multifield args capture via a **quoted** here-doc (`<<'DELIM'`) and parse with bash builtins (`read`, `${VAR%%…}`) — no `awk`/`jq`. Precedent: `agent-adr-recorder`.

## Mode-router script

- When a skill has N mutually-exclusive modes, a deterministic POSIX script selects one from `$ARGUMENTS` with a `case` and `cat`s only the chosen `references/mode-*.md`. The other modes **never enter context** — that economy (plus determinism over LLM branching) is the whole point.
- **Self-locate** references relative to the script via `$0`, never the host CWD: `dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)`. Use `#!/bin/sh`, `set -eu`, and lowercase the token with `awk '{print tolower($1)}'`.
- In the SKILL body wrap the `!`-call in `--- playbook ---` fences with a one-line "follow it exactly; ignore the other modes" instruction.

## Trust contract

- Every such script carries its `IN:` / `OUT:` contract in a header comment and is **self-verifying**. The caller trusts the output — it does NOT re-run or re-verify it. One route, one injection, no "re-run to confirm".
