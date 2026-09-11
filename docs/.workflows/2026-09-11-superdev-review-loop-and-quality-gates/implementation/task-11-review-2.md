# Task 11 review 2 - findings

## Critical

- `superdev/skills/superbuild/SKILL.md:18` and `superdev/skills/simplebuild/SKILL.md:18` - the new
  path rule exempts four scripts from the `root:` join, but two of them cannot take a
  repository-relative workdir from an arbitrary cwd: `checkpoint-update.sh` and `record-decision.sh`
  resolve their `<workdir>` argument against the caller's cwd (neither calls
  `git rev-parse --show-toplevel`, unlike `commit-task.sh`, whose header states "Every git call runs
  through `git -C <repository root>`"). Verified in a throwaway repo with cwd at `<repo>/src` and the
  workdir passed as `docs/.workflows/run-x`:
  - `checkpoint-update.sh` -> `docs/.workflows/run-x/checkpoint.md: No such file or directory`,
    exit 1 (`superdev/scripts/checkpoint-update.sh:46` redirects into a directory that does not exist
    relative to cwd), so the `### Fix loop` PASS branch (`superbuild/SKILL.md:114`,
    `simplebuild/SKILL.md:109`) fails and the resume bookkeeping the task's own resume edge case
    depends on is never written;
  - `record-decision.sh` -> exit 0 but it silently created
    `<repo>/src/docs/.workflows/run-x/implementation/decisions.md`
    (`superdev/scripts/record-decision.sh:45-46` `mkdir -p "$dir/implementation"`), so the BLOCKED
    branch (`superbuild/SKILL.md:115`, `simplebuild/SKILL.md:110`) writes the accepted decision to a
    stray untracked tree while the reviewer is handed the absolute
    `<workdir>/implementation/decisions.md` that stays empty - the same BLOCKED item is raised again
    forever, and the stray file then shows up as an `undeclared:` path on the next commit.
  This breaks covered criterion #25 (a build started from `src/` must behave as one started at the
  repository root) and covered criterion #22 (the accepted decision must reach the next round as
  `decisions:`), and it contradicts the task's own DoD line "every path absolute from `root:`". Both
  scripts work correctly when handed an absolute workdir (verified: `checkpoint-update.sh` with an
  absolute path from `src/` prints `checkpoint: ... -> abc123`, exit 0). The recorded decision in
  `task-11-notes.md:21` ("the first three document the repository-relative form in their headers")
  over-generalises: only `cleanup-run.sh` actually requires that form, and `decompose.sh:58-63` names
  exactly that one script as the reason ("workdir: itself stays repository-relative - cleanup-run.sh
  needs it that way").
  Fix: narrow the exemption in the rule to `cleanup-run.sh` (whose safety gate rejects an absolute
  path) - `commit-task.sh --path` may stay named or not, it normalises either form against the
  repository root - and state that `checkpoint-update.sh` and `record-decision.sh` get the workdir
  joined with `root:`, i.e. absolute, like every other script argument. Keep the two
  `## Mandatory Rules` sections byte-identical and update `task-11-notes.md:21` accordingly.
