To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# ADR candidates screened by a fresh agent

## Goal

Under `adr: true`, a plan gets an architecture decision record only for a decision about how the system is built, judged against a strict admission test by an agent that did not make the decision. What is worth keeping but is not a record goes to a place the build already has instead of being lost or inflated into a record.

## Problem

`planner` judges the decisions it has just made, with three loose criteria, as a side step of planning. Across 40 records written in four host projects between 21 and 30 September, 15 fail `planner`'s own test, many are product, security or privacy rules settled in the interview, the user accepted 34 of 41 candidates, the question was often biased ("Zapisz ADR (Recommended)") or repeated, and 3 records described code that did not exist. Left alone, `docs/adr/` fills with records nobody needs and some that mislead.

## Current behaviour

Under `adr: true`, `planner` reads `skills/planner/references/adr-tasks.md` before writing the tasks, finds candidates itself with three criteria (hard to reverse, surprising without context, a real trade-off), asks the user, and writes one first task per accepted decision. The record carries a title, `Status: accepted`, Context, Decision, Alternatives and Consequences. Anything rejected is dropped without trace.

### Must not change

- Under `adr: false` no plan carries a record task and nothing is dispatched for records.
- `planner`'s review gate: `ExitPlanMode` only after a `planner-review` PASS given after the last write to the plan file.

## Behaviour

### S1 - A plan with no qualifying decision [CHANGED - was: planner judged its own decisions and often asked anyway]

The plan is complete and valid; the screening agent finds nothing that passes the test. The user sees no question about records.

Given a plan under `adr: true` whose decisions are product rules, configuration or cheap to reverse
When `planner` finishes writing the plan
Then the plan goes to review with no record task and no question about records

### S2 - A plan with an architectural decision [CHANGED - was: candidate chosen by planner, asked with a recommendation]

Given a plan under `adr: true` settling a decision that passes the admission test
When `planner` finishes writing the plan
Then the user gets one prose question naming the decision, its strongest rejected option and its reversal cost, with no recommendation
And an accepted decision becomes a task with no dependencies writing a short record: title, status, a one-to-three-sentence paragraph, the rejected option with its reason

### S3 - A rule settled in the interview [CHANGED - was: offered as a record candidate]

Given an interview decision whose options differ only in what a user or the business sees
When the plan is screened
Then it is not offered as a record

### S4 - Knowledge that belongs elsewhere [NEW]

Given a decision that fails the test but is worth keeping
When the user accepts it
Then after the build a rationale for one spot of code sits as a comment at that spot
And a convention is offered to `.claude/rules/` at the build's close, under `rules: true`
And operational knowledge is only shown to the user during planning

### S5 - A decision changing an existing record [NEW]

Given a plan replacing or extending a decision a file under `docs/adr/` already records
When the user accepts the change
Then a task sets that file's status to deprecated or superseded, or appends the fragment to it, and never deletes the file

### S6 - Reading how the adr switch works [CHANGED - was: planner weighs the decision itself]

Given a user reading the help page or the `viber.yml` template
When they look up the `adr` switch
Then it says a separate screening agent judges the finished plan and the user accepts or drops what it proposes

### Edge cases

- The user drops every item, or drops the question -> the plan carries no record task and no record criterion.
- A plan stopping at a draft (no task half) -> nothing is dispatched for records.
- `docs/adr/` does not exist -> no existing record is matched; candidates are judged as usual.
- The screening agent returns no verdict line twice, or is refused a tool -> the user chooses between retrying after granting permission and continuing with no record task.
- A convention routed while `rules: false`, or a rationale for code no task of the plan builds -> shown to the user only, written nowhere.
- A record's `Delivers` naming a code identifier that is neither a `### File map` path nor declared in a `## Contracts` block -> a review finding.

## Glossary

- Screening agent - the read-only agent that applies the admission test to a finished plan; it decides nothing, it proposes.
- Admission test - the exclusions and gates a decision passes before it may become a record; failing it is the default.
- Routing - where knowledge that is not a record goes: a code comment, a convention for `.claude/rules/`, or operational knowledge shown to the user.
- Superseded record - an existing record whose decision a new one replaces; it stays on disk with its status changed.

