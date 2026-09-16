
## Task 3 - Scope the integration and e2e gate to final and re-review in the review contract
- TDD: none
- Model: opus
- Effort: high
- Covers: `E2e tylko w final` (#6), `Integracyjne tylko w final` (#16)

### Dependencies
- `Rename TDD Commands to Task Tests and tighten task sizing in both planners` (Task 1) - blocks: the `### Task Tests` name the contract's never-a-gate paragraph names

### Files
- modify - superdev/references/review-contract.md (stack-agnostic section list, `## Report skeleton`, `## Gates`)

### Test Commands
#### Build
- node --test "tests/**/*.test.ts"

#### Tests
- grep -c '### Task Tests' superdev/references/review-contract.md - prints `2` or more
- ! grep -q 'TDD Commands' superdev/references/review-contract.md - exits 0
- grep -c 'deferred to final' superdev/references/review-contract.md - prints `2` or more

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for every edit below.
2. Rename `### TDD Commands` to `### Task Tests` in the contract's opening section list and rewrite the never-a-gate paragraph of `## Gates`: `### Task Tests` belongs to the implementor writing that task (its TDD cycle and its end-of-task run), no stage collects it, and a command appearing there and nowhere else runs at no stage of a review.
3. In the `## Gates` command list, scope the third bullet: the host's integration or e2e command, when the plan or the host's memory files document one, on `stage: final` and `stage: re-review` only; a checkpoint never runs it. Add the matching rule bullet under `Rules:`: on `stage: checkpoint` the gates section carries the single sentence `integration and e2e deferred to final` in place of that command's line, the existing re-run rule on `stage: re-review` stands, and the `no e2e or integration suite in this host` sentence applies on `final` and `re-review` alone.
4. In `## Report skeleton`, extend the gates bullet with that checkpoint sentence as a third fixed single-sentence case next to the no-suite sentence and the unbounded-review sentence.

### Failure modes
- when the stage is `checkpoint` and the host documents an integration or e2e command -> response that command does not run and the gates section carries `integration and e2e deferred to final`, log that sentence in the report's gates section, test none - contract text read by the reviewer at run time.

### Contracts
- Gate stage rule: the integration or e2e command is a gate on `stage: final` and `stage: re-review` only; the checkpoint gates section carries `integration and e2e deferred to final`; consumed by `Sync README and root CLAUDE.md with the direct-run implementors` (Task 7).

### DoD
`## Gates` names `### Task Tests` as never a gate, scopes the integration or e2e command to `final` and `re-review`, and carries the checkpoint deferral rule; `## Report skeleton` lists the deferral sentence; the greps exit as listed; the test suite is green.


### Covered criteria
6. E2e tylko w final - `review-contract.md` `## Gates` zbiera komendę integracyjną / e2e hosta wyłącznie na `stage: final` i `stage: re-review`, checkpoint uruchamia build i `### Test Commands` bez niej, kształt raportu w `review-contract.md` każe sekcji gate'ów checkpointu powiedzieć to jednym zdaniem, a reguła ponownego biegu e2e na re-review zostaje.
16. Integracyjne tylko w final - test integracyjny lub e2e napisany przez zadanie biegnie wyłącznie przez komendę integracyjną / e2e hosta na `stage: final` i `stage: re-review`; implementator go nie uruchamia, a checklista planu flaguje doradczo linię `### Task Tests` lub `#### Tests` nazywającą udokumentowaną komendę albo katalog integracyjny / e2e hosta.
