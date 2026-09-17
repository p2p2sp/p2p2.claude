---
name: intent
description: You MUST ALWAYS use this skill every time a user wants to do something creative - a new idea, a new feature, build something from scratch, a change to an existing solution. Do not trigger when the user explicitly asks for a vibe change (skip planning, do it right away) - that request belongs to the vibe skill.
argument-hint: [path-to-intent.md]
allowed-tools: Read, Grep, Glob, Agent, Task, AskUserQuestion, Skill, ExitPlanMode, Write, Bash(date:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/read-config.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/last-commit-date.sh:*)
---

CRITICAL: Run `ExitPlanMode` first, if plan mode is active.

Help turn ideas into fully formed designs and specs through natural collaborative dialogue. First thing to do is reach a shared understanding of `What` and `Why` the user wants and `How` to build something, before any plan or code is drafted.

## Run
Date: !`date +%F`
Last commit: !`"${CLAUDE_PLUGIN_ROOT}/scripts/last-commit-date.sh"`

## Config

Resolved opt-in switches:

!`"${CLAUDE_PLUGIN_ROOT}/scripts/read-config.sh"`

The ADR step below runs ONLY when the `adr:` line above reads exactly `true`; anything else - `false`, absent, an unresolved block, a missing config file - means skip, and nothing below breaks on it.

