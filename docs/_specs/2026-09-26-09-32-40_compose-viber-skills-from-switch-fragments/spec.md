To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Compose viber skills from switch fragments

## Goal

Six viber skills carry branches on the `.claude/viber.yml` switches, so the model reads and tracks the instructions of features the project turned off, which costs tokens and invites drift. Each switch-dependent passage moves into a markdown fragment file, one per state that does something, and a bundled script preloads only the fragment matching the resolved switch value, so a loaded skill holds only the instructions of its active configuration.

## Acceptance criteria

1. None of `intent`, `fixer`, `triage`, `prototype`, `planner` and `implementor` keeps a sentence conditioned on a switch value (`issues`, `adr`, `qa`, `memory`, `rules`, `cleanup`, `branching.mode`) in its `SKILL.md` body.
2. The text for the enabled state, and for the disabled state wherever today's disabled branch does something rather than only skip, lives in existing markdown files under the skill's `fragments/` directory; the script only selects which file to print, never composes the text.
3. Behaviour under every switch combination is the same as today: with a switch off, the loaded skill carries none of that switch's enabled instructions, and every step it carried before still happens under the same condition.
4. The script has its own suite under `tests/viber/`, and a static sweep in `tests/portability.test.ts` fails when a skill calls a fragment with no file behind it, names an unknown key, or when a fragment file is called by no skill.

## Scope

### File map

- add - viber/scripts/switch-text.sh - prints the fragment file matching a key's resolved value
- add - tests/viber/switch-text.test.ts - the script's contract suite
- modify - tests/portability.test.ts - the fragment sweep and its self-checks
- modify - viber/skills/intent/SKILL.md - body without issue branches, preloads its fragments, drops the `config.sh` preload
- add - viber/skills/intent/fragments/issues-input.true.md - file-writing scope, script-line rule and argument handling
- add - viber/skills/intent/fragments/issues-input.false.md - file-writing scope, script-line rule and argument handling
- add - viber/skills/intent/fragments/issues-done.true.md - what follows a confirmed summary
- add - viber/skills/intent/fragments/issues-done.false.md - what follows a confirmed summary
- modify - viber/skills/fixer/SKILL.md - body without issue branches, preloads its fragments, drops the `config.sh` preload
- add - viber/skills/fixer/fragments/issues-report.true.md - resolving the report
- add - viber/skills/fixer/fragments/issues-report.false.md - resolving the report
- add - viber/skills/fixer/fragments/issues-diagnosis.true.md - the diagnosis `Issue` part
- modify - viber/skills/triage/SKILL.md - body without issue branches, preloads its fragments, drops the `config.sh` preload
- add - viber/skills/triage/fragments/issues-read.true.md - tools, file scope and reading the issue argument
- add - viber/skills/triage/fragments/issues-read.false.md - tools, file scope and reading the issue argument
- add - viber/skills/triage/fragments/issues-next.true.md - the next-step line forms
- add - viber/skills/triage/fragments/issues-next.false.md - the next-step line forms
- add - viber/skills/triage/fragments/issues-publish.true.md - the publish step
- modify - viber/skills/prototype/SKILL.md - body without issue branches, preloads its fragments, drops the `config.sh` preload
- add - viber/skills/prototype/fragments/issues-input.true.md - file scope, tools and argument handling
- add - viber/skills/prototype/fragments/issues-input.false.md - file scope, tools and argument handling
- add - viber/skills/prototype/fragments/issues-exit.true.md - exit question and the comment step
- add - viber/skills/prototype/fragments/issues-exit.false.md - exit question and the comment step
- modify - viber/skills/planner/SKILL.md - body without adr, branching and qa branches, preloads its fragments
- add - viber/skills/planner/fragments/adr.true.md - the ADR-task reading step
- add - viber/skills/planner/fragments/branching.allowed.md - the branch question
- add - viber/skills/planner/fragments/branching.required.md - the branch question
- add - viber/skills/planner/fragments/qa-e2e.true.md - the end-to-end hand-off line
- add - viber/skills/planner/fragments/qa-e2e.false.md - the end-to-end hand-off line
- modify - viber/skills/implementor/SKILL.md - body without close-switch branches, preloads its fragments
- add - viber/skills/implementor/fragments/memory.true.md - the close parts
- add - viber/skills/implementor/fragments/rules.true.md - the close parts
- add - viber/skills/implementor/fragments/qa.true.md - the close parts
- add - viber/skills/implementor/fragments/cleanup.true.md - the close parts

### Out of scope

- `e2e` and every agent.
- The `Memory-owned` rule in `viber/references/plan-rules.md`, and the `memory:` dispatch line to `planner-review`.
- Frontmatter: `argument-hint` and `description` stay as they are.
- Token measurement and tests of skill content.
- `config.sh` and the switch set in `viber.yml`.
