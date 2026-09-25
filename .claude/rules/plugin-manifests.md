---
paths:
  - "*/.claude-plugin/plugin.json"
  - ".claude-plugin/marketplace.json"
---

# Plugin manifest shape

- Two-space indent, a trailing newline, no trailing commas.
- Write a `skills[]` entry as the skill's DIRECTORY, with both a leading `./` and a trailing slash: `"./skills/rules/"`. Write an `agents[]` entry as the file itself: `"./agents/rules-writer.md"`.
- Keep `skills[]` in pipeline order rather than alphabetical: viber lists setup, triage, intent, planner, implementor, tdd, fixer, e2e, memory, rules, commit - the order a user meets them in, with the workers the chain pulls in sitting where they are first reached, and `commit`, used at any point, last.
- NEVER add a `"hooks"` field. Claude Code auto-loads `hooks/hooks.json` from that path, and a `hooks` field in `plugin.json` is a hard install error.
- Carry the same author block verbatim in all five manifests (`Dariusz Lenartowicz` / `dariusz.lenartowicz@p2p2.com.pl`). `version` is written by `.github/scripts/release.sh` across all five at once, never edited by hand.
- Only `superfix` and `viber` carry an `agents[]` key; the other three manifests have `skills[]` alone. Renaming a plugin updates this file, `.claude-plugin/marketplace.json` and the root `README.md` together.