## Resume from a file
- `$ARGUMENTS` is a path to an existing file named `intent.md`: Read it, then go to `## Refresh on resume` before anything else - `## Explore first` and `## Run the interview` stay skipped entirely; the refresh step is what replaces exploration here. Only once that step has written its `refresh.md`, present the file's `## Decisions` section as the synthesis, marking every decision named in that file's `## Impact on decisions` with the one line it carries there, and ask the user whether to reopen one decision - naming each decision, marked or offered, as `` `<question>` (decision <n>) ``, the question copied from its `### <n>.` heading, never a bare number.
  - A decision is reopened: run `## Run the interview` for that branch only, then overwrite the intent file in place with the updated decision (and anything it invalidates downstream) - Read `references/intent-template.md` (relative to this skill's directory) right before that overwrite. The `refresh.md` written a moment ago stays as it stands - reopening a decision changes the intent, not the delta behind it. Go to `## Handoff`.
    - ADR, after that branch re-interview and before the overwrite: the `adr:` line under `## Config` reads exactly `true` -> invoke the `adr` Skill with the single argument line `decision: <n>`, `<n>` being the reopened decision, and wait for its reply. Then drop from the resumed file every `## ADR` block whose `Decision:` line names that same decision and put the returned blocks in their place - `ADR: none` drops them with nothing to replace them, and a `## ADR` section left without a single block is dropped from the overwrite altogether. A block naming any other decision is carried over untouched.
    - The `adr:` line reads anything but `true` -> the `adr` skill is not invoked at all and the resumed file's `## ADR` section is carried into the overwrite verbatim.
  - No decision reopened: go straight to `## Handoff` - nothing is rewritten, so the file's `## ADR` section stays exactly as it stands, whatever the `adr:` line reads.
- `$ARGUMENTS` names an `intent.md` path that does not exist: tell the user the file was not found, then fall through to the normal flow using the argument text itself as the request.
- Any other argument, or none: normal flow - continue to `## Explore first`.

## Refresh on resume
Reached only from `## Resume from a file`, and never skipped there. Its mandate is one question - **what changed since this intent was written** - and its output is one file, `refresh.md`, written next to the resumed intent on every pass through this section, the pass that finds nothing included. Never leave this section without that `Write`.

1. **Baseline.** Read the resumed file's `Date:` line. A line matching `^Date: \d{4}-\d{2}-\d{2}` -> its value is `<Baseline>`. No such line, or a value in any other shape -> `<Baseline>` is `unknown`: keep going with no date bound anywhere (the whole `docs/changelog/` index in scope, `git log` without `--since`) and record `Baseline: unknown` in the file.
2. **Is there anything to compare?** Decide it with `Glob` / `Read` / `Grep` and the `## Run` block alone - this step runs no command of its own, and the only git fact it uses is the `Last commit:` value the preload already resolved. There is something to compare when ANY of these holds:
   - `docs/changelog/` holds an entry dated after `<Baseline>` (`Glob` `docs/changelog/*.md` - the entry filenames carry their date - or read the index `docs/changelog/README.md`);
   - the resumed file sits under a `phases/<NN>-<slug>/` directory whose parent `phases/` also holds a LOWER-numbered phase directory;
   - `<Baseline>` is `unknown`, or it is earlier than the `Last commit:` date under `## Run` - the repo moved after this intent was written, so commits no changelog entry records may exist. `Last commit:` reads `none` (no git, not a repository, no commit yet) -> this bullet HOLDS: an unknown repo state is never read as a static one. Today's date is NOT the bound here - a resume on a later day into a repo that has not moved is exactly the case this bullet must not fire on.
   None of them holds -> dispatch nothing, skip step 3, and go to step 4 with every section empty. This covers the phase-01 case (nothing was built before it) and the untouched-repo case (nothing was built since): either way nothing is worth an agent.
3. **Delta.** Launch both `Explore` agents in parallel, in ONE batch (one message, two `Agent` calls). Each reports findings only - neither proposes a change, and nothing either returns overrides a confirmed decision of the intent.
   - **History agent** - dispatched only when `docs/changelog/` or `docs/adr/` exists; neither present -> do not dispatch it at all and its section is `none`. Grep `docs/changelog/README.md` and the entry filenames for dates after `<Baseline>`, open every match, follow each entry's `ADR:` link, and independently `Grep docs/adr/` for the areas this intent's decisions rest on. The resumed file sits under a `phases/` segment -> also open the entries of this run's earlier phases, whatever their date. Report one line per entry or ADR: what it changed, its repo-relative path, and which area of this intent it touches.
   - **Code agent** - verify against the repo what the intent treats as already in place: every earlier phase's `Delivers:` named in its `## Constraints`, and every other `## Constraints` bullet - each reported as confirmed, or in the shape the repo really has. It also runs `git log --since=<Baseline> --oneline` ITSELF to catch movement no changelog entry records, and reports the topics it finds rather than the raw log. `<Baseline>` enters that command only when it matches `^\d{4}-\d{2}-\d{2}$` exactly; otherwise the command runs without `--since`. Not a git repository, no commits, or the command fails -> skip the log and verify by `Read` / `Grep` / `Glob` alone.
4. **Sections.** `## Since the baseline` is the history agent's report, `## Delivered state` the code agent's constraint verification, `## Other movement` its git topics; `## Impact on decisions` is yours - derive it by matching both reports against the resumed file's `## Decisions`, naming each touched decision as `` `<question>` (decision <n>) `` - the question copied from its `### <n>.` heading - and nothing else. A section whose source was not dispatched, returned nothing, or returned nothing usable is the single bullet `none` - never a missing section, and never a reason to hold back the write.
5. **Write.** Read `references/refresh-template.md` (relative to this skill's directory) and `Write` `<directory of the resumed file>/refresh.md` exactly as it prescribes, overwriting whatever was there. Only then go back to `## Resume from a file` and present the decisions.

## Explore first
- When the request touches existing code or conventions, launch multiple `Explore` agents in parallel in one batch to map relevant files, patterns, rules, and prior decisions. Anything you can answer from the codebase, do NOT ask the user.
- History agent - always one of the parallel `Explore` agents when `docs/changelog/` or `docs/adr/` exists: grep `docs/changelog/README.md` for the request's areas, open the matched entries, follow their `ADR:` links, and independently `Grep docs/adr/` for the same areas. Report each hit as decision context (what was chosen, why, whether a rejected alternative is the one now proposed) - the interview asks whether to uphold it; history is never a requirement. Neither dir present -> skip without comment.
- Skip exploration only when the request is genuinely greenfield.
- Carry the discovered conventions into proposed approaches so `How` always fits the host project.

## Run the interview
- Enter with Explore's findings in hand. Never re-ask what the codebase already settled.
- Walk the design tree branch by branch, resolving dependencies one decision at a time - early answers reshape later branches, so do not batch.
- Ask ONE question per turn so the user can pause, push back, or revisit any earlier choice without losing the thread.
- For each decision, propose 2-3 approaches with trade-offs, lead with your recommendation, and explain why it wins.
- Treat answers as living. If a later answer invalidates an earlier branch, surface it and re-open that decision instead of pressing forward.
- Prefer multiple choice questions when possible, but open-ended is fine too.
- Must number the options (`1`, `2`, `3`, and sub-options `1.1`, `1.1.1`, `1.2`, `1.2.1...` when the choice branches) so the user can point to an answer without re-typing it.
- Use plain prose, not the `AskUserQuestion` tool - the interview is a conversation, not a form. Form-style pickers flatten the trade-off discussion you are trying to have.

**Use ALWAYS this structure as an example of one question:**

> **Decision 2: where does the session token live?**
>
> [Recommended]: **2.1 HttpOnly cookie** - survives reload, immune to XSS exfiltration, no client-side wiring. Trade-off: needs a CSRF strategy.
>
> Alternatives:
> 2.2 `localStorage` - simpler, but readable from any script on the page.
> 2.3 In-memory only - safest, but logs the user out on every reload.
>
> Indicate: (2.1 / 2.2 / 2.3)?

## Keep this discipline
- ALWAYS use simple natural language.
- DO NOT simplify your decisions, do not use abbreviations or substitutes in a language other than the one being interviewed.
- "This is too simple to need a design" is an anti-pattern. If the user came here, the scope is non-trivial; honor that.
- "It's well-specified, I'll skip the interview" is the same anti-pattern in disguise - if you caught yourself reaching for `AskUserQuestion` to settle scope or approach, that proves a decision was open and the interview was required.
- The reverse is also an anti-pattern: if Explore plus one clarifying question fully resolve the request, close the interview and hand off.
- Do not invent branches to justify a longer conversation - the goal is shared understanding, not ritual.
- Stay inside the task. Adjacent cleanups, refactors, or improvements are out of scope unless the user explicitly asks for them.
- Never answer a question yourself - you must have to ask the user.
- Do NOT invoke any implementation skill, write code, scaffold a project, or take any implementation action until the user has approved a presented design - EVERY project, regardless of perceived simplicity.
- Ask questions one at a time, waiting for feedback before the next - asking multiple questions at once is forbidden, a simple factual one included.

## Apply output guidance
- Keep outputs concise - Prefer short sections, brief bullets, and only enough detail to support the next decision.
- Use repo-relative paths - When referencing files, use paths relative to the repo root (e.g., src/models/user.cs), never absolute paths. Absolute paths make documents non-portable across machines and teammates.

## Synthesis
- Close the interview when every **load-bearing** branch has a confirmed answer. A branch is load-bearing if a different answer would change which files are touched, which library or pattern is chosen, the data shape, or a contract between components. Branches whose answer only affects local style or naming are NOT load-bearing - do not gate the handoff on them.
- Present the synthesis as ~3-5 bullets capturing the chosen approach, key constraints, and explicit out-of-scope items. Wait for the user's confirmation before handing off.
- After the user confirms:
  - Fresh run (no resume): the run directory is `docs/.workflows/<Date>-<slug>/` (`<Date>` from `## Run`; `<slug>` = short title as slug). `Glob` `docs/.workflows/<Date>-<slug>*` first - if `docs/.workflows/<Date>-<slug>/` already exists, append `-2`, `-3`, ... to the directory name until one is free. Then `Write` the synthesis to `<run-dir>/intent.md` - the `Write` call itself creates the run directory; never `mkdir` it.
  - Resume: overwrite the resumed file's own `intent.md` in place. The ADR step below does not fire here - `## Resume from a file`'s reopened-decision branch is the single owner of the `adr` call on a resume, and whatever `## ADR` section the resumed file carries goes into the overwrite as it stands.
  - ADR, on a fresh run only: the `adr:` line under `## Config` reads exactly `true` -> invoke the `adr` Skill with no arguments and wait for its reply. `ADR: <k> accepted` -> the returned blocks, copied verbatim and in the order returned, are the `## ADR` section of the file about to be written; `ADR: none` -> the file has no `## ADR` section. The `adr:` line reads anything but `true` -> the skill is not invoked at all and the file has no `## ADR` section.
  - Only now - after the confirmation and right before the `Write` - Read `references/intent-template.md` (relative to this skill's directory) and write the file exactly as it prescribes. Do not load it earlier; nothing before this point needs it.
  - Then, still before the handoff, write `refresh.md` beside the `intent.md` just written - Read `references/refresh-template.md` (relative to this skill's directory) and `Write` it exactly as that file prescribes. Fresh run: `Baseline:` is the `Date:` just written into `intent.md`, `## Since the baseline` carries what `## Explore first`'s history agent found (one line per entry or ADR), `## Delivered state` and `## Other movement` both read `none - fresh run`, and `## Impact on decisions` reads `none - written with this intent`; a greenfield request that skipped exploration altogether writes every section as the single bullet `none`. Resume: the file `## Refresh on resume` already wrote next to that intent stands - do not rewrite it.
  - `refresh.md` goes beside EVERY `intent.md` this skill writes, fresh and resumed alike, never conditionally: `superspec` and `simpleplan` bounce an intent under `docs/.workflows/` that has no `refresh.md` next to it straight back into this skill, so an exit without the file is an exit into a loop.

## Handoff - the user picks the track [GATE]
Handoff is not the interview. After the user confirms the synthesis (and the intent file is written), present the options below with `AskUserQuestion` and let the user choose. The user's choice is the gate; never route yourself past it.
- **Simple path** - run `simpleplan`, passing `intent: <path to the intent file>` as the argument line. No spec; the plan carries its own DoD / acceptance criteria. Fits small, contained, reversible changes.
- **Spec path** - run `superspec`, passing `intent: <path to the intent file>` as the argument line. The spec (`What & Why`) is written first, then auto-chains into the plan. Fits medium/large, cross-cutting, or hard-to-reverse changes.
- **Phases path** - run `phases`, passing `intent: <path to the intent file>` as the argument line. Fits work too large for one spec: it is split into ordered phases, each built later as its own Simple or Spec run. Offer this option ONLY when the intent file's path has no `phases/` segment - a phase intent is already one slice of a split run, so there the gate shows Simple / Spec / Stop here only.
- **Stop here** - STOP. Reply with the intent file path and tell the user they can resume this interview anytime with `intent <path>`.
