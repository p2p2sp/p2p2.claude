# viber

From an idea to committed code in four steps: understand it, plan it, build it, remember it.

No code is written until you approve a plan that a reviewer has already passed. Every task lands
as its own commit, so the history reads like the plan.

## Why viber

### It asks before it guesses
One question at a time, each with concrete options and a recommendation. A weak answer gets called out. Add `--prove` and every recommendation is checked against your code before you see it.

### Every step is checked
A reviewer reads the plan against your codebase before you approve it. Each task is reviewed before its commit, the whole build gets a final review, and the run ends on your own test suite.

### It runs without you
Approve the plan and walk away. A failed task retries up to five times, one model tier up each time. Where a build would stop and ask, an arbiter agent picks a way forward and writes down why, so you can audit every call afterwards.

### It saves tokens
Each task gets the cheapest model that can do it: Haiku for a rename, a stronger model for real logic. Your usage limits last longer, and you set the floor and the ceiling.

### It learns your project
Every build closes by writing down what it learned: conventions to `.claude/rules/`, area knowledge to that area's `CLAUDE.md`. The next run starts from there, so you explain less each time.

### Nothing gets lost
The plan and its progress are committed. An interrupted build resumes in a new session or on another machine.

### It is simpler than it looks
`/viber:setup` once, then `/viber:intent`, and you answer questions. Each step names the next one, so you never need the diagram below.

## Install

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install viber@p2p2 --scope user
```

Optional tools. A step that needs one skips with a note when it is missing:

- `node`, for `/viber:setup`'s permissions merge
- Playwright, for `/viber:e2e`
- the `gh` CLI, for the GitHub steps (`/viber:setup` checks that it is installed)

`/viber:code-auditor` needs `node` 22.6 or newer and stops without it.

`/viber:setup` also adds a bare `Bash` allow to `.claude/settings.json`. `/viber:intent`,
`/viber:prototype`, `/viber:fixer` and `/viber:create-issue` rely on it for the script calls they
make after a later reply of yours. Without it, each of those calls asks for permission once.

## Quick start

| Say this | What happens |
| --- | --- |
| `/viber:setup` | Once per project: the switches, the ignore rules, the permissions, the CLAUDE.md check. |
| `/viber:triage` | Checks a reported issue (number, link or pasted text) against your code: can it be done, how, what it affects, how big. Names the next step and can post the report on the issue. |
| `/viber:create-issue` | Creates a GitHub issue of any kind, bugs included, from your project's issue form templates. Shows a preview and creates it only on your yes. Say what it is about, or let it take that from the conversation. |
| `/viber:intent` | Interviews you about a raw idea, one question at a time. Point it at an issue (`#42` or a link) to work from that issue. An interview that did not start from one can save its conclusions as a new issue. Add `--prove` to have every question's recommendation and alternatives checked against the code, and the web where needed, before you see it. |
| `/viber:fixer` | Traces a bug to its root cause, proves it with a failing test and hands it to the planner. Point it at an issue the same way. |
| `/viber:prototype` | Turns a UI change into one working HTML mockup in your project's own look, or three alternatives to choose from. You refine it in conversation, then it goes on to `/viber:intent`, to the GitHub issue it started from, or both. The accepted mockup travels with the plan into the build. |
| `/viber:e2e` | Turns the build's QA scenarios into Playwright tests and runs them against your app. |
| `/viber:create-pr` | Opens a pull request (or a draft) for the current branch, titled per `github.pr-title` and filled in from your pull request template. Shows a preview, then pushes and creates it only on your yes. The run's `qa.md` is posted on it as a QA comment, once per run. |
| `/viber:memory` | Reviews or extends your project's `CLAUDE.md` cascade on your own schedule. |
| `/viber:rules` | Reviews or extends your project's `.claude/rules/` on your own schedule. |
| `/viber:extension` | Creates or adapts, with you, an agent of your own in `.claude/agents/` that a build runs at its close, just before the run is archived. Registers it in `build.extensions` with `parallel: false`. |
| `/viber:code-auditor` | Audits a large codebase for bugs, tech debt or another job you pick. Cheap agents rank every file and file pair. Only the places worth it get a deep investigation, and its findings are replayed on a clean checkout. Needs Node.js 22.6 or newer. |
| `/viber:help` | Opens this usage guide in your browser. |
| `/viber:handoff` | Saves the conversation as one file (where to look, what is done, the decisions, what comes next, open problems) so a fresh session picks up where this one stopped. Name a directory or a `.md` path to save it elsewhere. |
| "commit" | Commits your changes, or only the paths you name, with a Conventional Commits message. Name an issue (`#42`) and it becomes the `Refs:` footer. |

