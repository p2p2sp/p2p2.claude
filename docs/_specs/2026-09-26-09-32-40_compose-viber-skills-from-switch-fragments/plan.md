---
source: /Users/dario/Projects/p2p2.claude/docs/_specs/2026-09-26-09-32-40_compose-viber-skills-from-switch-fragments/plan.md
---

To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Compose viber skills from switch fragments

## Goal

Six viber skills carry branches on the `.claude/viber.yml` switches, so the model reads and tracks the instructions of features the project turned off, which costs tokens and invites drift. Each switch-dependent passage moves into a markdown fragment file, one per state that does something, and a bundled script preloads only the fragment matching the resolved switch value, so a loaded skill holds only the instructions of its active configuration.

## Acceptance criteria

1. None of `intent`, `fixer`, `triage`, `prototype`, `planner` and `implementor` keeps a sentence conditioned on a switch value (`issues`, `adr`, `qa`, `memory`, `rules`, `cleanup`, `branching.mode`) in its `SKILL.md` body.
2. The text for the enabled state, and for the disabled state wherever today's disabled branch does something rather than only skip, lives in existing markdown files under the skill's `fragments/` directory; the script only selects which file to print, never composes the text.
3. Behaviour under every switch combination is the same as today: with a switch off, the loaded skill carries none of that switch's enabled instructions, and every step it carried before still happens under the same condition.
4. The script has its own suite under `tests/viber/`, and a static sweep in `tests/portability.test.ts` fails when a skill calls a fragment with no file behind it, names an unknown key, or when a fragment file is called by no skill.

## Scope

### File map

- add - viber/scripts/switch-text.sh - prints the fragment file matching a key's resolved value
- add - tests/viber/switch-text.test.ts - the script's contract suite
- modify - tests/portability.test.ts - the fragment sweep and its self-checks
- modify - viber/skills/intent/SKILL.md - body without issue branches, preloads its fragments, drops the `config.sh` preload
- add - viber/skills/intent/fragments/issues-input.true.md - file-writing scope, script-line rule and argument handling
- add - viber/skills/intent/fragments/issues-input.false.md - file-writing scope, script-line rule and argument handling
- add - viber/skills/intent/fragments/issues-done.true.md - what follows a confirmed summary
- add - viber/skills/intent/fragments/issues-done.false.md - what follows a confirmed summary
- modify - viber/skills/fixer/SKILL.md - body without issue branches, preloads its fragments, drops the `config.sh` preload
- add - viber/skills/fixer/fragments/issues-report.true.md - resolving the report
- add - viber/skills/fixer/fragments/issues-report.false.md - resolving the report
- add - viber/skills/fixer/fragments/issues-diagnosis.true.md - the diagnosis `Issue` part
- modify - viber/skills/triage/SKILL.md - body without issue branches, preloads its fragments, drops the `config.sh` preload
- add - viber/skills/triage/fragments/issues-read.true.md - tools, file scope and reading the issue argument
- add - viber/skills/triage/fragments/issues-read.false.md - tools, file scope and reading the issue argument
- add - viber/skills/triage/fragments/issues-next.true.md - the next-step line forms
- add - viber/skills/triage/fragments/issues-next.false.md - the next-step line forms
- add - viber/skills/triage/fragments/issues-publish.true.md - the publish step
- modify - viber/skills/prototype/SKILL.md - body without issue branches, preloads its fragments, drops the `config.sh` preload
- add - viber/skills/prototype/fragments/issues-input.true.md - file scope, tools and argument handling
- add - viber/skills/prototype/fragments/issues-input.false.md - file scope, tools and argument handling
- add - viber/skills/prototype/fragments/issues-exit.true.md - exit question and the comment step
- add - viber/skills/prototype/fragments/issues-exit.false.md - exit question and the comment step
- modify - viber/skills/planner/SKILL.md - body without adr, branching and qa branches, preloads its fragments
- add - viber/skills/planner/fragments/adr.true.md - the ADR-task reading step
- add - viber/skills/planner/fragments/branching.allowed.md - the branch question
- add - viber/skills/planner/fragments/branching.required.md - the branch question
- add - viber/skills/planner/fragments/qa-e2e.true.md - the end-to-end hand-off line
- add - viber/skills/planner/fragments/qa-e2e.false.md - the end-to-end hand-off line
- modify - viber/skills/implementor/SKILL.md - body without close-switch branches, preloads its fragments
- add - viber/skills/implementor/fragments/memory.true.md - the close parts
- add - viber/skills/implementor/fragments/rules.true.md - the close parts
- add - viber/skills/implementor/fragments/qa.true.md - the close parts
- add - viber/skills/implementor/fragments/cleanup.true.md - the close parts

