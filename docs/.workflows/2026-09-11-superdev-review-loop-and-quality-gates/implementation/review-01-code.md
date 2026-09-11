# Final code review - review-01-code.md

Change set: `git diff d210865..HEAD` (63 files, +3206/-297). Full suite run before reading code:
`node --test "tests/**/*.test.ts"` -> 643 tests, 640 pass, 0 fail, 3 skipped.
`lint_skill.sh` on every changed skill/agent -> `FAIL=0` everywhere (2 pre-existing WARNs per build
reviewer). `node -e plugin.json` -> `skills 20 agents 7`, as Task 12 claims.
Manual probes: `commit-task.sh --path .` on a fresh repo with a `.temp/` file, and `commit-task.sh`
with absolute task/notes paths from a subdirectory - both behave as documented.

## Output Format

### Strengths

- **The contract is genuinely single-owner.** `superdev/references/review-contract.md` states each
  rule exactly once, and the five consumers (three reviewer skills, two implementors) reference its
  sections by name instead of paraphrasing. Spot-checking the label set, the ID rules, the report
  skeleton and the three-verdict channel across `superbuild-reviewer-change`,
  `simplebuild-reviewer`, `superbuild-reviewer-spec` and both implementors found no restatement and
  no drift - the classic failure mode for a vocabulary spread over seven files was avoided.
- **`commit-task.sh` is the strongest unit in the change.** The declared-set / undeclared-set split
  is symmetric (`add_declared` and the porcelain loop both drop `.temp/`), rename and copy records
  are checked on both of their paths, an ignored-and-untracked declared path is dropped before
  `git add` can abort on it, and every git call goes through `git -C "$root"` so the result is
  cwd-independent. Three of those are undocumented improvements over the Approach and each one is
  recorded in the notes with its reason.
- **The `git add -A -- <dir> ':(exclude)...'` trap was found empirically, not guessed.** The notes
  record the verification (git 2.47.1), and the code takes the exclude only in the whole-tree branch
  where it demonstrably works. I re-verified the whole-tree branch: `--path .` on a fresh repo
  commits `keep.txt` and leaves `.temp/superdev/s.md` on disk and out of the commit.
- **Tests assert behaviour, not implementation.** The new `commit-task` cases each assert the full
  triple (exit code, the `undeclared:` line, `git log` unchanged); the decompose subdirectory case
  asserts the tree was built under the root *and* that `sub/docs` does not exist; the resolve-input
  pair proves both the fallback and the cwd-wins precedence. `toplevelOf()` / `normaliseAbs()` in
  `decompose.test.ts` handle the macOS `/private/var` and Git-Bash 8.3 spellings rather than
  pinning a path the CI matrix would break on - the test comments explain why.
- **Notes discipline is exemplary.** Every deviation carries its reason, `UNDERSPECIFIED:` lines name
  the value and the decision, and Task 11 even marks one earlier decision `SUPERSEDED` when round 2
  proved it wrong. That record is what made this review possible at contract depth.
- **The orchestrators' new failure states are precise.** "interrupted by limit" and "no report" both
  name the observable signal, rank against the fix loop, and state that neither counts as a round -
  and the "no report" state explicitly covers the `REASON: missing input <label>` return shape the
  contract defines, which is exactly the return that would otherwise fall into the FAIL branch.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

- **`superdev/skills/superbuild-reviewer-spec/SKILL.md:45` (with `:48-49` and
  `superdev/skills/superbuild/SKILL.md:128`) - the only spec-conformance gate of the build is now
  bounded to the last checkpoint's delta.**
  Line 45 says "Judge the current repository state against `## spec` and `## plan`, **bounded by the
  change set** `git diff --name-status <Since>..HEAD`", while line 48 says `final` judges "every
  acceptance criterion, scenario and constraint, over that change set and the repository state".
  The two lines disagree about scope, and the orchestrator resolves the disagreement in the wrong
  direction: Step 3 calls the spec reviewer with `since: <since>`, which after checkpoints is the
  SHA of the last closed round - not the build base. Before this change `Base SHA:` was always the
  build base, so the bound was the whole build.
  *Failure scenario:* a 12-task build closes a checkpoint after task 5 and another after task 10.
  The final spec review runs with `since` = the SHA after task 10, so the code for criteria covered
  by tasks 1-10 lies outside its change set. A criterion those tasks silently failed to deliver is
  never raised, and no other gate owns spec conformance (the checkpoints run the *code* reviewer
  only). The one dimension the Super track exists for degrades to the last two tasks.
  *Fix:* for `stage: final` the spec dimension is unbounded - judge every criterion against the
  repository state, using `since` only to locate what changed most recently. Either pass the base
  SHA on the spec call, or reword line 45 so the change set is evidence, not a scope bound.

