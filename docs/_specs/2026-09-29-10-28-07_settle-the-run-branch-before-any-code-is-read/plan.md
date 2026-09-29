---
source: C:/Projects/p2p2.claude/docs/_specs/2026-09-29-10-28-07_settle-the-run-branch-before-any-code-is-read/plan.md
---

To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Settle the run branch before any code is read

## Goal

Under `branching.mode` `allowed` or `required`, `intent` and `fixer` settle the run's work entry and check that HEAD sits on that entry's base commit before they read any code, offering a switch to the base when it does not. The planner then takes the branch from their hand-off instead of asking after the plan is written, and a `required` run can no longer end up committing straight onto any entry's base.

## Problem

Today the branch is decided only in the planner, after the plan is written. Everything before it - the interview verified by `prover`, the `fixer` trace and its RED reproduction test, the plan's file map and contracts - reads whatever HEAD happens to be. When HEAD is on `develop` and the entry is `hotfix` (base `main`), the plan describes code the run branch will not hold, the RED test may prove a bug `main` does not have, and the uncommitted reproduction test makes the landing stop because the base is at another commit. Separately, under `required` the landing compares the run branch only with the chosen entry's base, so a run can stay on another entry's base (`develop` for a `hotfix`) and commit straight onto it.

## Current behaviour

The planner reads the branch situation of the written plan and asks one question: which entry (when several are usable), then create the entry's branch from its base, stay on the current branch when it is not that base, or (under `allowed`) no branch. It records the entry and the branch in the plan, and the landing puts HEAD on that branch before copying. `intent` and `fixer` never look at branches. Under `required`, the landing refuses only a run branch equal to the chosen entry's base, and with no branch recorded keeps any HEAD that is not that base.

### Must not change

- Under `branching.mode: off`, or with no `.claude/viber.yml`, `intent`, `fixer`, `planner` and the landing behave exactly as today and report no branch.
- Every line the planner's existing branch report prints keeps its format and order.
- Nothing is ever fetched, pushed, merged or deleted.
- Landing under `allowed` keeps its current branch rules.

## Behaviour

### S1 - The work entry is settled when the interview or diagnosis starts [NEW]

Under `allowed` or `required`, `intent` and `fixer` read the branch situation as their first step after resolving any issue, before reading code. The entry is taken without a question when the issue type maps to one or exactly one entry is usable; otherwise one question asks which entry, offering only usable entries. Under `allowed` that same question also offers "no branch".

Given `mode: required` with entries `feature` (base `develop`) and `hotfix` (base `main`) and no issue
When the user starts `/viber:fixer` with a bug report
Then `fixer` asks which entry the run uses before it traces anything

### S2 - HEAD away from the base commit is caught before exploration [NEW]

Given the chosen entry's base is `main` and HEAD is on `develop` at another commit
When the start step compares the commits
Then the user is asked to switch to `main` now, stay on `develop` consciously, or abort; the question names how far `main` is behind its remote when it is; on "switch", HEAD moves to `main` before any code is read

### S3 - "No branch" skips the check [NEW]

Given `mode: allowed`
When the user answers "no branch"
Then no commit comparison happens, the run stays on the current branch and the planner later records no branch without asking

### S4 - Staying is barred on any entry base under required [CHANGED - was: only the chosen entry's base was barred]

Given `mode: required`, HEAD on `develop` (base of `feature`) and the entry `hotfix`
When the start question is asked
Then "stay" is not offered; and a plan that still records `develop` as its branch is refused at landing, nothing landed

### S5 - The planner takes the branch from the hand-off [CHANGED - was: the planner asked the branch question after writing the plan]

Given the interview handed off the entry `hotfix`
When the planner writes the plan
Then it records `hotfix` and the entry's computed branch name without asking; after "stay" it records the branch the user stayed on; after "no branch" it records no branch; a fix round that changes the title recomputes the name the same way, never overriding "stay" or "no branch"

### S6 - A returning draft is checked against its recorded branch [NEW]

Given a draft that records the branch `hotfix/login-crash`
When `intent` resumes it while HEAD is elsewhere
Then no entry question is asked and the user is offered a switch to the recorded branch, staying, or abort

### S7 - The planner without a hand-off keeps its question [CHANGED - was: "stay" under required was offered on any branch but the chosen entry's base]

Given a conversation carrying no hand-off of the entry (an older one, or one lost to compaction) and `mode: required` with HEAD on another entry's base
When the planner asks its branch question
Then the question is asked as today, but "stay" is not offered, since the planner's branch report now says whether the current branch is an entry base

