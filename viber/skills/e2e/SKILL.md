---
name: e2e
description: Generates and locally verifies Playwright tests for the QA scenarios of one viber run, then commits them. Use it after a build closed with a qa.e2e.md handoff file in its run directory.
argument-hint: "[run directory, or a path to qa.e2e.md]"
allowed-tools: Read, Grep, Glob, Bash, Agent, AskUserQuestion, TaskCreate, TaskUpdate, Bash(${CLAUDE_PLUGIN_ROOT}/scripts/check-playwright.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/plan-path.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh:*)
disallowed-tools: Write, Edit, NotebookEdit
user-invocable: true
disable-model-invocation: true
---

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/check-playwright.sh"
```

# e2e

One run's handoff file, one pass. Every scenario of its `qa.e2e.md` becomes one `@playwright/test` file, written by `viber:e2e-writer` against the application you launched, proven green there, and committed. You resolve, launch, dispatch and commit: you generate nothing and write not one byte into the tree yourself.

Nothing about this project's stack is assumed. The test directory, the base URL, the launch command and the test accounts come from the project's own instructions, from the handoff's header lines, or from the user - never from a default of your own, and never carried over from another project.

Every bundled-script run is one literal Bash line, `"${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh" <args>`, every argument double-quoted: never prefixed with an interpreter word, never assigned to a variable, never preceded by `cd`, never chained with `;`. The permission classifier matches the literal prefix, so any other form stalls the run on a prompt.

## 1. Resolve the run

The argument names either the run directory or the `qa.e2e.md` inside it; `<dir>` is that directory either way. With no argument, `"${CLAUDE_PLUGIN_ROOT}/scripts/plan-path.sh"` returns the plan most recently worked on and `<dir>` is its directory.

No `<dir>/qa.e2e.md` -> stop with one line naming the directory and saying it carries no handoff file. That build wrote no automatable scenario, and nothing here invents one.

## 2. Preflight

The two lines above are the state of this host: trust them, never re-probe either. Both reading `found` -> go on.

A `not found` -> one `AskUserQuestion` naming what is missing: install it now, or abort. Abort stops the run with nothing generated. On install, one Bash call each, an explicit generous timeout on every one of them, the package names exactly as written here and never re-derived from a binary name:

- `playwright-cli` -> `npm install -g @playwright/cli@latest`
- `@playwright/test` -> `npm i -D @playwright/test`, then `npx playwright install chromium` - the one browser this flow uses, so the download stays a browser rather than three

Installing `@playwright/test` changes this project's `package.json` and its lockfile. Say so in one line before the loop starts: those two files are the user's to commit or to stash, never this command's - step 6 commits the generated specs and the handoff, and nothing else.

## 3. Resolve the host values

Four values, each taken from the project's own instructions first, then from the handoff's header lines (`Base:`, `Launch:`, `Accounts:`), a line reading `unknown` being silence too:

- the e2e test directory, which the handoff does not carry at all
- the base URL
- the command that starts the application
- the test accounts and where their credentials live

Each value still missing -> one `AskUserQuestion` naming it: provide it now, or abort. Take the answer verbatim. Never fill a gap yourself and never continue past an abort.

## 4. Start the application

Probe once with one Bash call of `curl -sf -o /dev/null "<base-url>"`. It answers -> the application is already up; run no command and go to step 5.

Otherwise run the launch command as one background Bash call with its output redirected to `.temp/viber/e2e/launch.log`, then poll with the same probe every 2 seconds for up to 120 seconds. The first answer moves you on. No answer inside that bound -> `AskUserQuestion` quoting the last lines of that log: poll again at double the bound with the command left running, or abort.

This project's launch command, its config and its ports are never edited to make the probe answer. A command that does not start the application is a fact for the user, not a file for you.

## 5. Generate the tests

The ID list is every `### QA-<nn> <title>` heading under `## UI scenarios` and `## API scenarios`, in file order; an ID named under `## Not automatable` gets no entry at all. Read each one's state off the handoff's `## Automation` section: a `file` line is done and this pass skips it, a `blocked` line is retried, no line at all is pending.

`TaskCreate` one task per ID, the `file` ones completed at creation. Then one pending ID at a time in file order, never two at once - they share one running application and one set of data:

1. `TaskUpdate` -> in progress.
2. `Agent` with `subagent_type: viber:e2e-writer`, one labelled line each and nothing else: `handoff: <dir>/qa.e2e.md`, `id: QA-<nn>`, `spec-dir: <the e2e test directory>`, `base-url: <the base URL>`, `refs: ${CLAUDE_PLUGIN_ROOT}/references`. Every path absolute. Pass no `model:` - the writer's own frontmatter is its strength.
3. `VERDICT: PASS` plus `FILE:` -> keep that path for step 6. `TaskUpdate` -> completed.
4. `VERDICT: BLOCKED` plus `REASON:` -> the application, not the test, prevented a green run. The writer already deleted its file and wrote that ID's `blocked` line. Keep the reason for step 7, re-dispatch nothing, and change nothing in the application: a blocked scenario is a finding, never a build. `TaskUpdate` -> completed.
5. `VERDICT: FAIL` plus `REASON:` -> dispatch once more with the same lines. A second FAIL -> `AskUserQuestion` naming the scenario: retry again, skip it (keep the reason for step 7; it wrote no status line, so the ID stays pending for a later pass), or abort (go to step 6 with the IDs already processed).

Never open the application, write a spec file, edit one the writer produced, or read a red run yourself. The writer owns generation, the green run and the status line; you own the order they happen in.

## 6. Commit

No ID processed at all -> skip to step 7, nothing new is in the tree. Otherwise one call, the handoff plus one path per `FILE:` line kept in step 5, and nothing else ever:

```
"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" --e2e "<dir>/qa.e2e.md" "<spec>" ...
```

It derives its own subject and stages only what it is given. A non-zero exit means nothing was committed -> `AskUserQuestion`: retry, or leave the files uncommitted and report that in step 7. Never stage anything yourself, never `git add`, never `git commit`.

## 7. Report

At most five sentences - the handoff, the commit, how many IDs this pass skipped as already automated, how many are still pending - then one line per ID that has an outcome: `file <path>`, `blocked - <reason>` or `skipped - <reason>`. An ID an abort never reached gets no line; the sentences carry that count.

The only bytes you wrote are the logs under `.temp/viber/e2e/`. The application you launched is left running - stopping it is the user's call.
