---
source: C:/Projects/p2p2.claude/docs/_specs/2026-09-30-10-50-06_adr-candidates-screened-by-a-fresh-agent/plan.md
---

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

## Tasks

<!-- TASK -->
### T1 - Add the ADR screening agent and its admission test
- TDD: none
- Covers: #1, #2
- Uses: C1, C2, C4
- Depends-on: none
- Files: viber/references/adr-admission.md, viber/agents/adr-screener.md, viber/.claude-plugin/plugin.json, viber/skills/setup/assets/help.html
- Delivers: `adr-admission.md` stating the admission test of criterion 1 with its C4 labels, evidence required for every rule and no record as the default outcome; `adr-screener.md` as a read-only agent (`tools: Read, Grep, Glob`, `model: opus`, `effort: medium`, `color: yellow`) carrying the shared "Your tools are ..." and "Never narrate" paragraphs, taking the C1 input, reading the plan, `<refs>/adr-admission.md` and the files under `docs/adr/` whose slug names the same decision, treating a decision the `input:` lines settle as context per C1, and returning the C2 vocabulary; `plugin.json` listing it in `agents[]`; a help page line `id="agent-adr-screener"` in the Planning agent list, in both languages.
- Verification: `grep -q '"./agents/adr-screener.md"' viber/.claude-plugin/plugin.json && grep -q '^name: adr-screener' viber/agents/adr-screener.md && grep -q 'adr-admission.md' viber/agents/adr-screener.md && grep -q '^tools: Read, Grep, Glob$' viber/agents/adr-screener.md && grep -q '^color: yellow$' viber/agents/adr-screener.md && grep -q '^input:' viber/agents/adr-screener.md && grep -q 'B3 - Reversal cost' viber/references/adr-admission.md && grep -q 'W1 - Behaviour-only difference' viber/references/adr-admission.md && grep -q 'ROUTE: ops' viber/agents/adr-screener.md && grep -q 'id="agent-adr-screener"' viber/skills/setup/assets/help.html && node --test --test-reporter=dot tests/viber/help.test.ts tests/orphan-tags.test.ts` -> exit 0
- DoD: `adr-admission.md` carries every heading and definition of C4, the full B4 significance list included; `adr-admission.md` requires evidence for every rule and makes no record the default; `adr-admission.md` names the three routing targets comment, rule and ops; `adr-screener.md` has `tools: Read, Grep, Glob` and `color: yellow` and reads `<refs>/adr-admission.md`; `adr-screener.md` states its input as C1 and its output as C2; `adr-screener.md` treats a decision the `input:` lines settle as context unless its options differ in mechanism, data structure or contract; `adr-screener.md` treats a missing `docs/adr/` as matching no existing record; `plugin.json` lists `./agents/adr-screener.md`; the help page has the `agent-adr-screener` line in English and Polish; `tests/viber/help.test.ts` passes
<!-- /TASK -->

