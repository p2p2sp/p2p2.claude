# Good and Bad Tests

## Good Tests

Characteristics:

- Tests behavior users/callers care about
- Uses public API only
- Survives internal refactors
- Describes `What`, not `How`
- One logical assertion per test

## Bad Tests

**Implementation-detail tests**: Coupled to internal structure.

Red flags:

- Mocking internal collaborators
- Testing private methods
- Asserting on call counts/order
- Test breaks when refactoring without behavior change
- Test name describes `How` not `What`
- Verifying through external means instead of interface
