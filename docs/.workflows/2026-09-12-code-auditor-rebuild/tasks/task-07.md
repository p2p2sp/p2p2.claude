
## Task 7 - feat(superfix): code-auditor takes [<repo-path>] [<area-dir>], profiles the repo, scopes the sweep, redacts the critic and caps findings
- TDD: none
- Model: opus
- Effort: xhigh
- Covers: criteria #1, #4, #6, #12, #18

### Dependencies
- Task 2 - blocks: Task 8
- Task 3 - blocks: Task 8
- Task 4 - blocks: Task 8
- Task 5 - blocks: Task 8
- Task 6 - blocks: Task 8

### Files
- modify - superfix/skills/code-auditor/SKILL.md (frontmatter `argument-hint`; new `## Arguments` section; `## Phase 0 - Frame` steps 1, 4, 5 and new steps 6-7; `## Phase 1 - Sweep` both command blocks and the record description; `## Phase 2 - Score` first paragraph; `## Phase 4 - Dispatch detectives` brief list; `## Phase 5 - Synthesize`; `## Phase 6 - Iterate and open new fronts`; `## Output the user sees`)
- modify - superfix/skills/code-auditor/references/jobs.md (one sentence under `## Choosing and combining`: the profile's `## Bug classes from history` narrows the job's Opportunity signal to this repo's recurring classes)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `grep -n '^argument-hint: "\[<repo-path>\] \[<area-dir>\]"$' superfix/skills/code-auditor/SKILL.md` - expected: one hit
- `grep -n -- '--scope' superfix/skills/code-auditor/SKILL.md` - expected: at least two hits (both Phase 1 commands)
- `grep -n 'superfix:profiler\|## Repo profile\|Scope:\|claim.md\|critic returned no verdict\|Further findings\|repo profile unavailable' superfix/skills/code-auditor/SKILL.md` - expected: at least one hit per term
- `! grep -n 'the report path, `job.md`' superfix/skills/code-auditor/SKILL.md` - expected: no output (old critic brief removed)
- `! grep -rn $'\u2013\|\u2014' superfix/skills/code-auditor/SKILL.md superfix/skills/code-auditor/references/jobs.md` - expected: no output, exit 0

### Approach
1. Frontmatter: add `argument-hint: "[<repo-path>] [<area-dir>]"` (quoted, the two-bracket precedent is `superbiz/skills/idea-validator/SKILL.md`) after `disable-model-invocation: true`. Add `## Arguments` before `## Phase 0`: `$ARGUMENTS` holds zero, one or two whitespace-separated tokens; token 1 is the target repo path, token 2 the area directory; with zero tokens Phase 0 step 1 asks as today; with one token only the repo is set and the job is still confirmed.
2. Phase 0 renumbered to eight steps, in this order: (1) read the tokens and confirm repo and job; (2) resolve the root; (3) validate `<area-dir>` - an absolute path is accepted only when it lies under the resolved root and is rewritten to the root-relative form; a path that does not exist as a directory under the root, or lies outside it, or contains `..`, STOPS the run with `code-auditor: area directory not found under <root>: <value>`; (4) `check_node.sh` with its existing hard stop; (5) create the workspace; (6) write `job.md` with the existing recipe plus `Window: <days>` and `Scope: <dir>` (Scope omitted when unset); (7) dispatch `superfix:profiler` (Agent tool) with the brief from Task 6's contract (`Target root`, `Window`, `Scope` when set, `job.md` path, output path `.temp/superfix/<run-id>/profile.md`) in the same message as the Phase 1 scripts start; (8) profile gate: when the profiler returns, check that `profile.md` exists and carries the four headings `## Bug classes from history`, `## Contract shape`, `## Critical paths`, `## Severity calibration`, then append the whole file to `job.md` under `## Repo profile`; the miss branch is in Failure modes. Nothing that spends tokens or runs a script precedes step 4.
3. Phase 1: both command blocks gain `--scope <area-dir>` as a trailing option, present only when a scope is set; the record description names `dependents_stem`; one sentence: with a scope, records and pairs shrink to the area (pairs keep any partner outside it) while every signal stays repo-wide.
4. Phase 2: first sentence adds "Do not start until `job.md` carries `## Repo profile` or the profile gate has recorded its absence"; scouts' `job.md` is otherwise unchanged.
5. Phase 4: the detective brief gains the sidecar output path `.temp/superfix/<run-id>/reports/<rank>-<slug>.claim.md` and the sentence that an edge partner outside the scope is still a valid entry point.
6. Phase 5 rewritten in three steps: (1) for every report that is not `NO FINDING`, spawn `superfix:critic` with the sidecar path, `job.md`, the worktree-script path and a fresh unique worktree path (`.../worktrees/critic-<rank>-<slug>`), never the report path; (2) a critic whose final message has no `VERDICT:` line is dispatched once more with a fresh worktree path (`.../worktrees/critic-<rank>-<slug>-retry`); after a second miss the finding is folded as `INCONCLUSIVE` with reason `critic returned no verdict`, as `synthesis.md` specifies; (3) rank from verdict blocks plus each report's first four lines only, then write `findings.md` exactly as `synthesis.md` specifies (cap 10, `## Further findings (N)`, tie-break), opening a full report only for an entry that made the cap and only while writing its entry. Keep "synthesis.md is the sole authority" sentence.
7. Phase 6: first bullet adds `## Bug classes from history` in `job.md` as a second seed source for scout waves; last bullet adds "regenerate `findings.md` from the whole pool after every wave; the cap applies to the run".
8. Output the user sees: item 3 names the capped format and the `## Further findings (N)` section; item 4 adds pairs swept and whether the repo profile was available.
9. `jobs.md`: one sentence under `## Choosing and combining` as listed in Files.

### Failure modes
- when `<area-dir>` is missing under the root, outside it, or contains `..` -> response STOP in Phase 0 before any script or agent, log the message `code-auditor: area directory not found under <root>: <value>` to the user, test none - skill prose (the two scripts' own `--scope` validation from Tasks 1 and 2 is the tested backstop)
- when the profiler returns without `profile.md` or the file lacks one of the four headings -> response dispatch the profiler once more with the same brief; after a second miss continue with no `## Repo profile` section in `job.md`, record `repo profile unavailable` for `## Coverage notes`, and tell the user in the Phase 3 hotlist message, log that line in `findings.md`, test the grep for `repo profile unavailable` in SKILL.md (prose)
- when `check_node.sh` returns `NODE_MISSING` -> response the existing hard stop at step 4, before step 7 dispatches the profiler, so no agent is ever paid for on a missing runtime, log as today, test none - ordering rule stated in Approach step 2
- when a critic returns no `VERDICT:` twice -> response fold as `INCONCLUSIVE` with reason `critic returned no verdict` (Task 4 rule), log the reason in the entry's `STATUS` line, test the grep for the phrase in SKILL.md (prose)

### Contracts
- `$ARGUMENTS` grammar `[<repo-path>] [<area-dir>]`, `<area-dir>` validation (exists as a directory under the root, absolute-inside-root rewritten to relative, `..` and outside paths rejected before any spend) - consumed by Task 8 (README quick start and CLAUDE.md)
- `job.md` recipe: signals + rubric + `Target root:` + `Window:` + optional `Scope:` + `## Repo profile` (Task 6 layout verbatim) - consumed by every agent brief in this file; Task 8 documents it
- Critic worktree paths `critic-<rank>-<slug>` and `critic-<rank>-<slug>-retry` under `.temp/superfix/<run-id>/worktrees/` - consumed by Task 8 (CLAUDE.md components bullet names the retry path so a reader knows two critic worktrees per report may exist)

### DoD
All grep checks pass; SKILL.md carries the argument contract, scope validation, profiler dispatch and gate, `--scope` in both Phase 1 commands, the sidecar in the detective brief, the redacted critic brief with the retry rule, the moderator read rule and the capped output description; the dash scan prints nothing.


### Covered criteria
1. Wywołanie `/superfix:code-auditor <repo> <katalog>` skanuje, punktuje i dispatchuje detektywów tylko do plików leżących pod `<katalog>`; wywołanie bez argumentów zachowuje dotychczasowe pytanie o repo i job. `<katalog>` podany jako ścieżka bezwzględna wewnątrz repo jest przyjmowany i zapisywany w `job.md` jako względny; `<katalog>`, który nie istnieje lub leży poza repo, zatrzymuje run w Fazie 0 z komunikatem nazywającym ścieżkę, zanim jakikolwiek skrypt sweepu lub agent zostanie uruchomiony.
4. Przed Fazą 2 w `.temp/superfix/<run-id>/` istnieje `profile.md` napisany przez agenta `superfix:profiler` z czterema nagłówkami: `## Bug classes from history` (klasy błędów z commitów fix/hotfix/revert w oknie sweepu), `## Contract shape` (kształt kontraktów producer/consumer w tym stacku), `## Critical paths` (ścieżki krytyczne), `## Severity calibration`; a `job.md` zawiera jego treść jako sekcję `## Repo profile`. Profiler, który nie napisał `profile.md` lub napisał plik bez któregoś z tych czterech nagłówków, jest dispatchowany ponownie raz; po drugiej porażce run kontynuuje bez sekcji `## Repo profile`, a `findings.md` w `## Coverage notes` niesie linię "repo profile unavailable".
6. Moderator stosuje pasma severity z `## Severity calibration` profilu; pasma z `synthesis.md` są regułą obronną stosowaną tylko wtedy, gdy `job.md` nie ma sekcji `## Repo profile` (kryterium 4, ścieżka po drugiej porażce profilera).
12. Critic, który zakończył się bez linii `VERDICT:`, jest dispatchowany ponownie raz ze świeżym worktree; po drugim braku werdyktu finding trafia do `findings.md` jako `INCONCLUSIVE` z adnotacją "critic returned no verdict".
18. Faza 5 w SKILL.md nakazuje głównej sesji ustalić ranking wyłącznie z werdyktów criticów i nagłówków raportów (`# tytuł`, `LOCATION`, `CLASS`, `SEVERITY`), a pełny raport otwierać tylko dla wpisów, które weszły do limitu 10 z kryterium 15, i tylko w chwili pisania `findings.md`; w żadnej innej fazie i dla żadnego innego raportu główna sesja nie otwiera sekcji poza nagłówkiem.
