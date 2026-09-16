
## Task 3 - feat(superdev): admit the starting state into a spec's Why section
- Covers: criterion #4
- TDD: none
- Model: opus
- Effort: medium

### Dependencies
- none - independent of Tasks 1 and 2

### Files
- modify - superdev/skills/superspec/templates/spec.md (## Problem / context (Why))
- modify - superdev/skills/superspec/references/checklist.md (### Severity classes)
- modify - superdev/skills/superspec-reviewer/SKILL.md (## Assessment)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- none (no suite covers a template or a reviewer rubric; the change is verified by the DoD below)

### Approach
1. In `superdev/skills/superspec/templates/spec.md`, widen the placeholder under `## Problem / context (Why)` from `<Problem being solved. No solution.>` to name the starting state as well: what already exists, what is missing, and what an earlier phase left behind, still ending in `No solution.`.
2. In `superdev/skills/superspec/references/checklist.md`, attach a narrow carve-out to the first Blocking criterion (`an implementation detail leaking into a requirement`): naming an existing artifact as part of the starting state inside `## Problem / context (Why)` is not a leak; the leak is prescribing how the change will be built, or naming an artifact inside a goal, a user scenario or an acceptance criterion.
3. Add one matching bullet to `### Never flag`: an existing artifact named in `## Problem / context (Why)` as the state the change starts from.
4. In `superdev/skills/superspec-reviewer/SKILL.md`, attach the same carve-out clause to the FINDINGS bullet's opening item (`an implementation detail leaking into a requirement`), so the reviewer carries it inline instead of reaching it only through the checklist's `### Never flag` list.

### Failure modes
- when the carve-out is read as permission to name artifacts anywhere in the spec -> response: the carve-out sentence names the one allowed section and lists goal, user scenario and acceptance criterion as still Blocking, log nothing, test: draft a spec naming an artifact in an acceptance criterion and confirm the criterion still reads as Blocking
- when a spec has no starting state to describe -> response: the widened placeholder stays optional prose and the section keeps its existing problem-only form, log nothing, test: draft a greenfield spec with a problem-only `## Problem / context (Why)` and confirm no criterion is violated

### Contracts
- `superdev/skills/superspec/references/checklist.md` is read by two consumers: `superdev/skills/superspec-reviewer/SKILL.md`, which restates the Blocking list inline and is therefore edited here too, and `superdev/skills/superspec/SKILL.md`, whose own hard rule is the broader "Spec = `What & Why` - no How" and needs no carve-out because it never names a section.

### DoD
`superdev/skills/superspec/templates/spec.md` names the starting state in its `## Problem / context (Why)` placeholder; `superdev/skills/superspec/references/checklist.md` carries both the carve-out on the first Blocking criterion and the matching `### Never flag` bullet; `superdev/skills/superspec-reviewer/SKILL.md` carries the same carve-out inline on its FINDINGS bullet.


### Covered criteria
4. Stan zastany w sekcji `## Problem / context (Why)` specu jest jawnie dopuszczony przez `superdev/skills/superspec/templates/spec.md` i `superdev/skills/superspec/references/checklist.md`, a reviewer nadal ma regułę na prawdziwy przeciek „How”.
