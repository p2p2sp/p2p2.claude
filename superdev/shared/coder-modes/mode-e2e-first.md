# `e2e-first` work order

Single source of truth for the `e2e-first` work-order mode — `coder` SKILL.md Step 2/4 points here. The coder reads this file ONLY when the task file's `## Mode` is literally `e2e-first`; the other `references/mode-*.md` do not apply.

Start with a stub end-to-end test for the outermost intent in `## Tests` (Kind=e2e) that captures the externally observable acceptance criterion. It is allowed to be red until the implementation lands. Then implement the layers required to make it pass; finally turn the E2E green and add any supporting tests.

## Work order

1. Dispatch the filename + method name for the first `e2e` entry in `## Tests` (the one capturing the outermost acceptance criterion). Write the failing E2E test. It is allowed to be red until the layers are in place.
2. Implement the layers required by the `## Deliverable`, editing only files in `## Touches`. The order of layer implementation follows the project's rules (read `.claude/rules/**` for "back-to-front" / "front-to-back" preferences) and existing sibling patterns.
3. When the implementation is complete, the E2E test should now green. If `## Tests` lists additional `integration` / `unit` entries, dispatch and write them either inline (when they enable progress mid-implementation) or after E2E is green (when they are post-hoc confirmation).

## Mode-specific anti-pattern (forbidden)

- Skipping the E2E stub step "because the implementation is more important". The outermost test captures the acceptance criterion — it is the contract.
