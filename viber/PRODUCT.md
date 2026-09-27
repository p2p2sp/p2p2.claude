# Product assumptions

- The `viber` is a coding assistant that gives the agent greater freedom when performing tasks, enabling the highest quality and speed of work.

- The `viber` plugin must work correctly on projects of every kind. Where the tasks are not programming tasks, or the code is not testable, the plan and the implementation process have to account for that.

- A coder must write code so that TDD and its tests cover the cases without requiring an integration test against an external service such as a database.

- Integration tests only supplement the unit tests by covering several layers at once; they are never the base proof that a given function works.

- Integration tests run as the last tasks and rather serially.

- Integration tests full suite run once and only once, in the final step "final test run". Tests overlapping each other can be costly.

- Unit tests and TDD must outnumber integration tests by a wide margin.

- Integration tests should use test containers wherever possible.

- End-to-end tests belong to CI and `/viber:e2e`. A plan carries a task that writes them only when the user explicitly asks for them, in the request, the interview or its issue - never on the planner's or the interview's own initiative - and that task runs them only when the user separately asked for it to be run.

- Keeping the testing order from detail to whole (unit tests first, integration tests last) supports building the tasks concurrently.

- `implementor` is entered from an approved plan that `planner` names as the next step. Its description deliberately carries no resume or continue trigger, although step 1 resumes the most recent run once it runs: a request to continue a build in a new session may not reach it.
