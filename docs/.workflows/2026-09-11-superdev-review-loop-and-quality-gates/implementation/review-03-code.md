# Final code review (round 3) - review-03-code.md

Change set: `git diff d210865..HEAD` (63 files). Gates run before reading any code:

- `node --test "tests/**/*.test.ts"` -> 645 tests, 642 pass, 0 fail, 3 skipped.
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh` on the 10 changed skills/agents ->
  `FAIL=0` everywhere (2 pre-existing WARNs per build reviewer, 0 elsewhere).
- Dash sweep over `superdev/`, `tests/superdev/`, `CLAUDE.md` -> 0 hits.
- Exec bits: `checkpoint-update.sh` and `record-decision.sh` are `100755` in the index.
- Fresh manual probes of `commit-task.sh` on branches no test covers: a `touched:` line holding an
  **absolute** path plus an absolute `--notes` path (normalised against the root, committed, exit 0),
  and a **staged rename** left undeclared (both `src/old.txt` and `src/new.txt` reported, exit 2).
  Both behave exactly as the header documents.

No e2e or integration suite in this host beyond `node --test`.

## Output Format

### Strengths

- **Every one of round 2's ten findings is genuinely closed, and two of them were closed better than
  the report asked.** I1's resume gap is fixed at the source of truth rather than in memory - one
  `Glob` over `<workdir>/implementation/`, "one past the highest already there for its own name
  shape" (`superbuild/SKILL.md:76`, `simplebuild/SKILL.md:76`) - and the fix notes explain why
  `checkpoint-update.sh` was deliberately *not* widened into a four-counter file (a new argument list
  and a second write path for facts the file names already carry). I3 is scoped exactly where it had
  to be: `simplebuild-reviewer/SKILL.md:51` now says how much of the plan is due per stage instead of
  weakening the gate, so the Simple-track checkpoint can return a useful PASS. M1 was closed by
  naming the two-step read-then-write append (`review-contract.md:161-163`) rather than by adding a
  third bookkeeping script - the right call for a Minor, and the reasoning is recorded.
- **The round-2 fix round touched three files nobody named, and said so.** `fix-02-notes.md:21-23`
  records that the retired "non-test file" re-run wording (M3) was still restated inside all three
  reviewers' own `## Gates` sections, so fixing it only at the owner would have left three consumers
  contradicting it. That is the single-owner discipline working as designed.
- **`commit-task.sh` survives the branches its tests do not reach.** I re-probed the two with real
  logic behind them. `normalise_path` reduces an absolute path handed in on a `touched:` line and on
  `--notes` back to repository-relative and commits cleanly - the branch the whole new absolute-path
  rule in `## Mandatory Rules` rests on. The rename branch consumes the second NUL record correctly
  and reports *both* sides of a `git mv`. Neither could be made to stage or miss anything.
- **`root:` is spelled consistently across every consumer.** `decompose.sh:115`, `commit-task.sh:133`
  and `resolve-input.sh:67` all take it from the same `git rev-parse --show-toplevel`, so the prefix
  match in `normalise_path` and the absolute-value guard in `is_absolute` can never disagree about
  what "inside the repository" means - verified on this host (`C:/Projects/p2p2.claude`, where plain
  `pwd` would have given the unusable `/c/...` form).
- **The two new scripts and their tests are house style, end to end.** English header with usage,
  parameters and behaviour; `set -euo pipefail`; the no-trailing-newline guard in
  `record-decision.sh:48-51` written so command substitution's newline-stripping makes it fire only
  for a file that really lacks one; and six/five test cases each covering the happy path, the
  append-or-overwrite semantics, the missing-argument exit, the workdir normalisation and (for
  `checkpoint-update.sh`) the not-yet-created workdir.
- **The documentation layer kept up with the code.** `superdev/README.md` renumbered Close Out from 6
  to 7 when the review-rounds step was inserted, the manifest gained a four-line `## Build chain`
  section (groups and chains, not individual skills - the right granularity per the repo's own
  self-documentation rule), and the root `CLAUDE.md` entry names the three disjoint mandates
  accurately.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

