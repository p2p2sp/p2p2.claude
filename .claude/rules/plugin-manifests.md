---
paths:
  - "*/.claude-plugin/plugin.json"
  - ".claude-plugin/marketplace.json"
---

# Plugin manifest shape

- Two-space indent, a trailing newline, no trailing commas.
- Write a `skills[]` entry as the skill's DIRECTORY, with both a leading `./` and a trailing slash: `"./skills/superdev-rules/"`. Write an `agents[]` entry as the file itself: `"./agents/rules-writer.md"`.
- Keep `skills[]` in pipeline order rather than alphabetical: superdev lists setup, intent, adr, phases, superspec, superplan, superbuild and so on - the order a user meets them in.
- NEVER add a `"hooks"` field. Claude Code auto-loads `hooks/hooks.json` from that path, and a `hooks` field in `plugin.json` is a hard install error.
- Carry the same author block verbatim in all six manifests (`Dariusz Lenartowicz` / `dariusz.lenartowicz@p2p2.com.pl`). `version` is written by `.github/scripts/release.sh` across all six at once, never edited by hand.
- Only `superdev` and `superfix` carry an `agents[]` key; the other four manifests have `skills[]` alone. Renaming a plugin updates this file, `.claude-plugin/marketplace.json` and the root `README.md` together.