### Out of scope

- `e2e` and every agent.
- The `Memory-owned` rule in `viber/references/plan-rules.md`, and the `memory:` dispatch line to `planner-review`.
- Frontmatter: `argument-hint` and `description` stay as they are.
- Token measurement and tests of skill content.
- `config.sh` and the switch set in `viber.yml`.
## Tasks

<!-- TASK -->
### T1 - Print the fragment matching a switch value
- TDD: required
- Covers: #2, #4
- Uses: C1
- Depends-on: none
- Files: viber/scripts/switch-text.sh, tests/viber/switch-text.test.ts
- Delivers: a bundled preload script that resolves one key through `config.sh`, prints the matching fragment file with its two root placeholders expanded, prints nothing when there is no such file, and always exits 0; a header comment carrying its `Contract:` block; mode 100755 in the git index.
- Verification: node --test tests/viber/switch-text.test.ts -> every test passes; git ls-files -s viber/scripts/switch-text.sh -> mode 100755
- DoD: a true switch prints its `.true.md` file; a false or absent switch prints its `.false.md` file; `branching.mode` prints the file named by its mode; a missing fragment file, an unknown key, a name holding `/` or `..` or a missing argument prints nothing and exits 0; a session started in a subdirectory resolves the repository's config; every `${CLAUDE_SKILL_DIR}` and `${CLAUDE_PLUGIN_ROOT}` in the fragment is replaced by the derived path; the index records mode 100755
<!-- /TASK -->

<!-- TASK -->
### T2 - Compose intent from issue fragments
- TDD: none
- Covers: #1, #2, #3
- Uses: C1
- Depends-on: T1
- Files: viber/skills/intent/SKILL.md, viber/skills/intent/fragments/issues-input.true.md, viber/skills/intent/fragments/issues-input.false.md, viber/skills/intent/fragments/issues-done.true.md, viber/skills/intent/fragments/issues-done.false.md
- Delivers: `intent` whose issue passages (the issue-file writing scope and script-line rule, the Issues switch section, the confirmation branches, the what-next question, the `Issue:` hand-off line) live in the four fragments, preloaded where the passages stood; the `config.sh` preload and its `allowed-tools` pattern replaced by the `switch-text.sh` pattern.
- Verification: grep -c 'scripts/switch-text.sh' viber/skills/intent/SKILL.md && test -x viber/scripts/switch-text.sh && test -f viber/skills/intent/fragments/issues-input.true.md && test -f viber/skills/intent/fragments/issues-input.false.md && test -f viber/skills/intent/fragments/issues-done.true.md && test -f viber/skills/intent/fragments/issues-done.false.md && ! grep -nE 'issues: (true|false)|scripts/config\.sh' viber/skills/intent/SKILL.md -> a count of at least 3, the script and every fragment file present, no match
- DoD: the body names no `issues` value; under `issues: false` the loaded skill says in one line that issue handling is off, treats an issue-shaped argument as input text and hands off on confirmation; under `issues: true` the fetch, save, comment, what-next and `Issue:` line behave as today; `allowed-tools` pre-approves `switch-text.sh` and no longer `config.sh`
<!-- /TASK -->

<!-- TASK -->
### T3 - Compose fixer from issue fragments
- TDD: none
- Covers: #1, #2, #3
- Uses: C1
- Depends-on: T1
- Files: viber/skills/fixer/SKILL.md, viber/skills/fixer/fragments/issues-report.true.md, viber/skills/fixer/fragments/issues-report.false.md, viber/skills/fixer/fragments/issues-diagnosis.true.md
- Delivers: `fixer` whose report resolution and diagnosis `Issue` part live in the three fragments, preloaded where they stood; the hand-off restates every diagnosis part without a fixed count; the `config.sh` preload and its pattern replaced by the `switch-text.sh` pattern.
- Verification: grep -c 'scripts/switch-text.sh' viber/skills/fixer/SKILL.md && test -x viber/scripts/switch-text.sh && test -f viber/skills/fixer/fragments/issues-report.true.md && test -f viber/skills/fixer/fragments/issues-report.false.md && test -f viber/skills/fixer/fragments/issues-diagnosis.true.md && ! grep -nE 'issues: (true|false)|scripts/config\.sh' viber/skills/fixer/SKILL.md -> a count of at least 3, the script and every fragment file present, no match
- DoD: the body names no `issues` value; under `issues: false` the argument is the bug report as plain text and the diagnosis carries no `Issue` part; under `issues: true` an issue-shaped argument is fetched and the `Issue` line handed off as today; `allowed-tools` pre-approves `switch-text.sh` and no longer `config.sh`
<!-- /TASK -->

