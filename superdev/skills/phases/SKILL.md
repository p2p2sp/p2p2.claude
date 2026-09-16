---
name: phases
description: Splits one confirmed intent into ordered phases. Invoked from the intent skill's handoff gate (Phases option) or by the user command `phases` on an existing intent.md or phases.md - never spontaneously, never before an intent interview.
argument-hint: <path-to-intent.md | path-to-phases.md>
user-invocable: true
allowed-tools: Read, Grep, Glob, Agent, Task, AskUserQuestion, Skill, ExitPlanMode, Write, Edit, Bash(${CLAUDE_PLUGIN_ROOT}/scripts/phases-status.sh:*), Bash(date:*), Bash(printf:*)
---

CRITICAL: Run `ExitPlanMode` first, if plan mode is active.

# Phases

One confirmed intent, too big for a single run, becomes an ordered list of phases. Each phase later starts as its own `intent <phase intent.md>` and goes down its own Simple or Spec track, unchanged. This skill only cuts the work and records the cut - it never specs, plans or builds anything.

## Run
Date: !`date +%F`

## Input
`$ARGUMENTS` is either a line `intent: <path>` (from the intent skill's handoff) or a bare path. Take the path from it and dispatch on that path alone:

- basename `phases.md` -> go to `## Resume`.
- basename `intent.md` whose path contains a `phases/` segment -> tell the user that a phase is already one unit of work and cannot be split again into nested phases; if the phase turned out too big, the fix is to reopen the master phase split and re-cut it there. STOP - write nothing.
- any other `intent.md` -> go to `## Fresh`.
- anything else, or a file that does not exist -> report the path as not found (or not an intent/phases file) and STOP.

Never continue without a path - this skill never runs from context alone, and never runs an interview of its own.

## Fresh
1. Read the intent file. Its `## Decisions` numbering is the contract every phase's `Covers:` line refers to - never renumber it.
2. When the cut depends on the host code's structure (which modules exist, what depends on what, what is already in place), launch `Explore` agents in parallel, in one batch, to map it. Skip when the intent already answers it.
3. Propose the split in plain prose as a numbered list - one block per phase:
   - the phase title,
   - its goal in one sentence,
   - `Covers` - the master decisions it absorbs, each as `` `<decision question>` (decision <n>) ``, never a bare number,
   - what is checkable at the end of it,
   - what it depends on, each as `` `<phase title>` (phase <NN>) `` (earlier phases only, `none` for the first).
   Close with one line of rationale for the cut - what the order follows (dependencies, value, or both).
4. Run the conversation one round per turn - the user merges, splits, reorders or renames phases; re-present the full list after each round. Plain prose only, never `AskUserQuestion` - this is a discussion, not a form. Continue until the user confirms the list.
5. The intent carries a single decision, or the user rejects the split entirely -> tell them the work fits one run and point them back to `intent <path to that intent.md>` to pick a track there. STOP - write nothing.
6. A `phases.md` already exists next to the intent -> ask the user before overwriting it (an existing phases file means this is a resume, not a fresh split, so `phases <that phases.md>` is usually what they want). No answer to overwrite -> STOP.
7. Only now Read `references/phases-template.md` (relative to this skill's directory) and `Write` the confirmed list to `<intent dir>/phases.md` exactly as it prescribes - `Date:` from `## Run`, `Intent:` the repo-relative path of the intent file just read. Then go to `## Review gate`.

## Review gate
Immediately after saving - and BEFORE writing any phase intent - run the reviewer and act on its verdict. Never write a phase intent from a phases file that has not returned `VERDICT: PASS`. Track which invocation this is (round 1, round 2, …).

Checklist path (for the reviewer): !`printf '%s' "${CLAUDE_SKILL_DIR}/references/checklist.md"`

The reviewer is read-only: it edits nothing and returns issues derivable from the phases file, the intent and the checklist (`FINDINGS:`) plus what needs product knowledge or a user decision (`BLOCKED:`), plus advisory `NOTES:` that never block a PASS. Every fix is yours to apply.

1. Invoke `phases-reviewer` (Skill). The `args` MUST be a labeled block, one `label: value` per line. Every value is a PATH - the reviewer reads the files itself; NEVER paste file content. A bare path with no label is equally wrong:
   ```
   phases: <saved phases filepath>
   intent: <master intent filepath>
   checklist: <checklist path above>
   round: <N>
   ```
   `round` starts at 1 and increments by 1 each invocation of this loop for the current phases file. From round 2 on, also append one `prior-blocking: <finding>` line per FINDINGS entry the previous round returned, verbatim.
2. Read the first line of its output: `VERDICT: PASS` or `VERDICT: FAIL`, and concisely show the human the FINDINGS, any BLOCKED items, and any NOTES.
3. `VERDICT: PASS` -> proceed to `## Phase intents`. NOTES may be applied to the phases file first or relayed at the handoff instead - no re-review required either way.
4. `VERDICT: FAIL` - apply the fixes to `phases.md` yourself with `Edit`, then go back to step 1:
   - **`FINDINGS`** -> edit the phases file as each one directs; touch nothing else. Exception - a Blocking finding whose evidence you can show is factually wrong (the intent or the repo state already in your context contradicts it) -> do not re-loop on it; present that single finding plus your counterargument to the user in plain prose and apply their ruling.
   - **`BLOCKED` items present** -> resolve each from the intent and the confirmed conversation already in your context; an item that reopens the cut itself -> put it to the user in prose and apply their answer.
5. **Round cap:** after round 3 without PASS, STOP looping - show the user the remaining findings and let them decide how to proceed.
- Do not write a single phase intent until the reviewer returns `VERDICT: PASS`.

## Phase intents
After `VERDICT: PASS` only. Read `${CLAUDE_PLUGIN_ROOT}/skills/intent/references/intent-template.md`, then `Write` one full intent file per phase at `<intent dir>/phases/<NN>-<slug>/intent.md` (the `Dir:` value of that phase, joined to the phases file's own directory). The `Write` call itself creates the directory - never `mkdir`. Each file is a complete intent in the template's structure, in the master's language:

- `# Intent: <phase title>` and `Date:` from `## Run`.
- `## Request` - the phase's goal, written in the master's framing, as the ask for this phase alone.
- `## Decisions` - the master's decision blocks named in that phase's `Covers:` line, copied **verbatim**, keeping their master numbers (so `#5` stays `### 5.`). Copy no other decision.
- `## Constraints` - the master constraints that apply to this phase, plus one bullet `` `<phase title>` (phase <NN>) of <repo-relative phases file path> `` - the title from that phase's own `###` heading - plus one bullet per earlier phase it depends on, naming it the same way and its `Delivers:` as already in place.
- `## Out of scope` - the other phases' goals, as non-goals of this phase (they are built in their own runs), plus the master's own out-of-scope entries.
- `## ADR` - phase `01` only: the master's `## ADR` section copied verbatim when the master has one; every other phase intent has no `## ADR` section, whatever its `Covers:` names.
- `## History` - the master's, verbatim.

Each phase intent must stand on its own: a later phase's run reads only its own file, never the master intent.

## Handoff [GATE]
Handoff is not the conversation - use `AskUserQuestion`. The user's choice is the gate; never route yourself past it. Show the phases file path and the phase list first.
- **Start `<phase 01 title>` (phase 01)** - the title from phase 01's own `###` heading; run the `intent` Skill with phase 01's `intent.md` path as the sole argument (a bare path, no label). That run picks its own track at intent's own handoff.
- **Stop here** - STOP. Reply with the phases file path and tell the user that `phases <path>` resumes the undertaking anytime.

## Resume
1. Run `"${CLAUDE_PLUGIN_ROOT}/scripts/phases-status.sh" <phases file path>` with the Bash tool. Exit code != 0 -> relay its stderr to the user and STOP.
2. Relay its output as a short table - one row per phase, the script's three tab-separated columns (`<dir>`, `<status>`: `done` / `building` / `planned` / `pending`, `<title>`) - and the `next:` line (`next: <dir><TAB><title>`, or `next: none`).
3. `next: none` (every phase `done`) -> tell the user every phase is complete and STOP.
4. Otherwise `AskUserQuestion`:
   - **Start `<title>` (phase <NN>)** - title and directory from the `next:` line, `<NN>` the two-digit prefix of that directory's name; a title of `-` (a phases file with no `### NN.` headings) falls back to the directory's own name. The `next:` directory's `intent.md`, passed to the `intent` Skill as its sole argument (a bare path).
   - **Stop here** - STOP, repeating the phases file path.

Never re-propose or re-cut the phases on a resume - the split was already confirmed and reviewed. A scope that genuinely changed is the user's call: they edit `phases.md` and the affected phase intents by hand, or reopen one phase with `intent <phase intent.md>`.
