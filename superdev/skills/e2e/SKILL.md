---
name: e2e
description: Generate and locally verify Playwright tests for the scenarios of one docs/qa handoff file, then commit them for CI.
argument-hint: "handoff: <path to the build's docs/qa/<run id>.e2e.md>"
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash, Agent, AskUserQuestion, TaskCreate, TaskUpdate, TaskStop, Bash(${CLAUDE_PLUGIN_ROOT}/scripts/check-playwright.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh:*)
disallowed-tools: Edit, Write, NotebookEdit
---

# E2E

One handoff file, one run. Every scenario of a build's `docs/qa/<run id>.e2e.md` becomes one
`@playwright/test` file, written by `superdev:e2e-writer` against the application this skill launched,
proven green there, and committed for CI. You resolve, launch, dispatch and commit - you generate nothing
and write no file into the repository yourself.

Nothing about the host's stack is assumed. The launch recipe, the base URL, the test accounts, the e2e
directory and the test conventions come from the host's own memory, from the handoff's header lines, or
from the operator - never from a guess, and never from a default of your own.

`$ARGUMENTS` carries the handoff path as `handoff: <path>`; a bare path with no label is the same value.
A handoff file is never picked up on its own - not the newest, not the only one, not a sibling of the one
named. The operator names the file, always.

## Tooling

!`"${CLAUDE_PLUGIN_ROOT}/scripts/check-playwright.sh"`

Two lines, `playwright-cli:` first, `@playwright/test:` second. That is the state of this host - trust it,
never re-probe either, and read a `not found` as `## Preflight` step 4 directs.

## Preflight

Nothing here generates, writes or commits anything. A STOP or an abort at any step below leaves the
repository exactly as it was found - that is the point of the step.

1. `Agent` tool present in your tool pool? Every test is written by `superdev:e2e-writer` through it. Its
   absence means the harness lost the tool, never that you may write a test in its place: STOP at once,
   report exactly these four lines, and end the turn.

```
AGENT TOOL UNAVAILABLE - stopped at <step>.
Nothing was generated or committed in its place.
State: <resolved handoff path>, or "no handoff resolved yet".
Fix: exit this session, restart with `claude --resume`, then run `/superdev:e2e handoff: <path>` again.
```

2. Resolve the `handoff:` value. It must name an existing file whose name ends in `.e2e.md`. Missing, no
   such file, or a name ending otherwise -> STOP with one line naming the value you were given and the
   shape expected (`handoff: <path>/<run id>.e2e.md`); dispatch nothing. Then read the file: no
   `## UI scenarios` section and no `## API scenarios` section -> STOP with one line naming the file as
   carrying no automatable scenario.

3. Resolve the five host values, host memory first: the root `CLAUDE.md` and every child node it points
   at, then every file of `.claude/rules/`.

   | value | dispatched as | fallback when the memory is silent |
   | --- | --- | --- |
   | launch recipe | the command `## Launch` runs | the handoff's `Launch:` line |
   | base URL | `base-url:` | the handoff's `Base:` line |
   | test accounts | `accounts:` - the file the logins and their credentials live in | the handoff's `Accounts:` line |
   | e2e directory | `spec-dir:` | none - the handoff carries none |
   | e2e conventions | `memory:` / `rules:` - Page Objects, role fixtures, locator style, data helpers | none |

   A fallback line reading `not declared` is silence too. Each value still missing -> one
   `AskUserQuestion` naming it: **provide it now** (the operator types it in the answer) / **abort**.
   Take the answer verbatim - a command for the launch recipe, a URL for the base URL, a path for the
   accounts file, the e2e directory and the conventions. A conventions path rides as `rules:` when it
   names a directory and as `memory:` when it names a file, replacing the host path that label would have
   carried - that path was silent on conventions or you would not be asking. Never fill a gap yourself,
   never carry a value over from another project, and never continue past an **abort**: it STOPs the run
   with nothing generated.

4. A `## Tooling` line reading `not found` -> one `AskUserQuestion` naming the missing tools:
   **install them now** / **abort**. **abort** STOPs the run, nothing generated. On install, one Bash
   call each, every package name exactly as written here and never re-derived from a binary name, each
   with an explicit generous timeout - a browser download is minutes, not seconds:
   - `playwright-cli` -> `npm install -g @playwright/cli@latest`
   - `@playwright/test` -> `npm i -D @playwright/test`, then `npx playwright install`

   Check each result: `command -v playwright-cli`, and the root `package.json` naming `"@playwright/test"`.
   A command exiting non-zero, or the tool still absent afterwards -> `AskUserQuestion` (**retry** /
   **abort**); nothing is generated in either branch. Redirect the command's output to
   `.temp/superdev/e2e/install.log` and quote its last lines in that question.

   Installing `@playwright/test` changes the host's `package.json` and its lockfile. Tell the operator so
   in one line before the loop starts: those two files are theirs to commit or to stash, never the E2E
   commit's - `## Commit` declares the generated specs and the handoff only, and refuses (exit 2) while
   they sit undeclared in the working tree.

## Launch

