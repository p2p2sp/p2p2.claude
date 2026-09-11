# Task 11 review 1 - findings

## Critical

- `superdev/skills/superbuild/SKILL.md:18` and `superdev/skills/simplebuild/SKILL.md:18` - the new
  Mandatory Rule reads "never pass a relative path on: join the decompose index's `root:` value with
  each relative path that index printed, so every fork, agent and script receives an absolute path".
  `workdir:` is one of the relative paths that index prints, and `cleanup-run.sh` is a script, so the
  rule tells the orchestrator to hand `cleanup-run.sh` an absolute workdir at Step 5 item 1
  (`superbuild/SKILL.md:153`, `simplebuild/SKILL.md:144`). That breaks the script's documented
  contract: `superdev/scripts/cleanup-run.sh:9-16` states the workdir must be passed "TAK JAK
  wypisuje ją decompose.sh", and its safety gate at `cleanup-run.sh:84` rejects anything not starting
  with `docs/.workflows/` - explicitly including an absolute path - printing
  `CLEANUP: <workdir> (skipped - not a superdev run dir)` and exiting 0. The `cleanup: true` switch
  would therefore silently stop removing completed runs. The same contract is spelled out on the
  producer side in `superdev/scripts/decompose.sh:58-63`: the orchestrator joins `root:` with "the
  relative paths of this index to build the absolute path of every fork / agent label", but
  "workdir: itself stays repository-relative - cleanup-run.sh needs it that way". This is a violation
  of the task's `### Contracts` ("Consumes ... Task 3's `root:` index line") and it is not recorded in
  `task-11-notes.md`.
  Fix: reword the rule in both files (keeping the two `## Mandatory Rules` sections byte-identical) so
  the `root:` join applies to the path values handed to forks and agents and to file paths handed to
  scripts, while the index's `workdir:` value is passed on verbatim, exactly as `decompose.sh` printed
  it, to the run-directory scripts (`cleanup-run.sh` above all).
