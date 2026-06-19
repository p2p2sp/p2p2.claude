---
name: dev-interview
description: Interview the user to map the dependency graph of decisions before drafting any plan or code. Use whenever resolving the request requires asking the user two or more questions — dependent or independent — e.g. a new feature, architectural decision, multi-file change, choice between approaches, or unclear scope/requirements/trade-offs. The number of questions is the trigger: ≥2 questions → this skill (rather than batching them into one ad-hoc prompt). Do not run for trivial fixes, well-specified single-file edits, and casual clarification follow-ups, or when a single targeted question would close the gap.
model: opus
effort: xhigh
---

# Interview

Goal: reach a shared understanding of WHAT the user wants and HOW it should be built, before any plan or code is drafted.

The interview models the work as a **design tree** — a graph where each decision narrows the next branch (a data-shape choice constrains the API; an API choice constrains the UI). Resolving branches in dependency order is what keeps the conversation from looping back on itself.

## Explore first
- When the request touches existing code or conventions, launch multiple `Explore` agents in parallel to map relevant files, patterns, and prior decisions. Anything you can answer from the codebase, do NOT ask the user.
- Skip exploration only when the request is genuinely greenfield (no existing code yet, or the decision is purely product/UX with no technical footprint). Asking the user a question you could have answered from a 30-second grep is the failure mode this section prevents.
- Carry the discovered conventions into proposed approaches so HOW always fits the host project.

## Run the interview
- Walk the design tree branch by branch, resolving dependencies one decision at a time — early answers reshape later branches, so do not batch.
- Ask ONE question per turn so the user can pause, push back, or revisit any earlier choice without losing the thread. 
- When two questions feel tightly coupled, pick the one whose answer constrains the other and ask that first — the second often dissolves or reshapes once the first is answered.
- For each decision, propose 2–3 approaches with trade-offs, lead with your recommendation, and explain why it wins.
- Number the options (`1`, `2`, `3`, and sub-options `1.1`, `1.2` when the choice branches) so the user can point to an answer without re-typing it.
- Treat answers as living. If a later answer invalidates an earlier branch, surface it and re-open that decision instead of pressing forward.
- Use plain prose, not the `AskUserQuestion` tool — the interview is a conversation, not a form. Form-style pickers flatten the trade-off discussion you are trying to have.

**Example of one turn:**

> **Decision 2: where does the session token live?**
>
> [Recommended]: **2.1. HttpOnly cookie** — survives reload, immune to XSS exfiltration, no client-side wiring. Trade-off: needs a CSRF strategy.
>
> Alternatives:
> 2.2. `localStorage` — simpler, but readable from any script on the page.
> 2.3 In-memory only — safest, but logs the user out on every reload.
>
> Which you choose (2.1 / 2.2 / 2.3)?

## Discipline
- "This is too simple to need a design" is an anti-pattern. If the user came here, the scope is non-trivial; honor that.
- The reverse is also an anti-pattern: if Explore plus one clarifying question fully resolve the request, close the interview and hand off.
- Do not invent branches to justify a longer conversation — the goal is shared understanding, not ritual.
- Stay inside the task. Adjacent cleanups, refactors, or improvements are out of scope unless the user explicitly asks for them.

## Output Guidance
- Keep outputs concise - Prefer short sections, brief bullets, and only enough detail to support the next decision.
- Use repo-relative paths - When referencing files, use paths relative to the repo root (e.g., src/models/user.cs), never absolute paths. Absolute paths make documents non-portable across machines and teammates.

## Synthesis and handoff
- Close the interview when every **load-bearing** branch has a confirmed answer. A branch is load-bearing if a different answer would change which files are touched, which library or pattern is chosen, the data shape, or a contract between components. Branches whose answer only affects local style or naming are NOT load-bearing — do not gate the handoff on them.
- Present the synthesis as ~3–5 bullets capturing the chosen approach, key constraints, and explicit out-of-scope items. Wait for the user's confirmation before
handing off.
- Then ask: plain plan-mode or `superdev:dev-plan`?
  - Plain plan-mode → call the `EnterPlanMode` tool and continue.
  - Extraplan → invoke the `superdev:dev-plan` skill and continue.
