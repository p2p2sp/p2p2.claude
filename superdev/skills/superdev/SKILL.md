---
name: superdev
description: You MUST ALWAYS use this skill every time a user wants to do something creative - a new idea, a new feature, build something from scratch, a change to an existing solution. Do not trigger when user want to implement something here and now or fast.
allowed-tools: Read, Grep, Glob, Agent, AskUserQuestion, Skill, ExitPlanMode
---

CRITICAL: Run `ExitPlanMode` first, if plan mode is active.

Help turn ideas into fully formed designs and specs through natural collaborative dialogue. First thing to do is reach a shared understanding of `What` the user wants and `How` to build something, before any plan or code is drafted.

## Explore first
- When the request touches existing code or conventions, launch multiple `Explore` agents in parallel in one batch to map relevant files, patterns, rules, and prior decisions. Anything you can answer from the codebase, do NOT ask the user.
- Skip exploration only when the request is genuinely greenfield.
- Carry the discovered conventions into proposed approaches so `How` always fits the host project.
- When the host repo carries `docs/product/`, have one of the parallel `Explore` agents read the affected feature's doc(s). Docs are user intent: any doc-vs-code divergence is reported into the interview as an open requirement (fix the code, or - only on the user's explicit choice - amend the doc), never treated as text the code overrides.

## Run the interview
- Walk the design tree branch by branch, resolving dependencies one decision at a time - early answers reshape later branches, so do not batch.
- Ask ONE question per turn so the user can pause, push back, or revisit any earlier choice without losing the thread.
- For each decision, propose 2–3 approaches with trade-offs, lead with your recommendation, and explain using simple language why it wins.
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
- "This is too simple to need a design" is an anti-pattern. If the user came here, the scope is non-trivial; honor that.
- "It's well-specified, I'll skip the interview" is the same anti-pattern in disguise - if you caught yourself reaching for AskUserQuestion to settle scope or approach, that proves a decision was open and the interview was required.
- The reverse is also an anti-pattern: if Explore plus one clarifying question fully resolve the request, close the interview and hand off.
- Do not invent branches to justify a longer conversation - the goal is shared understanding, not ritual.
- Stay inside the task. Adjacent cleanups, refactors, or improvements are out of scope unless the user explicitly asks for them.
- Never answer a question yourself - you must have to ask the user.
- Do NOT invoke any implementation skill, write code, scaffold a project, or take any implementation action until the user has approved a presented design - EVERY project, regardless of perceived simplicity.
- Ask questions one at a time, waiting for feedback before the next - asking multiple questions at once is forbidden.

## Apply output guidance
- Keep outputs concise - Prefer short sections, brief bullets, and only enough detail to support the next decision.
- Use repo-relative paths - When referencing files, use paths relative to the repo root (e.g., src/models/user.cs), never absolute paths. Absolute paths make documents non-portable across machines and teammates.

## Synthesis
- Close the interview when every **load-bearing** branch has a confirmed answer. A branch is load-bearing if a different answer would change which files are touched, which library or pattern is chosen, the data shape, or a contract between components. Branches whose answer only affects local style or naming are NOT load-bearing - do not gate the handoff on them.
- Present the synthesis as ~3–5 bullets capturing the chosen approach, key constraints, and explicit out-of-scope items. Wait for the user's confirmation before handing off.

## Handoff - the user picks the track [GATE]
Handoff is not the interview. After the user confirms the synthesis, present the two tracks with `AskUserQuestion` and let the user choose. The user's choice is the gate; never route yourself past it.
- **Simple path** - run `simpleplan`. No spec; the plan carries its own DoD / acceptance criteria. Fits small, contained, reversible changes.
- **Spec path** - run `superspec`. The spec (`What & Why`) is written first, then auto-chains into the plan. Fits medium/large, cross-cutting, or hard-to-reverse changes.
