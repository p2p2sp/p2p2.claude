
## Task 7 - Name the two decision lines as delivered behaviour for qa-writer
- TDD: none
- Model: sonnet
- Effort: low
- Covers: `Zapis dla testera zna decyzje` (#13)

### Dependencies
- `Define the two decision lines, the implementor stop and the final decisions listing in the review contract` (Task 1) - blocks: the line names this bullet cites

### Files
- modify - superdev/agents/qa-writer.md (`Workdir:` and `Notes dir:` paragraphs in `## Input`)

### Task Checks
- grep -n "UNDERSPECIFIED:" superdev/agents/qa-writer.md
- grep -n "decisions.md" superdev/agents/qa-writer.md

### Approach
1. Extend the `Notes dir:` paragraph: a note records a deviation as a deviation line, an `UNDERSPECIFIED: <value> - <decision>` line, or a `DECISION:` line answered in the decisions file; in each case the delivered behaviour a scenario describes is the recorded decision or the user's recorded answer, never the plan's wording, for the acceptance document and the handoff file alike.
2. Extend the `Workdir:` paragraph: Read `<workdir>/implementation/decisions.md` when it exists - every line there is the user's own answer and outranks the plan's wording and the notes alike; absent, nothing is read and nothing is an error. No new prompt label: the dispatch lines in both orchestrators stay as they are.

### Failure modes
- none - agent prose

### Contracts
- none

### DoD
qa-writer names both lines and reads the decisions file off its workdir as sources of delivered behaviour for both artifacts it writes.


### Covered criteria
13. Zapis dla testera zna decyzje - Dokument akceptacyjny dla testera i plik przekazania do testów e2e opisują zachowanie wynikające z decyzji wykonawcy, nie z pierwotnego brzmienia planu.
