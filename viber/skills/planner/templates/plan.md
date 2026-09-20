# <change title>

<!-- source: <absolute path of THIS plan file, the one plan mode named> -->

Build: skill `implementor`

<!-- two parts: everything above "## Tasks" is the specification - WHAT and WHY - and is split off as
     spec.md; the tasks below are the implementation plan - HOW - one file each under tasks/ -->

## Goal

<2-4 sentences: what gets built and why. No description of the solution.>

## Acceptance criteria

1. <observable condition that can be checked>
2. <...>

## Scope

### File map

- add | modify | delete - <path> - <what this file owns>

### Out of scope

- <what this change does not touch>

## Contracts

<signatures, data shapes, endpoints, schemas this change introduces or consumes - or "none">

## Tasks

<!-- TASK -->
### T1 - <title>
- TDD: required | none
- Covers: #1, #2
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
