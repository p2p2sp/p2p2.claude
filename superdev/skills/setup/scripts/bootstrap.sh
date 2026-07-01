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
#   - seeds .superdev/config.yml from the bundled template when none,
#   - never overwrites an existing config.yml (reports its current switches),
#   - seeds .claude/rules/_superdev.md (a frozen pointer to the manifest's
#     mandatory rules) from the bundled template when none, never overwriting.
#
# Contract:
#   argv : none.
#   cwd  : the project root (the SKILL.md `!` block runs at skill load there).
#   env  : none required — the skill dir (for assets/) is derived from $0.
#   stdout: one human-readable line per result; the SKILL.md "Output" step and
#           the config-switch step read these lines verbatim. The config line is
#           either "config.yml: seeded from template — defaults: adr=false,
#           rules_improver=false, docs=false" (fresh seed) or "config.yml: already
#           present (left untouched) — current switches:" followed by the grep'd
#           switch lines (limited to the documented keys: adr, rules_improver, docs).
#           The rules line is either "_superdev.md: created", "_superdev.md:
#           already present (left untouched)", or "_superdev.md: template missing
#           at $src — skipped" — this exact literal is asserted verbatim by
#           bootstrap.test.sh.
#   exit : always 0 (fail-soft; missing templates are reported, not fatal).

set -u

skill_dir="$(cd "$(dirname "$0")/.." && pwd)"
src_gitignore="${skill_dir}/assets/gitignore.txt"
src_settings="${skill_dir}/assets/settings.json"
src_config="${skill_dir}/assets/config.yml"
src_rules_superdev="${skill_dir}/assets/_superdev.md"

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
  grep -E '^[[:space:]]*(adr|rules_improver|docs)[[:space:]]*:' .superdev/config.yml
elif [ -f "$src_config" ]; then
  mkdir -p .superdev && cp "$src_config" .superdev/config.yml \
    && echo "config.yml: seeded from template — defaults: adr=false, rules_improver=false, docs=false"
else
  echo "config.yml: template missing at $src_config — skipped"
fi

if [ -f ".claude/rules/_superdev.md" ]; then
  echo "_superdev.md: already present (left untouched)"
elif [ -f "$src_rules_superdev" ]; then
  mkdir -p .claude/rules && cp "$src_rules_superdev" .claude/rules/_superdev.md \
    && echo "_superdev.md: created"
else
  echo "_superdev.md: template missing at $src_rules_superdev — skipped"
fi

exit 0
