---
source: C:/Projects/p2p2.claude/docs/_specs/2026-09-29-12-58-10_fast-path-a-small-change-with-no-plan-document/plan.md
---

To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Fast path: a small change with no plan document

## Goal

Give viber a middle road for a small, well-scoped change to existing code: `intent` shows a short design in chat, and the change is built only after the user's explicit "yes", with no plan file and no run directory. The road sits behind a new `viber.yml` switch, `fast-path`, on by default.

## Problem

Today a small change has two roads only. A direct change skips any design and any approval. The full road (`intent` -> `planner` -> `implementor`) writes a plan file and a run directory, runs a planner review and dispatches coders and reviewers. A change of one or two tasks pays the whole cost of the full road, or goes unreviewed and unapproved through the direct one.

## Current behaviour

`intent` sizes every scope into two branches: interviewed whole (30 tasks or fewer) or split into a roadmap. Both end in `## Done`: a confirmed summary handed to `viber:planner`. `intent` writes no code. The session manifest forbids code before an approved plan, except when the user explicitly asks for a direct change. `test-runner` is dispatched by `implementor` only. `config.sh` prints eight switches, and `switch-text.sh` accepts those eight plus `branching.mode`.

### Must not change

- With `fast-path` false or absent from `viber.yml`, `intent` behaves exactly as today.
- `config.sh` prints every existing key with the same value and in the same relative order.
- `bootstrap.sh`'s merge keeps every value a user already set.
- The full road (`planner`, `implementor`, the plan gate, plain plan mode) and the direct change road work as today.

## Roadmap

Part 2 of 4 - Fast path: a small change with no plan document

1. Edge cases in the plan (built)
2. Fast path: a small change with no plan document (this plan)
3. Baseline test run behind a switch in `viber.yml`
   - The switch lives in `viber.yml`.
   - With it on, the test runner runs once before the first task dispatch.
   - A red baseline asks continue or abort and records the pre-existing failures.
   - The final test run treats only new failures as repair work.
4. Full autonomy with a ruling register
   - The build decides conflicts, ambiguities and stalled tasks itself instead of asking.
   - Every such decision is recorded as a ruling with its reason and its cost if wrong.
   - The final summary lists every ruling.
   - `VERDICT: DENIED` stays a stop.
   - It consumes part 3's list of pre-existing failures.

## Behaviour

### S1 - A small change takes the fast path [NEW]

The interview sizes a change as small, asks only what is still open, then shows a short design in chat instead of a summary for the planner. After the user's explicit "yes" the session makes the change itself, has `test-runner` prove it, and closes on a one-line suggestion to commit.

Given `fast-path: true` and a change to existing code estimated at 2 tasks with code and 5 tasks in total at most
When the user runs `/viber:intent` for it and answers "yes" to the design
Then the change is made in the working tree, `test-runner` returns its verdict, no plan file and no run directory exist, and the session suggests `/viber:commit`

### S2 - The user corrects the design [NEW]

Given a fast-path design shown in chat
When the user answers with a correction
Then the session shows the revised design and asks again, building nothing yet

### S3 - The change outgrows the limits during the build [NEW]

Given a fast-path build in progress
When the work needs more than 2 tasks with code or more than 5 tasks in total
Then the session stops, names in one line what exceeded the limit, leaves the working tree as it is and suggests `/viber:intent`

### S4 - The user asks for a full plan [NEW]

Given a fast-path design shown in chat
When the user asks for a full plan instead
Then the interview closes as today: the spec shape proposal, the confirmed summary and the hand-off to `viber:planner`

### S5 - The switch is off [CHANGED - was: no switch existed]

Given `fast-path: false`, or no such key
When the user runs `/viber:intent` on any change
Then the interview runs exactly as before this change

### S6 - A run branch keeps a change on the full road [NEW]

Given `branching.mode` allowed or required and a start step that settled a work entry needing its own branch
When the interview sizes the change as small
Then the fast path is not offered and the interview continues into today's `## Done`

### Edge cases

