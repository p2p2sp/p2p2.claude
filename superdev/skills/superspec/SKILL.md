---
name: superspec
description: Invoked by intent skill only.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Skill, AskUserQuestion, ExitPlanMode, Bash(date:*), Bash(printf:*), WebFetch, WebSearch
---

CRITICAL: Run `ExitPlanMode` first, if plan mode is active.

# SuperSpec
Write a specification document using the superspec template. Leverage the information gathered during the interview. A good specification is short enough that anyone can read it in one sitting, yet precise enough to be implemented without guesswork. Never describes `How` (that is superplan).

## Inputs
Do not re-interview the user - discovery belongs to the intent skill (which may have run, or the user may have skipped). Use whatever context the session already holds; if invoked directly with no prior interview, MUST run the `intent` Skill.

What should be delivered:
- intent interview context
- the spec track was chosen at handoff (this is medium/large work; if it turns out small → stop; hand back to `intent`, which owns the simple-track route)
- optionally `intent: <path>` from the handoff, naming the persisted intent file - write it verbatim into the spec's `Intent:` line; when the handoff carries none, omit that line entirely

- **Refreshed-intent gate** - evaluated before anything else, and before any file is created or modified. Three branches, and only the last one continues:
  - an `intent:` value that does not resolve to an existing file -> the gate is not evaluated: report that exact path back as not found and STOP. Never fall through into your own flow - the `intent` skill's own not-found branch does fall through and treats the argument as a request, but here there is no interview to fall into.
  - a resolved path under `docs/.workflows/` -> `Glob` `<that path's own directory>/refresh.md` (the value is only ever used to derive its own directory's `refresh.md`, never joined with any other segment). No hit -> create and modify NOTHING, run the `intent` Skill with that same path as its sole argument, and STOP. This cannot loop: the `intent` skill writes `refresh.md` on every path that writes an `intent.md`, fresh and resumed alike, and ends at its own handoff, so a bounced run comes back with the file present and the user re-picks the track there.
  - a hit, a resolved path outside `docs/.workflows/`, or no `intent:` line at all -> pass through untouched and carry on. Presence alone is the whole check - the file's content is never read.

## Smell test
- Is anything ambiguous or conflicting with the codebase → STOP and run `intent` Skill - do not invent scope.
- Is any scope decision left open? → the agent will fill it in for you, usually wrong - run `intent` Skill.
- Could an agent build the wrong thing and still satisfy the spec? → tighten the **outcome** and **acceptance criteria**.
- Are you describing style in prose? → replace with one **example**.

## Hard rules for the draft
- User stories: INVEST.
- Spec the area of change, not the whole system.
- Acceptance criteria = one line each, `<n>. <short name> - <condition>`: the condition is a single declarative outcome statement (observable business outcome), the short name is that criterion's title (a few words, no `#`, never changed afterwards - every later reference cites it). NO Given/When/Then, NO UI mechanics. Good: "3. Empty cart blocked - Checking out an empty cart ends with a validation error visible to the user."
- Max 3 AC per story; 4+ → split the story.
- Every AC testable - sketch its failing test; if you can't, fix the AC.
- Spec = `What & Why` - the specific persona who benefits + the concrete observable change for them + business value. No How. If you think "we'll do it via X", that belongs in superplan.
- Out of Scope ≥ 2 entries.
- No TBD / "later" / "details to follow" / Open questions - if you have any → STOP and run `intent` Skill.
- Before publishing: verify every rule above holds and no persona/edge case is missed; fix - never publish while a rule fails.

## Authoring the spec
- Replace every `< ... >` placeholder with real content; delete any section that genuinely doesn't apply.
- Each filled-in block is a WORKED EXAMPLE (a fictional "Add Task" feature) showing the expected level of detail - read it, then overwrite it.
- Be specific. Vague specs now → produce vague code later.
- Right-size the detail to the task: don't over-spec something trivial, don't under-spec something hard.
- Resolve every open point before handing the spec off - a spec must contain answers, not questions.
- Read `references/checklist.md` (relative to this skill's directory) and apply every checklist item to craft an extraordinary spec.

## Publish
Save date (YYYY-MM-DD):
!`date +%F`

- Load spec from `templates/spec.md`.
- **Refining an existing spec** - when an existing spec file path is in context (the user asked to work on that spec), render into it and overwrite that file in place; skip the date/slug step. Keep its existing `Intent:` line unchanged - a refine never adds, drops, or rewrites it.
- **New spec, handoff carried `intent: <path>`** - render into the template and save it as `spec.md` inside that path's own directory.
- **New spec, no `intent:` in the handoff** - create `docs/.workflows/<date>-<slug>/` (`<date>` = the value above; `<slug>` = a short title as slug; append `-2`, `-3`, … on collision) and render into the template, saving it as `spec.md` inside that directory.

## Review gate
Immediately after saving - and BEFORE any handoff - run the reviewer and act on its verdict. Never hand off a spec that has not returned `VERDICT: PASS`. Track which invocation this is (round 1, round 2, …).

Checklist path (for the reviewer): !`printf '%s' "${CLAUDE_SKILL_DIR}/references/checklist.md"`

The reviewer is read-only: it edits nothing and returns issues derivable from the spec's own content + the checklist (`FINDINGS:`) plus what needs product knowledge or a user decision (`BLOCKED:`), plus advisory `NOTES:` that never block a PASS. Every fix is yours to apply.

1. Invoke `superspec-reviewer` (Skill). The `args` MUST be a labeled block, one `label: value` per line. Every value is a PATH - the reviewer reads the files itself; NEVER paste file content. A bare path with no label is equally wrong:
   ```
   spec: <saved spec filepath>
   checklist: <checklist path above>
   round: <N>
   ```
   `round` starts at 1 and increments by 1 each invocation of this loop for the current spec. From round 2 on, also append one `prior-blocking: <finding>` line per FINDINGS entry the previous round returned, verbatim.
2. Read the first line of its output: `VERDICT: PASS` or `VERDICT: FAIL`, and concisely show the human the FINDINGS, any BLOCKED items, and any NOTES.
3. `VERDICT: PASS` → NOTES may be applied directly to the spec now (no exit gate exists for specs, so a post-verdict edit is safe) or relayed to the user at Handoff instead - no re-review required either way. Proceed to **Handoff**.
4. `VERDICT: FAIL` - apply the fixes to the spec file yourself, then go back to step 1:
   - **`FINDINGS`** → edit the spec as each one directs; touch nothing else. Exception - a Blocking finding whose evidence you can show is factually wrong (repo state or the interview context already in your context contradicts it) → do not re-loop on it; instead present that single finding plus your counterargument to the user in plain prose and apply their ruling.
   - **`BLOCKED` items present** → resolve each from the interview context already in your context and edit the spec accordingly; an item needing a genuinely open product decision → run the `intent` Skill (or ask the user) first.
5. **Round cap:** after round 3 without PASS, STOP looping - show the user the remaining findings and let them decide how to proceed.
- Do not advance to Handoff until the reviewer returns `VERDICT: PASS`.

## Hand off
Handoff is not the interview - use `AskUserQuestion`. The user's confirmation is the gate; never route yourself past it.
- **SuperPlan** - run the `superplan` Skill, passing the saved spec filepath (`docs/.workflows/<run>/spec.md`) as the sole argument.
- **Done for now** - STOP. Do not do anthing more.
