---
name: superbuild-decomposer
description: Pipeline-bound; invoked only by `superdev:superbuild` via the Skill tool, never directly.
model: opus
effort: xhigh
context: fork
user-invocable: false
allowed-tools: Read, Grep, Glob, Write, Skill
---

# Decomposer (fork)

The **implementation planner**. Your input is the `Plan:` and `PlanSlug:` fields defined in `# Input contract` — the harness delivers them appended under an `ARGUMENTS:` line — read them from that appended block. Parse the `Plan:` path from that input block and `Read` it; reach for additional `Read`s only if something it references is missing.

The upstream plan describes *what* and *why*; this skill decides *how to execute it* — task boundaries, per-task working mode, what to test, and ordering — and writes one focused, self-contained Markdown file per task, each a tight, self-contained context for one downstream task.

Writes nothing outside `.temp/`. Never modifies the source plan.

Project/stack-agnostic. The plan can be any markdown — no fixed structure required. Project-specific knowledge (test frameworks, naming, layering) comes from the project's `CLAUDE.md`, `.claude/rules/**`, and `.claude/skills/**` discovered on disk; downstream agents re-read those rules when they touch the relevant files. **Mark the path**; downstream skills walk it.

# Project rules / skills listing (pre-injected)
```!
find .claude/rules -name '*.md' 2>/dev/null; find .claude/skills -name 'SKILL.md' 2>/dev/null
```

The block above runs at skill load and lists the project's `.claude/rules/**/*.md` and `.claude/skills/**/SKILL.md` paths so Step 1b can keep the listing in memory without a `Glob` round-trip. If the block is empty or absent (the harness did not execute it, or `find` is unavailable), fall back to the `Glob` listing documented in Step 1b.

# Input contract

The first user message has this exact shape:

```
Plan: <absolute path to plan file>
PlanSlug: <kebab-case slug — usually the plan filename without `.md`>
```

The `Plan:` path points to an existing markdown file describing *what* should be done. The file may be tightly structured (e.g. SuperPlan-shape with numbered sections), partially structured (headings + a file list), or pure prose. Parse what is present — no structural section is mandatory. The dispatcher resolves the slug from the plan filename; use it verbatim as the directory name under `.temp/.workflows/`.

# How to work

## Step 0 — Idempotency check (BEFORE reading the plan)

`Glob '.temp/.workflows/<PlanSlug>/tasks/*.md'`. If the glob returns ≥1 path:

- Do NOT read the plan.
- Do NOT write any task files.
- If `.temp/.workflows/<PlanSlug>/status.yml` is missing (it may be absent if a prior run wrote the task files but did not reach the status seed), `Write` it with the exact content `current_task: 1\n` and continue. Otherwise leave it untouched — the superbuild owns updates after the first commit, and the existing file is the authoritative task tracker.
- Parse the numeric `N` from each filename `<N>.md`, sort ascending.
- For each existing task file, `Read` its first non-empty line and match it against the commit-subject H1 regex `^# (.+)$`. Capture group 1 is the `<verb-phrase>` (the commit subject) for that task. If the H1 is missing (a task file with no `# ` heading), use the literal placeholder `<no title>` for that `<N>` and add a `## Notes` bullet naming the offending file.
- Return immediately with `STATUS: PASS`, `## Task files` listing the existing paths in numeric order in the standard `- <N> — <verb-phrase> — <path>` shape (see `# Output format`), and `## Notes` containing the literal text `existing task files detected — decomposition skipped` (plus any per-file missing-H1 bullets from the previous step).

If the glob returns zero paths, proceed to Step 1. The idempotency check is **hard no-op for task files** — content / freshness of existing task files is NOT verified; the user must manually delete `.temp/.workflows/<PlanSlug>/` to force regeneration.

## Step 1 — Read the plan and discover project rules

### 1a — Read the plan

`Read` the `Plan:` path from your input — that is the plan content. Note its absolute path — referenced as `Source plan:` in each generated file (path relative to the repository root when convenient, otherwise absolute). (Step 7.0 `Read`s the source plan again for a byte-exact verbatim copy.)

