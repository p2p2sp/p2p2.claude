
### Edge cases
- A plan written before this change (still carrying `### Edge cases`): the reviewer treats the section as `### Failure modes` and applies B9 to it (state this in the checklist's B9 text).
- `### Failure modes` of a pure function task: `none - pure` is valid.

### Contracts
- Section names `### Failure modes` and `### Contracts` and classes B9-B14 are consumed by Task 7 (task reviewer) and Task 8 (implementors), which reference them by name.

### DoD
Both templates, the checklist, both plan skills and both plan reviewers updated; a plan whose task has `### Failure modes` equal to bare `none` or a consumed contract without `consumed by Task <N>` is classifiable as B9 / B14 by reading the checklist alone; greps in Test Commands hold; portability sweep green.