A typical run is `/viber:setup` once, then `/viber:intent`. If you ask for a plan without an
interview, however clear the change seems, viber suggests the `viber:intent` interview first. You
decide whether to run it or plan directly. A bug goes the same way through `/viber:fixer`.

### Fast path

With `planning.fast-path` on, a small change to existing code takes a shorter road through
`/viber:intent`. You get a short design in chat instead of a plan. Once you say yes, it is built
in your session and proven by the test suite, with no plan file and no run directory. You commit
it yourself with `/viber:commit`. Ask for a full plan and the interview continues as usual.

### Working from GitHub issues

With `github.issues` on, point `/viber:intent` or `/viber:fixer` at an issue: `#42`, the bare
number, or a link. It reads the issue instead of asking you to restate it, and keeps working on
that issue throughout.

An interview that did not start from an issue can save its confirmed summary as a new one, built
from your project's issue templates. The run then names that issue's number, and
`/viber:intent #42` resumes it.

### Prototypes

`/viber:prototype` takes an issue reference or a plain description of the change. It asks first
whether you want one proposal or three to choose from.

If it started from an issue, its conclusions can go back there as a comment. The mockup is an
HTML file you attach to that comment yourself in the browser, since only the browser accepts
attachments. Either way, the conclusions carry on to `/viber:intent`.

## How a run works

The interview asks one question at a time, with three concrete options and a recommendation. When
your answer is weak, it says so.

An idea too big for one cycle (a whole application, or a platform of several independent
subsystems) is split into ordered parts before any detail question, and the interview covers
every part. Each part gets its own plan and its own build. A finished build names the next part,
which resumes from the decisions already made. Nothing is faked in between: what a later part
brings stays out of scope until its turn, never a stub.

A reviewer reads the plan against your actual codebase before you approve it. Then the build runs
task by task, reviewing and committing each one. It runs one final review of the whole build and
finishes on your fast tests plus the integration tests the change reaches. End-to-end tests stay
with your CI and `/viber:e2e` unless you explicitly ask for them.

The build runs to its end without you at the keyboard. A task gets up to 5 attempts, each one
model tier up. Where the build would otherwise stop and ask, an arbiter agent picks one way
forward from a closed list. That happens when:

- a task is past its 5 attempts
- a baseline or final test run is red
- a recheck of the final review fails
- a commit is refused

Every ruling goes into `rulings.md` in the run directory, with its reason and its cost if wrong.
The final summary lists them. When the run is archived, the screen shows a two-line result and
the full summary is in `outcome.md` in the archive.

The build still stops to ask you when:

- a tool call is refused
- it finds another open run, or changed files no task claims
- nothing was committed for a task

![How viber works](skills/setup/assets/viber-flow-en.svg)

## Optional switches

`/viber:setup` writes `.claude/viber.yml` with its switches in three groups: `planning:`,
`build:` and `github:`. It turns seven of the ten on and `build.qa`, `github.issues` and
`build.baseline-tests` off. Without the file, all ten are off. A switch counts only inside its
group.

Edit the file to change a switch. Only `true` counts as on, so turn a switch off with `false`
instead of deleting it. `build.baseline-tests` is the exception: it takes `off`, `fast` or `full`,
and `setup` rewrites an older `true` to `full` and `false` to `off`. `build.extensions` is not a
switch: it holds a map of agent entries.