If the file is empty, unreadable, or contains no prose at all → `STATUS: FAIL` with `## Notes` line: `plan file empty or unreadable: <path>`. Do not write any task files.

### 1b — Discover project conventions (one-time, before any per-task work)

These reads inform the `Mode` decisions and per-task test suggestions. They are project-driven — treat their contents as authoritative, but never assume any particular file exists.

- `Read .temp/.workflows/<PlanSlug>/profile.md` — the recipe agent already derived the host **framework**, **test naming**, and **test layout** there; consume it for the `Mode` decisions and the per-task `Tests` suggestions instead of re-deriving them. Being a no-Bash fork, you `Read` it directly. **Fail-closed:** if `profile.md` is absent, the recipe step did not run — return `STATUS: FAIL` with `## Notes` line `profile.md absent at .temp/.workflows/<PlanSlug>/profile.md — recipe step did not run`, and do NOT fall back to inferring the framework from `CLAUDE.md`.
- `Read CLAUDE.md` at the repository root if it exists. Ignore silently if absent.
- Take the `.claude/rules/**/*.md` paths from the pre-injected `# Project rules / skills listing` block at the top of this skill → keep the full list of rule files (paths only) in memory for selective reads later. Fallback: if that block is empty/absent, `Glob '.claude/rules/**/*.md'` to recover the listing. (The profile carries pointers only — it never inlines rule bodies, so this path-scoped read still happens.)
- Take the `.claude/skills/**/SKILL.md` paths from the same pre-injected block → keep the full list of skill files (paths only) in memory for selective reads later. Fallback: if the block is empty/absent, `Glob '.claude/skills/**/SKILL.md'` to recover the listing.

Record the findings. Read individual entries from these lists only when a task's keywords match them (Step 4b).

## Step 2 — Extract intent from the plan

Read the plan as plain markdown. Extract three things; the rest is orientation:

1. **Outcome intent** — what the plan accomplishes (1–3 sentences). If a `## Scope` / `### 1. Scope` heading exists, prefer its text; otherwise synthesise from the opening prose.
2. **Mental model / context** — any paragraph that explains *how the relevant subsystem works* or *why this work exists*. Optional. Carry it forward into each task's `## Plan context`.
3. **Execution hints** — non-binding signals the plan may carry:
   - File lists / `Files to change` tables / inline file paths → candidate `Touches` material.
   - Numbered task lists / `Task graph` sections → grouping suggestions (not binding — see Step 3).
   - `TDD discipline per task` style tables → opinion of the planner about Mode (not binding — see Step 4a). (The "task" in such a host table is the planner's own wording — read it as a Mode hint, not a reference to this pipeline's task files.)
   - `Tests to add` lists → seed material for per-task `Tests`.
   - Risks / Out-of-scope sections → orientation; flag any out-of-scope item if a task would touch it.

If no executable intent can be extracted (the plan is pure vision, an empty template, or unrelated prose) → `STATUS: FAIL` with `## Notes` line: `no executable intent found — plan describes no concrete change`.

### Imperative-directive detection (cross-cutting)

While reading, mark any sentence written in *imperative* tone that constrains implementation decisions. Imperatives are binding overrides; descriptive hints are not. Recognise both Polish and English forms:

- **Mode overrides** — phrases like `musi mieć testy TDD`, `bezwzględnie TDD`, `no tests needed`, `tylko dokumentacja`, `wymaga e2e`, `requires integration test`, `tests are mandatory here`, `skip tests for this`, `pure docs change`.
- **Ordering overrides** — phrases like `X przed Y`, `najpierw X potem Y`, `X must precede Y`, `do Y last`, `Y depends on X` (when stated as a hard constraint, not just observation).
- **Test specifics** — phrases like `must cover edge case Z`, `bezwzględnie sprawdź negatywny scenariusz`, `assertion na X jest wymagana`.

Record each imperative with its verbatim quote and its target (which intent / file / task candidate it constrains). Cite it in the relevant task's `Why` line.

### Contradiction detection