### S8 - Nothing changes with branching off [NEW]

Given `mode: off` or no configuration
When the user starts `intent` or `fixer`
Then neither says anything about branches, and the only new text in either skill is the lines loading the branch steps, which load nothing

### S9 - The documentation describes the new moment [CHANGED - was: the documentation said the plan offers the branch]

Given a user reading `viber/BRANCHING.md`, `viber/README.md` or the help page
When they look up `branching.mode`
Then they learn that the entry and the base check happen when the interview or diagnosis starts, that the planner takes the branch from that hand-off, and that under `required` no run commits onto any entry's base

### Edge cases

- The chosen base does not exist locally -> the question names it; "switch" is not offered, only stay (where allowed) or abort.
- Dirty tree and the base at another commit -> the switch is refused with the tree untouched, and the user is told to commit or stash first.
- Detached HEAD under `required` -> "stay" is not offered.
- The branch situation reports configuration errors -> they are shown, no entry is handed off, and the planner falls back to its own question.
- An entry whose name needs an issue number with no issue -> never offered and never picked automatically.

## Glossary

- start step - what `intent` and `fixer` do first under `allowed` or `required`: read the branch situation without a plan, settle the entry, check the base commit.
- at base - HEAD's commit equals the local base branch's commit; the branch name HEAD is on does not matter.
- entry base - the `base` of any valid `branching.work` entry.
- work hand-off - what `intent` and `fixer` pass on to the planner: the chosen entry or "no branch", and the branch the user chose to stay on.

## Acceptance criteria

1. `plan-path.sh --start` under `allowed` or `required` prints the start report without a plan and never moves HEAD, the index or the tree; under `off` or outside a git repository it prints only `mode: off`.
2. The start report's `suggested:` is the entry the issue type maps to when an issue URL is given and mappings exist, else the single usable entry, else `none`; an entry needing `{issue-number}` with no URL reads `usable: no`.
3. The start report's `at-base:` is `yes` only when HEAD's commit equals the entry's local base commit, and `current-is-base:` is `yes` only when the current branch is an entry base.
4. `plan-path.sh --checkout <branch>` puts HEAD on an existing local branch, and refuses with exit 6, HEAD, index and tree unchanged, a missing branch, an invalid name, or a switch to another commit on a dirty tree; it never creates a branch.
5. Under `required`, landing refuses with exit 6 a recorded or kept run branch equal to any entry base, and with no branch recorded and HEAD on another entry's base it creates the entry's branch from the entry base instead of keeping HEAD.
6. `plan-path.sh --branch` prints a `current-is-base:` line after `current:`.
7. Under `allowed` or `required`, `intent` and `fixer` run the start report before reading code, pick the entry automatically on a `suggested:` entry and otherwise ask once among usable entries (with "no branch" under `allowed`), ask switch, stay or abort on `at-base: no` naming a `behind:` count above 0, switch through `--checkout`, never offer "switch" on `base-exists: no`, never offer "stay" under `required` on `current-is-base: yes` or a detached HEAD, and hand off `Work:` and, after "stay", `Branch:`.
8. `intent` returning to a draft with a recorded branch asks no entry question and offers a switch when `current:` differs from it.
9. The planner given a `Work:` line asks no branch question and writes the plan's branch keys from the hand-off, a fix round included, never overriding `Branch:` or `Work: none`; without one it asks today's question, offering "stay" under `required` only on `current-is-base: no`.
10. Under `off` or with no configuration none of the new fragments prints anything: no `.off.md` file exists for them, and `intent` and `fixer` carry only the preload lines.
11. `viber/BRANCHING.md`, `viber/README.md` and `help.html` describe the start check, the hand-off and the `required` base rule.

## Scope

### File map