- A change that introduces a new subsystem, a restructuring or a new domain concept, whatever its size -> the full road.
- A change estimated above 2 tasks with code or above 5 tasks in total -> the full road.
- A returning draft or a `roadmap.md` the user points at -> never the fast path.
- `branching.mode` allowed or required and the start step settled an entry needing its own branch -> the full road; "no branch" or "stay" -> the fast path stays open.
- A reply to the design that is neither an explicit "yes" nor a correction (a question, a hesitation) -> answered, the design asked again, nothing built.
- `test-runner` returns `VERDICT: FAIL` on the change -> the session repairs and dispatches `test-runner` again.
- `test-runner` returns `VERDICT: SKIP` -> one line saying no suite ran, then the commit suggestion.
- `test-runner` returns `VERDICT: DENIED` -> the refused call named, the session stops with no commit suggestion.

## Glossary

- fast path - `intent`'s third sizing branch: a short design approved in chat and built by the session itself; not a plan, not a direct change.
- task with code - an estimated plan task changing code, configuration, or text the host project's own instructions declare its product.
- task without code - an estimated plan task changing only documentation or comments, as the host project's instructions tell them apart; never a fixed list of files.
- explicit yes - a reply that approves the shown design and carries no correction.

## Acceptance criteria

1. With `fast-path: true`, `intent`'s sizing sends a change to the fast path only when it stays in existing code, adds no subsystem, restructuring or domain concept, and is estimated at 2 tasks with code and 5 tasks in total at most; every other change keeps today's road.
2. `intent` tells a task with code from a task without code by the host project's own instructions, never by a fixed list of files: documentation and comments are without code, configuration and host-declared product text are with code.
3. The fast path shows a short design in chat and builds only after an explicit yes, writing no plan file and no run directory; a correction brings a revised design and the question again; a request for a full plan continues into today's `## Done`.
4. After the yes, the session makes the change itself, then dispatches `test-runner` once with a report path under `.temp/viber/intent/`; a red result is repaired and `test-runner` dispatched again; `VERDICT: SKIP` is stated in one line.
5. A build outgrowing either limit stops, names in one line what exceeded it, leaves the working tree as it is and suggests `/viber:intent`.
6. A proven change (`PASS` or `SKIP`) closes on one line suggesting `/viber:commit`, and no commit is made.
7. The fast path is offered only under `branching.mode: off`, or when the start step settled "no branch" or "stay".
8. A new project gets the `fast-path` switch on, a project set up by an older version gains it on the next `/viber:setup` with its own values kept, a config without the key resolves it off, and with the switch off no fast-path text reaches `intent`.
9. The session manifest counts a fast-path design the user explicitly approved in chat as an approved plan.
10. `test-runner`'s description names `intent` as a caller besides `implementor`.
11. `viber/README.md` and `help.html` document the `fast-path` switch, count nine switches, and describe the fast path, and both flow diagrams show it.

## Scope

### File map

- modify - viber/scripts/config.sh - resolves and prints the `fast-path` switch
- modify - viber/scripts/switch-text.sh - accepts `fast-path` as a key
- modify - viber/skills/setup/templates/viber.yml - carries `fast-path: true` under its own comment
- modify - tests/viber/config.test.ts - proves the switch's resolution and print order
- modify - tests/viber/switch-text.test.ts - proves the fragment selection for the key
- modify - tests/viber/bootstrap.test.ts - fixtures and merge messages that enumerate every template key
- modify - tests/portability.test.ts - the switch-value map the fragment-call sweep checks against
- modify - viber/skills/intent/SKILL.md - preloads the fast-path fragment at the sizing step; its no-code line leaves room for an approved fast-path build
- add - viber/skills/intent/fragments/fast-path.true.md - the whole fast-path branch
- modify - viber/hooks/content/manifest.md - the plan rule's fast-path exception
- modify - viber/agents/test-runner.md - its description naming `intent` as a caller
- modify - viber/README.md - the switch row, the switch counts, and the fast path in the flow text
- modify - viber/skills/setup/assets/help.html - the switch entry, the intent card, the test-runner line and the guides
- modify - viber/skills/setup/assets/viber-flow-en.svg - the fast path in the English flow diagram
- modify - viber/skills/setup/assets/viber-flow-pl.svg - the fast path in the Polish flow diagram

### Out of scope