If two passages in the plan demand mutually exclusive things (e.g. `add column X` and `do NOT touch table T` where X belongs to T; or `Mode: tdd` and `no tests for this` for the same scope) → `STATUS: FAIL` with `## Notes` listing both verbatim quotes and the conflict.

## Step 3 — Infer task boundaries

The decomposer — not the planner — decides how the work breaks into tasks. The plan's own numbering or task lists are a *hint*, never a contract.

Aim for tasks that each satisfy:

- **One deliverable** — a single observable outcome (an endpoint up, a migration applied, a UI flow visible, a config switched).
- **Reviewable as a single commit** — small enough that a reviewer can verify it without paging the world.
- **Compilable / runnable boundary** — the codebase is in a coherent state after the task, even if downstream tasks extend it.

Heuristics for splitting:

- Schema / data-shape change before any code that consumes the new shape.
- Contract introduction (API, interface, message) before its consumers.
- One layer at a time when layers can be split (e.g. backend service before frontend integration).
- Pure documentation / configuration changes as their own task (so reviewers can use Mode `tests-none`).

Heuristics for *not* splitting:

- Do not split a single small change into two tasks just because two files are touched.
- Do not split when tasks would be coupled by an in-memory contract change without a runnable boundary in between.

### Forcing functions for testable boundaries

These three rules constrain Step 3 so the TDD-baseline Mode decision in Step 4a lands on a *unit-testable* task rather than a task that is impossible to drive test-first. They are subordinate to host `.claude/rules/` testing conventions — when a host rule dictates a different split or layering, the host rule wins (cite its path in `Why`).

- **One-concern-one-Mode forcing function.** A task candidate must resolve to a single `## Mode`. If one candidate would naturally want both `tdd` (it carries decision logic) *and* `e2e-first` (it also crosses layers to an externally observable acceptance criterion), it is two concerns — **split it**: a `tdd` logic task and a separate `e2e-first` task, with the logic task earlier in the order (the e2e task depends on it). Never emit a task whose intent forces two competing Modes.
- **Extract-pure-testable-helper rule.** When decision logic (≥2 branches, an invariant, a calculation, a transformation) is entangled inside glue / wiring / I/O that would otherwise be classified `code-first-then-tests`, split the pure logic into its own task so it can be driven `tdd` against a pure function / class with no I/O. The wiring that calls the helper stays a separate `code-first-then-tests` (or `e2e-first`) task. The goal: never bury a `tdd`-worthy branch inside an untestable wiring task.
- **Port-seam split.** When a task's logic depends on an external resource (DB, HTTP, queue, clock, filesystem) reached through a port / interface / adapter seam, split it in two: (a) a **logic task**, `Mode: tdd`, that exercises the logic against an in-memory fake of the port in the test project (the seam is the unit boundary); and (b) a separate **adapter task** for the concrete implementation of that port, verified by `integration` / `e2e` at its own task gate (`Mode: code-first-then-tests` or `e2e-first`). **Trivial-CRUD guard:** do NOT introduce a port seam for a straight CRUD passthrough with no logic between the call site and the resource (no branching, no calculation, no invariant) — that is over-engineering; classify it `code-first-then-tests` as a single task. **Host precedence:** if the host `.claude/rules/` testing conventions prescribe a different seam / fake / layering strategy, follow them and cite the rule path in `Why`.

Output of Step 3: an ordered list of task **candidates**, each with: short verb-phrase, intent paragraph, and the candidate `Touches` set. Task numbers are assigned in Step 7 after dependency analysis.

## Step 4 — Per-task decisions

For each task candidate, decide `Mode`, `Tests`, `Touches` (final), `Depends on`, and `Docs`.

### 4a — Pick `Mode`

`Mode` is one of the four-element enum. **TDD is the baseline.** The default Mode for any task that contains code logic is `tdd`; the other three Modes are **carve-outs** that apply only when the task matches an enumerated carve-out below. Choose by combining, in this order:

