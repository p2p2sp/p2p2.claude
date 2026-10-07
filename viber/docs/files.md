# Where viber writes

Every file viber creates or changes in your project. Back to the [viber guide](../README.md).

| Path | What it holds |
| --- | --- |
| `docs/_specs/<date>_<slug>/` | A run in progress: the approved plan, its progress and working notes |
| `docs/specs/<date>_<slug>/` | The archive of a finished run |
| `docs/adr/` | Architecture decision records, with `planning.adr` on |
| `CLAUDE.md` files, `.claude/rules/` | What builds, `/viber:memory` and `/viber:rules` learned |
| `.claude/agents/`, `.claude/skills/` | Agents and skills `/viber:extension` writes with you |
| `.claude/viber.yml` | The config, see [Configuring viber](configuration.md) |
| `.claude/settings.json` | The settings viber recommends |
| `.gitignore` | `.temp/` and `.claude/viber.local.yml`, when no rule ignores them yet |
| `.temp/viber/` | Scratch files, and `/viber:prototype`'s mockups in `.temp/viber/prototype/` |
| your e2e directory | Playwright tests from `/viber:e2e` |

The directory names under `docs/` are the defaults; `directories:` in `.claude/viber.yml` changes
them.

## The run directory

- `plan.md` is the plan as it was approved. It is never edited once it lands.
- `status.md` holds the run's progress.
- The notes and reports the run produces are committed beside them, so an interrupted build
  resumes in a new session or on another computer: ask Claude to continue the build, and it reopens
  the run most recently worked on.
- With `build.qa` on, the build's test scenarios land here too. `rulings.md` appears only when the
  build ruled on something.

A plan that stopped at a draft, with no tasks yet, is not a build to resume. Point `/viber:intent`
at it to continue it.

## The archive

With `build.cleanup` on, the build ends by moving what is worth keeping to `docs/specs/`:

- the specification
- the test scenarios
- `rulings.md`
- the build summary, `outcome.md`

It drops the plan, the progress file and the working notes. They stay in git, so nothing is lost.
The archive is the half you would want to read a year later.

## Memory and rules

- `/viber:memory` and `/viber:rules` write the same `CLAUDE.md` cascade and `.claude/rules/` that a
  build closes with, on your own schedule. Both ask before writing and leave the result unstaged.
- The root `CLAUDE.md` is written once, only where none exists. No build or review rewrites it
  afterwards: what they would change there arrives as suggestions.
- Both offer a `reset` mode, which deletes the whole layer and starts from zero. It is refused
  while a target holds uncommitted work.

## Extensions

`/viber:extension` writes an agent of your own into `.claude/agents/`. When its work runs in phases
one after another, it also writes one skill per phase into `.claude/skills/`. It adds an entry for
the agent, holding `parallel: false`, to `build.extensions` and leaves all of it uncommitted. A
build then runs that agent at its close and commits what it wrote in a commit of its own.

## Settings

`.claude/settings.json` gets every setting viber recommends, including a bare `Bash` allow (see
[Install](../README.md#install)). If the file already exists and differs, setup asks first:

| Choice | Effect |
| --- | --- |
| merge | A value viber sets wins over yours, permission lists only gain entries, and a permission viber moved from `deny` to `ask` is moved in your settings too. |
| reset | The file is replaced from scratch, and the old one is kept in `.temp/viber/setup/settings.json.bak`. |

Keep your own overrides in `.claude/settings.local.json`, which viber never touches.

## What is only ever added to

`.claude/viber.yml` and `.gitignore` are only ever added to, never rewritten. The one exception: a
switch written outside its group is moved into it with its value.