1. Probe once: one Bash call of `curl -sf -o /dev/null "<base-url>"`. It answers -> the application is
   already running; run no recipe and go to `## Loop`. `curl` absent from this host -> the probe is
   `playwright-cli open "<base-url>"` with its output redirected under `.temp/superdev/e2e/`, here and in
   every poll below.
2. Otherwise run the launch recipe as one background Bash call, its output redirected to
   `.temp/superdev/e2e/launch.log`.
3. Poll with the same probe every 2 seconds, up to 120 seconds. The first answer moves you to `## Loop`.
4. No answer inside that bound -> `AskUserQuestion`, quoting the last lines of
   `.temp/superdev/e2e/launch.log` so the operator sees why: **retry with a longer timeout** (poll again
   at double the previous bound, the recipe left running) / **abort**. **abort** ends the run - nothing
   was generated and nothing is committed.

Never edit the host's launch recipe, its config or its ports to make the probe answer. The recipe is the
host's; a recipe that does not start the application is a fact for the operator, not a file for you.

## Loop

Read `${CLAUDE_PLUGIN_ROOT}/references/qa-format.md` (`## Automation status lines`) first - it owns the
re-run rule below and this skill adds none of its own.

1. Build the ID list from the handoff: every `### QA-<nn> <title>` heading under `## UI scenarios` and
   under `## API scenarios`, in file order. An ID named under `## Not automatable` gets no entry at all.
2. Read each ID's state off the handoff's `## Automation` section (no such section -> every ID is
   pending): a `file` line -> done, this run skips it; a `blocked` line -> pending, this run retries it;
   no line -> pending.
3. `TaskCreate` one task per ID of step 1, the `file` ones marked completed at creation.
4. Then, one pending ID at a time in file order - never two dispatches in flight, they share one running
   application and its data:
   1. `TaskUpdate` -> start.
   2. `Agent` with `subagent_type: superdev:e2e-writer` and a labeled prompt, one `label: value` per
      line: `handoff:`, `id:`, `spec-dir:`, `base-url:`, `refs: ${CLAUDE_PLUGIN_ROOT}/references`,
      `memory:`, `rules:`, `accounts:`. Every path absolute. Omit `memory:`, `rules:` or `accounts:`
      entirely when this host has none - never an empty, placeholder or invented value. Pass no `model:`
      and no `effort:`: the writer's own frontmatter is its strength. Await it.
   3. `VERDICT: PASS` + `FILE: <path>` -> keep that path for `## Commit` and `## Done`; `TaskStop` ->
      completed.
   4. `VERDICT: BLOCKED` + `REASON: <line>` -> the application, not the test, prevented a green run: the
      writer has already deleted its file and written that ID's `blocked` status line. Keep the reason for
      `## Done`, re-dispatch nothing, and change nothing in the application - a blocked scenario is a
      finding, never a build. `TaskStop` -> completed.
   5. `VERDICT: FAIL` + `REASON: <line>` -> dispatch once more with the same arguments. A second FAIL ->
      `AskUserQuestion` naming the scenario `` `<title>` (QA-<nn>) ``: **retry** (the same arguments
      again) / **skip** (keep the `REASON:` line for `## Done` and move to the next ID - it wrote no
      status line, so the ID stays pending for a later run) / **abort** (stop dispatching and go to
      `## Commit` with the IDs already processed; every ID not reached stays pending).

Never open the application, write a spec file, edit one the writer produced, or read a red test run
yourself. The writer owns generation, the green run and the status line; you own the order they happen in.

## Commit

No ID processed at all in `## Loop` -> skip to `## Done`; nothing new is in the tree.

Otherwise one Bash call:

```
"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "test(e2e): <run id>" --path <handoff path> --path <FILE path> ...
```

- `<run id>` is the handoff's `Run:` line, its own basename without `.e2e.md` when that line is absent.
- One `--path` per `FILE:` line kept in `## Loop`, plus the handoff, and nothing else ever: the commit is
  exactly the generated spec files and the updated handoff.
- exit 2 with `undeclared: <path>` lines -> `AskUserQuestion` quoting every one of those lines:
  **remove or stash them** (the operator clears them, then you re-run the same command unchanged) /
  **include the named ones** (re-run it with one further `--path` per path the operator named) /
  **abort**. Never stage anything yourself, never `git add`, never `git commit`, and never widen the
  declared set on your own. A `@playwright/test` install from `## Preflight` surfaces here as
  `package.json` plus a lockfile - the operator's call, not yours.
- `commit: <sha>` -> carry the SHA to `## Done`. `Nothing to commit.` or
  `Not a git repository - skipping commit.` -> report that line there instead.

## Done

At most five sentences - the handoff, the commit SHA or why there was none, how many IDs this run skipped
as already automated, how many are still pending - then one line per ID that has an outcome:

```
QA-<nn>: file <repository-relative path>
QA-<nn>: blocked - <the writer's reason>
QA-<nn>: skipped - <the writer's REASON line>
```

An ID this run never reached - an abort cut the loop short - gets no line; the sentences carry that count.

You wrote no file: the handoff's status lines are the writer's, the commit is `commit-task.sh`'s, and the
only bytes written here are the logs under `.temp/superdev/e2e/`. The application you launched is left
running - stopping it is the operator's.
