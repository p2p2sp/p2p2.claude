---
name: dev-extraplan
description: Plan refinement and hardening expert — the default planning discipline for any non-trivial implementation/change plan. Use it (1) whenever the user explicitly asks for extraplan, plan refinement, plan hardening, or a more rigorous plan, and (2) proactively whenever a plan is being drafted in plan mode and the change is non-trivial — 3+ files, a schema / migration / API-contract change, security-adjacent work, more than one defensible approach, or anything costly to undo (full criteria in references/when-to-use.md); reach for it by default instead of producing a loose plain plan. Enforces a strict plan template (intent, model, files, assumptions, options, risk, out-of-scope) and forbids silent assumptions before the plan is presented. Implementation decisions are NOT part of the plan. Skip it only for trivial plans (one-sentence diff, single-file typo / rename, pure read-only research / Q&A) or when the user has explicitly chosen a plain plan-mode draft, and do NOT hijack mem-rules / mem-claudemd rules-bootstrap plan mode. Do NOT use for initial spec / PRD writing — use the `dev-spec` skill instead. Trigger applies in any language and to descriptive phrasing too.
model: opus
effort: xhigh
---

**CRITIAL**: If plan mode is not already active when extraplan is invoked, your first action MUST be to call `EnterPlanMode` before reading files or drafting anything — **regardless of the current mode** (default / accept-edits). Do NOT call it again if plan mode is already on (the system reminder `Plan mode is active` signals this). Producing the plan inside plan mode is what makes the downstream `dev-plan-reviewer` → `ExitPlanMode` gate apply. This is also enforced by a `PreToolUse` guard: writing a `.claude/plans/*.md` file outside plan mode is denied, so drafting the plan without first entering plan mode will be blocked anyway.

# ExtraPlan

A discipline for producing plans that survive contact with implementation.

Default Claude Code plan mode is read-only and structured, but the plan content itself can drift: missing files, hidden assumptions, no rollback story. ExtraPlan closes that gap with a strict template and mandatory pre-plan behavior before the plan is presented.

**Scope boundary — what ExtraPlan focuses on.** A plan answers *what changes and why*; *how to execute it* (task boundaries, per-task working mode, test naming/ordering/framework) is the `decomposer`'s job, which reads the approved plan (any markdown — ExtraPlan-shape or looser) and writes one focused task file per task under `.temp/.workflows/<slug>/tasks/`. The full **testing-direction-is-a-floor / decomposer-owns-execution / no-ADR-here** doctrine — what the plan MAY carry vs. what it must leave to the decomposer, the binding-floor contract, and where architectural reasoning lands — is stated canonically in §2 "Pre-plan context" and the §8 template section ("Recommended testing approach & edge cases"). Read those; this paragraph only fixes the boundary, it does not restate the doctrine.

---

## 1. When to use ExtraPlan

The canonical "Use when / Skip when" criteria live in `references/when-to-use.md` — that file is the single source of truth. Read it to decide whether a change warrants ExtraPlan over a plain plan.

If unsure → use ExtraPlan. The overhead is one extra section of writing; the cost of skipping is an unrecoverable bad merge.

---

## 2. Pre-plan context

Work with whatever context is already available in the current session. Extraplan must produce a usable plan regardless of whether a discovery `interview` has happened beforehand — **this skill never re-interviews the user**. Discovery responsibility belongs to the `interview` skill (which may have already run, or which the user may have deliberately skipped).

Apply these passive disciplines while drafting:

1. **Read before writing.** Open every file the plan will touch — at minimum the call sites, the type definitions, and one neighbor that uses the same pattern. Do not propose changes to a file not read in this session.
2. **State the model of the system in one paragraph** at the start of the plan (§3 Mental model in the template). If the user corrects it later during `dev-plan-reviewer`, the plan is wrong and must be redone — that correction is cheaper now than after implementation.
3. **Check for a simpler approach.** If a 10-line fix exists, say so before proposing a 100-line one. Recommend the simpler path unless the session has already ruled it out.
4. **No silent assumptions.** Every claim about behavior, data, environment, or intent that is NOT directly derivable from files read in step 1 and NOT explicitly stated in the session goes into §5 Assumptions, **marked `[load-bearing]` if the plan breaks when it's wrong**. The user reviews §5 during `dev-plan-reviewer` and corrects any incorrect items there.

   A candidate assumption with no defensible default becomes an `Option` in §6, not a silent guess in §5.

