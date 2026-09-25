# Add the prototype skill: a working HTML mockup of a UI change

Build: skill `implementor`

## Goal

A new user-only viber command, `/viber:prototype`, turns a UI change the user has in mind into one working, self-contained HTML mockup built in the host project's own look, either as one proposal or as three alternative scenarios to choose from. The user refines it in a loose, UI-only conversation, then carries the conclusions into `viber:intent`, onto the GitHub issue it started from, or both. The browser opener `setup` already uses becomes shared so both commands open a page the same way. The same build closes by turning the red CI run on `main` green again: one test case assumes `gh` can be hidden from PATH, which the Linux runner does not allow.

## Problem

Before a UI change is planned there is no way to see how it would look, so decisions about layout, hierarchy, flow and style are made blind inside the `intent` interview, in prose. Comparing alternatives means imagining them. The cost is a plan built on a look nobody saw, corrected only after the build.

## Current behaviour

Nothing yet. UI decisions are discussed only in prose inside `/viber:intent`; no viber step produces anything visual. `/viber:setup` opens its onboarding page in the browser through a script private to that skill.

### Must not change

- `issue-facts.sh` and `post-comment.sh` keep their argv, stdout and exit contracts byte for byte.
- `open-page.sh` keeps its argv, stdout and exit contract byte for byte; only its location and the callers its header names change.
- `/viber:setup` opens its onboarding page exactly as before.
- `intent` keeps every step it has today (issues switch, draft rounds, interview discipline, save and comment flow, Issue line); the only addition is carrying a Prototype line into its summary.
- Every existing `skills[]` and `agents[]` entry of `viber/.claude-plugin/plugin.json` keeps its relative order.

## Behaviour

### S1 - One mockup from the conversation [NEW]

The user describes a UI change in the chat and asks for a single proposal.

Given a conversation about a UI change and no argument
When the user runs `/viber:prototype` and answers "one" to the first question
Then the skill asks only the UI questions the conversation left open, one mockup appears under `.temp/viber/prototype/`, the file opens in the default browser, and the skill names what the mockup shows and how faithful it is to the project's look

### S2 - Three scenarios, then one [NEW]

Given the same start
When the user answers "three" to the first question and later picks one variant
Then the first mockup holds three variants behind an A/B/C switcher, each with a one-line trade-off; picking one rewrites the same file to that variant alone, with no switcher

### S3 - Revision round [NEW]

Given a mockup is on screen
When the user describes what to change
Then the same mockup file changes accordingly and the skill reminds the user to refresh the browser tab; the file is never opened a second time

### S4 - Start from an issue, close with a comment [NEW]

Given `issues: true`
When the user runs `/viber:prototype #N` (a number, `#N` or an issue URL as the whole argument) and, once the mockup is ready, picks the comment exit
Then the issue with its comments is the settled starting point, and the conclusions are posted as a comment on that issue, followed by the mockup's local path and a request to attach that file to the comment in the browser

### S5 - Hand off to intent [NEW]

Given a mockup the user calls ready
When the user picks the intent exit (from an issue: intent alone, or comment then intent)
Then the skill prints its conclusions with the Prototype line and invokes `viber:intent`, with the issue URL as the whole argument when the run is tied to an issue; `intent` treats the UI conclusions as settled and keeps the Prototype line in the summary it hands the planner

### S6 - No browser to open [NEW]

Given a session with no browser to open (a remote or headless host)
When the first mockup is written
Then nothing opens; the user is told where the file lies, to open it by hand, and the conversation goes on

### S7 - Issues switched off [NEW]

Given `issues: false`
When the argument looks like an issue reference
Then it is ordinary input text, no issue is fetched, and the comment exit is never offered

### S8 - Question outside UI [NEW]

Given the conversation is under way
When the user raises data, logic, an API, persistence, performance or scope beyond the screen
Then the skill does not pursue it; it lands in the conclusions as an open point for `intent`

### Edge cases

- The project has no design system -> the mockup takes its look from the code itself (component styles, stylesheets, the screen the change concerns).
- The project has no UI code at all -> the mockup follows the conversation alone, and the user is told so in one line.
- The mockup cannot be produced (for example the screen cannot be found) -> the user sees why and is asked, in prose, for what is missing.
- A tool call is refused by the permission system -> the user sees which one and chooses: add the permission and retry, or stop.
- The issue cannot be read (no GitHub command line tool, no access, no such issue) -> the user sees the reason and the command stops.
- Posting the comment fails -> the user sees the reason and that it is unknown whether a comment landed; nothing is retried, and a chosen intent exit still runs.
- The browser does not open although an opener exists -> the user is told where the file lies, to open it by hand.
- The user picks a variant when the mockup holds one, or a variant it does not hold -> the skill says so and asks again.
- Neither optional design skill is installed -> the mockup is made without one and nothing is reported about it.

## Glossary

