---
source: /Users/dario/Projects/p2p2.claude/docs/_specs/2026-09-28-09-34-14_four-test-layers-and-self-proven-tasks-in-viber-planning/plan.md
---

To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Four test layers and self-proven tasks in viber planning

## Goal

Give viber's planning and coding doctrine four named test layers (`unit`, `component`, `integration`, `e2e`), so that a task proves its own behaviour inside itself with fast in-memory tests. The slow layer that needs a real dependency shrinks to what only that dependency can reveal. The run's central behaviour is planned first, as its smallest provable slice.

## Problem

Plans hand the proof of a task's behaviour to integration tasks at the end of the run. In one host's run, 15 of 23 API tasks proved themselves with a build plus a grep, their done clauses reading "... proven by T47". The integration tests then re-asserted cases the unit tests already covered (validation keys, one refusal per endpoint), and the backend ended with close to one integration test per unit test. A request-binding defect passed its own task green and surfaced only in the last integration task, stalling the build overnight.

A second host has no integration layer at all. Its data-touching code is "proven" by source-text scans, because viber knows only two layers below end-to-end and the in-memory layer between them has no name, no rules and no place in a plan. Leaving it costs slow serial tails on every run, defects found late, and reviews that cannot tell a real proof from a text match.

## Current behaviour

A `TDD: required` done clause must be provable by a unit test. Anything needing a database, queue or network is either put behind a seam or becomes a `TDD: none` task proven by a later integration task. Integration tasks are the plan's last tasks, each `TDD: none` and `Exclusive: true`, depending on the tasks they exercise and running serially. `plan-index.sh` accepts a done clause that names another task as its proof. The plan rules demand a new port and test substitute for any database the behaviour touches, whatever the host's own convention. Nothing tells the planner to put the run's central behaviour first.

### Must not change

- End-to-end tests are written only when the user asked for them in their own words, and run only when the user separately asked for that.
- The full test suite runs once, in the build's final test run.
- An `Exclusive: true` task is a leaf of the dependency graph, and `plan-index.sh` still rejects a dependency on one.
- A `DoD` line is cut on `;` into numbered clauses exactly as today.
- A plan that landed before this change still validates and decomposes under `plan-index.sh --split`.

## Roadmap

Part 1 of 3 - test layers and plan ordering

1. Test layers and plan ordering (this plan)
2. Discovery of parallel build and test isolation per host stack, recorded in the host's instructions so the existing per-task `out` directory takes effect
3. An advisory architecture skill, with the decision which plugin owns it

## Behaviour

### S1 - A task proves its own behaviour [CHANGED - was: a done clause could hand its proof to a later task]

A planner can no longer leave a done clause for another task to prove. Every clause is proven by a test the task itself writes and runs.

Given a plan whose task's done clause says another task of the plan proves it
When the planner validates the plan
Then the validation fails, naming the task and the other task, and the planner-review gate treats any other wording of a handed-off proof as a Blocking finding

### S2 - An in-memory component test proves wiring inside the task [NEW]

Request binding, routing, authorization and the wiring between the application's own layers are proven in the task that delivers the behaviour, by running the whole application in the test process with fakes in place of its external adapters.

Given a task delivering an endpoint whose behaviour needs no real external dependency to be observed
When the planner writes its done clauses and verification
Then the task stays `TDD: required`, is not exclusive, runs in parallel with others, and its verification runs its own unit and component tests

### S3 - An integration test covers one adapter, inside the adapter's task [CHANGED - was: integration tasks ran last, exclusive and serial]

Given a task that creates or changes an adapter (a repository, a query, a mapping, an API client, or an entry point that calls data access directly)
When the host's integration layer starts its dependency disposably on a random port
Then the same task writes and runs that adapter's integration test in its own verification, without `Exclusive`, and asserts only what the real dependency reveals

### S4 - A missing component harness is built once [NEW]

Given a host whose stack can run the application in the test process but has no shared harness for it yet
When a plan's tasks need component tests
Then one non-exclusive task builds the harness from the host's existing test framework, and every task writing component tests depends on it

