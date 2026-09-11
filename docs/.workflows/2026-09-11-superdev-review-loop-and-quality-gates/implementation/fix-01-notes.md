# Fix round 01 - findings from implementation/review-01-code.md

The report predates the ID contract (bullets carry no IDs), so its findings are numbered here in
order of appearance: `I1`-`I4` for the four Important, `M1`-`M6` for the six Minor. No Critical
was raised.

touched: superdev/scripts/decompose.sh
touched: superdev/scripts/checkpoint-update.sh
touched: superdev/scripts/commit-task.sh
touched: superdev/references/review-contract.md
touched: superdev/agents/superbuild-task-reviewer.md
touched: superdev/skills/superbuild-reviewer-spec/SKILL.md
touched: superdev/skills/superbuild/SKILL.md
touched: superdev/skills/simplebuild/SKILL.md
touched: superdev/README.md
touched: CLAUDE.md
touched: tests/superdev/decompose.test.ts
touched: tests/superdev/checkpoint-update.test.ts
touched: tests/superdev/commit-task.test.ts

## Finding status

I1: fixed - no test: the fix is reviewer prose (no script executes it). The spec dimension's scope
now lives once in `review-contract.md` `## Verdict rules` ("the delta bounds where a defect is
hunted, never which requirements are verdicted"), and `superbuild-reviewer-spec` `## Review` points
at it instead of bounding the review by the change set.
I2: fixed - no test: agent prose. `superbuild-task-reviewer.md` `## Scope` now excludes the run's
own working directory (notes, reports, `debt.md`, `decisions.md`, `checkpoint.md`, `status.md`) from
the task's diff, so a checkpoint's own untracked artifacts never read as out of bounds.
I3: fixed - `decompose.sh` prints `root:` from `pwd -W 2>/dev/null || pwd` outside a repository, so
the value carries the platform's native spelling (`C:/...` under Git-Bash, never `/c/...`). Proved
red first: with the old `pwd` fallback the extended case "edge: outside a git repository the tree is
built and the commit is skipped, exit 0" in `tests/superdev/decompose.test.ts` fails on this
machine; it passes with the fix. The assertion opens `root:` the way a worker's file reader would
(`fs.existsSync(path.join(root, dir, "status.md"))`), which is the exact consumer the finding named.
I4: fixed - no test: orchestrator prose plus a contract rule. Both orchestrators now run
`record-decision.sh` per still-open Critical/Important when the user answers "accept with open
findings" (the BLOCKED branch's existing call), and `review-contract.md` rules what a prior ID does
afterwards: `ACCEPTED` in the prior findings table, never re-raised, never a FAIL; a `NOT ADDRESSED`
prior Critical/Important with no decisions line is a FAIL at `checkpoint` and `final` too.
M1: skipped - fixing it breaks a green test rather than a user. Dropping a `.` run directory instead
of promoting it to `declare_all` makes the existing case "message + task file: the status.md bump
lands in the SAME commit as the task's work" exit 2 (its `status.md` sits at the repository root),
so the change is not the low-risk edit a Minor allows. The behaviour stays latent: `decompose.sh`
never produces that layout.
M2: fixed - `checkpoint-update.sh` creates the working directory (`mkdir -p`) like
`record-decision.sh` does; covered by the new case "a workdir that does not exist yet is created,
not reported as a redirection error".
M3: fixed - no test: `commit-task.sh` documents `--path <path>` (usage line, header, error message,
test header comment) and states that a magic pathspec is dropped as a non-existent path.
M4: fixed - no test: `decompose.sh`'s header cwd paragraph now says the plan's `Spec:` and `Intent:`
values are read after the move to the repository root, so a relative one resolves against that root.
M5: fixed - no test: `superdev/README.md` and the root `CLAUDE.md` name the checkpoint report
`checkpoint-KK.md`, the spelling both orchestrators use.
M6: skipped - the proposed resume rule needs a value `checkpoint.md` does not carry. "checkpoint.md
absent or older than `NN`" has no observable form: the file holds SHAs, not task numbers, and the
`since == head` proxy misfires whenever a resume's own decompose commit moves HEAD, turning a missed
checkpoint into a duplicated one. Closing it properly means a fourth `checkpoint-update.sh` argument
plus a contract change, which is more than a Minor may buy.

## Deviations

- Fixed I1 by rewording the reviewer and the contract rather than by passing a different SHA on the
  spec call (the report offered either) - the orchestrator keeps one `since` per round, and a second
  SHA for one reviewer would need its own tracked value and a resume rule.
- Fixed I4 through both halves the report offered, not one: `record-decision.sh` on the accept path
  AND the missing verdict rule. Either alone leaves the other reading ambiguous - the recording has
  no rule that consumes it, and the rule alone leaves the acceptance unrecorded.
- Touched files outside the four the findings name: `superdev/references/review-contract.md` (single
  owner of the rules behind I1 and I4 - a rule written into a consumer instead would be the
  restatement the plan forbids), `superdev/skills/simplebuild/SKILL.md` (I4's fix loop text is
  shared by both tracks), `superdev/README.md` and `CLAUDE.md` (M5, and the decisions.md sentence
  that I4 widened), `superdev/scripts/commit-task.sh` (M3), `superdev/scripts/checkpoint-update.sh`
  (M2), and three test files (the I3 regression case, the M2 case, the M3 header line).
- `superbuild-reviewer-spec/SKILL.md` keeps its "No scope creep: judge against the change set"
  bullet bounded by `since`: creep is only observable in a diff, and the reviewer knows no earlier
  SHA. I1 was about criterion coverage, which is now unbounded.

UNDERSPECIFIED: the prior-findings verdict for a finding the user accepted - the report named no
value. Added `ACCEPTED` as a third verdict next to `ADDRESSED` / `NOT ADDRESSED` in the contract's
`## Report skeleton`, with the decisions-file line as its evidence cell, rather than overloading
`ADDRESSED` (which would claim code changed) or `NOT ADDRESSED` (which now always means FAIL).
UNDERSPECIFIED: the fallback spelling outside a git repository - the report suggested `pwd -W`
"where the shell supports it" without pinning the detection. Implemented as
`pwd -W 2>/dev/null || pwd`: Git-Bash answers with the native form, every POSIX bash fails the
option silently and falls back to `pwd`, which is already native there.
