### T19 coder notes

- Removed only the standalone "Read the existing `CLAUDE.md` nodes before changing one." line from
  memory-writer.md; the read-the-doctrine instruction two lines below it already covers the
  read-before-write requirement, so nothing was added back.
- "characters" -> "bytes" in node-doctrine.md's budget line and SKILL.md's `OVER-NODE` line;
  `<chars>` -> `<bytes>` in memory-writer.md's `OVER:` line and memory-node-writer.md's `SIZE:`
  and `CHAIN:` lines. `rules-writer.md`/`rules-map.sh`/`rules/SKILL.md` still say "characters"/
  `<chars>` - out of scope, not in this task's `Files`.
- Verified `grep -c 'characters\|<chars>'` is 0 on all four files, `OVER-NODE` still matches in
  both `memory-map.sh` and `memory/SKILL.md` (already true before this task), and
  `lint_skill.sh` gives `FAIL=0` on both agents and the memory skill (one pre-existing italics
  WARN on SKILL.md, unrelated).
