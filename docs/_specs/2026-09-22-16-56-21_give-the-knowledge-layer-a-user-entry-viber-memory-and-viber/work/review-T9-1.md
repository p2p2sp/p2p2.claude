# Review T9 - 1

## Critical

- `viber/CLAUDE.md:172` - "eight of the nine agents would start on an asking default" is a stale
  agent-total counter left describing the plugin as it was before this task: the Purpose line at
  `viber/CLAUDE.md:9` was correctly updated to "ELEVEN agents" (matching `plugin.json`'s eleven
  entries), but this sentence in the "permissions template allows the write tools outright"
  invariant still says "nine". DoD.4 explicitly bars leaving any counter in `viber/CLAUDE.md`
  describing the plugin as it was before this change; this is exactly that. Fix by recomputing
  the ratio against eleven agents (e.g. "ten of the eleven agents") or rephrasing to avoid a
  literal count that drifts every time the agent array grows.

## Notes (not findings)

- `viber/.claude-plugin/plugin.json`: nine skills / eleven agents, all paths resolve, no overlap
  between the two arrays, order matches the coder's stated rationale (writer before its own
  auditor). Verified with the task's own `node -e` verification command: exit 0.
- `viber/CLAUDE.md`, `viber/README.md`, `viber/skills/setup/assets/usage.md`,
  `docs/migracja-superdev-viber.md` all name both `/viber:memory` and `/viber:rules` (DoD.3, and
  the task's grep-based verification, both pass).
- No new markdown table introduced beside prose in any of the four documents; no em dash found in
  any of the diffs (DoD.5).
- The two-entry invariant added to `viber/CLAUDE.md` (`## Contracts & invariants`) states the
  writer/auditor split without restating either skill's own routing steps beyond the one-line
  summaries already used for sibling entries in `## Entry points`.
- `references/` invariant correctly extended with `rule-admission.md`'s two readers
  (`rules-auditor`, `rules-writer`).