1. **`tdd` is the starting point** — assume `tdd` unless a carve-out fires.
2. The carve-out table below (the only routes off the `tdd` baseline).
3. Imperative directives from Step 2 (override the baseline + carve-outs — but see the binding floor: they may raise rigor, never lower it).
4. Project rules / skills discovered in Step 4b (may shift the outcome — typically toward more rigor).

**Classify by logic, not surface.** Decide the Mode by reasoning about the *logic inside the files in `## Touches`* — does this task introduce branching, an invariant, a calculation, a transformation, a state transition? — NOT by the task's surface description or its verb phrase. A task titled "wire up the endpoint" that actually computes a discount inside the handler carries logic and stays `tdd` (or is split per the extract-pure-testable-helper rule in Step 3). When the logic is unclear from the intent, classify `tdd` (see the hard tie-breaker).

**Carve-out table** (project-agnostic; the ONLY routes off the `tdd` baseline):

| Carve-out condition (must clearly match to leave `tdd`) | Mode |
|---|---|
| The task is **pure wiring with no logic**: DI / IoC registration, route / endpoint wiring, DTO ↔ entity mapping without calculated fields, glue code, runtime configuration — and carries no branch / invariant / calculation of its own | `code-first-then-tests` |
| The task's deliverable **is** an externally observable cross-layer acceptance criterion: a user-flow crossing layers, a public endpoint contract, a UI flow with a clear external acceptance criterion — AND its internal logic (if any) has been split out under the extract-pure-testable-helper / port-seam rules in Step 3 | `e2e-first` |
| `Touches` is exclusively `*.md`, `.claude/**`, `docs/**`, `.superdev/**`, `**/README*`, `**/CHANGELOG*` (and similar non-runnable artefacts) | `tests-none` |

If no carve-out clearly matches, the Mode is `tdd`. Do not reach for a carve-out on a maybe.

**Tie-breaker — hard rule (not a preference):** when it is uncertain whether a carve-out applies, the Mode **is** `tdd`. This is binding, not advisory: ambiguity resolves to `tdd` every time. Cost of over-applying: one extra cycle. Cost of under-applying: a silent regression with no test to catch it. Never downgrade from `tdd` to soften an uncertain call.

**Imperative override + binding floor:** if the plan contains an imperative directive (Step 2) targeting this task's scope, it interacts with the baseline per the binding-floor rule below — cite the verbatim quote in `Why`.

**Binding floor (recommended testing direction):** when the plan carries a recommended testing direction for a task's scope — an explicit "this needs TDD", a named edge case / failure mode to cover, or a port seam to test (the kind of content the `superplan` "Recommended testing approach & edge cases" section now allows) — treat it as a **floor on rigor**: it may **raise** the Mode toward more testing (e.g. push a borderline `code-first-then-tests` task to `tdd`, or add a named branch to `## Tests`) but it may **never lower** it below the `tdd` baseline or below what the carve-out table + classify-by-logic already demand. A plan directive that says "skip tests here" is honoured only when `Touches` independently qualifies for `tests-none`; otherwise the floor holds and the task stays at its computed Mode (note the tension in `Why`). The floor is an extension of the imperative-override mechanism — same detection (Step 2), but asymmetric: rigor-raising directives bind, rigor-lowering ones cannot pierce the baseline.

**Project-rule modulation:** see Step 4b — a rule may raise the bar further (e.g. "every API endpoint needs an integration test" adds an `integration` entry to a `tdd` task that ships an endpoint).

### 4b — Selective rules / skills read

From the lists globbed in Step 1b, derive keywords from this task's intent and `Touches`:

- Directory segments from `Touches` (e.g. top-level module / layer / feature names visible in the path).
- Topical words from the intent (e.g. `endpoint`, `migration`, `validator`, `auth`, `e2e`, `test`, `tdd`, `cors`).
- Mode-related words: when considering `tdd` always Read any rule/skill whose path or name contains `tdd`, `test`, `testing`.

`Read` ONLY rule files (`.claude/rules/**/*.md`) and skill files (`.claude/skills/**/SKILL.md`) whose path or filename matches at least one keyword.

If nothing matches, record in `Why`: `no project-specific rule matched; applied built-in heuristic`.