<!-- TASK -->
### T4 - Compose triage from issue fragments
- TDD: none
- Covers: #1, #2, #3
- Uses: C1
- Depends-on: T1
- Files: viber/skills/triage/SKILL.md, viber/skills/triage/fragments/issues-read.true.md, viber/skills/triage/fragments/issues-read.false.md, viber/skills/triage/fragments/issues-next.true.md, viber/skills/triage/fragments/issues-next.false.md, viber/skills/triage/fragments/issues-publish.true.md
- Delivers: `triage` whose tool and file scope, issue-argument reading, next-step line forms and publish step live in the five fragments, preloaded where they stood; the `config.sh` preload and its pattern replaced by the `switch-text.sh` pattern.
- Verification: grep -c 'scripts/switch-text.sh' viber/skills/triage/SKILL.md && test -x viber/scripts/switch-text.sh && test -f viber/skills/triage/fragments/issues-read.true.md && test -f viber/skills/triage/fragments/issues-read.false.md && test -f viber/skills/triage/fragments/issues-next.true.md && test -f viber/skills/triage/fragments/issues-next.false.md && test -f viber/skills/triage/fragments/issues-publish.true.md && ! grep -nE 'issues: (true|false)|scripts/config\.sh' viber/skills/triage/SKILL.md -> a count of at least 4, the script and every fragment file present, no match
- DoD: the body names no `issues` value; under `issues: false` an issue-shaped argument gets the issue-handling-off answer and a request for pasted text, the next step is named by a one-line summary and nothing is published; under `issues: true` fetching, `#<N>` next steps and publishing behave as today; `allowed-tools` pre-approves `switch-text.sh` and no longer `config.sh`
<!-- /TASK -->

<!-- TASK -->
### T5 - Compose prototype from issue fragments
- TDD: none
- Covers: #1, #2, #3
- Uses: C1
- Depends-on: T1
- Files: viber/skills/prototype/SKILL.md, viber/skills/prototype/fragments/issues-input.true.md, viber/skills/prototype/fragments/issues-input.false.md, viber/skills/prototype/fragments/issues-exit.true.md, viber/skills/prototype/fragments/issues-exit.false.md
- Delivers: `prototype` whose comment-file scope, Issues switch step, exit question and comment step live in the four fragments, preloaded where they stood; the `config.sh` preload and its pattern replaced by the `switch-text.sh` pattern.
- Verification: grep -c 'scripts/switch-text.sh' viber/skills/prototype/SKILL.md && test -x viber/scripts/switch-text.sh && test -f viber/skills/prototype/fragments/issues-input.true.md && test -f viber/skills/prototype/fragments/issues-input.false.md && test -f viber/skills/prototype/fragments/issues-exit.true.md && test -f viber/skills/prototype/fragments/issues-exit.false.md && ! grep -nE 'issues: (true|false)|scripts/config\.sh' viber/skills/prototype/SKILL.md -> a count of at least 3, the script and every fragment file present, no match
- DoD: the body names no `issues` value; under `issues: false` an issue-shaped argument is input text and the exit question offers intent or stop; under `issues: true` fetching, the comment exit and the intent hand-off argument behave as today; `allowed-tools` pre-approves `switch-text.sh` and no longer `config.sh`
<!-- /TASK -->

<!-- TASK -->
### T6 - Compose planner from switch fragments
- TDD: none
- Covers: #1, #2, #3
- Uses: C1
- Depends-on: T1
- Files: viber/skills/planner/SKILL.md, viber/skills/planner/fragments/adr.true.md, viber/skills/planner/fragments/branching.allowed.md, viber/skills/planner/fragments/branching.required.md, viber/skills/planner/fragments/qa-e2e.true.md, viber/skills/planner/fragments/qa-e2e.false.md
- Delivers: `planner` whose ADR-task step, branch question and end-to-end hand-off line live in the five fragments, preloaded where they stood; the review-round and landing sentences about the run branch conditioned on the plan's recorded `work:` / `branch:` keys or the script's printed lines rather than on the switch; the `config.sh` preload kept for the `memory:` dispatch line, plus the `switch-text.sh` pattern.
- Verification: grep -c 'scripts/switch-text.sh' viber/skills/planner/SKILL.md && test -x viber/scripts/switch-text.sh && test -f viber/skills/planner/fragments/adr.true.md && test -f viber/skills/planner/fragments/branching.allowed.md && test -f viber/skills/planner/fragments/branching.required.md && test -f viber/skills/planner/fragments/qa-e2e.true.md && test -f viber/skills/planner/fragments/qa-e2e.false.md && ! grep -nE '(adr|qa): (true|false)|branching\.mode|mode: (off|allowed|required)' viber/skills/planner/SKILL.md -> a count of at least 4, the script and every fragment file present, no match
- DoD: the body names no `adr`, `qa` or `branching.mode` value; under `adr: false` no ADR-task reading step is loaded and under `true` it is; under `branching.mode: off` no branch question is loaded, under `allowed` it offers the no-branch answer and under `required` it does not offer it; the end-to-end hand-off line names the `qa: true` requirement only under `qa: false`; the `memory:` line still reaches `planner-review`
<!-- /TASK -->