<!-- TASK -->
### T2 - Wire planner to the ADR screening agent
- TDD: none
- Covers: #3, #4, #5, #6, #7, #8
- Uses: C1, C2, C3
- Depends-on: T1
- Files: viber/skills/planner/SKILL.md, viber/skills/planner/fragments/adr.true.md, viber/skills/planner/references/adr-tasks.md, viber/references/plan-rules.md, viber/skills/setup/assets/help.html, viber/skills/setup/templates/viber.yml, viber/skills/setup/assets/viber-flow-en.svg, viber/skills/setup/assets/viber-flow-pl.svg
- Delivers: `SKILL.md` running the `adr` switch preload after the `plan-index.sh` exit-0 line and before showing the plan path, a draft skipping it, its step 2 wording reading in that order (write the plan, validate it, screen it, validate again after any added task, show the path); `adr.true.md` pointing at `adr-tasks.md` at that moment; `adr-tasks.md` holding no admission criteria and stating: dispatch `viber:adr-screener` with the C1 lines, `input:` carrying the confirmed summary or diagnosis verbatim; the shared no-verdict `SendMessage` and the `DENIED` choice (permission added and retry, or continue with no record task); on the C2 no-candidate verdict ask nothing; otherwise one prose question listing every line (decision, rejected option, reversal cost; operational routes as information), with no recommendation, asked once and never argued back; dropping every item or the question leaves no record task and no record criterion; every `ROUTE:` line applied before any task is added, so its task id still names the task it was given for; one task per accepted `ADR:` line, appended after the plan's last task with no renumbering, `Depends-on: none`, writing the C3 shape and naming from the code only `### File map` paths and `## Contracts` names, with the existing Files/TDD/Uses/Verification/DoD/criterion rules; one task per accepted `DEPRECATE:` or `APPEND:` editing that record, merged into the task of the `ADR:` line superseding it when there is one, both paths in its `Files`; each accepted `ROUTE: comment` and, under `rules: true`, `ROUTE: rule` appended to the `Delivers` of the task it names (a rule as a convention its coder names in its notes); then `plan-index.sh` again; `plan-rules.md`'s `Provable` sentence on decision records extended so its proof is its `Status:` line and it names from the code only `### File map` paths and `## Contracts` names; the help page's `adr` key entry, both flow diagrams' `adr` line and the `viber.yml` `adr` comment describing the screening agent and a record task with no dependencies.
- Verification: `awk '/plan-index.sh" "<plan-path>"/{p=NR} /switch-text.sh" adr /{a=NR} END{exit !(p && a>p)}' viber/skills/planner/SKILL.md && grep -q 'viber:adr-screener' viber/skills/planner/references/adr-tasks.md && grep -q 'VERDICT: NONE' viber/skills/planner/references/adr-tasks.md && grep -q 'VERDICT: NONE' viber/agents/adr-screener.md && grep -q 'ROUTE: rule' viber/skills/planner/references/adr-tasks.md && grep -q 'ROUTE: rule' viber/agents/adr-screener.md && grep -q 'DEPRECATE:' viber/skills/planner/references/adr-tasks.md && grep -q 'DEPRECATE:' viber/agents/adr-screener.md && ! grep -q 'Surprising Without Context' viber/skills/planner/references/adr-tasks.md && grep 'docs/adr/' viber/references/plan-rules.md | grep -q 'File map' && grep -q 'adr-screener' viber/skills/setup/templates/viber.yml && grep -q 'adr-screener' viber/skills/setup/assets/viber-flow-en.svg && grep -q 'adr-screener' viber/skills/setup/assets/viber-flow-pl.svg && grep -q '^input:' viber/skills/planner/references/adr-tasks.md && node --test --test-reporter=dot tests/viber/help.test.ts tests/orphan-tags.test.ts` -> exit 0
- DoD: `SKILL.md` runs the `adr` preload after the `plan-index.sh` exit-0 line; `SKILL.md` step 2 reads in the order write, validate, screen, validate again, show the path; a draft plan dispatches nothing for records; `adr-tasks.md` dispatches `viber:adr-screener` with the C1 lines, `input:` carrying the summary or diagnosis verbatim; `adr-tasks.md` handles a missing verdict and `VERDICT: DENIED`; the C2 no-candidate verdict asks no question; the question is prose, lists every line with no recommendation and is asked once; dropping every item or the question leaves no record task and no record criterion; `ROUTE:` lines are applied before record tasks are added; an accepted `ADR:` line becomes a task appended after the last one, with no dependencies, writing the C3 shape; an accepted `DEPRECATE:` or `APPEND:` line becomes a task editing that record without deleting it; an accepted `ROUTE: comment` or, under `rules: true`, `ROUTE: rule` line is appended to the named task's `Delivers`; `ROUTE: ops`, a `ROUTE: rule` under `rules: false` and a route with no task are shown only; `adr-tasks.md` carries no admission criteria of its own; `plan-rules.md`'s `Provable` makes a record naming a code identifier outside `### File map` and `## Contracts` a finding; the help page `adr` entry, both flow diagrams' `adr` line and the `viber.yml` `adr` comment name the screening agent; `tests/viber/help.test.ts` passes
<!-- /TASK -->

