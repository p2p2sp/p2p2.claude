# Phases file - template and content rules

Loaded by the `phases` skill only at write time - right before the `Write` (or overwrite) of
`<intent dir>/phases.md`. Not needed while proposing or discussing the split.

## Content rules
- Write the file in the interview's language, in the exact structure below - one `###` block per
  phase, nothing else.
- `Dir:` is the machine-read contract: `phases-status.sh`, and every later resume, join it to the
  phases file's OWN directory. Always write it relative to that directory - `phases/<NN>-<slug>` -
  never absolute, never repo-relative, never with a `./` prefix. That relative form is what keeps
  the whole run movable.
- `<NN>` is the phase number, zero-padded to two digits (`01`, `02`, … `10`), consecutive from `01`,
  and the same number as the `###` heading it belongs to. `<slug>` is a short kebab-case title.
- `Covers:` names the master intent's decisions by the numbers they carry in its `## Decisions`
  section (`decisions #2, #5`). Every decision of the intent appears in exactly one phase; no phase
  names a decision the intent does not have. Keep the master numbers - never renumber per phase.
- `Delivers:` is the checkable outcome of the phase: what a human can observe or run once the phase
  is built. Never a list of files or steps.
- `Depends on:` names only lower-numbered phases (`phase 01`, `phase 01, 02`); phase `01` is always
  `none`. A dependency on a later phase means the order is wrong - fix the order, not the line.
- NEVER record a rejected split, an alternative cut, or why one lost. Alternatives belong to the
  live conversation; in the file they only crowd the judgement of every downstream reader (the phase
  intents, the specs, the plans, the changelog). `## Out of scope` is not a loophole for them: it
  lists non-goals - what this whole undertaking deliberately does not do - never a rejected split.
- No TBD, no placeholder, no empty mandatory section - resolve it with the user before writing.
- Use repo-relative paths when referencing files, never absolute paths.

## Template

```markdown
# Phases: <title>
Date: <YYYY-MM-DD>
Intent: <repo-relative path to the master intent.md>

## Goal
<what the whole undertaking delivers, one short paragraph, and one sentence on what the cut into
phases follows - the order of dependencies, the order of value, or both>

## Phases

### 01. <phase title>
- Dir: phases/01-<slug>
- Goal: <what this phase achieves, one sentence>
- Covers: decisions #<n>[, #<m>]
- Delivers: <the observable, checkable result at the end of this phase>
- Depends on: none

### 02. <phase title>
- Dir: phases/02-<slug>
- Goal: <...>
- Covers: decisions #<n>[, #<m>]
- Delivers: <...>
- Depends on: phase 01

## Out of scope
- <non-goal: something this undertaking deliberately does not do - never a rejected split>
```