- The plan format and every parser (`plan-index.sh`, `plan-path.sh`, `commit-task.sh`, `archive-run.sh`, `run-branch.sh`).
- `planner`, `implementor`, the plan gate and plain plan mode.
- The direct change road.
- End-to-end tests.
- Every `CLAUDE.md` node, left to the build's memory close.
- Roadmap part 3: Baseline test run behind a switch in `viber.yml`.
- Roadmap part 4: Full autonomy with a ruling register.

## Constraints

- Stack-agnostic: no fragment line names an ecosystem, a test framework or a fixed file list.
- Switch doctrine: no skill body branches on the switch; its text reaches `intent` only through the `switch-text.sh` preload, placed where the text belongs.
- The limits (2 tasks with code, 5 in total) are fixed in the fragment text, not configurable.
- Every script keeps working under Git Bash on Windows and under macOS.

## Tasks

<!-- TASK -->
### T1 - Add the fast-path switch
- TDD: required
- Covers: #8, #11
- Uses: C1
- Depends-on: none
- Files: viber/scripts/config.sh, viber/scripts/switch-text.sh, viber/skills/setup/templates/viber.yml, tests/viber/config.test.ts, tests/viber/switch-text.test.ts, tests/viber/bootstrap.test.ts, tests/portability.test.ts, viber/README.md, viber/skills/setup/assets/help.html
- Delivers: the `fast-path` switch resolved by `config.sh`, accepted by `switch-text.sh`, seeded on by the template and merged into older configs, plus its README row, corrected switch counts and its `help.html` key entry in both languages.
- Verification: node --test tests/viber/config.test.ts tests/viber/switch-text.test.ts tests/viber/bootstrap.test.ts tests/viber/help.test.ts tests/portability.test.ts -> every test passes
- DoD: `config.sh` prints `fast-path: true` for a config holding `fast-path: true` in any letter case, and `fast-path: false` when the key is absent or holds any other value, proven in `tests/viber/config.test.ts`; the `fast-path` line prints directly after the `issues` line, proven in `tests/viber/config.test.ts`; `switch-text.sh fast-path <skill dir> fast-path` prints `fragments/fast-path.true.md` under `fast-path: true` and nothing under false, proven in `tests/viber/switch-text.test.ts`; the template carries `fast-path: true` and a config lacking it gains it on merge with every other value kept, proven in `tests/viber/bootstrap.test.ts`; the portability sweep's switch-value map lists `fast-path` with `true` and `false`; `help.html` holds an entry `id="key-fast-path"` with an English and a Polish description, proven by `tests/viber/help.test.ts`; `help.html`'s switch-count paragraph names seven of nine switches on, in English and Polish; `viber/README.md`'s switch table has a `fast-path` row marked on and its counts name nine switches
<!-- /TASK -->

