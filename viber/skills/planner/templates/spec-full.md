---
source: <absolute path of THIS plan file, the one plan mode named>
into: <run key of the draft this round continues; drop the line otherwise>
issue: <full issue URL the run is tied to; drop the line otherwise>
work: <branching.work entry key the run branch comes from; drop the line under branching off>
branch: <run branch name, or none for no branch; drop the line under branching off>
---

To build this plab you must invoke skill `viber:implementor` with `source:` path as its only argument.

# <change title>

## Goal

<2-4 sentences: what gets built and why. No description of the solution.>

## Problem

<What breaks or is missing today, and for whom. The cost of leaving it alone.>

## Current behaviour

<How the area behaves today, in plain language. "Nothing yet" for a new capability.>

<!-- Every line under the next heading travels into EVERY task file, so it is a
     coder's standing boundary rather than a wish: name only behaviour this
     plan's own file map could break, and keep the list short. -->

### Must not change

- <behaviour that already works and has to keep working>

## Roadmap

<!-- Only when the change was split into subprojects; otherwise drop this section. -->

Part <n> of <N> - <this subproject>

1. <subproject> (built)
2. <subproject> (this plan)
3. <subproject>

## Behaviour

<!-- One block per scenario worth proving. Tag a scenario that touches an existing
     capability: [NEW], [CHANGED - was: <what it did>] or [REMOVED - reason: <why>].
     An untagged block is new behaviour in a new area. -->

### S1 - <scenario title> [NEW]

<What happens, in plain language, from the outside.>

Given <the starting situation>
When <what the actor does>
Then <what they observe>

### S2 - <scenario title> [CHANGED - was: <old behaviour>]

<...>

Given <...>
When <...>
Then <...>

### Edge cases

- <the unusual input, the empty case, the limit> -> <what happens>

## Glossary

<!-- Only the terms this change introduces or redefines, one line each, in plain
     language. A term a coder has to name in the code gets its own "## Contracts"
     block as well - the glossary is for shared understanding, the contract is
     what reaches a coder. -->

- <term> - <what it means here, and what it is not>

## Acceptance criteria

1. <observable condition that can be checked>
2. <...>

## Scope

### File map

- add | modify | delete - <path> - <what this file owns>

### Out of scope

- <what this change does not touch>

## Constraints

- <what binds the solution: compatibility, data, performance, a deadline>