Run `/viber:setup` again after an upgrade. It merges in any switch the new version added, moves a
switch written outside its group into it, and keeps every value you set. A session start tells
you when the file's `schema:` number says that run is needed.

| Switch | Default | When on |
| --- | --- | --- |
| `planning.adr` | on | A decision worth keeping becomes an architecture decision record in `docs/adr/`. |
| `planning.plain-plan-review` | on | A plan written in plain plan mode, without the planner, must pass a review before plan mode can be left. |
| `planning.fast-path` | on | For a small, well-scoped change to existing code, `/viber:intent` shows a short design in chat and builds it only after your explicit yes, with no plan file and no run directory. |
| `build.baseline-tests` | **off** | Takes `off`, `fast` or `full`. With `fast` or `full`, the build runs your tests once before the first task, records what already fails, and repairs only the failures it caused. `fast` runs the unit and component tests, `full` every layer but end-to-end. |
| `build.final-review` | on | After every task is committed and before the final test run, one reviewer checks the whole build's diff for what per-task review and the test suite cannot see. A coder fixes what it finds and a reviewer rechecks the fix. After a failed recheck, the arbiter rules on committing the fix as it stands, recorded in `rulings.md`. The build summary lists each finding, what was wrong and what the fix changed. |
| `build.memory` | on | The build closes by updating your project's `CLAUDE.md` nodes below the root with what it learned. The root stays yours: the build only suggests changes to it. |
| `build.rules` | on | The build closes by recording a convention it confirmed in `.claude/rules/`. |
| `build.qa` | **off** | The build closes by writing test scenarios for what it delivered, which `/viber:e2e` can then automate. |
| `build.cleanup` | on | The build ends by noting anything it delivered that the specification does not promise, then archives the run with its build summary and drops the working files. |
| `build.extensions` | empty | A map with one entry per agent from your project's own `.claude/agents/`, run in that order at the close of a build, just before the run is archived. An entry runs alone unless it holds `parallel: true`: consecutive such entries run together in one message, as one step. Empty runs none. |
| `github.issues` | **off** | `/viber:intent`, `/viber:fixer` and `/viber:prototype` can start from a GitHub issue's number or link, and an interview that did not can save its conclusions as a new one. `/viber:prototype` can post its mockup to the issue it started from. `/viber:triage` can fetch from and publish to a GitHub issue, not only work on pasted text. |

### Personal overrides

To change a few settings for yourself only, create `.claude/viber.local.yml` in the same layout.
It overrides four keys and nothing else: `tiers.min`, `tiers.max`, `build.baseline-tests` and
`github.issues`. An empty or invalid value is ignored. The file stays out of git (`/viber:setup`
adds it to `.gitignore`), and `/viber:setup` never creates or changes it.

### Titles and directories

The `github:` group also holds the title patterns of the issues and pull requests viber opens:
`issue-title` (`'{summary}'`) and `pr-title` (`'[{issue-number}] {summary}'`).

The `directories:` group names two directories under `docs/`: `runs` (`_specs`) for a run in
progress and `specifications` (`specs`) for the archive.

```yaml
directories:
  runs: _specs
  specifications: specs
```

### Model tiers

The `tiers:` group sets the model range the build runs with: `haiku`, `sonnet`, `opus` or
`fable`. Every task, review and retry stays inside it, so `min: sonnet` never runs Haiku and
`max: sonnet` never runs Opus. Fable runs only when you name it: `max: fable` lets retries climb
to it, and `min: fable` with `max: fable` runs the whole build on it. Planning is not affected: it
runs on your session's model.

```yaml
tiers:
  min: haiku
  max: opus
```

### Branching

The `branching:` group says whether a run works on its own git branch. It can describe several
kinds of branch, each with its own base, name pattern and pull request target. The type of the
GitHub issue a run starts from picks the kind, through `issue-type-mappings`.

