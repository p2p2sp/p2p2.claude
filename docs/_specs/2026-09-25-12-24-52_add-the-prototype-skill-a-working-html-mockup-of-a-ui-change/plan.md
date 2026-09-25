---
source: C:/Projects/p2p2.claude/docs/_specs/2026-09-25-12-24-52_add-the-prototype-skill-a-working-html-mockup-of-a-ui-change/plan.md
---

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

## Tasks

<!-- TASK -->
### T1 - Share the browser opener across viber skills
- TDD: none
- Covers: #2
- Uses: C1
- Depends-on: none
- Files: viber/scripts/open-page.sh, viber/skills/setup/scripts/open-page.sh, viber/skills/setup/SKILL.md, tests/viber/open-page.test.ts
- Delivers: `open-page.sh` moved with its history to `viber/scripts/`, its header naming `setup` and `prototype` as callers; `setup` calling and pre-approving it through `${CLAUDE_PLUGIN_ROOT}/scripts/`; the existing test file retargeted at the new path.
- Verification: `node --test tests/viber/open-page.test.ts && git ls-files -s viber/scripts/open-page.sh && grep -n 'CLAUDE_PLUGIN_ROOT}/scripts/open-page.sh' viber/skills/setup/SKILL.md && node --test tests/portability.test.ts` -> every test passes, covering each OS branch with its opener stubbed, a failing opener, no opener, a missing file and a missing argument; one 100755 index entry; the setup call line and its `allowed-tools` pattern; the portability sweep passes
- DoD: the script exists at `viber/scripts/open-page.sh` at mode 100755 and not under `viber/skills/setup/scripts/`; its argv, stdout and exit codes match C1 and the code below its header is unchanged; its header states a purpose true for any viber skill handing the user a local page (not the setup onboarding page alone) and names both callers; `setup` names it only through `${CLAUDE_PLUGIN_ROOT}/scripts/open-page.sh` in `allowed-tools` and in its call line; the test file resolves the new path and never launches a real browser
<!-- /TASK -->

<!-- TASK -->
### T2 - Add the prototype-writer agent
- TDD: none
- Covers: #3
- Uses: C2
- Depends-on: none
- Files: viber/agents/prototype-writer.md, viber/.claude-plugin/plugin.json
- Delivers: the agent that writes, revises and narrows one mockup from the C2 dispatch lines, and its `agents[]` registration.
- Verification: `bash supercc/skills/skill-designer/scripts/lint_skill.sh viber/agents/prototype-writer.md && grep -n 'prototype-writer' viber/agents/prototype-writer.md viber/.claude-plugin/plugin.json` -> zero FAIL, and the name on both sides
- DoD: frontmatter carries `name`, a description ending "Invoked only by the prototype skill, never directly.", `tools: Read, Write, Edit, Grep, Glob, Skill`, `model: opus`, `effort: high` and a `color:` other than `red`; the opening names its tools and says input is fully resolved; it reads the input per C2 and writes nothing but the `file:` path, never touching host code; the look comes from the design system, else the code of the screen concerned, else the brief, reported as `BASIS:`; it invokes `impeccable` when listed, else `superui:pro-designer` when listed, else neither, saying nothing about it; the mockup is one HTML file with inline CSS and script and no external request (no CDN, no remote font, no remote image); a three-variant mockup shows variants A, B and C behind a switcher with a one-line trade-off each; `narrow` rewrites the file to the chosen variant with no switcher; `revise` edits the file in place; it returns only the C2 lines, DENIED on a refused call; `plugin.json` lists `./agents/prototype-writer.md`
<!-- /TASK -->

