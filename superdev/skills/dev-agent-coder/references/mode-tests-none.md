# `tests-none` work order

Single source of truth for the `tests-none` work-order mode — `coder` SKILL.md Step 2/4 points here. The coder reads this file ONLY when the task file's `## Mode` is literally `tests-none`; the other `references/mode-*.md` do not apply.

Raw mode: production / artefact code only (docs, config, `.claude/**` rules, an ADR file, etc.). No test files.

## Work order

1. Write the production / artefact code for the `## Deliverable`, editing only files in `## Touches`.
2. No test files. The `## Task gate` is `- Tests: none` — there is no runnable gate, so Step 5's `superdev:dev-agent-runner` invocation is skipped entirely for this task.

## Malformed-gate guard

`## Task gate` MUST read `- Tests: none`. If it carries test identifiers, the task is internally inconsistent — return `STATUS: FAIL` with a `Plan inconsistency:` note in `## Rationale`. Do not invent a new design to reconcile the contradiction.

## Mode-specific anti-pattern (forbidden)

- Writing tests in `tests-none` mode. The task gate is the contract — `- Tests: none` means no test files ship.
