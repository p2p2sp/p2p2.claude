# viber

From an idea to committed code in four steps: understand it, plan it, build it, remember it.

No code is written before you approve a plan that a reviewer has already passed, and every task
lands as its own commit, so the history reads like the plan.

## Install

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install viber@p2p2 --scope user
```

Optional: `node`, for `/viber:setup`'s permissions merge, Playwright, for `/viber:e2e`, and the
`gh` CLI, for the GitHub steps (`/viber:setup` checks it is installed). Each step skips with a note
when its tool is missing. `/viber:code-auditor` also needs `node` 22.6 or newer and stops without it.

`/viber:setup` also installs the bare `Bash` allow in `.claude/settings.json`, which the script
calls that `/viber:triage`, `/viber:intent`, `/viber:prototype` and the ADR tasks make after a
prose question rely on; without it each of those calls asks for permission once.

## Quick start

| Say this | What happens |
| --- | --- |
| `/viber:setup` | Once per project: the switches, the ignore rules, the permissions, the CLAUDE.md check. |
| `/viber:triage` | A reported issue (number, link or pasted text) checked against your code: can it be done, how, what it affects, how big. Names the next step and can post the report on the issue. |
| `/viber:intent` | An interview about a raw idea, one question at a time. Point it at an issue (`#42` or a link) to work from that issue, and an interview that did not start from one can save its conclusions as a new issue. Add `--prove` to have every question's recommendation and alternatives checked against the code, and the web where needed, before you see it. |
| `/viber:fixer` | A bug traced to its root cause and proven by a failing test, then handed to the planner. Point it at an issue the same way to trace from that report. |
| `/viber:prototype` | A UI change in mind becomes one working HTML mockup in your project's own look, or three alternatives to choose from, refined with you in conversation, then carried on to `/viber:intent`, onto the GitHub issue it started from, or both. |
| `/viber:e2e` | The build's QA scenarios become Playwright tests, run against your app. |
| `/viber:memory` | Reviews or extends your project's `CLAUDE.md` cascade on your own schedule. |
| `/viber:rules` | Reviews or extends your project's `.claude/rules/` on your own schedule. |
| `/viber:code-auditor` | A large codebase audited for bugs, tech debt or another job you pick: cheap agents rank every file and file pair, and only the places worth it get a deep investigation whose findings are replayed on a clean checkout. Needs Node.js 22.6 or newer. |
| `/viber:help` | This usage guide opened in your browser. |
| `/viber:handoff` | The conversation so far saved as one file (where to look, what is done, the decisions, what comes next, open problems) so a fresh session picks up where this one stopped. Name a directory or a `.md` path to save it elsewhere. |
| "commit" | Your changes, or only the paths you name, committed with a Conventional Commits message. Name an issue (`#42`) and it becomes the `Refs:` footer. |

A typical run is `/viber:setup` once, then `/viber:intent`. Ask for a plan without an interview
behind it, however clear the change already reads, and viber suggests the `viber:intent` interview
first - you decide whether to run it or plan directly. A bug goes the same way through
`/viber:fixer`: viber suggests it and you decide.

With the `planning.fast-path` switch on, a small change to existing code takes a shorter road through
`/viber:intent`: a short design in chat instead of a plan, built in your session once you say yes,
proven by the test suite, then left for you to commit with `/viber:commit` - no plan file, no run
directory. Ask for a full plan instead and the interview carries on as usual.

With `github.issues` on, point `/viber:intent` or `/viber:fixer` at a GitHub issue - `#42`, its number
alone, or a link - and it reads that issue instead of asking you to restate it, then keeps working
on the same issue throughout. An interview that did not start from one can, once confirmed, save
its summary as a new issue built from your project's own issue templates; the run then names that
issue's number, and `/viber:intent #42` resumes it.

`/viber:prototype` takes the same kind of issue reference, or a plain description of the change,
and asks upfront whether you want one proposal or three to choose from. When it started from an
issue, its conclusions can go back there as a comment; the mockup itself is an HTML file you
attach to that comment yourself in the browser, since only the browser accepts an attachment. Either
way, the conclusions carry on to `/viber:intent`.

The interview asks one question at a time, with three concrete options and a recommendation, and
says so out loud when your answer is weak. An idea too big for one cycle, a whole application or a
platform of several independent subsystems, is split into ordered parts before any detail question,
and the interview then discusses every part. Each part gets its own plan and its own build, and a
finished build names the next part, which resumes from the decisions already made. Nothing is faked
in between: what a later part brings is out of scope until its turn, never a stub. You approve the plan yourself, but only after a reviewer
has read it against your actual codebase. Then the build runs task by task, reviews each one,
commits it, runs one final review of the whole build, and finishes on the full test suite.
End-to-end tests stay with your CI and `/viber:e2e` unless you explicitly ask for them.

The build runs to its end without you at the keyboard. A task gets up to 5 attempts, each one model
tier up. Where it would otherwise stop and ask - a task past its 5 attempts, a red baseline or
final test run, a failed recheck of the final review, a refused commit - an arbiter agent picks one way
forward from a closed list, and the build writes down every such ruling, with its reason and what
it costs if wrong, in `rulings.md` in the run directory. The final summary lists them. The build still stops to ask you at a refused tool call, when it finds
another open run or changed files no task claims, when a task's coder hands the decision to the
owner, and when nothing was committed for a task.

![How viber works](skills/setup/assets/viber-flow-en.svg)

## Optional switches