- mockup - the one self-contained HTML file a run produces and edits, under `.temp/viber/prototype/`; never an image, never uploaded anywhere by the skill.
- mode - a single proposal or three alternative variants behind a switcher, chosen by the user's answer to the first question.
- variant - one of the alternatives in a three-variant mockup, labelled A, B or C.
- narrow - the round that rewrites a three-variant mockup to the one variant the user picked; afterwards it is a single proposal.
- basis - where the mockup's look came from: the project's design system, its code, or the conversation alone.
- conclusions - what the UI conversation settled: the change, the chosen variant and why, the UI decisions, the open points outside UI, and where the mockup lies.
- Prototype line - the one line naming where the mockup lies, carried in the conclusions and kept in intent's summary (C3).

## Acceptance criteria

1. `viber/.claude-plugin/plugin.json` lists `./skills/prototype/` directly after `./skills/triage/`, and `.claude/rules/plugin-manifests.md` names `prototype` in the pipeline order.
2. `open-page.sh` lives in `viber/scripts/` with its C1 contract unchanged, no copy is left under `viber/skills/setup/scripts/`, `setup` calls it from the new place, and a test file proves its contract.
3. `prototype-writer` produces, revises and narrows one self-contained HTML mockup per C2, in the host's look or from the code, soft-using `impeccable` then `superui:pro-designer` when available, returns the C2 lines, and is registered as `./agents/prototype-writer.md` in `agents[]`.
4. `prototype` is a user-only skill that implements S1 to S8: the first question, the UI-only conversation, the writer dispatches, the first-round open, the revision loop, the exit question, the issue comment with the attach request, and the intent hand-off carrying the Prototype line.
5. `intent` keeps a Prototype line from the conversation inside the summary it hands to the planner.
6. `viber/README.md` describes `/viber:prototype` in plain usage terms.
7. The "gh is not on PATH" case of `tests/viber/issue-templates.test.ts` skips with a reason when a real `gh` sits in the core utilities directory (as on the `ubuntu-latest` CI runner, where it failed with `REASON=no-repo`) and runs as today elsewhere.

## Scope

### File map

- add - viber/scripts/open-page.sh - moved from the setup skill: opens one local file in the default browser (contract unchanged)
- delete - viber/skills/setup/scripts/open-page.sh - moved
- modify - viber/skills/setup/SKILL.md - calls and pre-approves the opener at its plugin-wide path
- modify - tests/viber/open-page.test.ts - the open-page.sh contract, retargeted at the new path
- add - viber/agents/prototype-writer.md - writes, revises and narrows the mockup
- add - viber/skills/prototype/SKILL.md - the conversation, the loop, the exits and the hand-off
- add - viber/skills/prototype/assets/comment.md - the issue comment template, filled at the comment exit
- modify - viber/.claude-plugin/plugin.json - the skill and the agent registered
- modify - .claude/rules/plugin-manifests.md - pipeline order names prototype
- modify - viber/skills/intent/SKILL.md - the Prototype line kept in the summary
- modify - viber/README.md - the prototype row and a short account of it
- modify - tests/viber/issue-templates.test.ts - the no-gh case guarded like its siblings

### Out of scope

- Any upload of the mockup to GitHub (REST, GraphQL, `gh --attach`, gist, release asset, branch, `gh-image`): only the browser UI accepts an `.html` attachment.
- Claude artifacts, screenshots, a "current state" view.
- Any change to the host project's code.
- A shared GitHub-usage reference for all skills.
- The onboarding page `viber/skills/setup/assets/usage.html` (and the retired `usage.md`): left untouched at the user's request, although `viber/CLAUDE.md` asks to keep it in step with the README.
- Any change to what `open-page.sh` does, an SSH-session check included.
- `planner`, `fixer`, `triage` and every script of `viber/scripts/` other than the moved opener.
- `docs/assets/viber-flow.svg`.
- The `CLAUDE.md` nodes (`viber/CLAUDE.md`, root `CLAUDE.md`): the build's memory close updates them.
- The script paths and enumerations in `.claude/rules/shell-preload-contract.md` and `.claude/rules/shell-script-header.md`, and the test-file counts in `.claude/rules/tests-running.md`: the build's rules close updates them.

## Constraints

- The build starts only once the onboarding-page work now uncommitted in the tree (`usage.html`, `open-page.sh`, the `setup` skill) is committed; T1 moves that committed script.
- `open-page.sh` keeps git mode 100755 at its new path (`git mv` keeps it; verify with `git ls-files -s`) and its header names every skill that calls it.
- Every bundled-script call in a skill is one literal line with a matching `allowed-tools` pattern; no heredoc anywhere.
- The skill dispatches an agent, so it carries no `disallowed-tools:`; its limits live in its body.
- The skill and the agent follow the `supercc:skill-designer` doctrine and pass its lint with zero FAIL.
- The agent's `color:` is not `red`.
- Tests stub every opener and never launch a real browser or reach `gh`.
- No em dash or en dash in any file.
- T6 runs last, after every other task, at the user's request. Criterion #7 is a CI-only criterion with no user scenario.
