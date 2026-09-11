## Task 5 notes

- Added two extra test cases beyond the Approach's enumerated list: a workdir-normalisation case in
  both `record-decision.test.ts` and `checkpoint-update.test.ts`, proving the `### Edge cases` entry
  ("trailing `/` or leading `./`" normalised like `cleanup-run.sh`) that the Approach's step 4 test
  enumeration did not itself list a case for.
- UNDERSPECIFIED: argument validation treats an empty-string argument the same as a missing one
  (`[[ -z "$x" ]]` checks, matching `status-update.sh`'s and `cleanup-run.sh`'s own convention) -
  the task said "validate four/three arguments" without pinning down empty-vs-absent.
- UNDERSPECIFIED: `checkpoint-update.sh` does not `mkdir -p` the workdir itself (unlike
  `record-decision.sh`, which the Approach explicitly told to `mkdir -p "<workdir>/implementation"`).
  Decision made: `checkpoint-update.sh` assumes `<workdir>` already exists, since it only ever runs
  mid-build after `decompose.sh` has created the run directory - the Approach's step 3 never mentions
  creating the directory, only overwriting the file inside it.