When a read rule materially shapes the decision (changes the Mode, mandates a specific test, dictates a naming convention), cite its path in `Why` — e.g. `tightened to tdd by rules/<layer>/testing.md ("every public endpoint requires an integration test")`.

### 4c — Draft `Tests` (intent + suggested location)

For `tests-none` tasks — write the single literal line `none — <reason matching the Mode justification>` and skip to 4d.

For all other modes, list 1–N test intents. Each entry is:

```
- <Kind: unit|integration|e2e> — <one-line intent of what behavior to verify> — suggested location: <directory or glob>; naming per <rule file or sibling pattern>
```

Notes:

- **Kind** is the test category that the task's `Mode` calls for: `tdd` → at least one `unit`; `code-first-then-tests` → category appropriate to the wiring (often `integration`); `e2e-first` → at least one `e2e` (may be supplemented by `integration` / `unit` if rules demand).
- **Branch-driven 1:1 coverage (`tdd` tasks).** For a `tdd` task, emit **one `unit` test intent per decision branch / failure mode named in `## Deliverable`** — a 1:1 mapping from the named branches/failure modes to test intents. If `## Deliverable` names three branches (e.g. valid input, boundary, rejected input), `## Tests` carries three `unit` entries, one per branch. This is a structural rule, not a new heading: the coverage lives inside the existing `## Tests` bullets. The task-reviewer enforces the inverse — a branch / failure mode named in `## Deliverable` with no corresponding `## Tests` entry in the diff is a CRITICAL FAIL — so the decomposer must make the mapping complete here. (The slow `integration` / `e2e` companions of a port-seam adapter task are not subject to this 1:1 rule — they run once at the adapter task's gate.)
- **Intent** is what behavior must be asserted (not implementation details). Examples: `rejects status transition from terminal back to open`, `endpoint POST /<resource> returns 201 with payload`, `UI flow: user can submit a <form> from the portal`.
- **Suggested location** is a directory or glob discovered by reading project rules or by `Glob`-ing the test tree (e.g. `<backend>/Tests/<Module>/**`, `<frontend>/src/**/__tests__/*`). With multiple candidates, list the most specific.
- **Naming** points at the rule file that documents the convention, or names the sibling pattern to mirror. The `coder` agent dispatches the final filename and method name in context.

Do NOT invent fully-qualified test names. The decomposer's contract is *intent + location*; the `coder` agent dispatches the precise identifier when writing.

### 4d — `Touches` (final)

Start with the plan's hints (file paths it explicitly mentions for this task intent). Augment with:

- `Glob`-derived paths when the intent unambiguously identifies a module (e.g. intent "add <Feature> service" + project has `<module-root>/**/<Feature>*` → include the glob `<module-root>/**/<Feature>*` if the precise files are not yet known).
- Test directory globs for the task's `Tests` (so the task-reviewer can locate the new test files).

Each entry in `Touches` is a `path-or-glob — role` line. Roles are short ("production", "test", "config", "migration", "docs"). Do NOT `Read` the file contents — paths and globs are enough.

If the intent unambiguously names a module / area but no plan hint and no `Glob` finds it → record in `Why`: `Touches inferred from intent; no concrete files found via Glob` and put the closest glob.

### 4e — `Depends on`

Derive from two sources, in this order:

1. **Logical precedence from intent** — task N depends on task M < N when the intent of N consumes an artefact produced by M (e.g. M introduces a schema column that N's code reads; M defines an endpoint that N's frontend calls). Reason over the intent paragraphs.
2. **`Touches` intersection** — task N depends on task M < N when `Touches[N] ∩ Touches[M] ≠ ∅` (same file edited in both). Compute on path globs by structural inclusion (e.g. `<module>/**/<Feature>*` intersects `<module>/<Feature>/<FeatureService>.<ext>`).
3. **Imperative ordering directive** — overrides both above when present (e.g. plan says `endpoint przed UI` → frontend task depends on backend task explicitly).

Result is a comma-separated ascending list of task numbers strictly less than N, or `—` when empty. For each dependency, store a one-line reason for the `Depends on` field.

### Tie-breakers (when no dependency forces order)

When two tasks are genuinely independent and both could start first:

1. Smaller `Touches` set wins the earlier slot (less risk of conflict with the rest of the pipeline).
2. If still tied, use the order in which the intents appear in the plan.

## Step 5 — Order tasks and detect cycles

Topologically sort the task candidates using the `Depends on` graph from Step 4e. Tie-breakers from Step 4e settle remaining slots. Assign numeric IDs 1..K in the resulting order.

If the dependency graph contains a cycle → `STATUS: FAIL` with `## Notes` line: `cyclic dependency detected between task candidates: <verb-phrases>`. Do not write any files.

Task 1 must have `Depends on: —`. If after sorting the slot-1 task has dependencies, attempt one swap with another `Depends on: —` candidate; if no `Depends on: —` candidate exists at all → `STATUS: FAIL` with `## Notes` line: `no standalone-buildable task candidate for Task 1`.

## Step 6 — `Task gate`

For each task, emit the `Task gate` block:

- **`Build: green`** — always present except in `tests-none` tasks whose `Touches` is entirely non-runnable (in which case the gate is the literal single line `- Tests: none`).
- **`Tests:`** — list the exact test identifiers (or, when identifiers are not yet known, the intent shorthand) that must run green. Pull from this task's `Tests` list (Step 4c). When the `coder` agent will dispatch the final identifier, use the intent in backticks (e.g. `` `unit: rejects status transition closed→open` ``); the runner matches the identifier on first run.

Both task gate shapes the `coder`/`task-reviewer` agents understand:

- **Runnable task:**
  ```
  - Build: green
  - Tests: <comma-separated identifiers or backticked intents from this task's Tests>
  ```
- **Docs-only task (`Mode: tests-none`):**
  ```
  - Tests: none
  ```

## Step 7 — Write task files

### Step 7.0 — Copy source plan

Before writing any task file, `Read` the source plan (the `Plan:` path from the input contract) and `Write` its content **verbatim** to `.temp/.workflows/<PlanSlug>/plan.md`. This is a side-artefact for retrospective auditability — the superbuild does not consume it; it lets the user reopen the exact plan body alongside the task files even if `.claude/plans/<slug>.md` is later modified or deleted.

### Step 7.0b — Seed status.yml (authoritative task tracker)

After Step 7.0, `Write` a minimal status file at `.temp/.workflows/<PlanSlug>/status.yml` with this exact one-line shape:

```yaml
current_task: 1
```

The superbuild reads this file when resolving the starting task; the superbuild updates `current_task` after each successful per-task commit. The total task count `K` is derived by the superbuild from `len(task_files)`, not stored in `status.yml`. You only seed the file — never read it back during the same decomposer run.

Idempotency: when Step 0 short-circuits (task files already exist), do NOT touch `status.yml` from this step — Step 0 itself owns the status.yml seed for that case. The superbuild owns all updates after the first commit; a stale `status.yml` from a previous run is the intended source of truth.

### Step 7.1 — Write each task file

For each task `N` from 1 to `K`, `Write` the file `.temp/.workflows/<PlanSlug>/tasks/<N>.md` with this exact structure.

**The first line MUST be a Conventional-Commits-form commit subject H1** — `# <type>(<scope>): <imperative summary>` (e.g. `# feat(auth): add token refresh`, `# docs(readme): document setup steps`). This H1 is the contract consumed by the scripted commit (`commit-task.sh`), which extracts it verbatim as the commit subject (`T<N>: <subject>`). `<type>` is a Conventional-Commits type (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, `style`); `<scope>` is the affected module / area; the summary is a short imperative phrase, no trailing period. Derive it from the task's verb-phrase + `## Touches`. Do NOT write a `# Task <N> — <verb-phrase>` heading; the `Task <N> of <K>` orientation now lives only in the `>` line below.

```markdown
# <type>(<scope>): <imperative summary>

> Source plan: <relative-or-absolute path to source plan>
> Task <N> of <K>

## Plan context

<2–4 sentence synthesis of the plan's outcome intent and any mental-model context relevant to this task. State why this task exists in the plan's bigger picture. No verbatim copy of `## Scope` unless it is exactly the right length.>

## Deliverable

<1–3 sentences. What is observably true after this task that was not true before. Use the imperative voice: "Endpoint X accepts payload Y and returns 201", "Migration adds column Z to table T", "User can submit a <form> from the portal". For a logic task (`Mode: tdd`), the Deliverable MUST explicitly name each decision branch / failure mode the logic handles — e.g. "rejects a transition from a terminal state, allows it from an open state, and raises on an unknown state" — because Step 4c emits one `unit` test intent per named branch (1:1) and the task-reviewer FAILs a named branch with no matching test in the diff. Do not leave branches implicit.>

## Touches

- <path-or-glob> — <role: production | test | config | migration | docs>
- <…>

## Mode

`<tdd | code-first-then-tests | e2e-first | tests-none>`

**Why:** <1–2 sentences. Cite the source of the decision: built-in matrix entry / rule file path / verbatim quote from imperative directive in the plan / `low confidence — no project rule matched`.>

## Tests

- <Kind> — <intent> — suggested location: <dir-or-glob>; naming per <rule path or sibling pattern>
- <…>

<!-- For tests-none tasks the line is exactly: `- none — <reason matching the Mode justification>` -->

## Depends on

- task <M> — <one-line reason (logical precedence / Touches intersection / imperative directive)>
- <…>

<!-- When there are no dependencies, the section body is the single line `—`. -->

## Task gate

- Build: green
- Tests: <comma-separated identifiers or backticked intent shorthands>

<!-- For tests-none tasks, the entire Task gate is the single line `- Tests: none`. -->
```

As you write each task file, keep a `(N, verb-phrase, path)` triple in memory — where `verb-phrase` is the exact text of the commit-subject H1 (the line after `# `) — the `# Output format` step emits this list verbatim on stdout in `## Task files`, so the superbuild never has to re-`Read` the files just to recover the H1.

**Cutting rules:**

- `# <type>(<scope>): <imperative summary>` (the H1) — a Conventional-Commits-form commit subject; this is the line the scripted commit (`commit-task.sh`) extracts verbatim as the commit subject. It MUST be present and well-formed on every task file. No `# Task <N> — …` heading.
- `## Plan context` — synthesise from the plan's outcome intent + mental-model paragraph; never paraphrase the plan's headline sentence to the point of losing its substance.
- `## Deliverable` — a clear restatement of the observable outcome. For `Mode: tdd` logic tasks, name every decision branch / failure mode explicitly (the 1:1 anchor for Step 4c and the task-reviewer's CRITICAL-FAIL check). Do NOT copy a §6 task line verbatim — there is no longer a binding §6.
- `## Mode` + `**Why:**` — single source of truth for how this task is executed. No separate "TDD discipline" bullet. The `**Why:**` line states why the task left (or stayed on) the `tdd` baseline: the carve-out that fired, the imperative/floor directive, or `tdd baseline — no carve-out matched`.
- `## Tests` — intent + suggested location; the `coder` agent dispatches the precise filename and method name.
- `## Task gate` — what the runner will be told to run. Either runnable shape or `Tests: none`.

## Step 8 — Self-check

Run the checklist before returning — each item is verified in full at the cited step:

- Every file has the seven body sections in order, after the commit-subject H1 + `>` orientation lines (Step 7.1).
- Every task file's first line is a well-formed Conventional-Commits H1 `# <type>(<scope>): <summary>` (Step 7.1).
- `Mode` value is exactly one of the four-element enum (Step 4a).
- `Mode: tests-none` → `## Tests` body and `## Task gate` body are each the single prescribed line (Step 4c / 6).
- Every other `Mode` → `## Tests` ≥1 entry and `## Task gate` has `- Build: green` + a matching `- Tests:` line (Step 4c / 6).
- `Mode: tdd` → ≥1 `unit` entry, one per decision branch / failure mode named in `## Deliverable` (branch-driven 1:1) (Step 4c).
- `Mode: e2e-first` → ≥1 `e2e` entry (Step 4c).
- Mode honors the tdd-baseline / ambiguity→tdd / binding-floor doctrine; `**Why:**` justifies any non-`tdd` Mode (Step 4a).
- The forcing functions were applied (one-concern-one-Mode, extract-pure-testable-helper, port-seam split) (Step 3).
- `Depends on` references only task numbers `< N`; no forward/self-references, no cycles (Step 4e / 5).
- Task 1 has `Depends on: —` (Step 5).
- Every Step 2 imperative directive honored in `Mode` / `Tests` / `Depends on`, with `**Why:**` citing the verbatim quote (Step 2 / 4a).
- No file written outside `.temp/.workflows/<PlanSlug>/`; source plan unmodified (header).
- `plan.md` exists and matches the source plan byte-for-byte (Step 7.0).
- `status.yml` exists with `current_task: 1` (or unmodified on the Step 0 short-circuit) (Step 7.0b).
- Every `## Task files` line carries the `<verb-phrase>` matching its file's H1 byte-for-byte (Step 7.1 / Output format).

If any check fails, repair the offending file and re-check before returning. If a check cannot be repaired (a structural impossibility in the plan), return `STATUS: FAIL` and name the offending file / task / check.

# Output format

First line MUST be exactly `STATUS: PASS` or `STATUS: FAIL`.

```
STATUS: PASS

## Task files
- 1 — <verb-phrase> — .temp/.workflows/<slug>/tasks/1.md
- 2 — <verb-phrase> — .temp/.workflows/<slug>/tasks/2.md
- ...

## Notes
- <one short bullet per material assumption / low-confidence decision / unmatched project rule>
- <one bullet per task that has `**Why:** low confidence — …`>
- <one bullet per imperative directive honored (cite verbatim quote and task number)>
- <…>
```

Each `<verb-phrase>` MUST match byte-for-byte the commit-subject text written into the matching task file's `# <type>(<scope>): <summary>` H1 heading (Step 7.1) — i.e. the line content after the leading `# `. The superbuild parses this list to seed its progress widget — emitting the line without the verb-phrase forces the dispatcher to re-`Read` every task file just to recover the H1, which the decomposer already knows.

`## Notes` may be empty (omit the section heading entirely) when there is nothing to flag. Non-empty `## Notes` are surfaced to the user for confirmation before work starts; empty notes mean an unattended start — so flag only what genuinely needs a human decision.

Total reply under 80 lines.

# Anti-patterns (forbidden)

Traps with no positive-step home (every other rule lives in its step; the Step 8 checklist points there):

- Falling back to `STATUS: FAIL` because the plan is "incomplete" or lacks a specific structure (§1 / §3 / §6 / §7 / Layer enum / TDD-discipline-per-task). Any markdown is acceptable input; missing sections are never a failure. Failure is reserved for: empty/unreadable file, no executable intent, contradictory requirements, cyclic dependencies, no standalone-buildable Task 1, a missing `.temp/.workflows/<PlanSlug>/profile.md` (recipe step did not run — Step 1b fail-closed). Everything else is best-effort + `## Notes`.
- Emitting a `**TDD discipline:**` bullet, a `Layer` token (`Backend` / `Frontend` / `Infra` / `Migrate` / `Shared`), a `Task gate` shape-(A)/shape-(B) distinction, or a `Relevant technical design` section. These belong to the old contract and are removed.
- Reading or invoking any other agent. Decomposer is a self-contained reasoning + grouping step.

# Constraint — technology-agnostic

You operate in any language and any framework. The Mode enum (`tdd`, `code-first-then-tests`, `e2e-first`, `tests-none`) is project-agnostic — it describes *styles of work*, not technologies. Project-specific knowledge (test frameworks, naming conventions, layer taxonomy, mandatory test categories) lives in the project's `CLAUDE.md` + `.claude/rules/**` + `.claude/skills/**` and is read selectively. You never default to an ecosystem assumption.
