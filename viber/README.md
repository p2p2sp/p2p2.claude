# viber

From an idea to committed code in four steps: understand it, plan it, build it, remember it.

No code is written before you approve a plan that a reviewer has already passed, and every task
lands as its own commit, so the history reads like the plan.

## Install

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install viber@p2p2 --scope user
```

No dependencies. Do not install it alongside `superdev`: both gate plan approval and each
recognizes only its own plan format, so one blocks the other. Run one track at a time.

## Quick start

| Say this | What happens |
| --- | --- |
| `/viber:setup` | Once per project: the switches, the ignore rules, the permissions. |
| `/viber:idea` | An interview about a raw idea, one question at a time. |
| `/viber:fixer` | A bug traced to its root cause and proven by a failing test, then handed to the planner. |
| "plan it" | The plan gets written and reviewed. |
| "implement it" | The approved plan gets built. |
| `/viber:e2e` | The build's QA scenarios become Playwright tests, run against your app. |

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

`/viber:setup` writes `.claude/viber.yml` with all four on. Edit that file to turn one off - only
`true` counts as on. Without the file all four are off.

| Switch | When on |
| --- | --- |
| `adr` | A decision worth keeping becomes an architecture decision record in `docs/adr/`. |
| `memory` | The build closes by updating your project's `CLAUDE.md` with what it learned. |
| `rules` | The build closes by recording a convention it confirmed in `.claude/rules/`. |
| `qa` | The build closes by writing test scenarios for what it delivered, which `/viber:e2e` can then automate. |

## Before your first run

The build and test commands come from your project's `CLAUDE.md`. If there is no such file, or it
does not name them, every agent in the run has to guess. Write them down once.

## Where it writes

`docs/_specs/<date>_<slug>/` holds the plan as it was approved and a `status.md` next to it with
the run's progress, so a build interrupted halfway
resumes by re-reading it - in a new session, or on another computer, because the notes and reports
the run produced are committed beside the plan. The plan itself is never edited once it lands.
With `qa` on, the build's test scenarios land there
too. Generated
Playwright tests go into the e2e directory your own project already uses - `/viber:e2e` asks if
nothing names one, and creates no directory of its own. Scratch files go to `.temp/viber/`. Your
`.gitignore` and `.claude/settings.json` are only ever added to, never rewritten. Nothing else,
nowhere else.