<!-- TASK -->
### T3 - Add the prototype skill
- TDD: none
- Covers: #1, #4
- Uses: C1, C2, C3, C4, C5, C6
- Depends-on: T1, T2
- Files: viber/skills/prototype/SKILL.md, viber/skills/prototype/assets/comment.md, viber/.claude-plugin/plugin.json, .claude/rules/plugin-manifests.md
- Delivers: the `/viber:prototype` command running S1 to S8, its comment template, its `skills[]` registration and the pipeline-order rule naming it.
- Verification: `bash supercc/skills/skill-designer/scripts/lint_skill.sh viber/skills/prototype && grep -n 'open-page.sh\|issue-facts.sh\|post-comment.sh\|config.sh\|viber:prototype-writer\|Prototype:' viber/skills/prototype/SKILL.md && grep -n 'opened in the browser\|VERDICT: PASS' viber/scripts/open-page.sh viber/agents/prototype-writer.md && grep -n 'skills/prototype' viber/.claude-plugin/plugin.json && grep -n 'prototype' .claude/rules/plugin-manifests.md` -> zero FAIL, every name and line on the skill side, the matching lines on the script and agent side, one manifest line, one rule line
- DoD: frontmatter has `user-invocable: true`, `disable-model-invocation: true`, no `disallowed-tools:`, and `allowed-tools` pre-approving `Read, Grep, Glob, Agent, Skill`, `Edit(./.temp/viber/prototype/**)` and one `${CLAUDE_PLUGIN_ROOT}/scripts/` pattern per script it calls (`config.sh`, `issue-facts.sh`, `post-comment.sh`, `open-page.sh`); `config.sh` is preloaded; under `issues: true` an argument that is exactly an issue reference is fetched through `issue-facts.sh` and its ERROR stops the skill, under `issues: false` it is plain text; the first question is one or three, in prose; the conversation asks only UI questions, one per message, and parks anything else as an open point; the mockup path is `<root>/.temp/viber/prototype/<slug>.html`, prefixed `<N>-` when tied to an issue; every writer dispatch carries the C2 lines and branches on PASS, FAIL and DENIED; `open-page.sh` runs after the first PASS only and its line is shown to the user, later rounds remind to refresh; the exit question offers comment, intent, or comment then intent with an issue, intent or stop without; the comment is filled from `assets/comment.md`, written to `<root>/.temp/viber/prototype/<N>.md`, posted through `post-comment.sh`, followed by the mockup path and the request to attach it, never retried; the intent hand-off prints the conclusions with the C3 line and invokes `viber:intent` with the issue URL as the whole argument when tied, else the conclusions; the skill never writes the mockup itself and never edits host code; `plugin.json` lists `./skills/prototype/` directly after `./skills/triage/`; `plugin-manifests.md` names prototype after triage in the pipeline order
<!-- /TASK -->

<!-- TASK -->
### T4 - Keep the Prototype line through intent
- TDD: none
- Covers: #5
- Uses: C3
- Depends-on: T3
- Files: viber/skills/intent/SKILL.md
- Delivers: `intent` carrying a Prototype line found in the conversation into the confirmed summary it hands to the planner.
- Verification: `grep -n 'Prototype:' viber/skills/intent/SKILL.md viber/skills/prototype/SKILL.md` -> the line named on both sides
- DoD: the hand-off step names the C3 line and keeps it inside the summary exactly as written, like the Issue line; a conversation with no Prototype line adds none; no other step of `intent` changes
<!-- /TASK -->

<!-- TASK -->
### T5 - Document the prototype command
- TDD: none
- Covers: #6
- Uses: none
- Depends-on: T3
- Files: viber/README.md
- Delivers: a Quick start row and a short plain account of `/viber:prototype` in the README.
- Verification: `grep -n 'viber:prototype' viber/README.md && grep -n '^name: prototype' viber/skills/prototype/SKILL.md` -> the command in the README and the skill name on the source side
- DoD: the README names `/viber:prototype`, the one-or-three choice, the issue start, the manual attach of the HTML to the comment and the hand-off to `/viber:intent`; its "Where it writes" names `.temp/viber/prototype/`; no implementation detail (agent, script names) appears
<!-- /TASK -->

