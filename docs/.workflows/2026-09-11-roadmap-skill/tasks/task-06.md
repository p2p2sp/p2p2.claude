
## Task 6 - feat(superdev): intent handoff offers the Roadmap track
- Covers: criteria #7
- TDD: none
- Model: opus
- Effort: medium

### Dependencies
- Task 5 - blocks: none

### Files
- modify - superdev/skills/intent/SKILL.md (`## Handoff - the user picks the track [GATE]`, `argument-hint`)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `grep -n "Roadmap path" superdev/skills/intent/SKILL.md` - expected: one bullet in the handoff section

### Approach
1. Change the handoff intro from "present three options" to "present the options below" and add a bullet **Roadmap path** between Spec path and Stop here: run `roadmap`, passing `intent: <path to the intent file>` as the argument line; fits work too large for one spec - it is split into phases, each built later as its own Simple or Spec run. Add the rule: offer this option only when the intent file's path has no `phases/` segment (a phase intent is already one slice of a roadmap).
2. Change `argument-hint` to `[path-to-intent.md]` (a phase intent lives under `phases/`, so "run-dir" no longer describes it).
3. Leave `## Resume from a file`, `## Synthesis` and every other section untouched.

### Edge cases
- Resume on a phase intent -> the gate shows Simple / Spec / Stop only.

### Contracts
- Handoff to `roadmap`: one argument line `intent: <path>`, same shape as the existing Simple/Spec handoffs.

### DoD
The handoff section lists four options with the phases guard; grep finds the bullet.


### Covered criteria
7. Bramka handoffu w `superdev/skills/intent/SKILL.md` ma cztery opcje (Simple / Spec / Roadmap / Stop); opcja Roadmap uruchamia `roadmap` z `intent: <ścieżka>` i jest pomijana, gdy ścieżka pliku intentu zawiera segment `phases/`.