<!-- TASK -->
### T7 - Compose implementor close from switch fragments
- TDD: none
- Covers: #1, #2, #3
- Uses: C1
- Depends-on: T1
- Files: viber/skills/implementor/SKILL.md, viber/skills/implementor/fragments/memory.true.md, viber/skills/implementor/fragments/rules.true.md, viber/skills/implementor/fragments/qa.true.md, viber/skills/implementor/fragments/cleanup.true.md
- Delivers: `implementor` whose memory-writer dispatch with its audit and node-writer waves, rules-writer dispatch, qa-writer dispatch with its `--qa` commit and summary line, and closeout dispatch live in the four fragments, preloaded in steps 6 and 7; step 3's task-list entries named as one per close part loaded in steps 6 and 7, and step 6's `closed:` skip keyed to those parts, neither restating a switch value; step 1's `branch:` line described without the switch; the `config.sh` preload kept for the tiers, plus the `switch-text.sh` pattern.
- Verification: grep -c 'scripts/switch-text.sh' viber/skills/implementor/SKILL.md && test -x viber/scripts/switch-text.sh && test -f viber/skills/implementor/fragments/memory.true.md && test -f viber/skills/implementor/fragments/rules.true.md && test -f viber/skills/implementor/fragments/qa.true.md && test -f viber/skills/implementor/fragments/cleanup.true.md && ! grep -nE '(memory|rules|qa|cleanup): true|branching\.mode' viber/skills/implementor/SKILL.md -> a count of at least 5, the script and every fragment file present, no match
- DoD: the body names no close-switch value and no `branching.mode`; every close switch off loads no close dispatch and opens no close entry in the task list; each switch on loads its part and opens its entry as today; memory and rule paths still land in one `--chore` commit after every writer of step 6 returned; the tiers clamp still reads `tiers.min` and `tiers.max`
<!-- /TASK -->

<!-- TASK -->
### T8 - Sweep skill fragment calls
- TDD: required
- Covers: #4
- Uses: C1
- Depends-on: T1, T2, T3, T4, T5, T6, T7
- Files: tests/portability.test.ts
- Delivers: a pure detector over every `SKILL.md` and every file under `<plugin>/skills/*/fragments/`, with a self-check per violation kind, and a real-tree test running it; the exec-bit sweep's corpus widened to the fragment files, since the issue script calls now live only there.
- Verification: node --test tests/portability.test.ts -> every test passes, the new self-checks and the fragment sweep among them
- DoD: a `switch-text.sh` call whose name has no fragment file for any valid value of its key is a violation; a call naming a key outside the switches and `branching.mode` is a violation; a fragment file whose value suffix is not valid for the key its calls name is a violation; a fragment file no `SKILL.md` of its own skill calls is a violation; a script invoked bare only from a fragment file and staged 100644 is an exec-bit violation; the real tree yields no violation
<!-- /TASK -->

## Contracts

### C1 - switch-text.sh

File: viber/scripts/switch-text.sh

```
call    : "${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh" <key> "${CLAUDE_SKILL_DIR}" <name>
          one fenced ```! block per call, placed where the text belongs in the body
allow   : Bash(${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh:*)   in the calling skill's allowed-tools
key     : adr | memory | rules | qa | cleanup | plain-plan-review | issues   -> value true | false
          branching.mode                                                     -> value off | allowed | required
          the value is the one config.sh prints for that key
name    : [a-z0-9-]+
file    : <skill dir>/fragments/<name>.<value>.md
stdout  : that file's content, every literal ${CLAUDE_SKILL_DIR} replaced by <skill dir>
          and every literal ${CLAUDE_PLUGIN_ROOT} by <skill dir> without its last two
          path segments (separator / or \); nothing when the file is absent, the key
          unknown, the name not matching its pattern or an argument missing
exit    : always 0
```
