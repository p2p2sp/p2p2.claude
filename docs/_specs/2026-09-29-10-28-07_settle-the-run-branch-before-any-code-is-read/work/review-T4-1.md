# Review T4 - round 1

## Blocking

1. viber/skills/intent/fragments/branching-start.allowed.md:5 and viber/skills/intent/fragments/branching-start.required.md:5 (DoD.9, criterion #8) - the returning-draft bullet settles the entry and asks switch/stay/abort against the recorded branch, but it never says the base check is skipped. The next bullets start with "Otherwise" (so they are skipped), but the at-base bullet ("The chosen entry's `at-base: yes` -> go on. `at-base: no` -> ask: switch to its `base:` ...") is unconditional and follows it. `at-base` is `yes` only when HEAD is the base commit (viber/scripts/run-branch.sh:455), so a draft resumed on its own run branch, which carries the landed draft commit, reports `at-base: no` and the fragment then offers to switch to the entry's base, off the draft's branch. Under `required`, a draft whose recorded branch is kept would also be pushed through that base question. Fix: in the returning-draft bullet state that it takes no base check (as the "no branch" bullet does), for example "... ask no entry question and run no base check: ...", in both intent start fragments.

## Minor

1. viber/skills/intent/fragments/branching-start.allowed.md:10 and branching-start.required.md:11 - "Exit 6 -> show its error, tell the user to commit or stash first, and ask the same question again" also covers the returning-draft switch to a recorded branch. That branch may not exist locally (for example a draft resumed on another machine), and `--checkout` then exits 6 with "does not exist locally". Telling the user to commit or stash and asking again loops. Word it as "show its error; when it names uncommitted changes, tell the user to commit or stash first and ask again, otherwise ask stay or abort".
2. viber/skills/intent/SKILL.md:111-113 - the `branching-handoff` preload comes after the "Hand off: invoke `viber:planner`" paragraph, but its text governs the summary shown for confirmation earlier in `## Done`. Place it before the hand-off paragraph, next to the `issues-done` preload, so the lines are part of the summary the user confirms.

Verification note: `node --test tests/portability.test.ts tests/viber/help.test.ts` fails 1/131 in the live tree only because the eight new fragments are untracked (the fragment-call sweep reads the git index). With them staged in a scratch clone, it passes 131/131. The grep clauses all hold.
