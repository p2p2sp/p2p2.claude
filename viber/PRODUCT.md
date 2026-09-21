# Product assumptions

- The `viber` plugin must work correctly on projects of every kind. Where the tasks are not
  programming tasks, or the code is not testable, the plan and the implementation process have to
  account for that.

- A coder must write code so that TDD and its tests cover the cases without requiring an
  integration test against an external service such as a database.

- Integration tests only supplement the unit tests by covering several layers at once; they are
  never the base proof that a given function works.

- Integration tests run once and only once, in the final step "final test run".

- Integration tests run as the last tasks and rather serially - heavy tasks carrying integration
  tests overlapping each other can be costly.

- Unit tests and TDD must outnumber integration tests by a wide margin.

- Integration tests should use test containers wherever possible.

- Keeping the testing order from detail to whole (unit tests first, integration tests last)
  supports building the tasks concurrently.
