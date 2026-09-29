---
source: <absolute path of THIS plan file, the one plan mode named>
into: <run key of the draft this round continues; drop the line otherwise>
issue: <full issue URL the run is tied to; drop the line otherwise>
---

To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# <change title>

## Goal

<2-4 sentences: what gets built and why. No description of the solution.>

## Roadmap

<!-- Only when the change was split into parts; otherwise drop this section.
     The build cuts it into roadmap.md, never into spec.md. Every later part
     lists the decisions settled for it as indented lines; a plan continuing
     the roadmap marks the earlier parts (built) and moves its own part's
     decisions into its specification. -->

Part <n> of <N> - <this part>

1. <part> (built)
2. <part> (this plan)
3. <part>
   - <decision settled for this part>

## Acceptance criteria

1. <observable condition that can be checked>
2. <...>

## Scope

### File map

- add | modify | delete - <path> - <what this file owns>

### Out of scope

- <what this change does not touch>