- modify - viber/scripts/run-branch.sh - the start report, the checkout, the any-entry-base rule under `required`, the `current-is-base` value
- modify - viber/scripts/plan-path.sh - the `--start` and `--checkout` forms and their header contract
- modify - tests/viber/plan-path.test.ts - cases for both new forms, the new report line and the `required` rule
- modify - viber/skills/intent/SKILL.md - the start and hand-off preloads and the `allowed-tools` pattern
- add - viber/skills/intent/fragments/branching-start.allowed.md - the start step under `allowed`
- add - viber/skills/intent/fragments/branching-start.required.md - the start step under `required`
- add - viber/skills/intent/fragments/branching-handoff.allowed.md - the hand-off lines in the summary under `allowed`
- add - viber/skills/intent/fragments/branching-handoff.required.md - the same under `required`
- modify - viber/skills/fixer/SKILL.md - the start and hand-off preloads and the `allowed-tools` pattern
- add - viber/skills/fixer/fragments/branching-start.allowed.md - the start step under `allowed`
- add - viber/skills/fixer/fragments/branching-start.required.md - the start step under `required`
- add - viber/skills/fixer/fragments/branching-handoff.allowed.md - the hand-off lines in the diagnosis under `allowed`
- add - viber/skills/fixer/fragments/branching-handoff.required.md - the same under `required`
- modify - viber/skills/planner/fragments/branching.allowed.md - taking the branch from the hand-off
- modify - viber/skills/planner/fragments/branching.required.md - the same, plus the stay rule
- modify - viber/skills/planner/fragments/branching-fix.allowed.md - re-deriving the branch after a fix with no question
- modify - viber/skills/planner/fragments/branching-fix.required.md - the same
- modify - viber/BRANCHING.md - the start check, the hand-off, the `required` base rule
- modify - viber/README.md - the `mode` sentence, whose "the plan offers a branch" would otherwise become false
- modify - viber/skills/setup/assets/help.html - `intent`, `fixer` and `planner` cards, the `branching.mode` entry, the run-branch troubleshooting entry

### Out of scope

