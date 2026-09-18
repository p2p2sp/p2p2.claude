## Runs
- grep -n 'GATES:' superdev/skills/simplebuild/SKILL.md -> exit 0
- grep -n 'gates:' superdev/skills/simplebuild/SKILL.md -> exit 0

no deviations

UNDERSPECIFIED: which file the Approach's "(Task 6) fixes it" reference names - Kind: text restricts reads to `### Files` and files `### Approach` names, and the Approach identifies the gate-block path contract only by Task 6's title, never a literal path. Read `superdev/skills/superbuild/SKILL.md` (the file Task 6's own title and Dependencies entry point at, already committed at db15afb) as the file that reference names, since mirroring its Checkpoint / Step 3 / Fix loop `run-gate.sh` calls verbatim (stage names, gate-file naming `gates-checkpoint-KK.md` / `gates-final-01.md` / `gates-<closing stage>-reR.md`, the `re-review:<closing stage>` stage argument) is the only way to satisfy Approach steps 2 and 3.
