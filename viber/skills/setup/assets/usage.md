# Using viber

## First: CLAUDE.md

viber knows nothing about your stack. Every agent takes the build and test commands from this
project's own instructions, so without them `test-runner` guesses from whatever manifest it finds,
and a task can be committed on a suite that never ran.

No `CLAUDE.md` yet: run `/init`, then make sure the root file states the exact build command, the
exact test command, how to run a single test file, and whatever else a newcomer would get wrong -
how to launch the app, the required env, the migrations.

## The four ways in

- `/viber:idea` - an interview about a raw idea, one question at a time. Writes nothing.
- `/viber:fixer` - a bug traced to its root cause and proven by a failing test.
- "plan it" - the planner, straight from an understood change.
- "implement it" - the orchestrator: task by task, one reviewed commit each.

`idea` and `fixer` both end at the planner, and nothing is built before you approve its plan.

## The switches (`.claude/viber.yml`)

- `adr` - decisions worth keeping become the plan's first tasks, under `docs/adr/`.
- `memory` - the build closes by updating this project's `CLAUDE.md` nodes.
- `rules` - the build closes by updating `.claude/rules/`.

Re-run `/viber:setup` to change them.