- `prototype`, `triage`, and Claude Code's plain plan mode without `intent`.
- Fetching, pushing, pull requests.
- The `branching.work` schema: no new key.
- `CLAUDE.md` nodes and `.claude/rules/` (the build's close owns them).

## Constraints

- Every script runs under Git Bash on Windows and bash 3.2 on macOS.
- Every skill-side script call is pre-approved in that skill's own `allowed-tools`.
- `intent` asks in prose, never through a question dialog.
- Branch text loads only under `allowed` or `required`, at the place in each skill where it applies.

## Tasks

<!-- TASK -->
### T1 - Add the plan-less start report
- TDD: required
- Covers: #1, #2, #3, #6
- Uses: C1, C3
- Depends-on: none
- Files: viber/scripts/run-branch.sh, viber/scripts/plan-path.sh, tests/viber/plan-path.test.ts
- Delivers: `plan-path.sh --start [<issue URL>]` printing the start report exactly as C1 declares, read-only, built from the same `config.sh --branching` lines, issue type lookup and `base_behind` the `--branch` report already uses, plus the `current-is-base:` line C3 adds to the `--branch` report, with the header contract documenting both.
- Verification: `node --test --test-name-pattern "start report|current-is-base" tests/viber/plan-path.test.ts` -> every case passes, at least one per DoD clause
- DoD: under `allowed` and `required` the start report prints every C1 line with no plan argument; HEAD, the index and `git status --porcelain` are unchanged after it runs; under `off` and outside a git repository it prints only `mode: off`; `suggested:` is the mapped entry for an issue URL whose stubbed type is mapped, the single usable entry without one, and `none` with several usable entries; an entry whose name holds `{issue-number}` reads `usable: no` without a URL; `at-base:` is `yes` on a branch at the base commit under another name and `no` on a branch one commit ahead; `current-is-base:` is `yes` on another entry's base and `no` when detached; an argument that is not an issue URL exits 2; `--branch` prints `current-is-base:` directly after `current:`, `yes` on an entry base and `no` elsewhere, every other line unchanged
<!-- /TASK -->

<!-- TASK -->
### T2 - Add the existing-branch checkout
- TDD: required
- Covers: #4
- Uses: C2
- Depends-on: T1
- Files: viber/scripts/run-branch.sh, viber/scripts/plan-path.sh, tests/viber/plan-path.test.ts
- Delivers: `plan-path.sh --checkout <branch>` as C2 declares, sharing the dirty-tree and branch-name checks the landing already applies, with the header contract documenting the form.
- Verification: `node --test --test-name-pattern "checkout form" tests/viber/plan-path.test.ts` -> every case passes, at least one per DoD clause
- DoD: an existing local branch at another commit on a clean tree becomes HEAD and stdout reads `branch: <name> (switched)`; the current branch reads `(kept)`; a name with no local branch exits 6 and creates nothing; an invalid name, including `@{-1}`, exits 6; a dirty tree with the branch at another commit exits 6 with HEAD, index and tree unchanged; a dirty tree with the branch at the same commit switches and carries the changes along; a missing argument exits 2
<!-- /TASK -->

<!-- TASK -->
### T3 - Refuse any entry base as the run branch under required
- TDD: required
- Covers: #5
- Uses: C4
- Depends-on: T2
- Files: viber/scripts/run-branch.sh, viber/scripts/plan-path.sh, tests/viber/plan-path.test.ts
- Delivers: the `required` landing rule with the C4 message, the header contract updated; existing cases asserting the old message move to the new one.
- Verification: `node --test tests/viber/plan-path.test.ts` -> every case passes, including the ones named "entry base under required"
- DoD: under `required` a plan recording `branch:` equal to another entry's base exits 6 with the C4 message and lands nothing; under `required` with no branch recorded and HEAD on another entry's base the landing creates the entry's pattern branch from the entry base; under `required` with no branch recorded and HEAD on a branch that is no entry base that branch is kept; under `allowed` a plan recording another entry's base still lands on it
<!-- /TASK -->

<!-- TASK -->
### T4 - Settle the run branch at the start of intent and fixer
- TDD: none
- Covers: #7, #8, #10, #11
- Uses: C1, C2, C4, C5
- Depends-on: T3
- Files: viber/skills/intent/SKILL.md, viber/skills/intent/fragments/branching-start.allowed.md, viber/skills/intent/fragments/branching-start.required.md, viber/skills/intent/fragments/branching-handoff.allowed.md, viber/skills/intent/fragments/branching-handoff.required.md, viber/skills/fixer/SKILL.md, viber/skills/fixer/fragments/branching-start.allowed.md, viber/skills/fixer/fragments/branching-start.required.md, viber/skills/fixer/fragments/branching-handoff.allowed.md, viber/skills/fixer/fragments/branching-handoff.required.md, viber/BRANCHING.md, viber/README.md, viber/skills/setup/assets/help.html
- Delivers: in each skill a `switch-text.sh branching.""mode "${CLAUDE_SKILL_DIR}" branching-start` preload directly after its issue preload and before any code is read, and a `branching-handoff` preload where the hand-off is written (`intent`'s `## Done`, `fixer`'s diagnosis payload), plus `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/plan-path.sh:*)` in each `allowed-tools`; start fragments stating S1 to S4, S6 and the edge cases (prose questions in `intent`); hand-off fragments carrying the C5 lines; `BRANCHING.md`, `README.md` and `help.html` (`intent` and `fixer` cards, the `branching.mode` entry, the `ts-branch` entry, both languages) describing S9.
- Verification: `grep -l -- "--start" viber/skills/intent/fragments/branching-start.allowed.md viber/skills/intent/fragments/branching-start.required.md viber/skills/fixer/fragments/branching-start.allowed.md viber/skills/fixer/fragments/branching-start.required.md viber/scripts/plan-path.sh` lists all five files, `grep -c "current-is-base" viber/skills/fixer/fragments/branching-start.required.md viber/skills/intent/fragments/branching-start.required.md viber/scripts/run-branch.sh` counts at least 1 in each, `grep -c "base-exists" viber/skills/intent/fragments/branching-start.allowed.md viber/scripts/run-branch.sh` counts at least 1 in each, and `node --test tests/portability.test.ts tests/viber/help.test.ts` passes
- DoD: each of the four start fragments names `plan-path.sh" --start` and `plan-path.sh" --checkout`, both defined in `viber/scripts/plan-path.sh`; each start fragment takes the entry without a question on a `suggested:` entry; each start fragment otherwise asks one entry question offering only `usable: yes` entries; both `.allowed.md` start fragments add "no branch" to that question and skip the base check for it; each start fragment asks switch, stay or abort on `at-base: no`, naming the `behind:` count when it is above 0; each start fragment runs `--checkout` of the base on "switch"; each start fragment withholds "switch" on `base-exists: no`; both `.required.md` start fragments withhold "stay" on `current-is-base: yes` and on `current: detached`; both `intent` start fragments, on a returning draft with a recorded `branch:`, ask no entry question and offer switch, stay or abort when `current:` differs from it; each hand-off fragment carries `Work:` and, after "stay", `Branch:` as C5 declares; no `branching-start.off.md` or `branching-handoff.off.md` exists in either skill; `intent/SKILL.md` and `fixer/SKILL.md` each carry exactly one `branching-start` and one `branching-handoff` preload line and the `plan-path.sh` pattern in `allowed-tools`; `BRANCHING.md` describes the start check, the hand-off and the `required` any-entry-base rule; `README.md`'s `mode` sentence says the entry is settled when the interview or diagnosis starts; `help.html`'s `intent` and `fixer` cards name the start check in both languages; `help.html`'s `branching.mode` entry describes the start check and the `required` base rule in both languages; `help.html`'s `ts-branch` entry names the refusal of an entry base under `required` in both languages; `tests/portability.test.ts` and `tests/viber/help.test.ts` pass
<!-- /TASK -->

<!-- TASK -->
### T5 - Take the run branch from the hand-off in the planner
- TDD: none
- Covers: #9, #11
- Uses: C3, C5
- Depends-on: T4
- Files: viber/skills/planner/fragments/branching.allowed.md, viber/skills/planner/fragments/branching.required.md, viber/skills/planner/fragments/branching-fix.allowed.md, viber/skills/planner/fragments/branching-fix.required.md, viber/skills/setup/assets/help.html
- Delivers: planner fragments handling S5 and S7: on a `Work:` line no question, `work:` from it and `branch:` from `Branch:`, else from the `--branch` report's `new:` for that entry; on `Work: none` `branch: none` and no `work:` key; a `Work:` entry whose `new:` reads `-` falls back to today's question; without a `Work:` line today's question with the `required` stay rule read from `current-is-base:`; fix fragments recomputing `branch:` from a re-run report without a question under the same precedence; the `planner` card in `help.html` (both languages) saying the branch comes from the interview or diagnosis.
- Verification: `grep -c "current-is-base" viber/skills/planner/fragments/branching.required.md viber/scripts/run-branch.sh` counts at least 1 in each, `grep -l "Work:" viber/skills/planner/fragments/branching.allowed.md viber/skills/planner/fragments/branching.required.md viber/skills/planner/fragments/branching-fix.allowed.md viber/skills/planner/fragments/branching-fix.required.md` lists all four, and `node --test tests/portability.test.ts tests/viber/help.test.ts` passes
- DoD: both `branching.*` fragments ask nothing on a `Work:` line and write `work:` and `branch:` from it; `Work: none` writes `branch: none` and no `work:` key in the `.allowed.md` fragment; a `Branch:` line wins over the report's `new:`; a `Work:` entry whose `new:` is `-` falls back to the question; without a `Work:` line both fragments keep today's question; `branching.required.md` offers "stay" only on `current-is-base: no`; both `branching-fix.*` fragments recompute `branch:` from the report without a question when the input carries `Work:`, leaving a `Branch:` or `Work: none` choice standing; the `planner` card in `help.html` says the branch comes from the interview or diagnosis in both languages; `tests/portability.test.ts` and `tests/viber/help.test.ts` pass
<!-- /TASK -->

## Contracts

### C1 - start report

File: viber/scripts/plan-path.sh, viber/scripts/run-branch.sh

```
argv: --start [<issue URL ending in /issues/<n>>]
stdout, mode allowed | required inside a git repository:
  mode: allowed | required
  issue-type: <type> | none
  suggested: <entry key> | none
  entry: <key> | base: <branch> | target: <branch> | usable: yes|no | base-exists: yes|no | at-base: yes|no | behind: <n>|unknown
  current: <branch> | detached
  current-is-base: yes | no
  dirty: yes | no
  error: <reason>            (zero or more: every config.sh --branching error, then
                              "issue <n> has no issue type" or
                              "issue type <type> is not in branching.issue-type-mappings")
stdout, mode off or outside a git repository:
  mode: off
exit: 0; 2 when the argument is not an issue URL
```

### C2 - checkout form

File: viber/scripts/plan-path.sh, viber/scripts/run-branch.sh

```
argv: --checkout <branch>
stdout on success: branch: <branch> (switched | kept)
exit: 0; 2 on a missing argument;
      6 with the reason on stderr, HEAD, index and tree unchanged:
        error: invalid branch name: <branch>
        error: branch <branch> does not exist locally - nothing is fetched, create it first
        error: uncommitted changes and <branch> is at another commit - commit or stash them first
        error: not a git repository
never creates a branch, never fetches
```

### C3 - current-is-base in the branch report

File: viber/scripts/plan-path.sh, viber/scripts/run-branch.sh

```
plan-path.sh --branch <plan>, one added line directly after "current:":
  current-is-base: yes | no
```

### C4 - required base refusal

File: viber/scripts/plan-path.sh, viber/scripts/run-branch.sh

```
plan-path.sh --land, exit 6 under required when the run branch is any entry base:
  error: branching is required and the run branch is a work entry base: <branch>
```

### C5 - work hand-off

File: none

```
Work: <entry key> | none
Branch: <branch name>        (only after the user chose to stay on the current branch)
```
