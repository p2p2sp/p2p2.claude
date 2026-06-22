#!/usr/bin/env bash
# superdev / setup — deterministic environment bootstrap.
#
# Replaces the multi-operation inline `!` block that the SKILL.md used to carry.
# That block was a single compound command (≈25 `[ ]`/echo/cp/mkdir/grep parts
# joined by `;`/`&&`); Claude Code's Bash permission checker decomposes compound
# commands and demands approval for EACH part, which dead-ends `/setup` on
# permission modes that cannot auto-approve every sub-command (observed on macOS;
# the Windows parse path tolerated it). Collapsing the step into one bundled
# script — per the repo "Script vs. fork" invariant (fixed tools + fixed paths) —
# makes the permission engine see ONE command (`bash .../bootstrap.sh`).
#
# Idempotent: re-running never overwrites anything that already exists.
#   - creates .temp/ and .superdev/ when missing,
#   - seeds .gitignore from the bundled template when the project has none,
#   - seeds .claude/settings.json from the bundled template when none,
#   - reports whether .superdev/config.yml exists (and its switches if so).
#
# Contract:
#   argv : none.
#   cwd  : the project root (the SKILL.md `!` block runs at skill load there).
#   env  : none required — the skill dir (for assets/) is derived from $0.
#   stdout: one human-readable line per result; the SKILL.md "Output" step and
#           the config-switch step read these lines verbatim. The config line is
#           either "config.yml: already present ... — current switches:" followed
#           by the grep'd switch lines, or "config.yml: MISSING — ...".
#   exit : always 0 (fail-soft; missing templates are reported, not fatal).

set -u

skill_dir="$(cd "$(dirname "$0")/.." && pwd)"
src_gitignore="${skill_dir}/assets/gitignore.txt"
src_settings="${skill_dir}/assets/settings.json"

if [ -d ".temp" ]; then
  echo ".temp: already present"
else
  mkdir -p ".temp" && echo ".temp: created"
fi

if [ -d ".superdev" ]; then
  echo ".superdev: already present"
else
  mkdir -p ".superdev" && echo ".superdev: created"
fi

if [ -f ".gitignore" ]; then
  echo ".gitignore: already present (left untouched)"
elif [ -f "$src_gitignore" ]; then
  cp "$src_gitignore" ".gitignore" && echo ".gitignore: created from template"
else
  echo ".gitignore: template missing at $src_gitignore — skipped"
fi

if [ ! -f .claude/settings.json ]; then
  mkdir -p .claude && cp "$src_settings" .claude/settings.json && echo "settings.json: created"
else
  echo "settings.json: already present"
fi

if [ -f ".superdev/config.yml" ]; then
  echo "config.yml: already present (left untouched) — current switches:"
  grep -E '^[[:space:]]*(adr|artifacts|help|rules_improver|ui)[[:space:]]*:' .superdev/config.yml
else
  echo "config.yml: MISSING — ask the user about the 5 switches, then write it (see 'Configure the opt-in switches')"
fi

exit 0
