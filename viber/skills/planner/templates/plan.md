# <change title>

<!-- source: <absolute path of THIS plan file, the one plan mode named> -->

Build: skill `implementor`

## Goal

<2-4 sentences: what gets built and why. No description of the solution.>

## Roadmap

<!-- Only when the idea was split into subprojects; otherwise drop this section. -->

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
- DoD: <observable done condition>; <the next one>; <each clause observable on its own>
<!-- /TASK -->

<!-- TASK -->
### T2 - <title>
- TDD: required | none
- Exclusive: true
- Covers: #<n>
- Uses: C1, C2
- Depends-on: T1
- Files: <repo-relative path>
- Delivers: <...>
- Verification: <...>
- DoD: <...>
<!-- /TASK -->

<!-- One TASK block per unit of work; leave every HTML marker intact. "Exclusive: true" is the one
     optional line and the only value it takes. -->

## Contracts

<!-- One block per shape this change introduces or consumes: signature, type, endpoint, schema,
     error code, dictionary key. "File:" says where the shape is declared, or "none".
     No contract at all -> drop this section and every task carries "Uses: none". -->

### C1 - <name>

File: <repo-relative path>, <repo-relative path> | none

<the shape itself>

### C2 - <name>

File: <...>

<...>
