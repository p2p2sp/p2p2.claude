# SuperPlan
To build this plan use the `superbuild` skill.

Title: "<title>"
Spec: <full/path/to/spec.md> <!-- `What & Why` specification -->
Intent: <path copied from the spec's Intent: line; omit when the spec has none>
Plan: <absolute path of this plan file, exactly as given by plan mode>

---

<!-- TASK -->

## Task <N> - <title which become a commit message>
- TDD: <marker>
- Model: <sonnet | opus>
- Effort: <low | medium | high | xhigh>
- Covers: `<criterion short name>` (#<n>)[, `<criterion short name>` (#<m>)]

### Dependencies
- `<task title>` (Task <N>) - blocks: <…>
<every reference to a criterion or a task is written `<title>` (<pointer>): the criterion's short name from the spec with (#<n>), the task's heading title with (Task <N>) - never a bare number. A spec whose criteria carry no short name is cited by the criterion's first clause. Only the #<n> tokens of `Covers:` are parsed, so no title contains `#`>

### Files
- <add | modify | delete> - <path> (<symbol>)
<one line per file touched; <path> is literal - commit-task.sh matches it by prefix, so no placeholders, globs or angle brackets; a file whose name is generated at build time (a migration timestamp, a snapshot hash, a dated file) is declared by its parent directory with a trailing slash, e.g. `add - src/Migrations/ (EF migration + designer)`>

### Test Commands
#### Build
- <build command which agent can run to verify build>

#### Tests
-  <test command which agent can run to verify tests>
<one line per test command>

### Task Tests
- <test file path> - <command that runs only that file>
<present on every task, whatever `TDD:` says; one line per test file this task writes or changes, and a task that writes or changes none carries the single line `none - <reason>`; every path is one this task declares under `### Files`; the command is literal and runnable as written - no placeholder, no filter to be filled in later - and where the host's runner cannot scope to a single file it carries the narrowest scope that does exist; only a test that runs fast in memory belongs here, never one in which a process or service the application connects to takes part>

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
