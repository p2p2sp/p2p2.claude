### Severity classes

- Blocking (drives `VERDICT: FAIL`, cite the violated criterion plus a quote from the spec text as
  evidence): an implementation detail leaking into a requirement ("How" instead of "What/Why"); an
  acceptance criterion phrased as mechanics rather than an observable outcome; a user story with 4
  or more acceptance criteria (not right-sized); a TBD, placeholder, or unfilled mandatory section;
  an Out of Scope list with fewer than 2 entries; a requirement that is untestable or ambiguous; a
  success criterion that is unmeasurable or names an implementation detail; a missing acceptance
  scenario or unidentified edge case; scope not bounded on both sides; an unidentified dependency or
  assumption the spec relies on; an acceptance criterion that is not written as
  `<n>. <short name> - <condition>` - no short name before the ` - ` separator, or a short name
  containing `#`.

  Carve-out on the first criterion: naming an existing artifact as part of the starting state inside
  `## Problem / context (Why)` is not that leak. The leak is prescribing how the change will be
  built, or naming an artifact inside a goal, a user scenario or an acceptance criterion.
- Advisory (NOTES on a PASS, never blocks): wording, structure, and right-sizing suggestions that
  do not violate a Blocking criterion above.

### Never flag

- Content that already satisfies the criteria as written.
- Naming or phrasing preferences with no effect on testability or clarity.
- A hypothetical gap with no quoted spec text behind it.
- An alternative to a decision the spec has already fixed.
- An existing artifact named in `## Problem / context (Why)` as the state the change starts from.

### Evidence rule

A Blocking finding must cite the violated criterion plus a direct quote from the spec text
that shows the violation. A suspicion with no quotable spec text behind it is not Blocking: demote
it to NOTES, phrased as a question.