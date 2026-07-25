# Rule file format

## Template

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API error handling

- Wrap handler bodies in `withErrorBoundary()` (`src/api/middleware/errors.ts`); never try/catch inline.
- Error responses use `ApiError` subclasses - never throw a raw `Error` from a handler.
```

Filename = the capture slug: `.claude/rules/api-error-handling.md`. Subdirectories are allowed (`.claude/rules/frontend/naming.md`) when the capture slug carries a `/`.

## Good

Narrow globs, delta only, anchored in real project files:

```markdown
---
paths:
  - "tests/**/*.py"
---

# Test conventions

- Test files mirror the source path: `src/billing/invoice.py` -> `tests/billing/test_invoice.py`.
- Use the `make_invoice()` factory (`tests/factories.py`); never construct `Invoice` inline.
```

## Bad - never write these

- Monolith: one `conventions.md` covering naming + tests + errors + imports. Split per area.
- Restating defaults: "write clear code", "add tests for new features", "handle errors properly".
- Unanchored: a convention with no real example and no file reference from the capture.
- Broad gate: `paths: ["**/*"]` on a rule that only concerns one directory or one language.
