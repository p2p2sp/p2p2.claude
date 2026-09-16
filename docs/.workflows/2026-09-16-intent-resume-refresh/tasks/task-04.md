
## Task 4 - docs(superdev): document the resume refresh step and refresh.md
- Covers: criterion #5
- TDD: none
- Model: sonnet
- Effort: low

### Dependencies
- Task 1 - blocks: the docs describe the file and the step Task 1 introduces
- Task 2 - blocks: the docs describe the gate Task 2 introduces

### Files
- modify - superdev/README.md (the `intent` row of the skills table)
- modify - CLAUDE.md (the superdev bullet, the docs/.workflows layout entry, the host-repo `docs/` invariant)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- none (no suite reads README.md or CLAUDE.md; the change is verified by the DoD below)

### Approach
1. In `superdev/README.md`, extend the `intent` row of the skills table, in English: a resume refreshes the context into `refresh.md` next to the intent (changelog entries and ADRs since the intent's date, the delivered state, movement in git) before presenting the decisions, and a fresh run writes the same file from what exploration found.
2. In `superdev/README.md`, extend the resume sentence in the numbered walkthrough so the refresh is visible where the reader meets `intent <path>`.
3. In root `CLAUDE.md`, extend the superdev bullet with the refresh step and the gate that `superspec` and `simpleplan` now carry.
4. In root `CLAUDE.md`, add `refresh.md` to the `docs/.workflows/` layout entry and to the host-repo `docs/` invariant's description of the run directory, in both places listing it beside `intent.md` as written on every resume.

### Failure modes
- none - documentation

### Contracts
- none

### DoD
`superdev/README.md` names the refresh in the `intent` row and in the resume sentence; root `CLAUDE.md` names the refresh step, the gate, and `refresh.md` in both places that enumerate a run directory's contents.


### Covered criteria
5. `superdev/README.md` i root `CLAUDE.md` opisują krok odświeżenia oraz plik `refresh.md` jako zawartość katalogu runu.
