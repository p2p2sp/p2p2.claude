# Product assumptions

- The `viber` is a coding assistant that gives the agent greater freedom when performing tasks, enabling the highest quality and speed of work.

- The `viber` plugin must work correctly on projects of every kind. Where the tasks are not programming tasks, or the code is not testable, the plan and the implementation process have to account for that.

- A coder must write code so that TDD and its tests cover the cases without requiring an integration test against an external service such as a database.

- Integration tests only supplement the unit tests by covering several layers at once; they are never the base proof that a given function works.

- Integration tests run as the last tasks and rather serially.

- Integration tests full suite run once and only once, in the final step "final test run". Tests overlapping each other can be costly.

- Unit tests and TDD must outnumber integration tests by a wide margin.

- Integration tests should use test containers wherever possible.

- End-to-end tests belong to CI and `/viber:e2e`. A build runs them only when the user asks for it, in the request or in its issue.

- Keeping the testing order from detail to whole (unit tests first, integration tests last) supports building the tasks concurrently.
