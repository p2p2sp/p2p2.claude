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
#   - ensures .gitattributes carries the two .superdev/** linguist-generated
#     rules (append-if-absent; creates the file when missing; never duplicates).
#
# Contract:
#   argv : none.
#   cwd  : the project root (the SKILL.md `!` block runs at skill load there).
#   env  : none required — the skill dir (for assets/) is derived from $0.
#   stdout: one human-readable line per result; the SKILL.md "Output" step and
#           the config-switch step read these lines verbatim. The config line is
#           either "config.yml: seeded from template — defaults: adr=false,
#           rules=false, memory=false" (fresh seed) or "config.yml: already
#           present (left untouched) — current switches:" followed by the grep'd
#           switch lines (limited to the documented keys: adr, rules, memory).
#           The .gitattributes line is one of ".gitattributes: created with
#           linguist-generated rules", ".gitattributes: linguist-generated rules
#           appended", or ".gitattributes: linguist-generated rules already
#           present" — also asserted verbatim by bootstrap.test.sh.
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
  grep -E '^[[:space:]]*(adr|rules|memory)[[:space:]]*:' .superdev/config.yml
elif [ -f "$src_config" ]; then
  mkdir -p .superdev && cp "$src_config" .superdev/config.yml \
    && echo "config.yml: seeded from template — defaults: adr=false, rules=false, memory=false"
else
  echo "config.yml: template missing at $src_config — skipped"
fi

# .gitattributes — collapse the tracked .superdev/ scratch + records in GitHub
# review (linguist-generated). Append-if-absent so a host's own rules survive;
# both lines are ensured independently (idempotent, no duplicates).
ga_line1=".superdev/**            linguist-generated=true"
ga_line2=".superdev/.workflows/** linguist-generated=true"
if [ ! -f ".gitattributes" ]; then
  printf '%s\n%s\n' "$ga_line1" "$ga_line2" > .gitattributes
  echo ".gitattributes: created with linguist-generated rules"
else
  ga_added=0
  # ensure a trailing newline so an append starts on its own line
  if [ -s ".gitattributes" ] && [ -n "$(tail -c1 .gitattributes)" ]; then
    printf '\n' >> .gitattributes
  fi
  grep -qxF "$ga_line1" .gitattributes || { printf '%s\n' "$ga_line1" >> .gitattributes; ga_added=1; }
  grep -qxF "$ga_line2" .gitattributes || { printf '%s\n' "$ga_line2" >> .gitattributes; ga_added=1; }
  if [ "$ga_added" -eq 1 ]; then
    echo ".gitattributes: linguist-generated rules appended"
  else
    echo ".gitattributes: linguist-generated rules already present"
  fi
fi

exit 0