<!-- TASK -->
### T2 - Route a small change through the fast path in intent
- TDD: none
- Covers: #1, #2, #3, #4, #5, #6, #7, #9, #10, #11
- Uses: C1, C2
- Depends-on: T1
- Files: viber/skills/intent/SKILL.md, viber/skills/intent/fragments/fast-path.true.md, viber/hooks/content/manifest.md, viber/agents/test-runner.md, viber/skills/setup/assets/help.html, viber/skills/setup/assets/viber-flow-en.svg, viber/skills/setup/assets/viber-flow-pl.svg, viber/README.md
- Delivers: `intent` preloading the fast-path fragment at the top of its sizing step, its no-code line scoped to leave room for an approved fast-path build; the fragment holding the whole branch (entry conditions and limits, design in chat, explicit yes, build by the session, `test-runner` proof, the stop on an outgrown limit, the commit suggestion, the branching condition and every edge case of the specification); the manifest's plan rule accepting an approved fast-path design; `test-runner`'s description naming `intent`; the fast path described for people in `help.html` (the `intent` card, the `test-runner` agent line, the "Add a feature" guide, the "Large requests, drafts and small plans" note and the planner troubleshooting answer, both languages), in both flow diagrams and in `viber/README.md`'s flow text.
- Verification: node --test tests/orphan-tags.test.ts tests/viber/session-start.test.ts tests/viber/help.test.ts && grep -n 'switch-text.sh" fast-path "${CLAUDE_SKILL_DIR}" fast-path' viber/skills/intent/SKILL.md && test -f viber/skills/intent/fragments/fast-path.true.md && grep -n 'viber:test-runner' viber/skills/intent/fragments/fast-path.true.md && grep -n '^description:.*intent' viber/agents/test-runner.md && grep -n 'viber:intent' viber/hooks/content/manifest.md && grep -n 'href="#key-fast-path"' viber/skills/setup/assets/help.html && grep -n '^fast-path:' viber/skills/setup/templates/viber.yml && grep -n 'fast-path' viber/skills/setup/assets/viber-flow-en.svg && grep -n 'fast-path' viber/skills/setup/assets/viber-flow-pl.svg -> every test passes and every grep prints a line
- DoD: `intent/SKILL.md` preloads `switch-text.sh fast-path "${CLAUDE_SKILL_DIR}" fast-path` at the top of `## Size the scope first`, before its first bullet; `intent/SKILL.md`'s no-code line leaves room for a build the user approved on the fast path, and the body carries no other fast-path text; the fragment states that the fast path skips the spec shape proposal and `## Done`; the fragment also covers the no-question path of `## Before the first question`: a small change the conversation and the code already settle goes to the chat design, not to `## Done`; the fragment states the entry conditions: existing code only, no new subsystem, restructuring or domain concept, at most 2 tasks with code and 5 in total; the fragment tells a task with code from one without by the host project's own instructions, naming documentation and comments as without code and configuration plus host-declared product text as with code, and lists no fixed file; the fragment keeps a returning draft and a `roadmap.md` off the fast path; the fragment offers the fast path only under `branching.mode` off or after the start step settled "no branch" or "stay"; the fragment shows a short design in chat and builds nothing before an explicit yes, writing no plan file and no run directory; the fragment answers a correction with a revised design and the question again, and any other non-yes reply with an answer and the question again; the fragment continues a request for a full plan into `## Done`; the fragment has the session make the change itself and then dispatch `test-runner` with a report path under `.temp/viber/intent/`; the fragment repairs a red result and dispatches `test-runner` again; the fragment states `VERDICT: SKIP` in one line; the fragment stops on `VERDICT: DENIED` naming the refused call, with no commit suggestion; the fragment stops a build outgrowing either limit, names what exceeded it in one line, leaves the tree as it is and suggests `/viber:intent`; the fragment closes a proven change on one line suggesting `/viber:commit` and makes no commit; the manifest's plan rule names `viber:intent`'s fast path and counts a design the user explicitly approved in chat as an approved plan; `test-runner.md`'s description names `intent` as a caller besides `implementor`; `help.html`'s `skill-intent` card describes the fast path and links `#key-fast-path`, in English and Polish; the `agent-test-runner` line names `intent`'s fast path as a caller, in English and Polish; the "Add a feature" guide's small-change note, the "Large requests, drafts and small plans" note and the planner troubleshooting answer name the fast path, in English and Polish; `viber-flow-en.svg` shows a fast-path exit from `/viber:intent` to a build in the session, labelled with the `fast-path` switch, and its description names it; `viber-flow-pl.svg` shows the same exit in Polish, labelled with the `fast-path` switch; `viber/README.md`'s flow text names the fast path and the `fast-path` switch
<!-- /TASK -->

## Contracts

### C1 - The fast-path switch

File: viber/scripts/config.sh, viber/scripts/switch-text.sh, viber/skills/setup/templates/viber.yml

```
viber.yml key : fast-path: true | false   (top-level, column 0; "default on" means the template seeds true)
config.sh     : fast-path: <true|false>   (printed directly after `issues:`; absent -> false)
switch-text.sh: key `fast-path`, values true | false
intent call   : "${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh" fast-path "${CLAUDE_SKILL_DIR}" fast-path
fragment      : viber/skills/intent/fragments/fast-path.true.md   (no .false.md)
help anchor   : id="key-fast-path"
```

### C2 - The fast path's test-runner dispatch

File: viber/agents/test-runner.md

```
dispatch : Agent, subagent_type viber:test-runner, no model
prompt   : one report path under .temp/viber/intent/
returns  : VERDICT: PASS
         | VERDICT: SKIP
         | VERDICT: FAIL + REPORT: <report path>
         | VERDICT: DENIED + REASON: <tool>: <call>
```
