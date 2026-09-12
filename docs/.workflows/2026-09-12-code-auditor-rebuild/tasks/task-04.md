
## Task 4 - feat(superfix): synthesis.md owns the claim sidecar, the redacted critic input, the no-verdict fold and the capped findings.md
- TDD: none
- Model: opus
- Effort: high
- Covers: criteria #6, #10, #11, #12, #15, #16, #17

### Dependencies
- none - blocks: Task 5, Task 7

### Files
- modify - superfix/skills/code-auditor/references/synthesis.md (sections `## Contents`, `## Detective report schema`, new `## Claim sidecar schema`, `## Critic verdict schema`, `## Deduplicate`, `## Severity`, `## findings.md (final output)`, new `## What the moderator reads`)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `grep -c '^## ' superfix/skills/code-auditor/references/synthesis.md` - expected: `9` (Contents, Detective report schema, Claim sidecar schema, Clean-checkout verification, Critic verdict schema, Deduplicate, Severity, findings.md, What the moderator reads)
- `grep -n 'Further findings\|critic returned no verdict\|## Reproduce\|Severity calibration' superfix/skills/code-auditor/references/synthesis.md` - expected: at least one hit per term
- `! grep -rn $'\u2013\|\u2014' superfix/skills/code-auditor/references/synthesis.md` - expected: no output, exit 0

### Approach
1. Add `## Claim sidecar schema` after the detective report schema: file `.temp/superfix/<run-id>/reports/<rank>-<slug>.claim.md`, body exactly `LOCATION: <same as report>`, `CLASS: <same as report>`, `## Reproduce` with input, command and the observable symptom (exit code, output line, HTTP status, failing test name); an explicit list of what the sidecar never contains (`CONFIDENCE`, `SEVERITY`, `ENTRY`, root cause, fix sketch, any sentence explaining why). A `NO FINDING` report has no sidecar.
2. Rewrite `## Critic verdict schema`'s preamble: the critic receives the sidecar path, `job.md`, the worktree script path and its own worktree path, never the report path; its mandate is to refute; `VERIFIED` only when the reproduction passed despite that attempt. Keep the four verdict lines and the four fold bullets, then add a fifth fold bullet: a critic that returned no `VERDICT:` line (empty output, crash, timeout) is dispatched once more with a fresh worktree; a second miss files the finding as `INCONCLUSIVE` with `CONFIDENCE` lowered one step and the reason `critic returned no verdict`.
3. Rewrite `## Severity`: the bands come first from `job.md`'s `## Repo profile` -> `## Severity calibration`; the four generic bands stay as the defensive fallback used only when `job.md` has no `## Repo profile` section.
4. Rewrite `## findings.md (final output)`: header line adds `P pairs swept`; at most 10 full entries (`## 1.` .. `## 10.`), each with `SEVERITY`, `CONFIDENCE`, `VERDICT`, optional `STATUS: INCONCLUSIVE - <missing oracle | critic returned no verdict>`, `LOCATION`, `CLASS`, root cause, reproduction, fix sketch; band 1-3 never gets a full entry; `## Further findings (N)` with one line per remaining finding `SEVERITY · LOCATION · CLASS · <title> · <report path>`; tie-break at the cap: verdict (`VERIFIED`, `PARTIALLY VERIFIED`, `INCONCLUSIVE`), then higher `CONFIDENCE`, then lower report `<rank>`; `## Coverage notes` keeps its two bullets and gains the optional `repo profile unavailable` line; the file is regenerated from the whole pool after every Phase 6 wave.
5. Add `## What the moderator reads`: ranking is built from critic verdict blocks plus each report's first four lines (`# title`, `LOCATION`, `CLASS`, `SEVERITY`); the full report is opened only for entries that made the cap, only while writing their full entry; no other report section is opened in any phase.
6. Update `## Contents` to list the two new sections.

### Failure modes
- none - reference-only (this task changes prose contracts; every runtime branch it names is tested through the agents and skill that implement it in Tasks 5 and 7)

### Contracts
- Claim sidecar schema (path pattern, three-part body, exclusion list) - consumed by Task 5 (detective writes it, critic reads it) and Task 7 (Phase 4 brief names the sidecar path, Phase 5 hands it to the critic)
- Critic input list and no-verdict retry rule - consumed by Task 5 (critic.md inputs and mandate) and Task 7 (Phase 5 dispatch and retry)
- `findings.md` format: cap 10, `## Further findings (N)` line format, tie-break order, `STATUS: INCONCLUSIVE` line, `repo profile unavailable` coverage line, header with pairs count - consumed by Task 7 (Phase 5 step 2, Phase 6 regeneration, "Output the user sees") and Task 8 (README step 4)
- Severity source order (`## Severity calibration` from `job.md`, generic bands as fallback) - consumed by Task 6 (profiler writes the section) and Task 7 (job.md recipe)
- Moderator read rule - consumed by Task 7 (Phase 5 text)

### DoD
`synthesis.md` carries the nine sections, the sidecar schema, the no-verdict fold, the capped `findings.md` format with tie-break, the severity source order and the moderator read rule; grep checks above hit; the dash scan prints nothing.


### Covered criteria
6. Moderator stosuje pasma severity z `## Severity calibration` profilu; pasma z `synthesis.md` są regułą obronną stosowaną tylko wtedy, gdy `job.md` nie ma sekcji `## Repo profile` (kryterium 4, ścieżka po drugiej porażce profilera).
10. Detektyw z findingiem pisze obok raportu plik `<rank>-<slug>.claim.md` zawierający wyłącznie `LOCATION:`, `CLASS:` i sekcję `## Reproduce` z krokami i obserwowalnym objawem; plik nie zawiera `CONFIDENCE`, `SEVERITY`, sekcji `Root cause` ani `Suggested fix`.
11. Critic otrzymuje ścieżkę sidecara, `job.md`, skrypt worktree i świeży worktree; nie otrzymuje ścieżki raportu głównego, a jego instrukcja nakazuje próbę obalenia claimu i dopuszcza `VERIFIED` tylko po reprodukcji, która przeszła mimo tej próby.
12. Critic, który zakończył się bez linii `VERDICT:`, jest dispatchowany ponownie raz ze świeżym worktree; po drugim braku werdyktu finding trafia do `findings.md` jako `INCONCLUSIVE` z adnotacją "critic returned no verdict".
15. `findings.md` zawiera w pełnym formacie co najwyżej 10 wpisów, uporządkowanych malejąco po severity; remis na granicy limitu rozstrzyga kolejno: werdykt (`VERIFIED`, potem `PARTIALLY VERIFIED`, potem `INCONCLUSIVE`), wyższy `CONFIDENCE`, niższy `<rank>` raportu. Żaden wpis z severity w paśmie 1-3 nie występuje w pełnym formacie.
16. Wszystkie pozostałe findingi występują w sekcji `## Further findings (N)` jako jedna linia każdy w formacie `SEVERITY · LOCATION · CLASS · tytuł · ścieżka do raportu`, a `N` równa się liczbie tych linii.
17. Finding `INCONCLUSIVE` liczy się do limitu 10, zachowuje `SEVERITY` z raportu i `CONFIDENCE` obniżone o jeden stopień (reguła `synthesis.md`), i nosi widoczną etykietę `INCONCLUSIVE` z powodem: nazwą brakującego oracle albo, na ścieżce z kryterium 12, adnotacją "critic returned no verdict". Po kolejnej fali Fazy 6 `findings.md` jest regenerowany z jednej puli i nadal spełnia kryteria 15 i 16.
