# Final code review (round 2) - review-02-code.md

Change set: `git diff d210865..HEAD` (63 files). Gates run before reading any code:

- `node --test "tests/**/*.test.ts"` -> 644 tests, 641 pass, 0 fail, 3 skipped.
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh` on all 13 changed skills/agents ->
  `FAIL=0` everywhere (2 pre-existing WARNs per build reviewer, 1 per plan reviewer).
- Plan grep gates: dash sweep over `superdev/`, `CLAUDE.md`, `README.md` clean; `grep -c '^## '
  review-contract.md` = 9; no `B1-B8`, no `Edge cases` outside the B9 compatibility sentence, no
  `Strengths`/`base:` in the three reviewers, no bare `git add -A`, no `cd` in the orchestrators;
  `diff` of the two `## Mandatory Rules` sections empty; `plugin.json` -> `20 7`.
- Manual probes of `commit-task.sh`: whole-tree `--path .` with a `.temp/` file (committed `keep.txt`
  only, `.temp/` left on disk), a `delete`-verb `### Files` entry, a run from a subdirectory with
  absolute task/notes paths, and a staged rename (`R` record, both paths reported). All as documented.

No e2e or integration suite in this host beyond `node --test`.

## Output Format

### Strengths

- **Round 1's four Important findings are genuinely closed, not papered over.** I1 is fixed at the
  contract level (`review-contract.md:126-130` - "the delta bounds where a defect is hunted, never
  which requirements are verdicted") rather than by a second SHA the orchestrator would have to
  track; I2 is one precise sentence in `superbuild-task-reviewer.md:28` that names every bookkeeping
  file by name; I3 is fixed *and* proved red-first with a regression case that opens `root:` the way
  a worker's file reader would (`decompose.test.ts`, `fs.existsSync(path.join(root, dir,
  "status.md"))`); I4 is fixed through both halves the report offered, and the notes say why one
  alone was not enough. The fix notes carry a status line per ID and a reason for each of the two
  skipped Minors - M1's reason (the fix would break a green test, not a user) is the right call.
- **`ACCEPTED` was invented rather than overloaded.** The round-1 accept path had no prior-findings
  verdict; the obvious shortcuts (reuse `ADDRESSED` and claim code changed, or `NOT ADDRESSED` and
  make it a FAIL) were both rejected in favour of a third verdict with the decisions-file line as its
  evidence cell (`review-contract.md:71-73`, `141-144`). That is the smallest change that makes the
  three stages readable side by side.
- **`commit-task.sh` holds up under adversarial probing.** The declared/undeclared split is
  symmetric on `.temp/`, the rename branch consumes the second NUL record correctly and reports both
  paths, a `delete`-verb path stages its deletion, a planned-but-never-created path is dropped before
  `git add` can abort on it, and every git call runs through `git -C "$root"` so a subdirectory
  caller gets the identical result. I could not get it to stage anything undeclared.
- **The gate is symmetric where it matters.** `decompose.sh` stages only the run directory it built,
  `commit-task.sh` only the declared set, the report and close-out commits carry explicit pathspecs -
  there is no longer a single bare `git add -A` in `superdev/scripts/`, and the two new tests prove
  a dirty tree survives a decomposition untouched.
- **The two new scripts follow the house style exactly.** English header with usage, parameters and
  behaviour; `set -euo pipefail`; `100755` in the index; the no-trailing-newline case in
  `record-decision.sh:48-51` handled correctly (command substitution strips the `\n`, so the guard
  fires only for a file that really lacks one). Both test files cover the happy path, the append or
  overwrite semantics, the missing-argument exit and the workdir normalisation.
- **B9-B14 are mechanically decidable.** Each new class names the sections to read and the Grep to
  run, and each is mirrored one-for-one in both plan templates, both plan SKILL.md files and the
  author self-check - so the author, the self-review and the reviewer apply the same sentence.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

- **`superdev/skills/superbuild/SKILL.md:74` (and `simplebuild/SKILL.md:74`) - a resume restores
  `head`, `since` and `prior` but none of the four report ordinals, so a resumed build overwrites
  its own review history and feeds stale paths to the new commit gate.**
  Step 1's resume rule recovers exactly three values. Four more drive file names and none of them is
  persisted or derivable from what is: `KK` ("this checkpoint's ordinal", `:108` / `:103`), the fix
  `NN` ("the fix ordinal across the whole build", `:117` / `:112`), the re-review `R` (`:120` /
  `:115`) and the per-task review `R` (`superbuild/SKILL.md:94`). A fresh orchestrator process has no
  memory of how many of each already ran and is told only "`01`, `02`, ...".
  *Failure scenario:* a 16-task build closes checkpoints after tasks 5 and 10, then the session dies
  during task 12. The resume reads `status: 11`, restores `since`/`prior` from `checkpoint.md`, and
  runs the checkpoint after task 15 as `KK = 01` - overwriting `implementation/checkpoint-01.md`, a
  closed round's report. Worse on the fix path: that checkpoint FAILs, the implementor is dispatched
  with `notes: implementation/fix-01-notes.md`, and both implementors are told to *append* when the
  file exists ("append when the file exists - earlier rounds stay",
  `superbuild-task-implementor.md:51`). The commit then runs `commit-task.sh --notes fix-01-notes.md`
  over a file holding two unrelated rounds' `touched:` lines, so the declared set silently widens to
  files the current round never touched - the exact widening the undeclared gate was built to
  prevent - and the round's status lines are interleaved with a stale round's in one file.
  *Why it matters:* resume is a first-class flow here (`status.md`, `base.md`, `checkpoint.md`, and
  the `claude --resume` instruction in the AGENT-TOOL-UNAVAILABLE block all exist for it), and this
  is the one place the new bookkeeping does not survive it.
  *Fix:* either derive the ordinals on resume (`KK` = `status: NN` div 5; `NN`/`R` = one Glob over
  `<workdir>/implementation/` for the highest existing `fix-*-notes.md` and `*-reR.md`), or add them
  to `checkpoint-update.sh`'s file the way `since`/`prior` already are.

- **`superdev/skills/superbuild/SKILL.md:142` and `simplebuild/SKILL.md:133` - the one relative path
  the orchestrator still hands an agent (`adr: docs/adr`) contradicts this change's own absolute-path
  rule and, when the session cwd is not the repository root, blocks the close-out commit.**
  `## Mandatory Rules` (`:18`, new in this change) states: "never pass a relative path on: join the
  decompose index's `root:` value with each relative path that index printed, so every fork, agent
  and script receives an absolute path and the build behaves identically whatever directory the
  session was started in". Step 4's ADR dispatch passes the bare literal `docs/adr`, and
  `adr-writer.md:14` uses it verbatim ("Non-path labels (`adr:` target dir) are used as literal
  values read straight off the prompt"). This is the only surviving relative value handed to a
  worker, and Step 4's commit is the step this change rewrote to a declared pathspec.
  *Failure scenario:* a host with `adr: true` runs `superbuild` from `src/`. `adr-writer` writes
  `src/docs/adr/2026-...md` and relays that path (or the relative `docs/adr/...` it was given).
  Step 4 then runs `commit-task.sh ... --path <workdir> --path <relayed ADR path>`.
  `commit-task.sh` resolves every declared path against the repository root, finds nothing at
  `<root>/docs/adr/...`, and drops it as a path that does not exist - while the file that actually
  landed, `src/docs/adr/...`, is untracked and outside every declared path. Result: exit 2,
  `undeclared: src/docs/adr/...`, the close-out commit blocked, and an `AskUserQuestion` escalation
  on every ADR-enabled build started outside the root. That is exactly criterion #25 ("każda komenda
  orkiestratora działa identycznie niezależnie od cwd") failing through a path this change did not
  bring in line with the rule it added.
  *Fix:* pass `adr: <root>/docs/adr` - the same join every other label already gets. The literal
  predates this change, but the rule and the declared-set commit that break on it do not.

- **`superdev/skills/simplebuild-reviewer/SKILL.md:49-55` - the plan-alignment gate is kept for
  `stage: checkpoint` without being scoped to the tasks built so far, so every Simple-track
  checkpoint trips it by construction.**
  The gate runs "FIRST on `checkpoint` and `final`" and asks "Is all planned functionality present?"
  and "does every file in the change set map to a plan task's `Files`?". At a checkpoint after task 5
  of 12, tasks 6-12 are not built: planned functionality is missing by definition. The gate's exit is
  absolute - "On any misalignment: STOP. Write the report (misalignment under Critical), emit the
  verdict line, and return immediately - do not run the checks below."
  *Failure scenario:* a 12-task SimplePlan. The checkpoint after task 5 returns `VERDICT: FAIL` with
  a Critical reading "tasks 6-12 not implemented", the orchestrator burns its one fix dispatch on an
  implementor that can only shrug, the re-review says the same, and the user gets the
  another-round/accept/abort question at every checkpoint boundary. The checkpoint layer - the single
  biggest thing this change adds to the Simple track - never returns a useful PASS.
  *Why the Super track is unaffected:* `superbuild-reviewer-change` carries no plan-alignment gate
  (`superbuild-reviewer-spec` owns that dimension and only ever runs at `final`), so the two tracks
  now disagree about what a checkpoint checks.
  *Fix:* scope the gate's first two questions to the delta at `stage: checkpoint` - the functionality
  of the tasks inside `git diff <since>..HEAD`, not of the whole plan - and keep the whole-plan
  reading for `final` only. Task 9's Approach said to keep the gate at both stages; it did not say
  the gate's wording should stay whole-build.

#### Minor (Nice to Have)

- `superdev/references/review-contract.md:154-161` vs `:163-172` - the two run bookkeeping files were
  given asymmetric guarantees. `decisions.md` is append-only *by construction* ("Written only through
  `scripts/record-decision.sh` - no orchestrator, fork or agent writes it by hand"); `debt.md` is
  append-only *by instruction* ("appends to it, never overwrites") with no mechanism named, while the
  reviewer's writing tool is `Write`, which truncates. A reviewer that does the obvious thing loses
  every earlier round's Minor. The blast radius is small (nothing reads `debt.md` and cleanup deletes
  it), but the repo's own script-vs-fork principle points at a third one-line script here.
- `superdev/references/review-contract.md:7-11` with `superdev/agents/superbuild-task-reviewer.md:60-66`
  - the contract lists the task reviewer among its consumers, but that agent receives no `refs:`
  label (`superbuild/SKILL.md:94` does not pass one) and cannot read the file; it restates the report
  skeleton and the ID scheme inline instead. The restatement is small and Task 7's Approach asked for
  it, but the single-owner claim in the contract header is false for one of its six named consumers,
  and the two shapes can now drift silently. Drop the task reviewer from the consumer list, or say
  there that it carries its own reduced copy.
- `superdev/references/review-contract.md:100` contradicts `:15-16`. The preamble promises the file
  never refers "to a heuristic for recognising a test file"; the re-run rule is "when the fix round
  touched any file other than a test". A stack-agnostic reviewer cannot evaluate that predicate.
  Reword to something observable - e.g. rerun the integration command whenever the fix round touched
  any file not listed under a `### Test Commands` block, or simply always on `re-review`.
- `superdev/references/review-contract.md:93` - the first gate bullet reads "the `#### Build` block of
  **the task's** `### Test Commands`", but `## Gates` is consumed only by the three build reviewers,
  none of which has a single task. Leftover wording from the per-task gate; say "of the plan's tasks".
- `superdev/skills/superbuild-reviewer-spec/SKILL.md:48` documents a `checkpoint` branch the spec
  reviewer is never dispatched at - both orchestrators run the *code* reviewer alone at a checkpoint.
  Harmless today, but it is the one place that would verdict every acceptance criterion mid-build and
  Critical the unbuilt ones if anyone ever wired it up. Either drop `checkpoint` from that line or
  state that the stage is reserved.
- `superdev/README.md:62` - "a re-review opens with an `ADDRESSED` / `NOT ADDRESSED` table per ID"
  predates the round-1 fix that added `ACCEPTED` as the third verdict (`review-contract.md:71-73`).
  The user-facing description of the table is now one column value short.
- `tests/superdev/commit-task.test.ts` - no case covers the `declare_all` branch
  (`commit-task.sh:319-320`, reached by `--path .`). It is the one mode that switches the undeclared
  gate off entirely and the only mode the git-init preflight uses, and it is currently proven by hand
  only (round 1 recommended this case; it was not added and the fix notes do not mention it). One
  case - fresh repo, a tracked file, a `.temp/` file, assert the commit carries the former and not
  the latter - would close it.

### Recommendations

- Two of the three Important findings above are the same shape as round 1's: a rule added in one task
  (`## Mandatory Rules`' absolute-path join, Task 11) or a section retained in another (Task 9's
  plan-alignment gate) whose interaction with a third task's code was never traced. Both would have
  been caught by the change's own new B14 class if the plan had named consumers for the values it
  introduced. Worth one line in the changelog: the checklist this build ships would have blocked the
  plan this build was built from.
- The stage vocabulary is now precise everywhere except *what each stage may assume about how much of
  the plan exists*. `checkpoint` means "half the build is not written yet", and three places assume
  otherwise (the Simple track's alignment gate, the contract's whole-plan gate list, the spec
  reviewer's unreachable `checkpoint` branch). One sentence in `## Verdict rules` - "at `checkpoint`
  the plan beyond the committed tasks is not yet due" - would settle all three at the owner.
- The run bookkeeping is now four files (`status.md`, `base.md`, `checkpoint.md`, plus
  `implementation/{debt,decisions}.md`) written by three different mechanisms (a script, a script, a
  fork's prose). Consolidating the append-only pair behind scripts would make the whole set
  script-owned and would also give the resume the ordinals finding 1 needs.

### Assessment

**Ready to merge?** With fixes

**Reasoning:** The scripts, the tests and the contract file are genuinely strong - the full suite and
every lint are green and `commit-task.sh` survived adversarial probing - and all four round-1
Important findings are properly closed. What remains is the same class of seam: a resume that
restores three of seven tracked values, one relative path left behind by the new absolute-path rule,
and a plan-alignment gate carried into a stage where the plan is deliberately half-built.

## Notes

- NOTE: plan defect - spec criterion #10 and Task 1's Approach step 4 require every build review,
  `checkpoint` included, to run "every `Test Commands` block of the plan". At a checkpoint the blocks
  belonging to unbuilt tasks are red by construction (they grep for text and run test files that do
  not exist yet), so every checkpoint opens with a gate table that is mostly false red, and the
  contract gives the reviewer no rule for it. Recorded as a decision, not a finding, because the spec
  states it explicitly; the fix belongs in the spec, not in this delivery.
- NOTE: plan defect - Task 2's Approach step 3 keeps the `status-update.sh` bump ahead of the
  undeclared-changes gate, so an exit-2 abort leaves `status.md` claiming a task that was never
  committed (verified by probe). Self-correcting in practice - the next task's commit reports the
  uncommitted work as undeclared - but the ordering is a recorded plan decision, so it is a note.
- The `*-notes.md` files were scanned for repeated `UNDERSPECIFIED:` lines naming the same field or
  rule across tasks: none found. `task-03-notes.md`'s `root:` spelling decision is explicitly marked
  SUPERSEDED by the round-1 fix, and no other pair collides.
- The changed files were grepped for a repeated default/error-shape pattern across more than one
  file. The one hit is the workdir normalisation ("drop a trailing `/` and a leading `./`") appearing
  independently in `record-decision.sh:42-43`, `checkpoint-update.sh:39-40`, `cleanup-run.sh` and, in
  a richer form, `commit-task.sh`'s `normalise_path`. Both locations were read in full: the four
  agree on the observable behaviour, Task 5's Edge cases explicitly told the two new scripts to copy
  `cleanup-run.sh`, and the orchestrators pass absolute paths that make the rule a no-op. Not a
  finding.
