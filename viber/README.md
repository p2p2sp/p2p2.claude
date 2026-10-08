# viber guide

How to use viber, command by command. For what viber is and why, see the
[project page](../README.md). `/viber:help` opens the same guide in your browser.

## Install

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install viber@p2p2 --scope user
```

Optional tools. A step that needs one skips with a note when it is missing:

| Tool | Used by |
| --- | --- |
| `node` | `/viber:setup`'s permissions merge |
| Playwright | `/viber:e2e` |
| the `gh` CLI | the GitHub steps, checked by `/viber:setup` |

`/viber:setup` adds a bare `Bash` allow to `.claude/settings.json`. `/viber:intent`,
`/viber:prototype`, `/viber:fixer` and `/viber:create-issue` rely on it for the script calls they
make after a later reply of yours. Without it, each of those calls asks for permission once.

## Before your first run

The build and test commands come from your project's `CLAUDE.md`. Without them, every agent in the
run has to guess, so write them down once. With no `CLAUDE.md` yet, run `/viber:memory`: it writes
a short root once, within 4000 bytes. After that the root is yours.

## Commands

A typical run is `/viber:setup` once, then `/viber:intent`. Each step names the next one.

### Start a change

| Command | What it does |
| --- | --- |
| `/viber:intent` | Interviews you about an idea, one question at a time, and hands the result to the planner. |
| `/viber:fixer` | Traces a bug to its root cause, proves it with a failing test and hands it to the planner. |
| `/viber:triage` | Checks a reported issue against your code: can it be done, how, what it affects, how big. |
| `/viber:prototype` | Turns a UI change into one HTML mockup in your project's own look, or three to choose from. |
| `/viber:create-issue` | Creates a GitHub issue from your issue form templates, after a preview and your yes. |

### Ship it

| Command | What it does |
| --- | --- |
| `/viber:e2e` | Turns the build's QA scenarios into Playwright tests and runs them against your app. |
| `/viber:create-pr` | Opens a pull request for the current branch from your template, after a preview and your yes. |
| "commit" | Commits your changes, or only the paths you name, with a Conventional Commits message. |

### Keep the project healthy

| Command | What it does |
| --- | --- |
| `/viber:memory` | Reviews or extends your project's `CLAUDE.md` cascade. |
| `/viber:rules` | Reviews or extends your project's `.claude/rules/`. |
| `/viber:code-auditor` | Audits your code through one lens (bugs, security, performance, tests, design) over the current diff, one directory or the whole repository. |
| `/viber:extension` | Creates, with you, an agent of your own that runs at the close of every build. |

### Utilities

| Command | What it does |
| --- | --- |
| `/viber:setup` | Once per project, and again after an upgrade: config, ignore rules, permissions, `CLAUDE.md` check. |
| `/viber:help` | Opens this guide in your browser. |
| `/viber:handoff` | Saves the conversation as one file, so a fresh session picks up where this one stopped. |

### Command details

- **`/viber:intent`**: add `--prove` to have every question's recommendation and alternatives
  checked against the code, and the web where needed, before you see it. If you ask for a plan
  without an interview, viber suggests the interview first, and you decide.
- **`/viber:triage`**: takes an issue number, a link or pasted text. It names the next step and can
  post its report on the issue.
- **`/viber:prototype`**: takes an issue reference or a plain description, and asks first whether
  you want one proposal or three. You refine it in conversation, then it goes on to `/viber:intent`,
  to the issue it started from, or both.
- **`/viber:create-issue`**: covers issues of any kind, bugs included. Say what it is about, or let
  it take that from the conversation.
- **`/viber:create-pr`**: opens a pull request or a draft, titles it per `github.pr-title`, pushes only on your yes,
  assigns it to you as its author, and posts the run's `qa.md` on it as a QA comment, once per run.
- **`/viber:code-auditor`**: `/viber:code-auditor [<lens>] [diff | diff:<sha> | <directory> | repo]`.
  Six lenses: `bugs`, `security`, `web-performance`, `runtime-performance`, `tests` and `design`;
  `performance` or `quality` picks a group and asks only which of its two lenses. Three scopes: the
  current diff (`diff`, or `diff:<sha>` to measure from a commit), one directory, or the whole
  repository (`repo`). Whatever you leave out, it asks. One agent maps the scope for the lens, hunters
  investigate it, and an independent critic tries to refute every finding without seeing the hunter's
  reasoning; the lenses that run code do so on a clean checkout. The result is `findings.md` under
  `.temp/viber/code-auditor/<run-id>/`, and your code is never edited.
- **`/viber:extension`**: registers the agent in `build.extensions` with `parallel: false`.
- **`/viber:handoff`**: the file holds where to look, what is done, the decisions, what comes next
  and open problems. Name a directory (`notes/`) or a `.md` path to save it elsewhere, and add a
  loose prompt to steer the focus: `/viber:handoff notes/ focus on the migration`.
- **"commit"**: name an issue (`#42`) and it becomes the `Refs:` footer.