### S5 - The run's core comes first [NEW]

Given a run with a central behaviour (a function, a component, a layer, depending on the run's subject)
When the planner orders the tasks
Then the core lands in the earliest tasks as its smallest slice with its own unit or component proof, everything consuming it depends on it for real, and a task binding the core together with work around it (a screen over it, its documentation) is a finding

### Edge cases

- A host whose integration layer uses a fixed shared resource (one database, a fixed port) -> the adapter and its integration test form one `Exclusive: true` leaf task, and whatever consumes the adapter reaches it through a port or contract an earlier task writes.
- A stack with no way to run the application in the test process -> no component layer; decisions go to unit tests.
- A host that keeps data access behind ports -> component tests use fakes holding their own state; a host calling data access straight from an entry point -> that entry point is the adapter, its integration test on a real dependency.
- A done clause quoting a task id as literal test data (a fixture plan in this repo's own tests) -> written inside backticks, which the check ignores.
- A plan landed before this change and resumed after it -> `--split` does not apply the new check.

## Glossary

- unit test - one unit, or several collaborating units with only the input and output boundaries substituted (the "sociable" style is a unit test, not a layer of its own).
- component test - the whole application run inside the test process from its entry point, every internal layer real, every external adapter replaced by an in-memory fake that holds its own state; never an in-memory database.
- integration test - one adapter against its real dependency, started disposably for the test run.
- end-to-end test - the deployed application driven from outside; unchanged.
- adapter - the code that talks to an external dependency; where a host calls data access directly from an entry point, that entry point.
- core - the run's central behaviour, the thing the rest of the run is built around.

## Acceptance criteria

1. A done clause handing its proof to another task is a finding, and `plan-index.sh` rejects a `DoD` clause naming another task of the plan.
2. An integration test does not repeat a case a lower layer already proves.
3. The four layers are named: `unit` (sociable style included), `component` (the application in the test process, fakes holding their own state), `integration` (one adapter on its real dependency), `e2e` (unchanged).
4. A component test proves a done clause of a `TDD: required` task, inside the task delivering the behaviour, with no `Exclusive`.
5. An adapter's integration test lives in the task creating or changing the adapter, with no `Exclusive` when its dependency is disposable on a random port; the "integration last, serially" rule is gone.
6. A host missing a component harness gets one shared task building it from the host's framework and the stack's in-process hosting; a stack without that mechanism stays with unit tests.
7. Ports follow the host's convention: an entry point calling data access directly is the adapter, and the "new port" rule applies only where the host uses ports.
8. The run's core lands in the earliest tasks as its smallest proven slice; a core bound together with its surrounding work is a finding, with no artificial dependencies.

## Scope

### File map

- modify - viber/references/plan-rules.md - planning rules: the four layers, self-proven tasks, the adapter task, the shared harness, core-first ordering, host-convention ports
- modify - viber/scripts/plan-index.sh - rejects a `DoD` clause naming another task of the plan, exempt under `--split`
- modify - tests/viber/plan-index.test.ts - regression cases for that rejection
- modify - viber/references/integration-tests.md - integration test scoped to one adapter, no repeat of a lower layer's case, no exclusive slot
- modify - viber/references/test-strategy.md - how a unit test may keep real collaborators and how a component test is written
- modify - viber/agents/task-coder.md - reads the integration rules and uses the long timeout on any task running an integration test
- modify - viber/agents/task-reviewer.md - the same, and a unit or component test reaching a real dependency is a finding
- modify - viber/agents/planner-review.md - gates the integration rules on any plan carrying an integration test
- modify - viber/skills/planner/SKILL.md - reads the integration rules on any plan carrying an integration test
- modify - viber/PRODUCT.md - the product's testing assumptions restated for four layers

### Out of scope

- Subproject 2: discovery of parallel build and test isolation per host stack.
- Subproject 3: an advisory architecture skill.
- End-to-end testing rules, `/viber:e2e` and its agents.
- A test harness in any host repository, and any change in a host repository.
- The implementor's scheduling, the `Exclusive` hold and the final test run.
- `CLAUDE.md` nodes and sections: the build's memory close updates them.

## Constraints

- Reference files are read at every plan and task: each file grows only as far as the new rules need, and `plan-rules.md` stays within 12500 bytes.
- Wording stays independent of any stack: no framework, library or language is named as the way to do something.
- No file names a source, an author or where the knowledge came from.
- No em dash or en dash in any written file.

## Tasks

<!-- TASK -->
### T1 - Bind planning to four test layers and self-proven tasks
- TDD: none
- Covers: #1, #3, #4, #5, #6, #7, #8
- Uses: C1, C2
- Depends-on: none
- Files: viber/references/plan-rules.md
- Delivers: `plan-rules.md` naming the C2 layers in a new `Layers` rule; a new `Self-proven` rule tagged `(script)` stating the C1 rejection; `Provable` extended so any other wording that hands a clause's proof to another task is a finding, and its "On `TDD: required`, every done clause is provable by a unit test" sentence rewritten to accept a unit or component test, and the adapter's own integration test inside the same task for a clause only the real dependency reveals; `TDD`'s exemption for an integration task becomes one for a task writing or running an end-to-end test; `Layered` rewritten so its first sentence makes a unit or component test needing a database, queue, broker or network the finding, the adapter task stays `TDD: required` with its data-access clauses proven by its own integration test, that test runs only the adapter's own tests, carries no `Exclusive` when the dependency is disposable on a random port, and only on a fixed shared resource the adapter and its integration test form one `Exclusive: true` leaf task whose consumers reach the adapter through a port or contract an earlier task writes; `Integration layer` widened to a shared harness for both the component and the integration layer, built once in a non-exclusive task every task writing component or integration tests depends on, its closing finding restated as an adapter task starting its own dependency or two tasks each building a harness, from the host's own test framework and the stack's in-process hosting, a stack without that hosting having no component layer; `Owned` asking for a new port and its fake only where the host keeps that dependency behind ports; `Size` putting the run's core in the earliest tasks as its smallest slice with its own unit or component proof, a core bound together with work consuming it being a finding; the `End-to-end` rule's run case becoming an `Exclusive: true` task instead of an integration task; the room for the new wording comes from the removed "Integration tasks are the plan's last tasks" sentence and the integration-task wording it replaces
- Verification: `grep -n "^- Layers:.*component" viber/references/plan-rules.md && grep -n "^- Self-proven:.*(script)" viber/references/plan-rules.md && ! grep -n "is an integration task (Layered)" viber/references/plan-rules.md && ! grep -n "provable by a unit test inside" viber/references/plan-rules.md && ! grep -n "Integration tasks are the plan's last tasks" viber/references/plan-rules.md && test "$(wc -c < viber/references/plan-rules.md)" -le 12500` -> both greps print one line, both negated greps print nothing, the command exits 0
- DoD: a `Layers` rule defines `unit`, `component`, `integration` and `e2e` as C2 states them; a `Self-proven` rule tagged `(script)` states the C1 rejection; `Provable` makes any other hand-off of a clause's proof to another task a finding; `Provable` accepts a unit or component test as the proof of a `TDD: required` clause, and the adapter's integration test in the same task for a clause only the real dependency reveals; a task writing or running an end-to-end test keeps a `TDD: none` exemption; `Layered`'s finding is a unit or component test needing a real database, queue, broker or network, and an adapter task is `TDD: required`; no rule sends integration tests to the plan's last tasks; `Layered` puts the adapter's integration test in the adapter's own task without `Exclusive` on a disposable dependency and, on a fixed shared resource, the adapter with its integration test in one `Exclusive: true` leaf task consumed through an earlier port or contract; the shared harness rule covers both layers and names the no-in-process-hosting case; `Owned` asks for a new port only where the host uses ports; `Size` puts the core first and makes a core bound with its surrounding work a finding, while `Ordered` still makes a dependency that constrains nothing a finding; `plan-rules.md` ends within 12500 bytes
<!-- /TASK -->

<!-- TASK -->
### T2 - Reject a done clause naming another task
- TDD: required
- Covers: #1
- Uses: C1
- Depends-on: none
- Files: viber/scripts/plan-index.sh, tests/viber/plan-index.test.ts
- Delivers: the C1 check in `plan-index.sh`'s validation, its case listed in the header's exit 4 enumeration and among the checks exempt under `--split`, plus regression cases in `plan-index.test.ts`
- Verification: `node --test tests/viber/plan-index.test.ts` -> every test passes, 0 failed
- DoD: a plan whose task's `DoD` names another task's id outside backticks exits 4 with the C1 line and nothing on stdout; a `DoD` naming that id only inside backticks exits 0; a `DoD` naming the task's own id exits 0; a word that merely contains another task's id (`T10` beside a task `T1`) exits 0; the same deferring plan landed as `<dir>/plan.md` decomposes under `--split` with exit 0
<!-- /TASK -->

<!-- TASK -->
### T3 - Scope integration tests to one adapter and add component test rules
- TDD: none
- Covers: #2, #3, #5, #7
- Uses: C2
- Depends-on: none
- Files: viber/references/integration-tests.md, viber/references/test-strategy.md
- Delivers: `integration-tests.md` scoping an integration test to one adapter on its real dependency (an entry point calling data access directly counting as the adapter), a `(blocking)` rule that an integration test asserting a case a unit or component test already proves is a finding, and its reuse rule resting on the disposable dependency each test run starts on a random port instead of on the exclusive slot; `test-strategy.md` naming the C2 layers it writes, allowing a unit test to keep real collaborators while substituting only input and output boundaries, and a `(blocking)` component test rule: driven through the entry point inside the test process, external adapters replaced by fakes holding their own state, never an in-memory database dialect or an object-relational mapper's in-memory provider, asserting on the entry point's response and the fakes' state
- Verification: `grep -n "(blocking)" viber/references/integration-tests.md | grep -n -i "unit or component" && grep -n -i "component test.*(blocking)" viber/references/test-strategy.md && ! grep -n "Exclusive" viber/references/integration-tests.md && test "$(wc -c < viber/references/integration-tests.md)" -le 2200 && test "$(wc -c < viber/references/test-strategy.md)" -le 3300` -> both greps print at least one line, the negated grep prints nothing, the command exits 0
- DoD: `integration-tests.md` scopes an integration test to one adapter and counts an entry point calling data access directly as one; a `(blocking)` rule makes an integration test repeating a unit or component test's case a finding; `integration-tests.md` no longer rests on an exclusive slot; `test-strategy.md` lets a unit test keep real collaborators behind substituted input and output boundaries; a `(blocking)` rule defines how a component test runs, what replaces its adapters and what it asserts, and forbids an in-memory database; `integration-tests.md` ends within 2200 bytes and `test-strategy.md` within 3300 bytes
<!-- /TASK -->

<!-- TASK -->
### T4 - Read the integration rules wherever an integration test is written
- TDD: none
- Covers: #4, #5
- Uses: C2
- Depends-on: none
- Files: viber/agents/task-coder.md, viber/agents/task-reviewer.md, viber/agents/planner-review.md, viber/skills/planner/SKILL.md
- Delivers: `task-coder.md`'s seam sentence scoped to unit and component tests, stating that an adapter's integration test runs against the real dependency; `task-coder.md` and `task-reviewer.md` reading `integration-tests.md` and applying the minutes-long timeout on any task that writes or runs an integration test, and the reviewer on any `recheck:` command running one, instead of only on an `Exclusive: true` task, `task-reviewer.md`'s `Tested` check making a unit or component test that reaches a real database, queue or network a finding whose proof belongs to the adapter's integration test; `planner-review.md`'s `Sliced right` check and `planner/SKILL.md`'s step 1 reading `integration-tests.md` on any plan carrying an integration test
- Verification: `grep -n "integration test" viber/agents/task-coder.md && grep -n "integration test" viber/agents/task-reviewer.md && grep -n "integration test" viber/agents/planner-review.md && grep -n "integration test" viber/skills/planner/SKILL.md && grep -n "seam.*unit or component" viber/agents/task-coder.md && ! grep -n "An .Exclusive: true. task runs its integration test" viber/agents/task-coder.md viber/agents/task-reviewer.md && ! grep -n "belongs to an integration task" viber/agents/task-reviewer.md && ! grep -n -E "(with|has) an integration task" viber/agents/planner-review.md viber/skills/planner/SKILL.md && test "$(wc -l < viber/agents/task-coder.md)" -le 66 && test "$(wc -l < viber/agents/task-reviewer.md)" -le 55` -> each of the five greps prints at least one line, every negated grep prints nothing, the command exits 0
- DoD: the coder's seam sentence binds unit and component tests only, and an adapter's integration test runs against the real dependency; the coder reads `integration-tests.md` and uses the long timeout on any task writing or running an integration test; the reviewer does the same; the reviewer's `Tested` check makes a unit or component test reaching a real dependency a finding pointing at the adapter's integration test; the plan reviewer and the planner read `integration-tests.md` on any plan carrying an integration test; `task-coder.md` stays within its current 66 lines and `task-reviewer.md` within 55
<!-- /TASK -->

<!-- TASK -->
### T5 - Restate the product testing assumptions for four layers
- TDD: none
- Covers: #3, #5
- Uses: C2
- Depends-on: none
- Files: viber/PRODUCT.md
- Delivers: `PRODUCT.md`'s testing assumptions naming the C2 layers, its "without requiring an integration test against an external service" and "Integration tests only supplement the unit tests by covering several layers at once" lines restated for decisions proven without a real dependency and integration tests covering one adapter, unit and component tests outnumbering integration tests by a wide margin, integration tests covering adapters inside the adapters' own tasks, the full suite running once in the final test run, disposable test containers wherever possible, and no assumption that integration tests run last or serially
- Verification: `grep -n "unit.*component.*integration.*e2e" viber/PRODUCT.md && grep -n -i "unit and component tests" viber/PRODUCT.md && ! grep -n -i "run as the last tasks" viber/PRODUCT.md && ! grep -n "integration tests last" viber/PRODUCT.md && ! grep -n "covering several layers at once" viber/PRODUCT.md && grep -n "once and only once" viber/PRODUCT.md` -> the three positive greps print at least one line, every negated grep prints nothing, the command exits 0
- DoD: `PRODUCT.md` names the four layers in one line; no line calls integration tests a check of several layers at once; unit and component tests outnumber integration tests by a wide margin; integration tests cover adapters inside the adapters' own tasks; the full suite still runs once and only once in the final test run; no line says integration tests run last or serially
<!-- /TASK -->

## Contracts

### C1 - Done clause naming another task

File: viber/scripts/plan-index.sh

Validation case, exit 4, nothing on stdout, one stderr line:

`task <id>: DoD names task <other> - prove each clause inside this task, naming a file or symbol instead`

- `<other>` is the id of another task of the same plan, matched as a whole token (bounded by characters outside `[A-Za-z0-9_-]`) in the task's `DoD` line.
- Text inside backtick spans is not scanned.
- The task's own id never matches.
- Skipped under `--split`, like the other checks added after plans were frozen.
- `plan-rules.md` states it as the `Self-proven` rule, tagged `(script)`.

### C2 - Test layers

File: none

- `unit` - one unit, or several collaborating units with only input and output boundaries substituted.
- `component` - the whole application run in the test process from its entry point, internal layers real, external adapters replaced by in-memory fakes holding their own state; never an in-memory database.
- `integration` - one adapter against its real dependency, started disposably for the test run; an entry point calling data access directly counts as the adapter.
- `e2e` - the deployed application driven from outside; written and run only on the user's own request.
