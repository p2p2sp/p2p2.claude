---
name: superdev
description: As a SuperDev interview the user to map the dependency graph of decisions before drafting any plan or code. You MUST use this before any creative work - creating features, building components, adding functionality, modifying behavior or explores user intent, requirements and design ALWAYS before implementation. Do NOT run for pure information/repo question (answer those directly) or casual clarification follow-ups. The well-specified-edit exception is NARROW — single file AND zero open design/scope/approach decisions; if you'd ask the user ANY question (a picker counts) or touch multiple files, the exception does NOT apply and you MUST interview.
model: opus
effort: xhigh
---

**CRITICAL**: Run `ExitPlanMode` first, if plan mode is active.

# Interview

Goal: reach a shared understanding of WHAT the user wants and HOW to build it, before any plan or code is drafted.
- Start from the current project context; ask questions one at a time, waiting for feedback before the next — asking multiple questions at once is forbidden.
- Walk each branch of the design tree, resolving dependencies between decisions one-by-one.
- Once you understand what you're building, present the design and get user approval before acting.
- Do NOT invoke any implementation skill, write code, scaffold a project, or take any implementation action until the user has approved a presented design — EVERY project, regardless of perceived simplicity.

## Explore first
- When the request touches existing code or conventions, launch multiple `Explore` agents in parallel in one batch to map relevant files, patterns, rules, and prior decisions. Anything you can answer from the codebase, do NOT ask the user.
- Skip exploration only when the request is genuinely greenfield (no existing code yet, or the decision is purely product/UX with no technical footprint). Asking the user a question you could have answered from a 30-second grep is the failure mode this section prevents.
- Carry the discovered conventions into proposed approaches so HOW always fits the host project.

## Run the interview
- Walk the design tree branch by branch, resolving dependencies one decision at a time — early answers reshape later branches, so do not batch.
- Ask ONE question per turn so the user can pause, push back, or revisit any earlier choice without losing the thread.
- For each decision, propose 2–3 approaches with trade-offs, lead with your recommendation, and explain why it wins.
- Number the options (`1`, `2`, `3`, and sub-options `1.1`, `1.2` when the choice branches) so the user can point to an answer without re-typing it.
- Treat answers as living. If a later answer invalidates an earlier branch, surface it and re-open that decision instead of pressing forward.
- Use plain prose, not the `AskUserQuestion` tool — the interview is a conversation, not a form. Form-style pickers flatten the trade-off discussion you are trying to have.

**Example of one question:**

> **Decision 2: where does the session token live?**
>
> [Recommended]: **2.1 HttpOnly cookie** — survives reload, immune to XSS exfiltration, no client-side wiring. Trade-off: needs a CSRF strategy.
>
> Alternatives:
> 2.2 `localStorage` — simpler, but readable from any script on the page.
> 2.3 In-memory only — safest, but logs the user out on every reload.
>
> Choose (2.1 / 2.2 / 2.3)?

## Discipline
- "This is too simple to need a design" is an anti-pattern. If the user came here, the scope is non-trivial; honor that.
- "It's well-specified, I'll skip the interview" is the same anti-pattern in disguise — if you caught yourself reaching for AskUserQuestion to settle scope or approach, that proves a decision was open and the interview was required.
- The reverse is also an anti-pattern: if Explore plus one clarifying question fully resolve the request, close the interview and hand off.
- Do not invent branches to justify a longer conversation — the goal is shared understanding, not ritual.
- Stay inside the task. Adjacent cleanups, refactors, or improvements are out of scope unless the user explicitly asks for them.
- Never answer a question yourself - you must have to ask the user.

## Output Guidance
- Keep outputs concise - Prefer short sections, brief bullets, and only enough detail to support the next decision.
- Use repo-relative paths - When referencing files, use paths relative to the repo root (e.g., src/models/user.cs), never absolute paths. Absolute paths make documents non-portable across machines and teammates.

## Synthesis
- Close the interview when every **load-bearing** branch has a confirmed answer. A branch is load-bearing if a different answer would change which files are touched, which library or pattern is chosen, the data shape, or a contract between components. Branches whose answer only affects local style or naming are NOT load-bearing — do not gate the handoff on them.
- Present the synthesis as ~3–5 bullets capturing the chosen approach, key constraints, and explicit out-of-scope items. Wait for the user's confirmation before
handing off.

## Handoff
Let the user choose the next step:
- Save conclusions as the specification - run `superdev:superspec` skill
- Handoff to superplan - run `superdev:superplan` skill
