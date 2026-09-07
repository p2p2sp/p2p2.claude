
## Task 7 - Persist the intent file, add resume mode and the history Explore agent
- Covers: criteria #7
- TDD: none

### Dependencies
- Task 6 - blocks: edits the same `intent/SKILL.md` after the docs bullet is gone

### Files
- modify - superdev/skills/intent/SKILL.md (frontmatter `allowed-tools`, new `argument-hint`, `## Explore first`, new `## Resume from a file`, `## Synthesis`, `## Handoff`)

### Test Commands
#### Build
- none - the repo has no build step

#### Tests
- `node --test tests/portability.test.ts` -> `# fail 0` (the new `date` preload must be quoted-safe)

### Approach
1. Frontmatter: add `Write` and `Bash(date:*)` to `allowed-tools`; add `argument-hint: [path-to-intent.md]`. Add a `Date:` preload line `` !`date +%Y%m%d` `` under a short `## Run` heading (same pattern as `superspec` Publish).
2. `## Explore first`: add the bullet "History agent - always one of the parallel `Explore` agents when `docs/changelog/` or `docs/adr/` exists: grep `docs/changelog/README.md` for the request's areas, open the matched entries, follow their `ADR:` links, and independently `Grep docs/adr/` for the same areas. Report each hit as decision context (what was chosen, why, whether a rejected alternative is the one now proposed) - the interview asks whether to uphold it; history is never a requirement. Neither dir present -> skip without comment."
3. New `## Resume from a file` (placed before `## Explore first`): when `$ARGUMENTS` is a path to an existing file ending in `-intent.md`: Read it, skip Explore and the interview, present its `## Decisions` as the synthesis and ask whether to reopen one decision by number; a reopened decision runs the interview for that branch only, then the file is overwritten in place; then go to Handoff. Any other argument or none -> the normal flow.
4. `## Synthesis`: after the user confirms, write `docs/.workflows/<Date>-<slug>-intent.md` (`<slug>` = short title as slug, same rule as `superspec`) in the interview language, format per Contracts; on resume overwrite the same path.
5. `## Handoff`: the `AskUserQuestion` offers three options - Simple path, Spec path, Stop here. Stop here -> reply with the intent path and `intent <path>` as the way back, then STOP. Simple / Spec -> invoke `simpleplan` / `superspec` passing `intent: <path>` as the argument line (the receiving skill writes it into its `Intent:` preamble).

### Edge cases
- Slug collision on the same day -> overwrite is the intended behavior only on resume; on a fresh run append `-2` when the file exists.
- Resume on a path that does not exist -> say so and fall through to the normal flow using the argument as the request text.

### Contracts
- Intent file:
  ```
  # Intent: <title>
  Date: <YYYY-MM-DD>

  ## Request
  <the ask in one short paragraph, the user's own framing>

  ## Decisions
  ### <n>. <decision name>
  - Chosen: <approach>
  - Alternatives: <a> - <why rejected>; <b> - <why rejected>
  - Why: <reason>

  ## Constraints
  - <...>

  ## Out of scope
  - <...>

  ## History
  - <changelog entry or ADR consulted - upheld | changed, why> (or `none`)
  ```
- Handoff argument line to `simpleplan` / `superspec`: `intent: docs/.workflows/<yyyyMMdd>-<slug>-intent.md`.

### DoD
`intent/SKILL.md` carries the resume section, the file write, the three-option gate and the history agent bullet; portability sweep green.


### Covered criteria
7. `intent/SKILL.md`: after the user confirms the synthesis it writes `docs/.workflows/<yyyyMMdd>-<slug>-intent.md` in the format fixed in Task 7 Contracts, then the handoff `AskUserQuestion` offers Simple / Spec / Stop here (telling the user to resume with `intent <path>`); when `$ARGUMENTS` is a path to an existing `*-intent.md` it skips exploration and interview, presents that file's synthesis, lets the user reopen one named decision (interview only that branch, overwrite the file in place) and goes to the gate; the Explore batch contains one explicit history agent (changelog index -> matched entries -> linked ADRs, plus an independent `Grep docs/adr/`) whose findings enter the interview as decision context, never as requirements, and skips silently when neither `docs/changelog/` nor `docs/adr/` exists.