**Testing-direction-is-a-floor / decomposer-owns-execution (canonical).** Do NOT proactively interview the user about *execution-style* decisions — test framework, test-first vs test-after ordering, per-task test naming, task boundaries, edit order. `decomposer` derives those later from the plan + project rules + project skills. You MAY, however, capture the *testing solution direction* the session already surfaced — which areas need TDD and why, the edge cases / failure modes that matter, the port seams worth isolating — into the §8 "Recommended testing approach & edge cases" template section; that is *what to test and why*, not *how to execute the tests*. If an explicit directive is already present in the session ("validation layer needs TDD"), fold it into that section verbatim. `decomposer` consumes that direction as a **binding floor**: it may raise rigor (push a borderline area to TDD, add a named edge case) but never lower it below the TDD baseline; a volunteered execution directive ("ship the migration first") is captured verbatim and read by the decomposer as a binding imperative override. Stick to *what changes / what to test* and *why*; treat execution mechanics (framework, ordering, boundaries) as decomposer's job, not yours.

**Architectural-decision reasoning (captured in prose — no ADR here).** ExtraPlan no longer judges or drafts ADRs; that moves to implementation, where the `orchestrator` runs the `dev-adr-analyzer` fork-skill on the approved plan before `decomposer`. Your job is to make the *reasoning* behind any architectural decision the change locks in legible in the plan prose: the trade-off, the rejected alternatives, and why this direction (§3 Mental model, §6 Options if present, §7 Risk & rollback). The implementation-time analyzer reads the approved plan and the code it touches to judge ADR-worthiness, so the richer the reasoning here, the better the ADR it can draft. Never write an ADR file from this skill.

Loose-coupling invariant with `interview`: `interview` may have produced rich context in this session and may have explicitly invoked extraplan as its end-of-interview handoff — use that context. But extraplan must also work when invoked directly without any prior interview; in that case, simply mark uncertain items `[load-bearing]` in §5 and let `dev-plan-reviewer` + the user catch them.

---

## 3. The ExtraPlan template

The best plan leaves no unanswered questions. Any remaining means digging deeper to interview the user. Every ExtraPlan output MUST contain the §0 orchestrator preamble plus these **ten numbered sections (§1–§10)**, in this order, with these exact headings:

### 0. Instruction for orchestrator use
Do not change `<orchestrator>` section. Insert directly from the template.

### 1. Scope
One sentence: what this plan accomplishes. If you cannot fit it in one sentence, the plan is too big — split it.

### 2. Context
2–4 sentences on *why* this change is needed now — the problem, trigger, or goal it serves. This is the motivation, kept distinct from the system description: §3 covers how the subsystem works today; §2 covers why we are touching it at all. A reader who knows the codebase but not the backstory should be able to tell, from §1 + §2 alone, whether this work is worth doing.

### 3. Mental model
One paragraph describing the current understanding of how the relevant subsystem works. The user reads this first; if it's wrong, the rest is wasted.

### 4. Files to change
A list or loose table. For each file: **path**, **what changes**, **why this file**. No mandatory `Order` column — sequencing is `decomposer`'s job. Use whichever format reads best (bullet list, two-column table, prose paragraph per file).

Example bullet form:
```
- `<module>/<Feature>Service.<ext>` — add `<Method>` — needed for <deliverable> deliverable
- `<module>/Validators/<Validator>.<ext>` — new file — encodes the <rule-name> rule
```

Or a loose table:
```
| Path | Change | Why |
|---|---|---|
| `<module>/<Feature>Service.<ext>` | add `<Method>` | needed for <deliverable> deliverable |
```