<!-- TASK -->
### T6 - Skip the no-gh issue-templates case where gh cannot be hidden
- TDD: none
- Covers: #7
- Uses: none
- Depends-on: T4, T5
- Files: tests/viber/issue-templates.test.ts
- Delivers: the "templates exist but gh is not on PATH" case guarded by the same `ghOnCorePath` check `post-comment.test.ts`, `issue-facts.test.ts` and `create-issue.test.ts` already use, so a runner with `gh` in its core utilities directory skips it with a reason instead of failing.
- Verification: `node --test tests/viber/issue-templates.test.ts && grep -n 'ghOnCorePath' tests/viber/issue-templates.test.ts tests/viber/post-comment.test.ts` -> every test passes or skips with a reason, and the guard named in both files
- DoD: the no-gh case carries a `skip:` option whose reason says the absence of `gh` cannot be staged, taken exactly when `coreUtilsPath()` resolves a `gh` or `gh.exe`; without such a `gh` the case runs and asserts `REASON=no-gh` as today; no other test in the file and no script changes
<!-- /TASK -->

## Contracts

### C1 - open-page.sh (existing contract, new location)

File: viber/scripts/open-page.sh

```
open-page.sh <file, absolute or relative to the cwd>
opener: Darwin -> open; MINGW*|MSYS*|CYGWIN* -> rundll32 url.dll,FileProtocolHandler <cygpath -w path>;
        any other -> wslview when on PATH, else xdg-open (backgrounded) when DISPLAY or WAYLAND_DISPLAY is non-empty
stdout, exit 0, exactly one line, <path> absolute (C:/ form on Windows):
  <name>: opened in the browser
  <name>: the browser did not open - open <path> by hand
  <name>: no browser to open it - open <path> by hand
  <name>: missing at <path>
exit 2: no argument or an empty one; usage line on stderr
```

### C2 - prototype-writer dispatch

File: viber/agents/prototype-writer.md

```
input, one labelled line each, a block running to the end of the prompt:
  file: <absolute path of the mockup, under <root>/.temp/viber/prototype/>
  mode: one | three                       (what the file holds before this round; narrow always carries three;
                                           every dispatch after a narrow carries one)
  round: create | revise | narrow
  variant: A | B | C                      (narrow only)
  brief:                                  (create only) the settled UI conclusions, multi-line
  remarks:                                (revise only) the user's change requests, multi-line
output, nothing else:
  VERDICT: PASS | FAIL | DENIED
  on PASS:   FILE: <absolute path>
             BASIS: design-system | code | brief
             VARIANT: <A|B|C> - <title> - <one-line trade-off>   (one line per variant the file holds after this round:
                                                                 A, B and C for three; A for a single proposal
                                                                 made as one; after a narrow, the chosen variant
                                                                 keeps its own label)
  on FAIL:   REASON: <one line>
  on DENIED: REASON: <refused tool name>: <the exact refused command, or the path for a file tool>
```

### C3 - Prototype line

File: none

```
Prototype: <absolute path of the mockup>
One line inside the conclusions prototype prints before invoking viber:intent,
and inside the confirmed summary intent hands to viber:planner.
```

### C4 - issue-facts.sh (existing, unchanged)

File: viber/scripts/issue-facts.sh

```
issue-facts.sh <N | #N | https://<host>/<owner>/<repo>/issues/<N>>
stdout (exit 0): NUMBER=<N>, URL=<url>, TITLE=, STATE=, AUTHOR=, LABELS=, COMMENTS=<count>,
                 "--- body ---", body lines, then per comment "--- comment <k> by <login> at <ISO> ---" + body
exit 1: one ERROR line on stderr (no gh, gh failed, no NUMBER= line); exit 2: bad argument
```

### C5 - post-comment.sh (existing, unchanged)

File: viber/scripts/post-comment.sh

```
post-comment.sh <issue ref> <comment file>
stdout (exit 0): COMMENT_URL=https://<host>/<owner>/<repo>/issues/<N>#issuecomment-<id>
exit 1: ERROR line, landing unknown, never retried; exit 2: bad arguments or missing file
```

### C6 - issues switch line (existing, unchanged)

File: viber/scripts/config.sh

```
config.sh stdout (preload), among the other keys:
  issues: <true|false>        (absent key -> false)
```