- **`superdev/skills/simplebuild-reviewer/SKILL.md:79` - the Simple track's duplicated-derived-value
  scan looks for a notes line that the Simple track's implementor is never told to write, so the
  check is dead by construction.**
  Task 9 added this paragraph to `simplebuild-reviewer` ("scan the `*-notes.md` files for more than
  one `UNDERSPECIFIED:` line naming the same field or rule"); `task-09-notes.md:4` confirms it is an
  addition, not a retention ("`simplebuild-reviewer`, which never had them"). But
  `simplebuild-task-implementor.md:51-57` - the only producer of `task-NN-notes.md` on that track -
  lists five note shapes and `UNDERSPECIFIED:` is not among them. Its Super-track twin has it
  (`superbuild-task-implementor.md:55`); the Simple one never did, and Task 8 did not add it while
  rewriting that exact list.
  The contract cannot rescue it either: `review-contract.md:191` documents the line as "unchanged,
  one per value the task left open", but both implementors are told to read the contract only "On a
  findings report" (`simplebuild-task-implementor.md:21`), so in plain plan-task mode - the only mode
  that writes `task-NN-notes.md` - the Simple implementor never sees that section.
  *Failure scenario:* a 9-task SimplePlan where tasks 3 and 7 each have to invent the same
  validation-error shape because the plan pinned neither. Both implementors decide independently and
  differently. On the Super track each writes an `UNDERSPECIFIED:` line and the final review pairs
  them. On the Simple track neither line exists, the reviewer's scan returns nothing, and - as the
  paragraph itself warns - the two decisions "share no syntactic pattern", so the `??`/`||` grep in
  the line above finds nothing either. The defect ships.
  *Why it matters:* this is the one check in the whole delivery aimed at the class of defect B8 exists
  to prevent, and on one of the two tracks it can never fire. A reviewer instruction with no producer
  is the prose equivalent of B13's "test that cannot fail".
  *Fix:* add the `UNDERSPECIFIED:` bullet to `simplebuild-task-implementor.md`'s step 4 list, worded
  as in `superbuild-task-implementor.md:55`. (If the Simple track is meant to stay without it, then
  `review-contract.md:191` must stop calling the line "unchanged" for both implementors and the scan
  must come out of `simplebuild-reviewer`.)

- **`superdev/agents/superbuild-task-reviewer.md:39` (and both implementors, and
  `superdev/references/review-contract.md:16`) - the `### Edge cases` -> `### Failure modes` rename
  got a backward-compatibility rule on the plan side and none on the build side, so an
  already-approved plan built after this release fails its own per-task gate.**
  `plan-review-checklist.md:55-56` handles it explicitly: "A plan drafted before the rename still
  carries `### Edge cases` in place of `### Failure modes`: treat that section as `### Failure modes`
  and apply B9 to it." That sentence is the only one in `superdev/` that mentions the old name
  (verified by grep). The three build-side consumers Task 7 and Task 8 rewrote - the task reviewer and
  both implementors - name `### Failure modes` only, with no equivalent carve-out.
  *Failure scenario:* a user has an approved SuperPlan whose tasks carry `### Edge cases`, updates the
  plugin, and resumes the build. Task 6 adds a `catch`. The task reviewer runs its failure pass, point
  (a): "both match an entry under the task's `### Failure modes`, or the branch is a bug". There is no
  such section, so nothing matches, and `:45` makes (a) **Critical**. The task FAILs, the implementor
  is dispatched at a finding it cannot fix (the plan has no `### Failure modes` to satisfy), the
  re-review says the same, and the task burns its three-round budget before escalating - once per task
  that touches an error path. The same plan's `### Edge cases` content is simultaneously invisible to
  the implementor, which is told to "honor its `Contracts` and `Failure modes`"
  (`superbuild-task-implementor.md:30`).
  *Why it matters:* the checklist's compatibility sentence proves the migration window was recognised
  during this build; it was just applied to the reviewer of plans and not to the consumers of them.
  Resuming a build across a plugin update is a first-class flow here (`status.md`, `base.md`,
  `checkpoint.md` and the whole Step 1 resume branch exist for it).
  *Fix:* mirror the checklist's sentence in the three build-side consumers - one clause in the `task`
  input bullet of both implementors and of `superbuild-task-reviewer.md`, e.g. "a task drafted before
  the rename carries `### Edge cases` in its place; read it as `### Failure modes`" - or state it once
  in `review-contract.md`'s stack-agnostic preamble, which already enumerates the plan template's
  section names, and have the task reviewer's inline copy carry it too.

#### Minor (Nice to Have)

- `superdev/references/review-contract.md:7-13` - round 2's M2 was fixed for one of the three
  non-reading consumers only. The header still says the contract is "Consumed by ... the two
  orchestrators (`skills/superbuild`, `skills/simplebuild`) - each of them reads this file", and the
  carve-out immediately after covers the task reviewer alone. Neither orchestrator reads it or even
  mentions it (grep for `review-contract` across `superdev/` returns five hits: the two implementors
  and the three reviewers). Both nevertheless restate contract vocabulary inline - the label set, the
  `PASS`/`FAIL`/`BLOCKED` verdicts, the `REVIEW:`/`REASON:` return lines, the report name shapes, the
  `minor:` and `more:` labels - which is exactly the silent-drift risk the carve-out was written to
  make visible. Extend the carve-out to name the orchestrators too, or drop them from the list.
- `superdev/skills/superbuild/SKILL.md:76` - of the four ordinal shapes the resume rule enumerates,
  `task-NN-review-R.md` is the only one with two variables, and "one past the highest already there
  for its own name shape" does not say that `NN` is held fixed while `R` is scanned. `:96` makes `R`
  per-task ("R = review round for this task, starting `1`"), so a resumed build that Globs the highest
  `R` across all tasks would open task 12's first review as `task-12-review-3.md` because task 05 had
  three rounds. Nothing is overwritten, but the number then reads like a round count and sits next to
  a "Max 3 review rounds per task" gate at `:100`. Say "for this task's own `NN`".
- `tests/superdev/commit-task.test.ts` - the two branches carrying the most logic are still
  hand-proved only: `normalise_path`'s absolute -> repository-relative reduction (`commit-task.sh:153-157`,
  the branch every task commit in a real build now depends on, since `## Mandatory Rules` makes every
  orchestrator path absolute) and the rename/copy second-NUL-record read (`:291-295`). I re-probed both
  and both are correct, but 14 cases cover the easier paths and neither of these has one. Two cases -
  a `touched:` line holding `<root>/src/a.txt`, and an undeclared `git mv` asserting both paths in the
  exit-2 output - would close the gap.
