# viber audit - 2026-09-26 - item D: EXTRA paths across an interrupted session

> Proposal, not implemented. Follows item 2.1 of `viber-instruction-audit-2026-09-26.md`.

Severity low: the gap needs a session cut off after the coder edited a path outside `Files` and
before `commit-task.sh` committed the task.

## Problem

The 2.1 fix carries a coder's `EXTRA:` paths to the reviewer (`extra:`), and the commit already
took them through `--with`, both only from return lines the current session saw. A new session knows the tree only through
`plan-index.sh`, and that script reports dirty paths per task, for a task's own files alone. An
`EXTRA:` path left dirty by the interrupted session reaches neither `resume:`, `--with` nor
`extra:`: the resumed coder does not know it, the reviewer never diffs it and the task commit
leaves it behind, uncommitted.

## Evidence

- `viber/scripts/plan-index.sh:26`: the header documents `dirty:` "only for a task whose own files
  are dirty".
- `viber/scripts/plan-index.sh:207-215`: every changed path of the tree is read
  (`git status --porcelain --untracked-files=all -z`) into `changed`.
- `viber/scripts/plan-index.sh:628-633`: the `dirty:` loop walks only `fpath[i, k]`, the task's own
  `Files`; a changed path no task claims is dropped silently.
- `viber/skills/implementor/SKILL.md:74`: `resume: <paths>` is built from the `dirty:` line alone.
- `viber/skills/implementor/SKILL.md:128`: `extra:` comes from `EXTRA:` lines returned "so far in
  this build"; `:132`: `--with` comes from the `EXTRA:` lines of the task's coder or reviewer. A new
  session received neither.
- Side case: an `EXTRA:` path owned by a `done` task (the prior-task exception) does surface, but
  as a `dirty:` line of that `done` task, not next to the task that edited it.

## Proposed fix

- `plan-index.sh`: print each changed path that no task's `Files` claims, outside the run
  directory and `.temp/`, either next to the task left in progress (`dirty: T2 | src/a.ts ;
  unclaimed: lib/x.ts`) or as its own line (`unclaimed: lib/x.ts,lib/y.ts`) after the `dirty:`
  lines. The own-line form is simpler: the script cannot tell which task made an unclaimed
  edit, and an unrelated user edit lands there too.
- `implementor`: name the unclaimed paths in the existing `dirty:` question. On "continue", add
  the ones the user keeps to the coder's `resume:`, the reviewer's `extra:` (which forces a
  review, as in 2.1) and the task's `--with`.
- Header of `plan-index.sh` (the stdout contract) and the `viber/CLAUDE.md` orchestrator bullet
  change in the same edit.

## Cost

- One awk loop in `plan-index.sh` (no apostrophe inside the block, `bash -n` after), one line in
  `implementor/SKILL.md:74`.
- New cases in `tests/viber/plan-index.test.ts`: an unclaimed dirty path, a claimed one (no
  line), a run-directory path (no line), a clean tree (no line).
- Must hold on Windows Git Bash and macOS (bash 3.2, BSD awk); the macOS and Windows CI legs run
  only on a manual dispatch.