`/viber:setup` writes `.claude/viber.yml` with its switches in three groups - `planning:`,
`build:` and `github:` - seven of the ten on and `build.qa`, `github.issues` and
`build.baseline-tests` off. A switch counts only inside its group. Edit that file to change any of
them - only `true` counts as on, so turn a switch off with `false` rather than by deleting it.
Without the file all ten are off. Run `/viber:setup` again after an upgrade: any switch the new
version added is merged into your file, a switch written outside its group is moved into it, and
every value you set is left as it is. A session start tells you when the file's `schema:` number
says it needs that run.

| Switch | Default | When on |
| --- | --- | --- |
| `planning.adr` | on | A decision worth keeping becomes an architecture decision record in `docs/adr/`. |
| `planning.plain-plan-review` | on | A plan written in plain plan mode, without the planner, must pass a review before plan mode can be left. |
| `planning.fast-path` | on | For a small, well-scoped change to existing code, `/viber:intent` shows a short design in chat and builds it only after your explicit yes, with no plan file and no run directory. |
| `build.baseline-tests` | **off** | Before the first task the build runs your test suite once and records what already fails, then repairs only the failures it caused. |
| `build.final-review` | on | After every task is committed and before the final test run, one reviewer looks at the whole build's diff for what per-task review and the test suite cannot see, a coder fixes what it finds, a reviewer rechecks the fix, and after a failed recheck the arbiter rules on committing the fix as it stands, recorded in `rulings.md`. The build summary lists each finding with what was wrong and what the fix changed. |
| `build.memory` | on | The build closes by updating your project's `CLAUDE.md` with what it learned. |
| `build.rules` | on | The build closes by recording a convention it confirmed in `.claude/rules/`. |
| `build.qa` | **off** | The build closes by writing test scenarios for what it delivered, which `/viber:e2e` can then automate. |
| `build.cleanup` | on | The build ends by noting anything it delivered that the specification does not promise, then archiving the run and dropping the working files. |
| `github.issues` | **off** | `/viber:intent`, `/viber:fixer` and `/viber:prototype` can start from a GitHub issue's number or link, and an interview that did not can save its conclusions as a new one; `/viber:prototype` can post its mockup to the issue it started from; `/viber:triage` can fetch and publish to a GitHub issue instead of pasted text alone. |

The `github:` group also carries the title patterns of the issues and pull requests viber opens,
`issue-title` (`'{template-title}{summary}'`) and `pr-title` (`'{type}: {summary}'`).

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

A `branching:` group says whether a run works on its own git branch, and can describe several
kinds of branch - each with its own base, name pattern and pull request target - picked by the
type of the GitHub issue a run starts from through `issue-type-mappings`. `mode` is `off` (stay on
the branch the run started on, today's behavior), `allowed` (the run may get its own branch) or
`required` (a run always gets its own branch, never an entry's base). Under both, the entry is
settled when the interview or diagnosis starts, before any code is read, with an offer to switch
to its base first; the planner takes the branch from there. Nothing is fetched, pushed, merged or
deleted: the branch is only created, switched to and committed on. See
[`viber/BRANCHING.md`](BRANCHING.md) for the full schema and one example per branching strategy -
trunk based development, GitHub Flow, GitLab Flow, Release Flow and GitFlow.

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

The build and test commands come from your project's `CLAUDE.md`. If there is no such file, or it
does not name them, every agent in the run has to guess. Write them down once.

## Where it writes

`docs/_specs/<date>_<slug>/` holds the plan as it was approved and a `status.md` next to it with
the run's progress, so a build interrupted halfway
resumes by re-reading it - in a new session, or on another computer, because the notes and reports
the run produced are committed beside the plan: just ask Claude to continue the build, and it
reopens the run most recently worked on. A plan that stopped at a draft, with no tasks yet, is not
a build to resume: point `/viber:intent` at it instead to continue it. The plan itself is never
edited once it lands. With `build.qa` on, the build's test scenarios land there
too. `rulings.md` appears beside them only when the build ruled on something.

With `build.cleanup` on, the build ends by moving what is worth keeping - the specification and the test
scenarios, plus `rulings.md` - to `docs/specs/<date>_<slug>/`, and dropping the plan, the progress file and the
working notes. They are all in git, so nothing is lost; the archive is simply the half you would
want to read a year later. Generated
Playwright tests go into the e2e directory your own project already uses - `/viber:e2e` asks if
nothing names one, and creates no directory of its own. Scratch files go to `.temp/viber/`, and
`/viber:prototype`'s mockups to `.temp/viber/prototype/` within it. Your
`.claude/viber.yml` and your `.gitignore` are only ever added to, never rewritten, except that a
switch written outside its group is moved into it with its value. Your
`.claude/settings.json` gets every setting viber recommends. If the file already exists, setup
asks first: merge (a value viber sets wins over yours, permission lists only gain entries, and a
permission viber moved from `deny` to `ask` is moved in your settings too) or reset (the file is
replaced from scratch, the old one kept in `.temp/viber/setup/settings.json.bak`). Keep your own overrides in `.claude/settings.local.json`, which viber never
touches.

`/viber:memory` and `/viber:rules` write the same `CLAUDE.md` cascade and the same
`.claude/rules/` a build closes with, on your own schedule instead of a build's. Either one asks
before writing and leaves the result unstaged, exactly like the close does. Both also offer a
`reset` mode, which deletes the whole layer and starts from zero; it is refused while a target
holds uncommitted work.
