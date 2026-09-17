# SuperPlan
To build this plan use the `superbuild` skill.

Title: "<title>"
Spec: <full/path/to/spec.md> <!-- `What & Why` specification -->
Intent: <path copied from the spec's Intent: line; omit when the spec has none>
Plan: <absolute path of this plan file, exactly as given by plan mode>

## Gate commands
<the gate of the whole build, never of a single task: the commands a review round runs over everything the build has produced. The planner fills each subsection's scope from the host's memory and from what this plan moves - the whole repository, one project, one path, one suite - and writes a command only where the planner judges its result proof for this plan. `#### Build` and `#### Tests` run at every checkpoint, so each carries the narrowest scope that still proves what this plan moves; a whole repository, solution or workspace build, or a full suite, belongs under `#### Integration` alone, which runs at the final review and its re-review only>

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
- TDD: <marker>
- Model: <sonnet | opus>
- Effort: <low | medium | high | xhigh>
- Review: <model> <effort>
- Covers: `<criterion short name>` (#<n>)[, `<criterion short name>` (#<m>)]
<`Review:` is optional on any task and takes the same two value sets as `Model:` and `Effort:`; absent, the per-task reviewer runs at its own frontmatter default>

### Dependencies
- `<task title>` (Task <N>) - blocks: <…>
<every reference to a criterion or a task is written `<title>` (<pointer>): the criterion's short name from the spec with (#<n>), the task's heading title with (Task <N>) - never a bare number. A spec whose criteria carry no short name is cited by the criterion's first clause. Only the #<n> tokens of `Covers:` are parsed, so no title contains `#`>

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
<one bullet per failure branch, fixed shape: when <X fails | input is invalid | two <X> run concurrently> -> response <Y>, log <Z>, test <T>. A step made of a persisted write followed by an outside action (a send, a call, a job hand-off) carries the bullet for the failure between the two - the write landed, the outside action did not. Nothing to handle -> the single bullet "none - <one-word reason>", never a bare "none">

### Contracts
<data shapes / signatures this task introduces or consumes, one bullet each. A contract another task consumes ends with "consumed by `<task title>` (Task <N>)". A closed set this task extends (enum member, variant, status, kind) adds the list of that set's consumers, found by Grep. A change of the response mechanism (redirect vs rewrite, proxy vs direct, status code family) adds a method-and-status matrix, one line per method with the status codes before and after. An external value (header, path segment, query, form field, environment) entering a path, query, command or routing decision adds its validation rule. A new HTTP endpoint, route or handler adds its request shape, its response shape and its status codes. Text a person reads (a message, a screen, an error message, a text resource) is carried here verbatim, or delegated with one "copy: implementor, after <existing key or file>" line naming the existing wording the implementor follows. (or "none")>

### DoD
<observable done condition; impl = code + related tests green>.

<!-- /TASK -->

---

<!-- repeat Task <N> per unit of work; leave intact all comment markers; keep tasks small, independently testable, and builder-executable unattended (no interactive human step) -->
