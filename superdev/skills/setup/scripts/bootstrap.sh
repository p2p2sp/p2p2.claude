#!/usr/bin/env bash
# superdev / setup - deterministic environment bootstrap.
#
# Replaces the multi-operation inline `!` block that the SKILL.md used to carry.
# That block was a single compound command (≈25 `[ ]`/echo/cp/mkdir/grep parts
# joined by `;`/`&&`); Claude Code's Bash permission checker decomposes compound
# commands and demands approval for EACH part, which dead-ends `/setup` on
# permission modes that cannot auto-approve every sub-command (observed on macOS;
# the Windows parse path tolerated it). Collapsing the step into one bundled
# script - per the repo "Script vs. fork" invariant (fixed tools + fixed paths) -
# makes the permission engine see ONE command (`bash .../bootstrap.sh`).
#
# Idempotent: re-running never overwrites anything that already exists.
#   - creates .temp/ when missing,
#   - seeds .gitignore from the bundled template when the project has none,
#   - seeds .claude/settings.json from the bundled template when none,
#   - seeds .claude/superdev.yml from the bundled template when none,
#   - never overwrites an existing superdev.yml (reports its current switches),
#   - ensures .gitattributes carries the docs/workflows/** linguist-generated
#     rule (append-if-absent; creates the file when missing; never duplicates).
#
# Contract:
#   argv : none.
#   cwd  : the project root (the SKILL.md `!` block runs at skill load there).
#   env  : none required - the skill dir (for assets/) is derived from $0.
#   stdout: one human-readable line per result; the SKILL.md "Output" step and
#           the config-switch step read these lines verbatim. The config line is
#           either "superdev.yml: seeded from template - defaults: adr=false,
#           rules=false, memory=false, docs=false" (fresh seed) or
#           "superdev.yml: already present (left untouched) - current switches:"
#           followed by the grep'd switch lines (limited to the documented keys:
#           adr, rules, memory, docs).
#           The .gitattributes line is one of ".gitattributes: created with
#           linguist-generated rule", ".gitattributes: linguist-generated rule
#           appended", or ".gitattributes: linguist-generated rule already
#           present" - also asserted verbatim by bootstrap.test.sh.
#   exit : always 0 (fail-soft; missing templates are reported, not fatal).

set -u

skill_dir="$(cd "$(dirname "$0")/.." && pwd)"
src_gitignore="${skill_dir}/assets/gitignore.txt"
src_settings="${skill_dir}/assets/settings.json"
src_config="${skill_dir}/assets/config.yml"

if [ -d ".temp" ]; then
  echo ".temp: already present"
else
  mkdir -p ".temp" && echo ".temp: created"
fi

if [ -f ".gitignore" ]; then
  echo ".gitignore: already present (left untouched)"
elif [ -f "$src_gitignore" ]; then
  cp "$src_gitignore" ".gitignore" && echo ".gitignore: created from template"
else
  echo ".gitignore: template missing at $src_gitignore - skipped"
fi

if [ ! -f .claude/settings.json ]; then
  mkdir -p .claude && cp "$src_settings" .claude/settings.json && echo "settings.json: created"
else
  echo "settings.json: already present"
fi

if [ -f ".claude/superdev.yml" ]; then
  echo "superdev.yml: already present (left untouched) - current switches:"
  grep -E '^[[:space:]]*(adr|rules|memory|docs)[[:space:]]*:' .claude/superdev.yml
elif [ -f "$src_config" ]; then
  mkdir -p .claude && cp "$src_config" .claude/superdev.yml \
    && echo "superdev.yml: seeded from template - defaults: adr=false, rules=false, memory=false, docs=false"
else
  echo "superdev.yml: template missing at $src_config - skipped"
fi

# .gitattributes - collapse the tracked docs/workflows/ run records in GitHub
# review (linguist-generated). Append-if-absent so a host's own rules survive
# (idempotent, no duplicates).
ga_line="docs/workflows/** linguist-generated=true"
if [ ! -f ".gitattributes" ]; then
  printf '%s\n' "$ga_line" > .gitattributes
  echo ".gitattributes: created with linguist-generated rule"
elif grep -qxF "$ga_line" .gitattributes; then
  echo ".gitattributes: linguist-generated rule already present"
else
  # ensure a trailing newline so an append starts on its own line
  if [ -s ".gitattributes" ] && [ -n "$(tail -c1 .gitattributes)" ]; then
    printf '\n' >> .gitattributes
  fi
  printf '%s\n' "$ga_line" >> .gitattributes
  echo ".gitattributes: linguist-generated rule appended"
fi

exit 0
