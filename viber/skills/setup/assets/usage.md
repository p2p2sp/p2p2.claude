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
- "plan it" - the planner, on what one of those two confirmed. Ask for it with neither behind it
  and the interview starts first.
- "implement it" - the orchestrator: task by task, one reviewed commit each.

`idea` and `fixer` both end at the planner, and nothing is built before you approve its plan.

## After a build

- `/viber:e2e` - turns the QA scenarios a build wrote into Playwright tests, run against your
  own application and committed once they are green. Needs the `qa` switch to have been on during
  that build, and it starts off - turn it on before the build, not after.

## On your own schedule

- `/viber:memory` - maps this project's `CLAUDE.md` cascade, verifies it against the code through
  a dispatched auditor, and hands what changed to the same writer the build close uses.
- `/viber:rules` - maps `.claude/rules/`, verifies it the same way, and hands what changed to the
  same writer the build close uses.

Both ask before writing anything and leave the result unstaged, same as the close. Neither needs a
build in progress - run them whenever the layer might have drifted.

## The switches (`.claude/viber.yml`)

- `adr` - decisions worth keeping become the plan's first tasks, under `docs/adr/`.
- `memory` - the build closes by updating this project's `CLAUDE.md` nodes.
- `rules` - the build closes by updating `.claude/rules/`.
- `qa` - the build closes by writing its QA scenarios into the run directory.
- `cleanup` - the build ends by noting on the specification anything it delivered that the
  specification does not promise, then archiving the run and dropping the plan, the state file
  and the trail. They are all in git, which is where the history belongs.
- `plain-plan-review` - a plan written in plain plan mode, without the planner, must pass a review
  before plan mode can be left.

Five of the six start on; `qa` starts off, because a build that needs acceptance scenarios is the
exception rather than the rule. Edit `.claude/viber.yml` to change that - every key is commented
there, and only `true` counts as on. Turn a switch off with `false` rather than by deleting it:
running `/viber:setup` again merges in whatever the current version's template carries and your
file does not, which is how a new switch reaches a project set up by an older one, and a deleted
key is restored at its default by that same merge. Every value you already set survives it.

A `directories:` group names two directories rather than switches: `runs` (`_specs`) is where an
open run lives under `docs/`, `specifications` (`specs`) is where `cleanup` archives a finished
one. Both are plain directory names, read only from inside that group - a value carrying a slash
is ignored and the default stands.

A `tiers:` group bounds the models the build dispatches: `min` (`haiku`) and `max` (`opus`), each
one of `haiku`, `sonnet`, `opus` or `fable`. Every task, review and retry is kept inside that
range; fable runs only when the range names it. An unknown value falls back to its default and an
inverted range to the default one. Planning runs on
the session's own model and is not bound by it.
