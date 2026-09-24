# T22 - coder notes

- `.claude/viber.yml` was rewritten to the template verbatim (comments + new `tiers:` block),
  keeping only `adr: false` different from the template's `adr: true` - the repo-wide "no ADR
  capture" rule in the root CLAUDE.md.
- The three rules undercounted viber's own script inventory: `viber/skills/memory/scripts/
  memory-map.sh` and `viber/skills/rules/scripts/rules-map.sh` are both `!` preloads (via
  `${CLAUDE_SKILL_DIR}`) AND runtime `--reset` calls, and `archive-run.sh` is a runtime call from
  `agents/closeout.md`, not a SKILL.md - none of the three were counted anywhere. Recounted from
  the tree: 8 preload-invoked scripts (was 6), 13 viber scripts total with 11 carrying the full
  header block (was "ten"/"eight"), 29 shipped `.sh` files repo-wide (was 30) with 8 (not 9)
  using `set -euo pipefail`.
- `plugin-manifests.md`'s viber skill-order example was missing `memory` and `rules` at the tail,
  even though `plugin.json` already lists all 9 in pipeline order.
- Left `docs/reviews/2026-09-24_viber-review.md` untouched - it was already modified at session
  start by an earlier task and is not in this task's Files line.