## Contracts

### C1 - Screening dispatch input

File: viber/agents/adr-screener.md

```
plan: <absolute path of the plan file>
refs: <the plugin reference directory>
input:
<the confirmed viber:intent summary or viber:fixer diagnosis in context, verbatim, on the lines below this label, up to the end of the prompt>
```

A decision the `input:` summary or diagnosis settles is context for a record, never its subject, unless its options differ in mechanism, data structure or contract.

### C2 - Screening output vocabulary

File: viber/agents/adr-screener.md

```
VERDICT: NONE
VERDICT: FOUND
ADR: <the decision, one line> | rejected: <strongest rival> - <why not> | cost: <B3 evidence>
DEPRECATE: <docs/adr/ path> | <one sentence: what replaces it>
APPEND: <docs/adr/ path> | <the fragment>
ROUTE: comment | <task id> | <what the comment states>
ROUTE: rule | <task id> | <the convention>
ROUTE: ops | <what an operator has to know>
VERDICT: DENIED
REASON: <refused tool name>: <the exact refused command, or the path for a file tool>
```

`VERDICT: FOUND` is followed by one or more item lines and nothing else. A fragment belonging to an `ADR:` line of the same result is folded into that line, never an `APPEND:`.

### C3 - Decision record shape

File: viber/skills/planner/references/adr-tasks.md

```
# <decision title>

Status: accepted (<yyyy-mm-dd>) | deprecated (<yyyy-mm-dd>) | superseded by <docs/adr/ path> (<yyyy-mm-dd>)

<1-3 sentences: context, decision, why>

Rejected: <strongest rival> - <why not>

Consequences: <only a non-obvious one not visible in the code; line omitted otherwise>
```

### C4 - Admission test labels

File: viber/references/adr-admission.md

```
Order: exclusions, then gates, then routing. A rule with no evidence is not met. Default: no record.
One record holds one decision, and only its part passing the test.

Exclusions - any one true: not a record, go to routing
W1 - Behaviour-only difference: the rejected options differ only in what a user or the business
     sees, or in a business, security or privacy rule - never in mechanism, data structure or contract.
W2 - Procedure, configuration, convention or scope: a configuration value, an operational procedure,
     a naming convention, test organisation without a tool choice, a scope or phase decision.
     No exception.
W3 - Already recorded: a record under docs/adr/ holds it. A change to it passes this same test;
     failing, the old record is deprecated with one sentence. A fragment changing a contract another
     record states is appended to that record.

Gates - all hold, each with evidence
B1 - Real choice: the rejected option is a different design of the same B2 category, feasible in
     this project; the record names the strongest one. "Later" or "without migration" never counts.
B2 - Category: structure, runtime quality, dependencies, interfaces and contracts, or construction
     techniques (framework, library, tool, build and deploy process); name the category and the element.
B3 - Reversal cost: reversal needs at least one of
     - changes in 2 or more components; a component is a separately deployed unit (an SPA and an API
       in one image or binary are one component) or a module whose contract others consume;
     - information loss or manual work on data; a mechanical reverse migration does not count;
     - a change to a contract consumed outside the component: an API, a token claim, a permission
       scope, a package format, a registration at an external party;
     - rebuilding a security boundary (tenant isolation, origin, trust in a third party) whose
       rationale spans several modules.
B4 - Significance: surprising without context (a competent engineer would ask "why not the
     standard?"), or 2 or more of: high business value or risk, a key stakeholder concern, a new
     demanding runtime quality, an external dependency problem, cross-cutting impact, the first
     decision of its kind (never enough alone), an area that caused trouble before.

Routing - everything that is not a record
comment - the rationale for one non-obvious spot of code
rule    - a convention to enforce in code, for .claude/rules/
ops     - operational knowledge: backup, keys, deployment
nothing - none of the above
```