### Fast path

With `planning.fast-path` on, a small change to existing code takes a shorter road through
`/viber:intent`: a short design in chat instead of a plan. Once you say yes, it is built in your
session and proven by the test suite, with no plan file and no run directory. You commit it
yourself. Ask for a full plan and the interview continues as usual.

### Working from GitHub issues

With `github.issues` on, point `/viber:intent`, `/viber:fixer` or `/viber:prototype` at an issue:
`#42`, the bare number, or a link. It reads the issue instead of asking you to restate it.

- An interview that did not start from an issue can save its confirmed summary as a new one, built
  from your issue templates. `/viber:intent #42` then resumes it.
- A prototype that started from an issue can post its conclusions there as a comment. You attach
  the HTML mockup to that comment yourself, since only the browser accepts attachments.
- Either way, a prototype's conclusions carry on to `/viber:intent`, and the accepted mockup
  travels with the plan into the build.

## How a run works

![How viber works](skills/setup/assets/viber-flow-en.svg)

The interview asks one question at a time, with three concrete options and a recommendation. A
reviewer reads the resulting plan against your codebase before you approve it. Then the build runs
task by task, reviewing and committing each one, and finishes with one final review and your fast
tests plus the integration tests the change reaches. End-to-end tests stay with your CI and
`/viber:e2e` unless you explicitly ask for them.

An idea too big for one cycle, such as a whole application, is split into ordered parts before any
detail question, and the interview covers every part. Each part gets its own plan and its own
build. A finished build names the next part, which resumes from the decisions already made, and
nothing is stubbed in between.

### When it decides for you

A task gets up to 5 attempts, each one model tier up. Where the build would otherwise stop and ask,
an arbiter agent picks one way forward from a closed list. That happens when:

- a task is past its 5 attempts
- a baseline or final test run is red
- a recheck of the final review fails
- a commit is refused

Every ruling goes into `rulings.md` with its reason and its cost if wrong, and the final summary
lists them. When the run is archived, the screen shows a two-line result, and the full summary is
in `outcome.md` in the archive.

### When it stops to ask you

- a tool call is refused
- it finds another open run, or changed files no task claims
- nothing was committed for a task

## Configuration

`/viber:setup` writes `.claude/viber.yml`, with a comment on every key. Edit it to change:

- which review and close steps a build runs (switches)
- the model range a build runs with (tiers)
- whether a run works on its own git branch (branching)
- the titles of issues and pull requests, and the run directories

[Configuring viber](docs/configuration.md) is the full reference, including personal overrides in
`.claude/viber.local.yml`. [BRANCHING.md](BRANCHING.md) covers the branching schema.

## Where it writes

| Path | What it holds |
| --- | --- |
| `docs/_specs/<date>_<slug>/` | A run in progress, committed so a build resumes in a new session or on another machine |
| `docs/specs/<date>_<slug>/` | The archive: specification, test scenarios, rulings, build summary |
| `CLAUDE.md` files, `.claude/rules/` | What builds learned about your project |
| `.temp/viber/` | Scratch files and mockups, kept out of git |

[Where viber writes](docs/files.md) lists every file, including settings, extensions and what is
only ever added to.
