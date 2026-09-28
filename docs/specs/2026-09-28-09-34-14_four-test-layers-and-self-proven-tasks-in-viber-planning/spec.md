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
