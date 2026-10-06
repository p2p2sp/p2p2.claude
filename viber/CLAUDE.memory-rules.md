# Memory and rules layers

- A section travels with its node: `section:` and `unlinked:` lines, never in a chain;
  reset, audited and written with its node; only a `FILES:`/`DELETED:` path named `CLAUDE.md`
  is a node.
- The root `CLAUDE.md` is the user's: `/viber:memory` writes it once, only where none exists
  (`memory-node-writer`, at most 4000 bytes, an item it cannot find on `MISSING:`); no writer
  rewrites it or a section beside it, each change returns as a `SUGGEST:` line that the build
  summary or the memory report repeats, and `SUGGEST:` paths stay off `FILES:`.
- `memory-writer` ends no node or section over its cap, nor a chain with room (cut facts:
  `DROPPED:`), checking only sentences naming a path or symbol the build changed.
- The form of a node below the root and of its sections is `node-doctrine.md`'s `## Template`, defined
  nowhere else. `memory-auditor` reads it through `refs:` and reports `SHAPE` for form only, never
  for the root or a section beside it; `memory-node-writer` writes every node it creates in it and
  rewrites a file into it on `SHAPE`; `memory-writer` places each new fact under its heading without
  rearranging the rest.
- `rules-writer` may still end a file over its cap (`OVER:`, only repeated): a cut would lose a
  gated convention; `memory-writer` and `memory-node-writer` drop instead (`DROPPED:`), and
  `memory-node-writer` reports an ancestor leaving no room on `CHAIN:`.
- `rules-auditor` and `rules-writer` pass every line through `references/rule-admission.md`; a
  fact about one place leaves as `MOVE:` for the memory layer. `rules-writer` never writes a
  `CLAUDE.md`, `memory-writer` never touches `.claude/rules/`.

Duplicated on purpose - change together:

- Node (and section) budget 12000 / 32000, the root's 4000: `references/node-doctrine.md`,
  `skills/memory/scripts/memory-map.sh`, `skills/memory/SKILL.md`, `memory-node-writer`. Section name
  rule (never `local`): the doctrine, `memory-map.sh` (twice), `memory-auditor`,
  `memory-node-writer`. Rule budget 4000 / 40000: `agents/rules-writer.md`,
  `skills/rules/scripts/rules-map.sh`, `skills/rules/SKILL.md`.
- The `memory-auditor` dispatch lines (`target:`, `scope:`, `out:`, `refs:`) and the five-counter
  `AUDIT:` line (`stale`, `gone`, `unverifiable`, `shape`, `miss`): `agents/memory-auditor.md` and
  `skills/memory/SKILL.md`, whose step 6 keeps a target while any counter is not zero. `rules-auditor`'s
  `AUDIT:` line keeps its own counters.
- The frozen `_`-prefixed rule file: `rules-map.sh`, `rules-auditor`, `rules-writer`.
- Memory skips every path below a directory whose name starts with `.` and every path the host's
  ignore rules exclude, tracked or not: `memory-map.sh` (its `tracked` list and `is_excluded`),
  `memory-auditor`, `memory-node-writer`.
