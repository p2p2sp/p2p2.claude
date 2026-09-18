# Stop - the advisory stop and its three outcomes

Read at the moment a stop is reached, never up front. Reached from `## Verdict`, `## Guard` or `## Commit`, each carrying a `<stage>` and a `<reason>`. Nothing is committed automatically and nothing is reverted before the user has answered.

## The question

One `AskUserQuestion`, exactly three options, the `<reason>` stated in the question text and each option's own outcome in its label:

1. **approve** - commit it anyway. Append `OVERRIDE: <stage> - <reason>` under the brief's `## Notes` (whole-file rewrite), then `## Commit`.
2. **revert** - take every declared path back to HEAD, per `## The declared paths` below. Its description warns in its own words that any edit made to those same files before this run and never committed goes with it; a file this run did not declare is left exactly as it is.
3. **go to intent** - leave the diff exactly as it stands, commit nothing, and invoke the `intent` Skill with an argument text carrying the goal sentence, the absolute `brief.md` path and the declared path list, so the interview starts with the work already in the tree in front of it.

`<stage>` is one of `entry guard`, `size guard`, `failed checks`, `no verdict`; nothing else is ever written on an `OVERRIDE:` line. A stop carrying no `<stage>` (the `## Commit` exit-1 branch) writes no `OVERRIDE:` line on **approve** and re-runs its command once instead.

## The declared paths

Both the revert option and the intent handoff work off the `touched: <value>` lines of `<run dir>/notes.md`, reduced exactly as `commit-task.sh` and `vibe-guard.sh` reduce them, so all three read one notes file the same way: cut `<value>` at the first ` - ` or ` (`, whichever comes first; turn every `\` into `/`; an absolute path inside `<root>` becomes relative to `<root>`. A value that cuts to nothing declares nothing.

A reduced path that resolves outside `<root>` or still carries a `..` segment is never handed to `git checkout` and never deleted: skip it and name it in a `## Done` status line. Per surviving path:

- tracked (`git ls-files --error-unmatch -- <path>` succeeds) -> `git checkout -- <path>`;
- untracked but present as a file -> delete it;
- neither tracked nor present -> skip it and name it in a `## Done` status line.