### 5. Assumptions
Bulleted, explicit. Every claim that is NOT directly derivable from files read in §3 and NOT explicitly stated in the session goes here. **Mark each item `[load-bearing]` if the plan breaks when it's wrong**, so the user can re-verify at a glance during `dev-plan-reviewer`. The contract is: dev-plan-reviewer pass + the user's review of this section catches incorrect assumptions — extraplan does not chase confirmations interactively (that is the `interview` skill's job).

### 6. Options (only if >1 approach is defensible)
For each option:
- **Name** (short, memorable)
- **Approach** (2–3 sentences)
- **Files touched** (count)
- **Risk** (low / medium / high)
- **Reversibility** (trivial / non-trivial / one-way door)
- **Recommendation**: which one and why

Skip this section if there is genuinely one obvious path.

### 7. Risk & rollback
- **Worst-case failure mode**: one sentence
- **Blast radius**: who/what is affected if this goes wrong in prod
- **Rollback trigger**: the observable condition that should initiate a rollback (the signal to act, not just the mechanism)
- **Rollback strategy**: revert SHA / feature flag / migration-down / "cannot rollback, here's why"
- **Pre-merge checks** the user should personally do

### 8. Recommended testing approach & edge cases
The testing *solution direction* — what to test and why, never how to execute it. Include:
- **Areas needing TDD & why** — which parts of the change carry decision logic / invariants / calculations / state transitions that warrant test-first discipline, and the reason (a wrong branch here is silent and costly).
- **Key edge cases / failure modes** — the boundary inputs, rejected inputs, and error paths that must be covered. Name them concretely (e.g. "transition from a terminal state is rejected", "empty payload returns 400").
- **Port seams worth isolating** — external resources (DB, HTTP, queue, clock, filesystem) reached through a port/interface that the logic should be tested against via an in-memory fake, so the logic stays unit-testable.

Do NOT prescribe the test framework, test-first vs test-after ordering, per-task test names, or task boundaries — those are `decomposer`'s job. This section is a **binding floor** for the decomposer: it may raise rigor, never lower it. For a change with no decision logic at all (pure docs / config / trivial CRUD passthrough), state that explicitly in one line (e.g. "no logic branches — no TDD areas; covered by wiring tests at the task gate") rather than leaving the section empty.

### 9. Definition of done
Observable, declarative exit criteria — what is **true** when this work is complete, phrased as outcomes a reviewer can check, not as tasks. Keep it a short checklist. **If the change involves runnable code, "the code runs without error" (build succeeds / app starts / script exits 0) is a mandatory item here.** For a pure docs / config change with nothing to run, say so in one line.

### 10. Out-of-scope
Explicit list of things adjacent to this work that this plan does NOT do. This prevents scope creep mid-implementation and gives the user a chance to add back anything wrongly excluded.

---

## 4. Behavioral rules during planning

- **Never invent file paths.** Do not list a file not yet read. Use search/glob to confirm first.
- **Never invent function or symbol names.** If a function "should exist", check first; if it doesn't, the plan must say so as part of the change description in §4.
- **Quote line numbers, not paraphrases**, when referencing existing code in the plan.
- **No "we'll see during implementation".** That phrase is a code smell. Either resolve it now as an open question, or accept the risk explicitly in §8.
- **Time estimates are forbidden** unless the user asked for them. They will be wrong.
- **No silent assumptions.** Every item in §5 must be explicit. If reaching for a default that has not been stated in the session, surface it as `[load-bearing]` in §5 so `dev-plan-reviewer` and the user catch it. Never bury a guess in narrative.

---

## 5. When the user pushes back

If the user edits the plan or rejects sections:

- Treat the edit as authoritative. Do not silently re-add removed items.
- If their edit makes the plan internally inconsistent (e.g., removed a file that another change depends on), surface the conflict explicitly and ask, do not patch silently.
- If asked to skip a section of the template, comply, but note in the response which section was skipped so the trade-off is visible.

---

## 6. When to abandon the plan and re-plan

Re-enter plan mode and produce a fresh ExtraPlan when **any** of these happen mid-implementation:

- A change fails in a way that invalidates a later change's assumptions
- You discover a file that needs to change which was not in §4
- An assumption in §5 turns out to be wrong
- Tests you didn't expect to break, break

Do not "patch around" a broken plan. The cost of replanning is minutes; the cost of a partially-migrated codebase is hours. It is worth to dig deeper and interview the user so as not to fall into the same trap next time.

---

## 7. Output skeleton

See `templates/plan.md`. Copy it verbatim and fill each section.

---

## 8. Publish the approved plan as an artifact (optional)

When the user wants to **share** the approved plan as a live link (not a
`.claude/plans/<slug>.md` path), hand it to the `cc-artifact` skill. This is
opt-in and runs in the main session only — never as part of any fork or the
orchestrator pipeline. It is also entirely separate from the implementation flow:
publishing the plan does not gate, replace, or feed `decomposer` / `orchestrator`.

Assemble ONE `.md` file, then invoke `cc-artifact` with that file and a title:

1. **Prepend a `## Review verdict` block** to the plan body. Take the verdict
   from the `dev-plan-reviewer` output **already present in this session** — the
   `STATUS:` line (`PASS` / `FAIL`) plus the 🔴 / 🟡 / 🟢 severity markers it
   emitted. Do **not** re-run `dev-plan-reviewer`, and do **not** parse the raw
   transcript to reconstruct it — use the verdict the reviewer already returned in
   this session. The block sits above the plan body so a reader sees the review
   outcome first; the plan body follows verbatim.
2. **Write the assembled `.md`** (verdict block + plan body) to a file on disk.
3. **Invoke `cc-artifact`** with that file path and a short title (e.g. the
   plan's §1 Scope sentence). `cc-artifact` validates it is a single, size-bounded,
   external-reference-free `.md`, asks before publishing, and either publishes it
   as a private shareable page or falls back to reporting the local path.

**Fallback — verdict no longer available.** If no `dev-plan-reviewer` verdict is
present in this session (e.g. the plan was approved in an earlier session, or
review was skipped), do **not** fabricate one and do **not** parse the transcript.
Either publish the plan body **without** the `## Review verdict` block, or offer to
re-run `dev-plan-reviewer` first and prepend the fresh verdict — let the user choose.
A published plan with no verdict block is valid; a published plan with an invented
verdict is not.

---

## 9. One-line summary

A plan is only good if a careful reader, with no extra context, could approve or reject it in under three minutes and predict 90% of the resulting diff. ExtraPlan enforces exactly that bar — for *what changes and why*. *How to execute* is the next step, owned by `decomposer`.
