A prior attempt's `Write` was refused by the harness for viber/skills/tdd/SKILL.md; it was available again this run and both files were written clean.

Trap: my first Write of task-coder.md left a trailing `</content>` line on disk (the emission artifact the repo-wide CLAUDE.md invariant warns about) even though the tool's content parameter I sent held no such tag. Caught it only by reading the file back with `tail -c | xxd`; a plain `Read` also shows it. Anyone editing this file next should check the tail before trusting a "no need to Read it back" note.

Cut the TDD skill's per-cycle checklist and its isolation-rule sentences entirely (those already live in test-strategy.md, read separately by task-coder) rather than trying to trim them - kept only the cycle steps and the new resume/reason/report exception.

Both files landed exactly at or under their ceilings (5789/5800 for the coder, 2831/3500 for the skill); every trim came from cutting caller-narrative asides ("other tasks are live in the same tree", "Git belongs to the caller"), never from a rule or a label.