- **`superdev/agents/superbuild-task-reviewer.md:23,26,31` vs `superdev/skills/superbuild/SKILL.md:104-114`
  - the per-task gate sees the checkpoint's own artifacts as out-of-bounds changes.**
  The task reviewer treats `git status --short` as "the uncommitted work under review" and flags any
  file outside the task's `### Files` ("Stays in bounds"). On the PASS path a checkpoint writes
  `implementation/checkpoint-KK.md`, `implementation/debt.md` and `checkpoint.md` and nothing
  commits them until the *next* task's commit, which runs after that task's review.
  *Failure scenario:* task 5 commits; the checkpoint runs and PASSes, leaving three untracked files
  in the run directory; task 6's implementor runs; task 6's reviewer runs `git status --short`,
  sees `docs/.workflows/<run>/implementation/checkpoint-01.md`, `.../debt.md` and
  `<run>/checkpoint.md` - none of them under task 6's `### Files`, none of them in `notes:` - and
  raises an out-of-bounds Critical. Result: a spurious FAIL, one wasted fix dispatch, and an
  implementor pointed at files it must not touch. This fires at every checkpoint boundary of every
  Super-track build.
  *Fix:* one sentence in the task reviewer's `## Scope`: files under the run's own working directory
  (`docs/.workflows/<run>/`) are build bookkeeping, never part of the task's diff - ignore them.
  (`notes:` already covers the implementor's own notes file by accident; the new files are not.)

- **`superdev/scripts/decompose.sh:114` with `superdev/skills/superbuild/SKILL.md:18` - outside a git
  repository `root:` is printed in a spelling the agents' file reader cannot open on Windows.**
  Inside a repository `root:` comes from `git rev-parse --show-toplevel`, which prints `C:/Projects/x`
  under Git-Bash - fine. Outside one it falls back to `pwd`, which prints the MSYS form
  (`/c/Projects/x`, or `/tmp/tmp.X` for a temp dir; verified in this shell). The orchestrator's new
  rule (`SKILL.md:18`) joins that value with every relative index path and hands the result to agents
  and forks, which open it with the file-reading tool, not through bash.
  *Failure scenario:* a Windows user runs `superbuild` outside a repository and picks "Continue
  without git" at the Step 1 preflight. Every dispatch then carries `task: /c/Users/x/proj/docs/...`;
  the implementor's reader resolves that against the current drive as `C:\c\Users\...`, finds
  nothing, and returns `VERDICT: FAIL` / `REASON: missing input task`. The build cannot start. Before
  this change the orchestrator passed the index paths as printed (relative), which resolved fine.
  Two tasks each decided a piece of this rule independently and neither owns it - Task 3
  ("the `root:` spelling is verbatim what the environment gives ... the consumer hands it back to
  the same shell") and Task 4 (`is_absolute` accepts both spellings) - and the consumer that is not
  a shell was missed.
  *Fix:* make the no-repository fallback print the same spelling git would (e.g. `pwd -W` where the
  shell supports it, falling back to `pwd`), or state in `## Mandatory Rules` that the `root:` join
  is skipped when the index reports no repository.

- **`superdev/skills/superbuild/SKILL.md:122` / `simplebuild/SKILL.md:117` with
  `superdev/references/review-contract.md:152-160` - "accept with open findings" leaves no record,
  so the next round's treatment of those IDs is undefined.**
  The BLOCKED branch records the user's acceptance through `record-decision.sh`, and the contract
  then says a criterion covered by a `decisions.md` line "is neither raised as a Critical nor
  returned as BLOCKED again". The FAIL branch's **accept with open findings** option writes nothing:
  it only moves `since`/`prior` on. The contract's `## Verdict rules` defines what a `NOT ADDRESSED`
  Critical does at `re-review` and says nothing about it at `final`, while `## Report skeleton`
  requires the prior-findings table whenever `prior` is given.
  *Failure scenario:* the user accepts two open Criticals at the checkpoint after task 5. The final
  code review is handed `prior:` = that checkpoint's last report, must table `C1`/`C2` as
  `NOT ADDRESSED`, and has no rule saying whether that is a FAIL. One reading re-opens findings the
  user already closed (the extra rounds this whole change exists to prevent); the other silently
  drops them. Both are defensible from the text, which is the defect.
  *Fix:* route "accept with open findings" through `record-decision.sh` as well (the script and the
  label already exist and the reviewer already treats those lines as plan text), or add one line to
  `## Verdict rules` fixing what a `NOT ADDRESSED` prior ID does at `stage: final`.

#### Minor (Nice to Have)

- `superdev/scripts/commit-task.sh:170-173` with `:237-242` - a run directory that normalises to `.`
  sets `declare_all=1`, which declares the whole tree and disables the undeclared gate entirely.
  It is reachable whenever the task or notes file sits two levels below the repository root
  (`<root>/tasks/task-01.md`, as the existing "message + task file" test does). `decompose.sh` never
  produces such a layout, so this is latent rather than live, but the silent widening is the exact
  opposite of the guarantee the script now owes. Consider dropping a `.` run directory instead of
  promoting it to whole-tree, and keeping `--path .` as the only way in. (Recorded as an
  `UNDERSPECIFIED:` decision in `task-02-notes.md`.)
- `superdev/scripts/checkpoint-update.sh:41-46` - no `mkdir -p "$dir"`, unlike its sibling
  `record-decision.sh:45`. A missing working directory produces a raw redirection error and exit 1
  instead of the script's own message; the two scripts were written together and differ here for no
  stated reason beyond "it only ever runs mid-build".
- `superdev/scripts/commit-task.sh:15-18` - `--path` is documented as taking a `<pathspec>`, but the
  value is normalised as a literal path, existence-checked and prefix-matched. A real pathspec
  (`':(exclude)x'`, a glob) would be dropped silently. Call the parameter `<path>` in the usage line
  and the header.
- `superdev/scripts/decompose.sh:143,156` - after the new `cd` to the repository root, a `Spec:` or
  `Intent:` value that was relative to the *caller's* cwd no longer resolves (exit 4 for the spec).
  The new behaviour is the correct one, but the header's cwd paragraph (`:15-19`) should say that
  those two plan values are read as repository-root relative now.
- `superdev/README.md:57` and `CLAUDE.md:190` name the checkpoint report `checkpoint-NN.md` while both
  orchestrators (`superbuild/SKILL.md:108`) call it `checkpoint-KK.md`. Same file, two spellings in
  the documentation that is meant to be the reference.
- `superdev/skills/superbuild/SKILL.md:86,104` - on a resume the loop starts at the first task after
  `status:`, so a checkpoint that was due at the boundary the session died on is never run
  (e.g. the session ends right after task 5's commit; the resume starts at task 6 and the first
  checkpoint now happens at task 10). Cheap to close: on resume, run the checkpoint when
  `status: NN` is a multiple of 5, `NN < total` and `checkpoint.md` is absent or older than `NN`.

### Recommendations

- The four Important findings are all *seam* findings (Task 10 vs 11, Task 7 vs 11, Task 3 vs 4 vs 11,
  Task 1 vs 11). Every one of them sits where a task changed a value another task consumes without a
  `consumed by Task <N>` line - which is precisely what the new B14 class was introduced to block.
  The plan for this build predates its own rule; worth noting in the changelog as the first
  regression the new checklist would have caught.
- `review-contract.md` is the right shape, but `## Verdict rules` currently defines FAIL conditions
  per stage only for `re-review`. Giving `checkpoint` and `final` the same explicit "FAIL when ..."
  sentence would close the gap behind the fourth Important finding and make the three stages
  readable side by side.
- The scripts now have four consumers each (orchestrator, forks, agents, tests) but only the tests
  execute them. The two new scripts are covered; consider one regression case for
  `commit-task.sh --path .` including a `.temp/` file, since the git-init branch is the only caller
  of that mode and it is currently proven by hand only.

### Assessment

**Ready to merge?** With fixes

**Reasoning:** The scripts, tests and the contract file are high quality and the full suite plus every
lint is green; the defects are all in the seams between the contract, the orchestrators and the two
gates that consume them - a spec dimension whose scope was narrowed by the new `since` label, a
per-task gate that will trip over the checkpoint's own files, a `root:` spelling that breaks the
no-git branch on Windows, and an accept-path the contract never rules on.

VERDICT: FAIL
