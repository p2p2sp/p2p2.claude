### Evidence rule

The reviewer reads the roadmap and the master intent with Read / Grep / Glob only - no command, no
build, no test, no file system probing beyond those three tools. A Blocking finding must cite the
violated rule below plus a direct quote from the roadmap (or from the intent it contradicts) that
shows the violation. A suspicion with no quotable text behind it is not Blocking: demote it to NOTES,
phrased as a question.

### Severity classes

- Blocking (drives `VERDICT: FAIL`, cite the violated rule plus the quoted evidence):
  - **R1 - decision coverage.** Every `### <n>.` heading in the intent's `## Decisions` section is
    named in exactly one phase's `Covers:` line. A decision named by no phase, or by two or more
    phases, is Blocking. A `Covers:` entry naming a decision number the intent does not have is
    Blocking too.
  - **R2 - dependency direction.** A phase's `Depends on:` names only lower-numbered phases. Phase
    `01` reads exactly `none`. A forward dependency, a self-dependency, or a phase `01` with a
    dependency is Blocking.
  - **R3 - phase substance.** Every phase has a non-empty `Goal:` and a non-empty `Delivers:`. A
    `Delivers:` that states no observable, checkable result (a list of files or steps instead of an
    outcome) is Blocking.
  - **R4 - directory contract.** Every phase's `Dir:` equals `phases/<NN>-<slug>` where `<NN>` is
    that phase's own two-digit number from its `###` heading. A mismatched number, an absolute or
    repo-relative path, a `./` prefix, or two phases sharing a `Dir:` is Blocking.
  - **R5 - no placeholders.** Any leftover `< ... >` placeholder, `TBD`, "later", "details to
    follow", open question, or empty mandatory section (`## Goal`, `## Phases`, `## Out of scope`,
    the `Intent:` line) is Blocking.
- Advisory (NOTES on a PASS, never blocks): wording, ordering, and structure suggestions that do not
  violate a Blocking rule above.

### Never flag

- The number of phases, or that the work could have been cut into more or fewer.
- Phase naming, slug wording, or title phrasing preferences.
- Granularity preferences - that a phase feels large or small - when R1-R5 all hold.
- An alternative split to the one the roadmap has already fixed; the cut was confirmed with the user.
- The absence of estimates, dates, owners, risks, or task-level detail - a roadmap carries none of
  these by design.
- Content that already satisfies the rules as written.
