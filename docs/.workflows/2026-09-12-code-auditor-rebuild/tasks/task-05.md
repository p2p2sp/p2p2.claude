
## Task 5 - feat(superfix): detective writes the claim sidecar, critic refutes from the sidecar alone, both inherit the session model
- TDD: none
- Model: opus
- Effort: high
- Covers: criteria #10, #11, #13

### Dependencies
- Task 4 - blocks: Task 7

### Files
- modify - superfix/agents/detective.md (frontmatter `model`, `effort`; `## Inputs you are given` gains the sidecar output path; `## Method` step 4; `## Hard rules`)
- modify - superfix/agents/critic.md (frontmatter `model`, new `effort`; `## Inputs you are given`; `## Method` steps 1 and 3; `## Output` unchanged; `## Hard rules`)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `grep -n '^model: inherit$' superfix/agents/detective.md superfix/agents/critic.md` - expected: one hit per file
- `grep -n '^effort: high$' superfix/agents/detective.md superfix/agents/critic.md` - expected: one hit per file
- `grep -n '^model: haiku$' superfix/agents/scout.md superfix/agents/edge-scout.md` - expected: one hit per file (unchanged)
- `grep -n 'claim.md' superfix/agents/detective.md superfix/agents/critic.md` - expected: at least one hit per file
- `! grep -n 'report path' superfix/agents/critic.md` - expected: no output (the critic no longer receives the report path)
- `! grep -rn $'\u2013\|\u2014' superfix/agents/` - expected: no output, exit 0

### Approach
1. `detective.md`: set `model: inherit`, keep `effort: high`; add an input bullet for the sidecar path (`<report path>.claim.md`, given by the skill); Method step 4 becomes "write the report at the schema you were given, then write the claim sidecar at the sidecar schema in the same file: only `LOCATION`, `CLASS` and `## Reproduce`"; add hard rules: the sidecar carries no reasoning, no confidence, no severity; a `NO FINDING` report has no sidecar.
2. `critic.md`: set `model: inherit`, add `effort: high`; replace the inputs with: the sidecar path, `job.md`, the worktree script path, the reserved worktree path; Method step 1 becomes "read the sidecar; your task is to refute it: look for a reason the symptom is not a defect (a test fixture, an intended branch, a precondition the sidecar assumes but the code enforces) before and while replaying"; step 3 adds "`VERIFIED` only when the reproduction passed and no refutation held"; add hard rules: never open the detective's report, never search `.temp/superfix/<run-id>/reports/` for it; judge severity from the observed symptom and `job.md`'s `## Repo profile` -> `## Severity calibration` when present.
3. Keep both `## Output` blocks byte-identical to today so `synthesis.md`'s fold rules keep matching.
4. Keep every worktree line (`sh <worktree-script> add|remove ...`, `WORKTREE_FAILED` mapping) unchanged in both files.

### Failure modes
- none - prose-only (the agents' runtime branches, `WORKTREE_FAILED` -> `NO FINDING` / `INCONCLUSIVE`, are unchanged and already documented in both files and `synthesis.md`)

### Contracts
- Detective dispatch brief must now carry a sidecar output path in addition to the report path - consumed by Task 7 (Phase 4)
- Critic dispatch brief: sidecar path, `job.md`, worktree script path, worktree path; no report path - consumed by Task 7 (Phase 5)

### DoD
All grep checks above hold; detective writes report plus sidecar; critic's inputs exclude the report path and its method leads with refutation; scout and edge-scout untouched; the dash scan prints nothing.


### Covered criteria
10. Detektyw z findingiem pisze obok raportu plik `<rank>-<slug>.claim.md` zawierający wyłącznie `LOCATION:`, `CLASS:` i sekcję `## Reproduce` z krokami i obserwowalnym objawem; plik nie zawiera `CONFIDENCE`, `SEVERITY`, sekcji `Root cause` ani `Suggested fix`.
11. Critic otrzymuje ścieżkę sidecara, `job.md`, skrypt worktree i świeży worktree; nie otrzymuje ścieżki raportu głównego, a jego instrukcja nakazuje próbę obalenia claimu i dopuszcza `VERIFIED` tylko po reprodukcji, która przeszła mimo tej próby.
13. `detective.md` i `critic.md` mają `model: inherit` i `effort: high`; `scout.md` i `edge-scout.md` zachowują `model: haiku`.