## Acceptance criteria

1. `viber/references/adr-admission.md` holds the whole admission test of C4 - every exclusion, every gate with its definitions and the full significance list, evidence required for every rule, no record as the default, routing of every non-record.
2. `viber/agents/adr-screener.md` exists as a read-only agent (Read, Grep, Glob) that reads the plan, the admission test and `docs/adr/` (a missing directory matching no record), treats interview decisions as context, and returns the C2 vocabulary; it is listed in `viber/.claude-plugin/plugin.json` `agents[]` and has its agent line on the help page, and `tests/viber/help.test.ts` passes.
3. Under `adr: true`, `planner` dispatches `viber:adr-screener` once the whole plan is written and its index validates, before the review; a draft dispatches nothing.
4. `planner` relays the screening result in prose, neutrally, with no recommendation, once; a result with no candidate asks nothing; dropping every item or the question leaves no record task and no record criterion; `adr-tasks.md` holds no admission criteria of its own.
5. Each accepted record line of C2 becomes a task with no dependencies, appended after the plan's last task, writing a record in the C3 shape; `plan-rules.md` makes a record naming a code identifier outside the `### File map` paths and the `## Contracts` blocks a review finding.
6. Each accepted deprecate or append line of C2 becomes a task changing that existing record's status line or appending the fragment, never deleting it.
7. An accepted comment or rule route of C2 lands in the `Delivers` of the task it names (a rule only under `rules: true`); an operational route and every route with no task to land in is shown only.
8. The help page's `adr` key entry, the flow diagrams' `adr` line and the `viber.yml` template's `adr` comment describe the screening agent, and the words the screening agent returns match what `adr-tasks.md` reads.

## Scope

### File map

- add - viber/references/adr-admission.md - the admission test and routing targets, read whole by the screening agent
- add - viber/agents/adr-screener.md - the screening agent's contract: input, what it reads, output vocabulary
- modify - viber/.claude-plugin/plugin.json - `agents[]` lists the new agent
- modify - viber/skills/setup/assets/help.html - the new agent's line; the `adr` key entry
- modify - viber/skills/planner/SKILL.md - the `adr` switch preload moves after the `plan-index.sh` exit 0 line, before the review
- modify - viber/skills/planner/fragments/adr.true.md - points at `adr-tasks.md` at its new moment
- modify - viber/skills/planner/references/adr-tasks.md - dispatch, relay, question and task writing; no criteria of its own; the record shape
- modify - viber/references/plan-rules.md - `Provable`: a record's status line is its proof, and it names only file-map paths and contract names
- modify - viber/skills/setup/templates/viber.yml - the `adr` comment
- modify - viber/skills/setup/assets/viber-flow-en.svg - the `adr` line of the flow
- modify - viber/skills/setup/assets/viber-flow-pl.svg - the `adr` line of the flow

### Out of scope

- Re-assessing or rewriting records already in host projects.
- `adr: false` behaviour.
- `viber:intent` and its interview format.
- `rules-writer`, `task-coder` and `planner-review` files: a routed convention reaches `rules-writer` through the coder notes it already reads, and `planner-review` already gates every `(review)` rule of `plan-rules.md`.
- `hooks/scripts/plan-gate.sh`: the new agent's name matches no reviewer the gate reads.
- A manual acceptance scenario: the user analyses the filter's effect himself.
- This repo's own `.claude/viber.yml`: it keeps `adr: false` and its comment is the user's.

## Constraints

- With `memory: true` in this repo, no task lists a `CLAUDE.md` or a `CLAUDE.<topic>.md` section: `viber/CLAUDE.md`, `viber/agents/CLAUDE.md` (agent count), `viber/references/CLAUDE.md`, `viber/CLAUDE.switches.md` and the root `CLAUDE.md` memory table are updated by the build's close.
- Every token the new agent and reference make a model read counts against the user's usage limits: the reference holds the test only, the agent file its contract only.
- No source attribution anywhere; English in every file; the agent's `color:` is never red.
