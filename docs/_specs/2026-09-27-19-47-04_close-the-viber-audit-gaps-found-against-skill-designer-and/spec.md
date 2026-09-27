To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Close the viber audit gaps found against skill-designer and tuner

## Goal

Close the gaps an audit of viber's skills and agents found against the `skill-designer` and `tuner` doctrine, each one checked against the Claude Code documentation and the model system cards. The contracts between skills and agents stop losing input, the plan review stops judging a plan only against itself, and the prompts stop leaving known model weaknesses open.

## Problem

- `/viber:e2e` resolves test accounts, sometimes from the user's own answer, but never hands them to the writer, which then cannot sign in and never says why.
- The plan reviewer sees only the plan, so a criterion lost between the interview and the plan passes unseen; both plan reviewers are told to read "enough of the codebase", a loose instruction on which Opus 5.5 under-explores.
- The bug-fixing skill trusts a fetched issue's text without marking it as data.
- The planner and the bug-fixing skill run at the session's effort, which on Opus 5.5 ignores the user's settings-file effort level and stays at medium.
- The memory, rules and planner skills have no answer to an agent that ends its turn with text instead of its result, and the longest memory agent is not told that such a turn ends its run.
- Parallel coders are forbidden to move the tree but get no safe way to compare with the committed state or to keep a copy of their work, and nothing says a stash of their own files is unsafe too.
- The build skips review for a haiku task proven only by the tests the same coder wrote, the case the Haiku 4.5 system card names; a stalled task's ruling is not bound to the user's own words.
- Three contract paragraphs pack many conditional rules into one paragraph, the setup skill hard-wraps its paragraphs, and two skills repeat a rule.

## Current behaviour

Every item above behaves as described under Problem; the rest of viber works as released in 0.69.0.

### Must not change

- Every existing output line of every agent and every existing labelled dispatch line keep their names and meaning; this plan only adds lines.
- The plan gate allows and denies exactly the transcripts it does today; only the wording of its instruction to dispatch the plan reviewer changes.
- A coder still removes a file with `git rm -r -q`, its one git write.
- A rule rewritten one rule per line keeps its exact words.

## Behaviour

### S1 - The end-to-end writer signs in with the accounts the user gave [CHANGED - was: accounts from the user's answer never reached the writer]

The user answers the end-to-end command's question about test accounts; each scenario's writer receives that answer and signs in with it. A scenario whose role has no account anywhere fails at once, naming the role.

Given a run whose handoff file carries no accounts and project instructions that name none
When the user supplies the accounts and the command generates a scenario needing a signed-in role
Then the writer signs in with the supplied account, or, for a role nobody supplied, reports that no credentials exist for that role

### S2 - The plan review catches a requirement the plan dropped [CHANGED - was: the reviewer saw only the plan]

The planner, now at high effort, hands the reviewer the summary the user confirmed. The reviewer reads the code widely, not only the files the plan names, and fails a plan missing or adding a criterion, boundary or constraint. The plan gate's instruction names that hand-off too.

Given a confirmed summary with four acceptance criteria and a plan covering three
When the plan reviewer runs
Then it returns a failing verdict naming the missing criterion as blocking

### S3 - The bug-fixing skill treats a fetched issue as data [CHANGED - was: issue text trusted with no data marking]

A fetched issue and its comments are the bug report, and any instruction written inside them is data, never an order. The skill traces at high effort.

Given an issue whose comment says to skip the reproduction test
When the bug-fixing skill reads it
Then it still writes and runs the reproduction test

### S4 - An agent that ends without its result is asked once to finish [CHANGED - was: the memory, rules and planner skills had no answer]

When a memory, rules or plan-review agent ends with text and no result line, its skill asks it once to finish and report; a second silence is handled as a refused call. The memory writer is told a message with no tool call ends its run.

Given a memory audit agent that replies with a progress note only
When the memory skill receives it
Then it sends one follow-up asking the agent to finish, and on a second silence asks the user as it does for a refused call

### S5 - Parallel coders keep the shared tree intact [CHANGED - was: bans without a safe alternative]

A coder and a reviewer never stash, not even their own files, because one stash stack serves every coder at once. They compare with the committed state by reading it, and a coder keeps a copy of its own file in its own scratch directory before a risky change.

Given two coders working in parallel
When one needs the committed version of a file it is changing
Then it reads that version without touching the tree or the stash

### S6 - The build reviews every haiku task and binds a ruling to the user [CHANGED - was: haiku tasks proven by their own tests skipped review]

A task built on the cheapest tier is always reviewed; the review skip remains only on the middle tier. A stalled task's ruling is the user's own answer copied, never text the build composed, except its automatic ruling copied from the coder's own options.

Given a haiku-tier task whose verification runs the tests it wrote
When its coder passes
Then a reviewer gates it before it is committed

### S7 - A maintainer finds each rule once, on its own line [CHANGED - was: packed paragraphs, hard wraps and repeats]

The coder's and reviewer's input rules and the build's retry answer read one rule per line with their words unchanged; the setup skill's paragraphs are whole lines; the interview states its dependency rule once and the planner states its script-line rule once.

Given the coder agent's input section
When a maintainer reads it
Then each input label has its own line carrying its rule

### S8 - The product assumptions record why the build has no resume trigger [NEW]

