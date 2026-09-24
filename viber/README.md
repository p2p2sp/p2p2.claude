# viber

From an idea to committed code in four steps: understand it, plan it, build it, remember it.

No code is written before you approve a plan that a reviewer has already passed, and every task
lands as its own commit, so the history reads like the plan.

## Install

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install viber@p2p2 --scope user
```

Optional: `node`, for `/viber:setup`'s permissions merge, and Playwright, for `/viber:e2e`. Each
step skips with a note when its tool is missing.

## Quick start

| Say this | What happens |
| --- | --- |
| `/viber:setup` | Once per project: the switches, the ignore rules, the permissions. |
| `/viber:idea` | An interview about a raw idea, one question at a time. |
| `/viber:fixer` | A bug traced to its root cause and proven by a failing test, then handed to the planner. |
| "plan it" | The plan gets written and reviewed. |
| "implement it" | The approved plan gets built. |
| `/viber:e2e` | The build's QA scenarios become Playwright tests, run against your app. |
| `/viber:memory` | Reviews or extends your project's `CLAUDE.md` cascade on your own schedule. |
| `/viber:rules` | Reviews or extends your project's `.claude/rules/` on your own schedule. |

"plan it" and "implement it" are not commands: "break this down", "go ahead" or anything else
meaning the same works too. A typical run is `/viber:setup` once, then `/viber:idea`, "plan it", "implement it". The
interview is not a step you can skip: ask for a plan without one behind it and the interview starts
first, however clear the change already reads. A bug goes the same way through `/viber:fixer`.

The interview asks one question at a time, with three concrete options and a recommendation, and
says so out loud when your answer is weak. An idea too big for one cycle, a whole application or a
platform of several independent subsystems, is split into ordered parts before any detail question,
and the interview then covers the first part only. Each part gets its own plan and its own build,
and nothing is faked in between: what a later part brings is out of scope until its turn, never a
stub. You approve the plan yourself, but only after a reviewer
has read it against your actual codebase. Then the build runs task by task, reviews each one,
commits it, and finishes on the full test suite.

![How viber works](../docs/assets/viber-flow.svg)

## Optional switches

`/viber:setup` writes `.claude/viber.yml` with five of the six on and `qa` off. Edit that file to
change any of them - only `true` counts as on, so turn a switch off with `false` rather than by
deleting it. Without the file all six are off. Run `/viber:setup` again after an upgrade and any
switch the new version added is merged into your file, with every value you set left as it is.

| Switch | Default | When on |
| --- | --- | --- |
| `adr` | on | A decision worth keeping becomes an architecture decision record in `docs/adr/`. |
| `memory` | on | The build closes by updating your project's `CLAUDE.md` with what it learned. |
| `rules` | on | The build closes by recording a convention it confirmed in `.claude/rules/`. |
| `qa` | **off** | The build closes by writing test scenarios for what it delivered, which `/viber:e2e` can then automate. |
| `cleanup` | on | The build ends by noting anything it delivered that the specification does not promise, then archiving the run and dropping the working files. |
| `plain-plan-review` | on | A plan written in plain plan mode, without the planner, must pass a review before plan mode can be left. |

The same file carries a `directories:` group with two names, both under `docs/`: `runs`
(`_specs`) for a run in progress and `specifications` (`specs`) for the archive.

```yaml
directories:
  runs: _specs
  specifications: specs
```

A `tiers:` group sets the model range the build runs with (`haiku`, `sonnet`, `opus` or `fable`).
Every task, review and retry stays inside it, so `min: sonnet` never runs Haiku and `max: sonnet`
never runs Opus. Fable is used only when you name it, as `max: fable` (retries may climb to it) or
`min: fable` with `max: fable` (the whole build). Planning is not affected: it runs on the model
of your session.

```yaml
tiers:
  min: haiku
  max: opus
```

## Before your first run

The build and test commands come from your project's `CLAUDE.md`. If there is no such file, or it
does not name them, every agent in the run has to guess. Write them down once.

## Where it writes

`docs/_specs/<date>_<slug>/` holds the plan as it was approved and a `status.md` next to it with
the run's progress, so a build interrupted halfway
resumes by re-reading it - in a new session, or on another computer, because the notes and reports
the run produced are committed beside the plan. The plan itself is never edited once it lands.
With `qa` on, the build's test scenarios land there
too.

With `cleanup` on, the build ends by moving what is worth keeping - the specification and the test
scenarios - to `docs/specs/<date>_<slug>/`, and dropping the plan, the progress file and the
working notes. They are all in git, so nothing is lost; the archive is simply the half you would
want to read a year later. Generated
Playwright tests go into the e2e directory your own project already uses - `/viber:e2e` asks if
nothing names one, and creates no directory of its own. Scratch files go to `.temp/viber/`. Your
`.claude/viber.yml` and your `.gitignore` are only ever added to, never rewritten. Your
`.claude/settings.json` gets every setting viber recommends: a value viber sets wins over yours,
permission lists only gain entries, and a permission viber moved from `deny` to `ask` is moved in
your settings too. Keep your own overrides in `.claude/settings.local.json`, which viber never
touches.

`/viber:memory` and `/viber:rules` write the same `CLAUDE.md` cascade and the same
`.claude/rules/` a build closes with, on your own schedule instead of a build's. Either one asks
before writing and leaves the result unstaged, exactly like the close does.