`mode` takes one of three values:

- `off`: stay on the branch the run started on
- `allowed`: the run may get its own branch
- `required`: a run always gets its own branch, never an entry's base

Under `allowed` and `required`, the entry is settled when the interview or diagnosis starts,
before any code is read, with an offer to switch to its base first. The planner takes the branch
from there.

No branching step fetches, pushes, merges or deletes. The branch is only created, switched to and
committed on. Only `/viber:create-pr` pushes it, on your yes.

[`viber/BRANCHING.md`](BRANCHING.md) has the full schema, one example per branching strategy
(trunk based development, GitHub Flow, GitLab Flow, Release Flow and GitFlow), and the pull
request template convention `/viber:create-pr` reads.

```yaml
branching:
  mode: off
  work:
    main:
      base: main
      name: '{type}/{slug}'
      target: main
```

## Before your first run

The build and test commands come from your project's `CLAUDE.md`. If the file is missing or does
not name them, every agent in the run has to guess, so write them down once. With no `CLAUDE.md`
yet, run `/viber:memory`: it writes a short root once, within 4000 bytes. After that the root is
yours.

## Where it writes

### The run directory

`docs/_specs/<date>_<slug>/` holds the plan as it was approved and a `status.md` with the run's
progress. The plan is never edited once it lands. The notes and reports the run produces are
committed beside it, so an interrupted build resumes in a new session or on another computer:
ask Claude to continue the build, and it reopens the run most recently worked on.

A plan that stopped at a draft, with no tasks yet, is not a build to resume. Point
`/viber:intent` at it to continue it.

With `build.qa` on, the build's test scenarios land there too. `rulings.md` appears only when the
build ruled on something.

### The archive

With `build.cleanup` on, the build ends by moving what is worth keeping to
`docs/specs/<date>_<slug>/`: the specification, the test scenarios, `rulings.md` and the build
summary `outcome.md`. It drops the plan, the progress file and the working notes. They stay in
git, so nothing is lost. The archive is the half you would want to read a year later.

### Other files

- Generated Playwright tests go into the e2e directory your project already uses. If nothing
  names one, `/viber:e2e` asks, and it creates no directory of its own.
- Scratch files go to `.temp/viber/`, and `/viber:prototype`'s mockups to
  `.temp/viber/prototype/`.
- `.claude/viber.yml` and `.gitignore` are only ever added to, never rewritten. The one
  exception: a switch written outside its group is moved into it with its value.
- Setup adds `.temp/` and `.claude/viber.local.yml` to `.gitignore` when no rule ignores them yet.

### Settings

`.claude/settings.json` gets every setting viber recommends. If the file already exists and
differs, setup asks first:

- merge: a value viber sets wins over yours, permission lists only gain entries, and a permission
  viber moved from `deny` to `ask` is moved in your settings too
- reset: the file is replaced from scratch, and the old one is kept in
  `.temp/viber/setup/settings.json.bak`

Keep your own overrides in `.claude/settings.local.json`, which viber never touches.

### Memory and rules

`/viber:memory` and `/viber:rules` write the same `CLAUDE.md` cascade and `.claude/rules/` that a
build closes with, on your own schedule. Both ask before writing and leave the result unstaged,
like the close does.

The root `CLAUDE.md` is written once, only where none exists. No build or review rewrites it
afterwards: what they would change there arrives as suggestions.

Both also offer a `reset` mode, which deletes the whole layer and starts from zero. It is refused
while a target holds uncommitted work.

### Extensions

`/viber:extension` writes an agent of your own into `.claude/agents/`. When its work runs in
phases one after another, it also writes one skill per phase into `.claude/skills/`. It adds an
entry for the agent, holding `parallel: false`, to `build.extensions` in `.claude/viber.yml`, and
leaves all of it uncommitted. A build then runs that agent at its close and commits what it wrote
in a commit of its own.