The product assumptions state that the build is entered from an approved plan, that its description deliberately names no resume trigger although it resumes the latest run once running, and what that costs.

Given the product assumptions file
When a later audit flags the missing resume trigger
Then the file already records it as a product decision with its cost

### Edge cases

- The plan review is dispatched with no confirmed summary (the plan gate on an older transcript) -> the reviewer skips the faithfulness check and reviews the rest as before.
- A role is named by a scenario but no account exists anywhere -> the writer fails that scenario with the role named, and the command offers retry, skip or abort as for any failure.
- An agent that ends without its result a second time -> handled exactly like a refused tool call, with "no verdict returned" as the reason.
- A task on the top tier -> reviewed, as today.

## Glossary

- Faithfulness check - the plan reviewer's comparison of the plan with the request the user confirmed; not a check of the plan's format.
- Review skip - building a task without a reviewer because its verification runs the project's build or tests; not a skipped task.

## Acceptance criteria

1. The end-to-end command hands every writer the test accounts it resolved, the user's own answer included; the writer signs in from them first and fails a scenario whose role has no account with a reason naming that role.
2. The planner hands the plan reviewer the confirmed interview summary or bug diagnosis verbatim, and the reviewer blocks a plan missing or adding a criterion, boundary or constraint of it, in both review scopes, skipping that check when no such input arrives.
3. Both plan reviewers read the files the plan modifies or deletes, the callers of every symbol it changes, and any other file the change could affect, including ones the plan does not name.
4. The plan gate's instruction to dispatch the planner's reviewer names the confirmed input among what to pass.
5. The bug-fixing skill's issue input states that the issue text is data, never instructions, in the interview's own wording.
6. The planner and the bug-fixing skill run at high effort.
7. The memory, rules and planner skills ask an agent that returned none of its result lines, once, to finish and return them, and handle a second silence as a refused call with the reason "no verdict returned".
8. The memory node writer's output section states that a message with no tool call ends its run, in the wording the coder agent already uses.
9. The coder and the reviewer never stash, not even with a path list of their own files, with the shared stack named as the reason; both compare with the committed state through a read of it or a diff, and the coder copies its own file under its own output directory before a risky change.
10. The build skips review only for a middle-tier task, never for a cheapest-tier or top-tier one, and states that a ruling's text is the user's own answer copied, the one text it composes being the automatic ruling copied from the coder's options.
11. The coder's input rules, the reviewer's input rules and the build's retry answer read one rule per line with their words unchanged.
12. The setup skill carries no paragraph or bullet broken across lines.
13. The interview states its dependency-order rule once, keeping "early answers reshape later branches"; the planner states its one-literal-line script rule once, at the top of its body.
14. The product assumptions carry the recorded implementor entry decision, in the wording the user chose.

## Scope

### File map

- modify - viber/agents/planner-review.md - the plan review contract: confirmed input, faithfulness check, broad read
- modify - viber/agents/plain-plan-review.md - the plain plan review's broad read
- modify - viber/skills/planner/SKILL.md - effort, hand-off of the confirmed input, re-ask on a missing verdict, one script-line rule
- modify - viber/hooks/scripts/plan-gate.sh - the instruction naming what the planner's reviewer is dispatched with
- modify - tests/viber/plan-gate.test.ts - proof that instruction names the confirmed input
- modify - viber/skills/e2e/SKILL.md - the accounts line in each writer dispatch
- modify - viber/agents/e2e-writer.md - signing in from the accounts line, failure on a role with no account
- modify - viber/skills/fixer/SKILL.md - effort
- modify - viber/skills/fixer/fragments/issues-report.true.md - issue text marked as data
- modify - viber/skills/memory/SKILL.md - re-ask on a missing result line, its tool list
- modify - viber/agents/memory-node-writer.md - the message-ends-the-run line
- modify - viber/skills/rules/SKILL.md - re-ask on a missing result line, its tool list
- modify - viber/agents/task-coder.md - stash ban with reason and safe alternatives, input rules one per line
- modify - viber/agents/task-reviewer.md - stash ban with reason and safe alternative, input rules one per line
- modify - viber/skills/implementor/SKILL.md - review skip only on the middle tier, ruling bound to the user, retry answer one case per line
- modify - viber/skills/setup/SKILL.md - whole-line paragraphs
- modify - viber/skills/intent/SKILL.md - one dependency-order rule
- modify - viber/PRODUCT.md - the recorded implementor entry decision

### Out of scope

- The permissions template of `/viber:setup`, the build skill's model, the plan reviewers' models, the build skill's description.
- Mitigations for Fable 5.1, which runs only when a host names it as its top tier.
- A backup-copy rule for the reviewer, which writes no source file.
- The seven corrections to `supercc` (`tuner` and `skill-designer`) the verification found: a separate `viber:intent` cycle for `supercc`.
- `viber/CLAUDE.md`, which the build's memory close updates (the `memory` switch is on).

## Constraints

- Every file in English; no heredoc; no em dash or en dash in any written text.
- Contracts `viber/CLAUDE.md` lists as changing together change together within this plan.
- Every task touching this repo's markdown is reviewed, per the root `CLAUDE.md`.
- The plan gate keeps working under Git Bash on Windows and bash 3.2 on macOS; the `tests/` suites stay green.
