
## Task 6 - Check the implementor's recorded runs in the per-task reviewer
- TDD: none
- Model: opus
- Effort: medium
- Covers: `Reviewer sprawdza Runs` (#11)

### Dependencies
- `Run task tests directly in both task implementors and record runs in the notes` (Task 4) - blocks: the `## Runs` line shape this check reads

### Files
- modify - superdev/agents/superbuild-task-reviewer.md (`## Input`, `## Check`)

### Test Commands
#### Build
- node --test "tests/**/*.test.ts"

#### Tests
- grep -c 'Runs recorded' superdev/agents/superbuild-task-reviewer.md - prints `1`
- ! grep -Eq 'run\.sh|superdev:executor' superdev/agents/superbuild-task-reviewer.md - exits 0
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/superbuild-task-reviewer.md - exits 0

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for every edit below.
2. `## Input`, the `task` bullet: add `Task Tests` to the plan-task shape; the `notes` bullet: say the file also carries the implementor's `## Runs` section, one line per build command and per `### Task Tests` line, in the shape `- <command verbatim> -> <summary line | exit <n>>`.
3. `## Check`: add the bullet `Runs recorded (when notes is set)`: the notes carry a `## Runs` section with one line for the task's `#### Build` command and one for every `### Task Tests` file line (a section reading `none - <reason>` needs the build line only); a missing section or a missing line is an Important finding. State in the same bullet that this reviewer runs nothing itself: no build, no test, `Bash` stays for `git status --short`.

### Failure modes
- when `notes` is not set -> response the runs check is skipped and no finding is raised for it, log none, test none - agent text.

### Contracts
- none

### DoD
The reviewer's `## Check` carries the runs bullet with its Important severity and the no-run sentence, its `## Input` describes `## Runs`; the greps and the lint exit as listed; the test suite is green.


### Covered criteria
11. Reviewer sprawdza Runs - per-task reviewer ma w `## Check` punkt: sekcja `## Runs` istnieje i pokrywa blok `#### Build` oraz każdą linię `### Task Tests` zadania; brak sekcji lub linii to finding klasy Important, sprawdzany tylko gdy etykieta `notes` jest podana (tak jak dzisiejszy punkt o uczciwości notatek), a reviewer nadal nic nie uruchamia.