- `superdev/skills/superbuild/SKILL.md:121` and `simplebuild/SKILL.md:116` - the fix commit's result
  handling is narrower than the task commit's. Step 2 of the loop lists all three outcomes
  (`commit: <sha>`, exit 2, `Nothing to commit.` / not a repository); the fix loop's step 2 forwards
  only exit 2 ("handled exactly as in the loop above") and then states `head` := the SHA of its
  `commit:` line unconditionally. A fix implementor that returns PASS having changed nothing
  committable leaves no such line, and the next step re-reviews with `since: <fix_since>` over an
  empty diff. One clause - "`Nothing to commit.` -> `head` unchanged" - closes it.
- `superdev/references/review-contract.md:196` - `## Implementor fix-mode input` opens "In fix mode
  the `task:` file, and every `more:` file, is a report in the `## Report skeleton` shape." On the
  Super track's per-task fix path (`superbuild/SKILL.md:98`) the `task:` file is the per-task
  reviewer's report, which `superbuild-task-reviewer.md:66` deliberately writes *without* `## Gates`,
  `## Prior findings` or `## Debt`. The implementor reads the contract on that path (`refs:` is
  passed) and is told to expect sections that are absent by design. Add "or the per-task gate's
  reduced report" to that sentence.
- `superdev/scripts/decompose.sh:55` - the header comment still describes what the script creates as
  "pusty katalog implementation/ na raporty reviewera (Final Review)". That directory now also holds
  the checkpoint reports, every re-review, `debt.md` and `decisions.md`, all of which both
  orchestrators document at their own Step 1. The script's own contract is the stale one.

