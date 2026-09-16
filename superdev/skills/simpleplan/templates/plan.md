# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "<title>"
Intent: <path from the handoff's intent: line; omit when none>
Plan: <absolute path of this plan file, exactly as given by plan mode>

---
<!-- HEADER -->

## Goal
<observable end-state behavior from the interview>

## Context
<short description of plan context, 3-5 sentences max>

## Out of scope
- <non-goal this plan deliberately does not deliver - one short line, no rationale>
<max 5 bullets; nothing to exclude -> the single bullet "none">

## Acceptance criteria
1. <short name> - <numbered, testable, observable true/false condition>
2. …
<short name = this criterion's title: a few words, no `#`, unchanged once written - every later reference cites the criterion by it>

<!-- /HEADER -->

## Gate commands
<the gate of the whole build, never of a single task: the commands a review round runs over everything the build has produced. The planner fills each subsection's scope from the host's memory and from what this plan moves - the whole repository, one project, one path, one suite - and writes a command only where the planner judges its result proof for this plan>

#### Build
- <command that builds the scope this plan moves>

#### Tests
- <command that runs the host's automated tests over that scope>

#### Integration
- <command that runs the host's integration or end-to-end suite over that scope>
<one line per command in each of the three subsections; every command is literal and runnable as written, with no placeholder and no filter to be filled in later, and a subsection with nothing to run carries the single line `none - <reason>`>

---

<!-- TASK -->

## Task <N> - <title which become a commit message>
- Covers: `<criterion short name>` (#<n>)[, `<criterion short name>` (#<m>)]
- TDD: <marker>
- Model: <sonnet | opus>
- Effort: <low | medium | high | xhigh>

### Dependencies
- `<task title>` (Task <N>) - blocks: <…>
<every reference to a criterion or a task is written `<title>` (<pointer>): the criterion's short name from `## Acceptance criteria` with (#<n>), the task's heading title with (Task <N>) - never a bare number. Only the #<n> tokens of `Covers:` are parsed, so no title contains `#`>

### Files
- <add | modify | delete> - <path> (<symbol>)
<one line per file touched; <path> is literal - commit-task.sh matches it by prefix, so no placeholders, globs or angle brackets; a file whose name is generated at build time (a migration timestamp, a snapshot hash, a dated file) is declared by its parent directory with a trailing slash, e.g. `add - src/Migrations/ (EF migration + designer)`>

### Task Checks
- <test file path> - <command that runs only that file>
- <command>
<present on every task, whatever `TDD:` says; one line per check the implementor runs as this task's own proof. A check that runs a test file this task declares under `### Files` opens with that path, then " - ", then the command that runs only that file; every other check - a compile, a type-check, a lint, a grep, any other proof - is the bare command on its own line. Nothing to run -> the single line `none - <reason>`. Every command is literal and runnable as written - no placeholder, no filter to be filled in later - and carries the narrowest scope the host's runner offers; only a check that finishes in seconds, without connecting to a process or service outside the application, belongs here>

### Approach
<2-5 imperative steps - symbol + signature, algorithm (name the symbol, never a line number). No prose, no "figure out", no line-by-line code, no failure decision (a catch, a fallback, a default on error belongs under Failure modes)>

### Failure modes
<one bullet per failure branch, fixed shape: when <X fails | input is invalid | two <X> run concurrently> -> response <Y>, log <Z>, test <T>. Nothing to handle -> the single bullet "none - <one-word reason>", never a bare "none">

### Contracts
<data shapes / signatures this task introduces or consumes, one bullet each. A contract another task consumes ends with "consumed by `<task title>` (Task <N>)". A closed set this task extends (enum member, variant, status, kind) adds the list of that set's consumers, found by Grep. A change of the response mechanism (redirect vs rewrite, proxy vs direct, status code family) adds a method-and-status matrix, one line per method with the status codes before and after. An external value (header, path segment, query, form field, environment) entering a path, query, command or routing decision adds its validation rule. (or "none")>

### DoD
<observable done condition; impl = code + related tests green>.

<!-- /TASK -->

---

<!-- repeat Task <N> per unit of work; leave intact all comment markers; keep tasks small, independently testable, and builder-executable unattended (no interactive human step) -->