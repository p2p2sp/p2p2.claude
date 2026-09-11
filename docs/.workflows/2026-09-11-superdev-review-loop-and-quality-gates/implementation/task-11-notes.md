The checkpoint trigger carries a third condition beyond the Approach's "N multiple of 5 and N < total": `head` must have moved in the commit step - without it the no-git build (`base: none`, every commit skipped) would still fire checkpoints, which the task's own edge case forbids.

Step 1's working-dir listing gained a `checkpoint.md` bullet (not named in the Approach) - the resume edge case reads that file, so the orchestrator has to know it exists and who writes it.

The final-reports commit in Step 3 and the close-out commit in Step 4 both carry "its exit 2 is handled as in Step 2" - the Approach spelled the undeclared-changes escalation out only for the task and fix commits, and a pathspec commit can hit the same exit.

simplebuild's single `stage: final` call carries `prior: <prior>` (omitted when none) and `decisions:` as well, which the Approach spelled out only for superbuild's code reviewer - criterion #7 requires the final review of both tracks to inherit the last closed checkpoint's report.

Step 4 lost its own `printf '%s\n' "${CLAUDE_PLUGIN_ROOT}/references"` call and its item numbering shifted from 2-7 to 2-6, because `<refs>` is now computed once in Step 1 as the Approach directs.

UNDERSPECIFIED: the BLOCKED branch's "fix" option - the task names the three `AskUserQuestion` options (accept as changed / fix / abort) but not what "fix" does; decided: it takes the FAIL branch of the same fix loop (one implementor dispatch plus one re-review), so a BLOCKED report the user wants coded never leaves the budgeted path.

UNDERSPECIFIED: a writer line relaying `none` (e.g. `ADR: none`) in the close-out commit's pathspec - decided: it contributes no `--path`, since there is no file behind it and `commit-task.sh` would drop the literal anyway.

UNDERSPECIFIED: `<report basename>-reR.md` - decided the basename is the report name without its `.md` suffix, so `checkpoint-01.md` re-reviews are `checkpoint-01-re1.md`, matching the task's Contracts examples.

Review round 1 fix - the `## Mandatory Rules` path rule in both SKILL.md files now exempts the run directory itself: the index's `workdir:` value goes verbatim (repository-relative) to the scripts that take it as an argument, because `cleanup-run.sh`'s safety gate rejects any path outside `docs/.workflows/`, absolute included, and `decompose.sh` documents that form on the producer side.

Review round 1 fix - the same over-broad wording in Step 1's index sentence of both files ("prefixing every path you hand on with `root:`") was reworded to defer to `## Mandatory Rules`; the finding named only line 18, but leaving that sentence would have reinstated the same instruction one section later.

UNDERSPECIFIED: which scripts count as taking the run directory verbatim - the finding named `cleanup-run.sh` "above all"; decided in round 1 the exemption list is `cleanup-run.sh`, `checkpoint-update.sh`, `record-decision.sh` and `commit-task.sh --path`. SUPERSEDED by the round 2 fix below: that list was wrong, only `cleanup-run.sh` requires the repository-relative form.

Review round 2 fix - the `## Mandatory Rules` path rule in both SKILL.md files now exempts `cleanup-run.sh` alone: `checkpoint-update.sh` and `record-decision.sh` resolve their `<workdir>` argument against the caller's cwd (no `git rev-parse --show-toplevel`, unlike `commit-task.sh`), so a repository-relative workdir from a session started in a subdirectory made the first exit 1 and the second write the accepted decision into a stray untracked tree. Verified in a throwaway repo from `<repo>/src`: with the absolute workdir both write into the real run directory and leave `src/` empty. `commit-task.sh` is named only as normalising either form, and the two sections stay byte-identical.

Review round 2 fix - Step 5's `cleanup-run.sh` call in both files gained an inline "here alone `<workdir>` is the index's value verbatim" reminder (not asked for by the finding): the narrowed rule makes `<workdir>` mean the absolute run directory everywhere else in the body, so the single exception had to be visible at its one call site rather than only three sections earlier.

Review round 3 fix - the `## Mandatory Rules` "no report" state in both SKILL.md files now also covers a reviewer returning `VERDICT: FAIL` or `VERDICT: BLOCKED` with no report to act on (no `REVIEW:` line, e.g. a `REASON: missing input <label>` line in its place), not only a missing `VERDICT:` line or a `REVIEW:` path that does not exist: the documented input-error return of all three build reviewers (`review-contract.md` `## Labels`) has exactly that shape and matched no `### Fix loop` branch, leaving the orchestrator to improvise into the FAIL branch and dispatch an implementor at a report that was never written. The verdict scoping is deliberate - a plain `VERDICT: PASS` carries no `REVIEW:` line by contract and must not read as "no report". The two sections stay byte-identical.

Review round 3 fix - the same bullet gained a closing precedence sentence (not asked for by the finding): "It outranks every `### Fix loop` branch - never dispatch an implementor at a report that was never written." Naming the state without ranking it above the FAIL branch it collides with would have left the same improvisation available one section later.