### Recommendations

- The two Important findings above are the same shape as rounds 1 and 2's: a rule or a section added
  in one task whose *other* consumers were never enumerated. Round 2 said this and it repeated. The
  mechanical fix is the one this build ships: B14 ("Contract or shared value with no consuming task")
  and B10 ("Extended closed set with no consumer list") would both have caught them if the plan had
  listed consumers for the two values it changed - the notes vocabulary and the section name. Worth
  one line in the changelog, as round 2 already suggested for the same reason.
- The three build reviewers now carry six identical `printf | tr | sed | head` label preloads each -
  eighteen copies of one pipeline, each with an HTML comment explaining why it cannot be pre-approved
  by a `Bash(...)` pattern. `resolve-input.sh` already owns exactly this parse for file-valued labels.
  A sibling that prints a single non-file label value would collapse all eighteen, make them
  pattern-approvable, and put the label vocabulary behind one script instead of eighteen restatements
  of the same `sed` expression. Not a finding (the form predates this change and demonstrably works),
  but it is the largest remaining violation of the repo's own script-vs-fork principle in this area.
- Both new scripts take free text from an `AskUserQuestion` answer and have it interpolated into a
  shell command line by the orchestrator (`record-decision.sh <workdir> "<ID>" "<criterion or task>"
  "<what the user accepted>"`). Neither the scripts' headers nor the orchestrators say what happens to
  a `"` or a `$` in that text. A sentence in the orchestrators' Fix loop - the accepted wording is
  passed as a single argument, quotes stripped - would remove the only place in this change where
  user-authored text becomes shell syntax.

### Assessment

**Ready to merge?** With fixes

**Reasoning:** The suite, the lints and fresh adversarial probes of `commit-task.sh`'s untested
branches are all green, and all ten of round 2's findings are properly closed - the delivery is
structurally sound. What remains are two consumer-enumeration seams the change created itself: a
Simple-track reviewer check whose producing line was never added to the Simple-track implementor, and
a section rename whose compatibility rule reached the plan reviewer but not the three build-side
consumers of the renamed section.

## Notes

- NOTE: plan defect - spec criterion #10 and Task 1's Approach step 4 require every build review,
  `checkpoint` included, to run "every `Test Commands` block of the plan". At a checkpoint the blocks
  belonging to unbuilt tasks are red by construction. Unchanged from round 2 and recorded there as a
  decision, not a finding; repeated here only so the record is complete in this round's report.
- NOTE: plan defect - Task 2's Approach step 3 keeps the `status-update.sh` bump ahead of the
  undeclared-changes gate, so an exit-2 abort leaves `status.md` claiming a task that was never
  committed. Recorded as a plan decision in round 2; unchanged.
- The `*-notes.md` files were scanned for repeated `UNDERSPECIFIED:` lines naming the same field or
  rule across tasks: 15 lines across 10 files, no pair collides. `task-11-notes.md:21`'s exemption-list
  decision is explicitly marked SUPERSEDED by the round-2 fix, and `fix-02-notes.md:31`'s ordinal
  decision has no counterpart elsewhere.
- The changed files were grepped for a repeated default/error-shape pattern across more than one file.
  The one hit remains the workdir normalisation ("drop a trailing `/` and a leading `./`") in
  `record-decision.sh:42-43`, `checkpoint-update.sh:39-40`, `cleanup-run.sh` and, richer, in
  `commit-task.sh`'s `normalise_path`. All four were read in full: they agree on observable behaviour,
  Task 5's Failure modes told the two new scripts to copy `cleanup-run.sh`, and the orchestrators pass
  absolute paths that make the rule a no-op. Not a finding, as in round 2.
- A second candidate was checked and cleared: `root:` could have been spelled differently by
  `decompose.sh`, `commit-task.sh` and `resolve-input.sh` (git's `C:/...` vs the shell's `/c/...`).
  All three read it from the same `git rev-parse --show-toplevel`, and the prefix match in
  `normalise_path` was probed against a real absolute `touched:` path. They agree.

VERDICT: FAIL
