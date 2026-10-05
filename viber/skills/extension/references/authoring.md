# Authoring an extension agent and its phase skills

## Every file

- `description:` in the third person: what the file produces and from what, then its routing guard as the last sentence. No angle brackets, under 1024 characters; `name` is lowercase letters, digits and single hyphens, at most 64.
- Body as input -> work -> output. Cut every line that is true only of the caller's world (who dispatches it, why); keep scope limits even when they name a sibling.
- Write only the delta from what a competent model does unaided. Where the project's files already show the convention (naming, layout, tone), point to them instead of restating it.
- Most critical rules first, under a heading. One rule per line, in the imperative ("Write X", "Never Y"), with at most one short clause of why. No hedges ("try to", "if possible", "consider"), no politeness, no narration of how.
- ALWAYS, NEVER and CRITICAL only for a rule whose violation is irreversible or breaks the output contract.
- Name one concept by one term everywhere. State only what holds now, never a decision's history.
- Clean text: bullets over prose, no tables, no italics, no emoji.
- A deterministic step (parsing, sorting, counting, a fixed command) is one exact command line to run, not reasoning to redo.
- Never tell the file to read the project's instruction files: the harness injects them.

## The agent's Task section

- Fill `Produces`, `Writes to`, `Language` and `Reads` from the interview, each one concrete: paths, not "the docs".
- Phases -> add `Skill` to `tools:` and to the opening tool sentence, then one `Phases` bullet naming each phase skill in run order. Invoke each through `Skill` with these args lines and nothing else: `run:`, `spec:`, `notes:`, `out: <out>/<phase>/`, plus `prior: <out>/<previous phase>/` from the second phase on.
- A phase returning `FAIL:` ends the agent on `VERDICT: FAIL` with that reason and runs no later phase; a phase returning `DENIED:` ends it on `VERDICT: DENIED` with that reason. The agent's `FILES:` line is the union of every phase's `FILES:` line.

## A phase skill

- Path `.claude/skills/<agent>-<phase>/SKILL.md`, `name: <agent>-<phase>`.
- Frontmatter: `context: fork`, `user-invocable: false` (never `disable-model-invocation`, which blocks the agent's `Skill` call too), `model:` the agent's own unless the phase needs a stronger one, and a description ending "Invoked only by the <agent> agent, never directly."
- The fork sees none of the agent's conversation: its whole input is `$ARGUMENTS`, the labelled lines above. Read `prior:` for the previous phase's result; write this phase's own intermediate result under `out:`.
- Carry the agent's Rules section in full: git read-only, never write into the run directory, write only the paths the agent's Task section names, stop every background process it started, the read-back of a leaked closing tag.
- Never invoke a skill and never dispatch an agent from a phase: the fork already runs two levels below the build.
- End on exactly one of: `FILES: <repo-relative paths, comma-separated, or none>`, `FAIL: <one line>`, `DENIED: <refused tool name>: <the exact refused command, or the path for a file tool>`.
