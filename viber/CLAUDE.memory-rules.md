# Memory and rules layers

- A section travels with its node: `section:` and `unlinked:` lines, never in a chain;
  reset, audited and written with its node; only a `FILES:`/`DELETED:` path named `CLAUDE.md`
  is a node.
- `memory-writer` ends no node or section over its cap, nor a chain with room (cut facts:
  `DROPPED:`), checking only sentences naming a path or symbol the build changed.
- `rules-writer` may still end a file over its cap (`OVER:`, only repeated): a cut would lose a
  gated convention; `memory-writer` drops instead, nothing else bounds a node.
- `rules-auditor` and `rules-writer` pass every line through `references/rule-admission.md`; a
  fact about one place leaves as `MOVE:` for the memory layer. `rules-writer` never writes a
  `CLAUDE.md`, `memory-writer` never touches `.claude/rules/`.
