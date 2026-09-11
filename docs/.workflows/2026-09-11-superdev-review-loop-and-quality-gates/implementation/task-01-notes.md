# Task 1 notes

- `## Report skeleton` presents the report structure as a bullet list with backticked section names instead of a verbatim fenced skeleton, because the task's own test `grep -c '^## '` must return exactly 9 and a verbatim block would add `## Gates` / `## Findings` / `## Notes` lines to that count.
- Added `minor: <ID>[, <ID>]` to `## Labels` (Approach step 2 defines it only inside `## Implementor fix-mode input`), because Task 8 dispatches it as a label and references it as defined in `## Labels`.
- Added to `## Report skeleton` one clause that the `report:` path is the reviewer's only output file and any scratch file lives under `.temp/` (criterion #33 support for Tasks 9 and 10, which reference this file rather than restating rules); not named in the Approach.
- Added to `## Report skeleton` one sentence that the spec reviewer inserts its own coverage table between the gates and prior findings sections and that no other section is added, so the skeleton does not contradict Task 10's report layout.
- Added a preamble line defining `<workdir>` as the run working directory, because `## Debt file` and `## Decisions file` use that token in their paths and the Approach never defines it.
- UNDERSPECIFIED: parent of `### Needs decision` in the report skeleton - the Approach lists it after the Critical/Important bullets without naming a parent section; decided it is the third subsection of `## Findings`.
- UNDERSPECIFIED: line shape of the existing `UNDERSPECIFIED:` note - the implementor agents describe it in prose only, with no fixed shape; decided the documented shape is `UNDERSPECIFIED: <value> - <the decision made>`, which the prose already implies.
- UNDERSPECIFIED: which build command the gates run - the Approach says "the build"; decided it is the plan's `#### Build` block or blocks, matching how the plan template names them.
