# T7 - coder notes

- Moved the "target missing -> create from template" block ahead of the `command -v node`
  check in `merge-settings.sh`; the `--reset` path already created a missing target before any
  node check, so this makes the plain (non-reset) path consistent with it.
- Added one header paragraph stating a missing target is always a plain copy needing no node,
  placed after the argument list (not inside the `--reset` bullet) to keep the existing
  argument-by-argument reading order intact.
- Confirmed red the required way: reverted the script to `git show HEAD:...` in place, ran only
  the new test (failed on the node-skip block instead of "created from template"), then restored
  the fixed file from a scratch copy - never touched the test.
- `tests/viber/plan-path.test.ts` fails on the full suite run (`allow` vs `deny` assertion); it is
  unrelated to `merge-settings.sh` (not in this task's Files, no `Depends-on`) and pre-existing in
  the tree from another in-flight task of this same plan run - left untouched per the task
  boundary.
