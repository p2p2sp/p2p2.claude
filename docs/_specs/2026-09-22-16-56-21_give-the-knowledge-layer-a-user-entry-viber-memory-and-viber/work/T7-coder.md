# T7 - /viber:memory

- Choices the plan left open, now pinned: the four modes are `review`, `extend`, `both`, `reset`; `state: none` skips the mode question entirely (nothing to review, nothing to reset) and routes straight to the candidate list; an argument naming a mode is that answer and suppresses the question.
- Two `allowed-tools` patterns for one script, as Delivers asks: `...memory-map.sh:*` for the preload and `...memory-map.sh --reset:*` for the runtime call, both spelled through `${CLAUDE_SKILL_DIR}` exactly as the two literal lines spell them.
- The skill carries `disallowed-tools: Read, Write, Edit, NotebookEdit` and no bare `Bash`: it routes on the preloaded map, never opens a node or a findings file, and the only Bash it can run without a prompt is the reset line. That is what makes DoD.5 structural rather than a promise in prose.
- After a successful reset the target list is the map's `cand:` lines plus the directories just emptied, taken from the script's own `removed:` lines - the map is never re-run, so DoD.2 holds across the reset.
- Lint leaves one WARN ("possible italics with *...*") that comes from the `:*)` sequences in `allowed-tools`; `viber/skills/e2e` and `viber/skills/implementor` carry the identical WARN. Verification only requires `FAIL=0`.
- The skill is not registered yet: `viber/.claude-plugin/plugin.json` gains `./skills/memory/` in T9, which owns that file.
