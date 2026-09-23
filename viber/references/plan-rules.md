# Plan rules

Every rule a plan's task half and contract appendix must hold. A rule tagged `(script)` is rejected by `plan-index.sh`; a rule tagged `(review)` is the planner's own check before dispatch and is gated by the plan reviewer.

## Plan

- Split right: everything above `## Tasks` is WHAT and WHY - goal, problem, current behaviour, roadmap, scenarios, glossary, acceptance criteria, file map, boundary, constraints. A signature, type, endpoint, error code or dictionary key there belongs in a `## Contracts` block, the only way a shape reaches a coder. (review)

## Tasks

- Size: each task is the smallest unit that carries its own verification and is worth a reviewer's gate; setup, config and docs fold into the task whose deliverable needs them. (review)
- Title: the heading line `### T<n> - <title>` is committed verbatim as the commit subject, so the title is one short imperative summary of what the task delivers. (review)
- Ids: task ids are `T1`, `T2`, … in order. (review)
- Depends: `Depends-on` references lower-numbered tasks only, which keeps the graph acyclic. (script)
- Ordered: `Depends-on` matches the actual flow of code and data - a dependency only where one task consumes what another produces. A task needing something no listed dependency produces is a finding, and so is a dependency that constrains nothing: it burns parallelism. (review)
- Paths: `Files` is one comma-separated line of exact repo-relative file paths, no globs, no directories, no annotations; a bracket wrapping a whole path segment (`[id]`, `[...slug]`, `[[...slug]]`) is part of the file's own name, written exactly as on disk. (script)
- Owned: `Files` is the task's complete map, staged for its commit and compared by the collision check: nothing outside it has to change for the task to deliver and pass its `Verification`. It holds every file the task's own work forces - where a new type is registered, exported or wired up, the declaration and migration a new persisted shape needs, every test asserting a count, an enumeration or a snapshot over what it changes. A shape two tasks need is written by the first one that cannot deliver without it. A contract on `File: none` whose shape plainly has a home is the same finding. (review)
- Disjoint: tasks with no dependency path between them never list the same file, since they run at the same time. (script)
- Exclusive: `Exclusive: true` only where a task cannot share the working tree or a machine-wide resource - a fixed port, one database, a suite that has to run alone - and the line left out everywhere else. A `Verification` hanging on such a resource without the marker is a finding, and so is the marker on a task needing nothing of the sort: it stops the whole build while it runs. (review)
- Leaf: an Exclusive task is never named in another task's `Depends-on` - it runs last, so nothing may depend on it. (script)
- Uses: every task carries `Uses:`, naming existing contract blocks or `none`. (script)
- Supplied: `Uses` names every block the task's work touches, the ones it writes and the ones it only calls: the task file is the coder's whole input, so a shape left off reaches it nowhere. (review)
- Delivers: `Delivers` states WHAT the task produces, never how to code it, never a line number. (review)
- Provable: `Verification` is a runnable command plus the result that counts as proof, scoped to the task's own `Files` and the tests covering them; a whole-project suite run is a finding, since other tasks write the same tree at once. A task with no runtime behaviour greps its artefact for an identifier the code really declares, on both sides in one command - the document and the source file defining the identifier. A `Verification` a plausible invention would satisfy is a finding: a grep for a word, a document-side check with nothing on the code side, "read it and judge". `DoD` separates its clauses with semicolons, each observable on its own, because each is cut into `DoD.1`, `DoD.2`, … and gated alone. (review)
- TDD: `TDD: required` by default; `TDD: none` only where the task changes no runtime behaviour - config, docs, mechanical rename, scaffolding. (review)
- Reproduced: a reproduction test already RED in the tree is in the fixing task's `Files` and on its `Repro:` line, and that task carries `TDD: none`; a bug-fix plan missing that line is a finding, since without it the build reads the uncommitted test as an interrupted coder. (review)
- Layered: a `TDD: required` task whose `Verification` needs a database, queue, broker or network is a finding - that behaviour belongs behind a seam. Integration tasks are the plan's last tasks, each `TDD: none` and `Exclusive: true`, depending on the tasks whose work it exercises, its `Verification` running its own integration test and nothing wider. (review)
- Covers: every acceptance criterion is covered by at least one task's `Covers`, and every number there is an acceptance criterion. (script)
- Covered: each task really delivers what the criteria its `Covers` names require. A condition no single task delivers, like the suite staying green, is not an acceptance criterion but the build's own close. (review)

## Contracts

- Blocks: one `### C<n> - <name>` block per shape the change introduces or consumes, ids `C1`, `C2`, … in order, under the `## Contracts` appendix below the tasks; a change introducing no shape has no appendix and every task carries `Uses: none`. (review)
- Block body: a block opens with `File:` - the repo-relative paths the shape is declared in, or `none` for one living in no file of its own - then the shape itself and nothing else: no rationale, no history, no instruction on how to build it. (review)
- Glossary: a `## Glossary` term the code has to name - an identifier, a field, a state or a value a coder writes - gets its own block, named by the `Uses` of every task that writes or reads it; `File: none` fits a term living in no file of its own. (review)
- Named: every block is named by at least one task's `Uses`. (script)
- Writer: the plan never says which task writes a block and which only calls it: the task whose `Files` holds the block's own file writes it, every other one takes it exactly as written. (review)
- Homed: every `File:` path is in some task's `Files` unless the tree already holds it. (script)
- Seen: at least one task holding a block's `File:` path names that block in its `Uses`. (script)
