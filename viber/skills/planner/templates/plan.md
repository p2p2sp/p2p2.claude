# <change title>

<!-- source: <absolute path of THIS plan file, the one plan mode named> -->

Build: skill `implementor`

<!-- three parts: everything above "## Tasks" is the specification - WHAT and WHY - and is split
     off as spec.md; the tasks are the implementation plan - HOW - one file each under tasks/;
     the "## Contracts" appendix carries the shapes, sliced into those task files by each task's
     "Uses:" line. A signature never appears above "## Tasks". -->

## Goal

<2-4 sentences: what gets built and why. No description of the solution.>

## Roadmap

<!-- Only when the idea was split into subprojects: the ordered list with this plan's entry marked,
     every later entry repeated under "### Out of scope". Not split -> drop this section. -->

Part <n> of <N> - <this subproject>

1. <subproject> (built)
2. <subproject> (this plan)
3. <subproject>

## Acceptance criteria

1. <observable condition that can be checked>
2. <...>

## Scope

### File map

- add | modify | delete - <path> - <what this file owns>

### Out of scope

- <what this change does not touch>

## Tasks

<!-- TASK -->
### T1 - <title>
- TDD: required | none
- Covers: #1, #2
- Uses: C1 | none
- Depends-on: none
- Files: <repo-relative path>, <repo-relative path>
- Delivers: <what the task produces - WHAT, never HOW>
- Verification: <command> -> <result that counts as proof>
- DoD: <observable done condition>
<!-- /TASK -->

<!-- TASK -->
### T2 - <title>
- TDD: required | none
- Covers: #<n>
- Uses: C1, C2
- Depends-on: T1
- Files: <repo-relative path>
- Delivers: <...>
- Verification: <...>
- DoD: <...>
<!-- /TASK -->

<!--
One TASK block per unit of work; leave every HTML marker intact.
The whole heading line, "T<n> - <title>", is committed verbatim as the commit subject.
-->

## Contracts

<!-- One block per shape this change introduces or consumes: signature, type, endpoint, schema,
     error code, dictionary key. Every block is named by at least one task's "Uses:" - a block
     nobody names reaches no coder and is rejected at validation. Whether a task writes its
     block or only calls it is read off its own "Files:", so no second field says so.
     No contract at all -> drop this section and every task carries "Uses: none". -->

### C1 - <name>

<the shape itself>

### C2 - <name>

<...>
