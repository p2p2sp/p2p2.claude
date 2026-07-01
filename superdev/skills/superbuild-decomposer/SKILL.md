---
name: superbuild-decomposer
description: Pipeline-bound; invoked only by `superdev:superbuild` via the Skill tool, never directly.
model: opus
effort: high
context: fork
user-invocable: false
allowed-tools: Read, Grep, Glob, Write, Bash(bash:*), Bash(python3:*), Bash(cat:*)
---

# Decomposer

The **implementation planner**. Your input is the `Plan:` and `PlanSlug:` fields defined in `# Input contract` — read them from the pre-injected `# Arguments (pre-injected)` block below. Parse the `Plan:` path from that block and `Read` it; reach for additional `Read`s only if something it references is missing.

The upstream plan describes *what* and *why*; this skill decides *how to execute it* — task boundaries, per-task working mode, what to test, and ordering — and writes one focused, self-contained Markdown file per task, each a tight, self-contained context for one downstream task.

Writes nothing outside `.temp/`. Never modifies the source plan.

Project/stack-agnostic. The plan is expected to be a superplan with sections §0–§6 (source template: `## 0. Implementation mode` … `## 6. Migration / data`); free-form prose is a thin fallback, never a failure. Project-specific knowledge (test frameworks, naming, layering) comes from the project's `CLAUDE.md` and `.claude/rules/**` discovered on disk; downstream agents re-read those rules when they touch the relevant files. **Mark the path**; downstream skills walk it.

# Arguments (pre-injected)

```!
cat <<'__DECOMP_ARGV__'
$ARGUMENTS
__DECOMP_ARGV__
```

The block above splices the raw `$ARGUMENTS` text at skill load — the delivery path for the two `# Input contract` fields below. Read `Plan:` and `PlanSlug:` from between the fences above. (Its `$ARGUMENTS` token suppresses the harness `ARGUMENTS:` auto-append, so this block is the sole delivery path — no `ARGUMENTS:`-line fallback exists.)

# Idempotency precheck (pre-injected)

```!
bash "${CLAUDE_PLUGIN_ROOT}/skills/superbuild-decomposer/scripts/precheck.sh" <<'__DECOMP_ARGS__'
$ARGUMENTS
__DECOMP_ARGS__
```

The block above runs `precheck.sh` at skill load over the raw `$ARGUMENTS` (delivered on stdin via a quoted here-doc; the script extracts `PlanSlug:` with builtins). Its stdout is exactly one of: the literal `FRESH` (no prior task files — proceed normally) or a full short-circuit block (`STATUS: PASS` + `## Task files` + `## Notes`) when a prior decomposition already exists. Step 0 consumes this output.

# Project rules listing (pre-injected)

```!
find .claude/rules -name '*.md' 2>/dev/null
```

The block above runs at skill load and lists the project's `.claude/rules/**/*.md` paths so Step 1b can keep the listing in memory without a `Glob` round-trip. If the block is empty or absent (the harness did not execute it, or `find` is unavailable), fall back to the `Glob` listing documented in Step 1b.

# Input contract

The pre-injected `# Arguments (pre-injected)` block carries this exact shape:

```
Plan: <absolute path to plan file>
PlanSlug: <kebab-case slug — usually the plan filename without `.md`>
```

The `Plan:` path points to an existing markdown file describing *what* should be done. It is expected to be a superplan with the §0–§6 sections of the source template, optionally carrying a `> Spec:` reference on its second line. Parse the structural sections (Step 2); a missing section degrades to a thin prose fallback, never a failure. The dispatcher resolves the slug from the plan filename; use it verbatim as the directory name under `.temp/.workflows/`.

# How to work

## Step 0 — Idempotency check (BEFORE reading the plan)

Read the **# Idempotency precheck (pre-injected)** output:

- If it is exactly `FRESH` → proceed to Step 1.
- Otherwise it is the full short-circuit block (a prior decomposition exists) → return that block **verbatim** as your entire reply and stop. Do NOT read the plan, do NOT write any task files.

The idempotency check is **hard no-op for task files** — content / freshness of existing task files is NOT verified; the user must manually delete `.temp/.workflows/<PlanSlug>/` to force regeneration. (`precheck.sh` seeds a missing `status.yml` itself; the superbuild owns it after the first commit.)

## Step 1 — Read the plan and discover project rules

### 1a — Read the plan and its spec

`Read` the `Plan:` path from your input — that is the plan content. Note its absolute path — referenced as `Source plan:` in each generated file (path relative to the repository root when convenient, otherwise absolute).

Parse the `> Spec:` reference from the plan's header (present only when a `superspec` handoff produced the plan; absent otherwise). When present, `Read` the spec — **fail-open**: if the spec path is missing or unreadable, continue without it. Spec consumption points: §4 Behavior Contract + §5 Acceptance Criteria feed the deliverable-branch naming in `## Deliverable` (Step 2 / Step 4c) and the 1:1 `## Tests` mapping (Step 4c). Without these consumption points the spec read is a no-op — so use it only there. For a standalone plan (no spec), the plan's own `## Scope & acceptance criteria` → `Acceptance criteria:` list is the equivalent feed for those same two consumption points (deliverable-branch naming in `## Deliverable` + the 1:1 `## Tests` mapping).

If the plan file is empty or unreadable → `STATUS: FAIL` with `## Notes` line: `plan file empty or unreadable: <path>`. Do not write any task files.

### 1b — Discover project conventions (one-time, before any per-task work)

These reads inform the `Mode` decisions and per-task test suggestions. They are project-driven — treat their contents as authoritative, but never assume any particular file exists.

- `Read .temp/.workflows/<PlanSlug>/profile.md` — the recipe agent already derived the host **framework**, **test naming**, **test layout**, and the **Python3 available** fact there; consume it for the `Mode` decisions, the per-task `Tests` suggestions, and the Step 5 / Step 8 python3 checks instead of re-deriving or re-probing them. Being a fork, you `Read` it directly. **Fail-closed:** if `profile.md` is absent, the recipe step did not run — return `STATUS: FAIL` with `## Notes` line `profile.md absent at .temp/.workflows/<PlanSlug>/profile.md — recipe step did not run`, and do NOT fall back to inferring the framework from `CLAUDE.md`.
- Take the `.claude/rules/**/*.md` paths from the pre-injected **# Project rules listing** block → keep the full list of rule files (paths only) in memory for selective reads later. Fallback: if that block is empty/absent, `Glob '.claude/rules/**/*.md'` to recover the listing. (The profile carries pointers only — it never inlines rule bodies, so this path-scoped read still happens.)

Record the findings. Read individual entries from this list only when a task's keywords match them (Step 4b).

## Step 2 — Map the plan's structural sections

The plan is a superplan; map its §0–§6 sections. A missing section is a thin prose fallback (scan the surrounding text for the same signal in one pass), never a failure:

- **§1 Touch list** → candidate `## Touches` material (`<path> — create|modify — <purpose>`).
- **§2 Phases & dependencies** (`blocks:`) → ordering hints + candidate `## Depends on` (suggestions, not binding — Step 3 / 4e decide).
- **§3 Decisions resolved** → decision context for `## Plan context` and `Why` lines.
- **§4 Test strategy + "Testing direction"** → the `Mode` floor + `## Tests` material (Step 4a binding floor, Step 4c).
- **§5 Risks & assumptions** → `## Notes` orientation; flag any task that would touch an out-of-scope / risk item — including an out-of-scope item listed in the plan's own `## Scope & acceptance criteria` section, when present.
- **§6 Migration / data** → `## Touches` with role `migration` + ordering (schema / data change before its consumers).

**Plan context source.** Synthesize each task's `## Plan context` from the plan **title** + the `> Spec:` reference (if present) + the plan's own `## Scope & acceptance criteria` section (if present, in place of the absent spec) + **§3 Decisions resolved**. A standalone (no-spec) plan carries the `## Scope & acceptance criteria` section — read it directly; a plan with neither a spec nor that section has no dedicated Scope/Context source, so title + §3 remain the designated source for it.

**FAIL trigger — no executable intent.** Return `STATUS: FAIL` with `## Notes` line `no executable intent found — plan describes no concrete change` ONLY when there is **no §1 Touch list AND no recognizable intent** from the title / §3. A plan that merely omits prose is not a failure.

### Contradiction detection

If two structural passages demand mutually exclusive things (e.g. §1 adds column X to table T while §3/§5 says "do NOT touch T"; or §4 says `tdd` for a scope while another line says "no tests for this" for the same scope) → `STATUS: FAIL` with `## Notes` listing both verbatim quotes and the conflict.

## Step 3 — Infer task boundaries

The decomposer decides how the work breaks into tasks. The plan's own phases or §2 ordering are a *hint*, never a contract.

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

Output of Step 3: an ordered list of task **candidates**, each with: short verb-phrase, intent paragraph, and the candidate `Touches` set. Each candidate's **candidate id** is its position in this list (1..K) — stable through Steps 3–4, distinct from the **final task number**, which Step 5 computes and Step 7 assigns to filenames.

## Step 4 — Per-task decisions

For each task candidate, decide `Mode`, `Tests`, `Touches` (final), `Depends on`, and `Docs`.

### 4a — Pick `Mode`

`Mode` is one of the four-element enum. **TDD is the baseline.** The default Mode for any task that contains code logic is `tdd`; the other three Modes are **carve-outs** that apply only when the task matches an enumerated carve-out below. Choose by combining, in this order:

1. **`tdd` is the starting point** — assume `tdd` unless a carve-out fires.
2. The carve-out table below (the only routes off the `tdd` baseline).
3. The §4 binding floor — testing-direction directives from §4 + decisions from §3 (they may raise rigor, never lower it — see the binding floor below).
4. Project rules discovered in Step 4b (may shift the outcome — typically toward more rigor).

**Classify by logic, not surface.** Decide the Mode by reasoning about the *logic inside the files in `## Touches`* — does this task introduce branching, an invariant, a calculation, a transformation, a state transition? — NOT by the task's surface description or its verb phrase. A task titled "wire up the endpoint" that actually computes a discount inside the handler carries logic and stays `tdd` (or is split per the extract-pure-testable-helper rule in Step 3). When the logic is unclear from the intent, classify `tdd` (see the hard tie-breaker).

**Carve-out table** (project-agnostic; the ONLY routes off the `tdd` baseline):

| Carve-out condition (must clearly match to leave `tdd`) | Mode |
|---|---|
| The task is **pure wiring with no logic**: DI / IoC registration, route / endpoint wiring, DTO ↔ entity mapping without calculated fields, glue code, runtime configuration — and carries no branch / invariant / calculation of its own | `code-first-then-tests` |
| The task's deliverable **is** an externally observable cross-layer acceptance criterion: a user-flow crossing layers, a public endpoint contract, a UI flow with a clear external acceptance criterion — AND its internal logic (if any) has been split out under the extract-pure-testable-helper / port-seam rules in Step 3 | `e2e-first` |
| `Touches` is exclusively `*.md`, `.claude/**`, `docs/**`, `.superdev/**`, `**/README*`, `**/CHANGELOG*` (and similar non-runnable artefacts) | `tests-none` |

If no carve-out clearly matches, the Mode is `tdd`. Do not reach for a carve-out on a maybe.

**Tie-breaker — hard rule (not a preference):** when it is uncertain whether a carve-out applies, the Mode **is** `tdd`. This is binding, not advisory: ambiguity resolves to `tdd` every time. Cost of over-applying: one extra cycle. Cost of under-applying: a silent regression with no test to catch it. Never downgrade from `tdd` to soften an uncertain call.

**Binding floor:** when §4 carries a recommended testing direction for a task's scope — the §4 test strategy "Testing direction" content (TDD areas, named edge cases / failure modes, port seams to isolate) — treat it as a **floor on rigor**: it may **raise** the Mode toward more testing (e.g. push a borderline `code-first-then-tests` task to `tdd`, or add a named branch to `## Tests`) but it may **never lower** it below the `tdd` baseline or below what the carve-out table + classify-by-logic already demand. A §4 directive that says "skip tests here" is honoured only when `Touches` independently qualifies for `tests-none`; otherwise the floor holds and the task stays at its computed Mode (note the tension in `Why`). Cite the §4 line in `Why` whenever it applies.

**Project-rule modulation:** see Step 4b — a rule may raise the bar further (e.g. "every API endpoint needs an integration test" adds an `integration` entry to a `tdd` task that ships an endpoint).

### 4b — Selective rules read

From the list globbed in Step 1b, derive keywords from this task's intent and `Touches`:

- Directory segments from `Touches` (e.g. top-level module / layer / feature names visible in the path).
- Topical words from the intent (e.g. `endpoint`, `migration`, `validator`, `auth`, `e2e`, `test`, `tdd`, `cors`).
- Mode-related words: when considering `tdd` always Read any rule whose path or name contains `tdd`, `test`, `testing`.

`Read` ONLY rule files (`.claude/rules/**/*.md`) whose path or filename matches at least one keyword.

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

Start with the §1 hints (file paths it explicitly mentions for this task intent). Augment with:

- `Glob`-derived paths when the intent unambiguously identifies a module (e.g. intent "add <Feature> service" + project has `<module-root>/**/<Feature>*` → include the glob `<module-root>/**/<Feature>*` if the precise files are not yet known).
- Test directory globs for the task's `Tests` (so the task-reviewer can locate the new test files).

Each entry in `Touches` is a `path-or-glob — role` line. Roles are short ("production", "test", "config", "migration", "docs"). Do NOT `Read` the file contents — paths and globs are enough.

If the intent unambiguously names a module / area but no §1 hint and no `Glob` finds it → record in `Why`: `Touches inferred from intent; no concrete files found via Glob` and put the closest glob.

### 4e — `Depends on`

Derive from two sources, in this order:

1. **Logical precedence from intent** — task N depends on task M when the intent of N consumes an artefact produced by M (e.g. M introduces a schema column that N's code reads; M defines an endpoint that N's frontend calls). Reason over the intent paragraphs.
2. **`Touches` intersection** — task N depends on task M when `Touches[N] ∩ Touches[M] ≠ ∅` (same file edited in both). Compute on path globs by structural inclusion (e.g. `<module>/**/<Feature>*` intersects `<module>/<Feature>/<FeatureService>.<ext>`).
3. **Ordering directive from §2 Phases & dependencies** — the §2 `blocks:` graph overrides both above when present (e.g. §2 says `endpoint` blocks `UI` → the frontend task depends on the backend task explicitly).

Result is a comma-separated list of this candidate's dependency candidate ids (any numeric relation — Step 5's script computes the final order), or `—` when empty. For each dependency, store a one-line reason for the `Depends on` field.

### Tie-breakers (when no dependency forces order)

When two tasks are genuinely independent and both could start first:

1. Smaller `Touches` set wins the earlier slot (less risk of conflict with the rest of the pipeline).
2. If still tied, use the order in which the intents appear in the plan.

## Step 5 — Order tasks and detect cycles (scripted)

When `profile.md`'s `Python3 available` fact (Step 1b) is `yes`, run the bundled toposort edge over the Step 4e dependency graph — one line per candidate, in any order: `<candidate id> <Touches bullet count> [dep candidate id ...]`:

```
python3 "${CLAUDE_PLUGIN_ROOT}/skills/superbuild-decomposer/scripts/toposort.py" <<'__DECOMP_GRAPH__'
<one line per candidate>
__DECOMP_GRAPH__
```

Read the result:

- `<final task number> <candidate id>` × K lines, ascending final task number → this is both the execution order and the candidate-id → final-number lookup (build it in one pass over these lines); use it in Step 7 to translate every `Depends on` reference and to name each task file.
- `CYCLE <id> <id> ...` → translate the listed candidate ids to their verb-phrases (held from Step 3), then `STATUS: FAIL` with `## Notes` line: `cyclic dependency detected between task candidates: <verb-phrases>`. Do not write any files.
- `MALFORMED <line>` or `DUPLICATE <id>` (exit 2) → the graph you emitted was ill-formed (a line that is not `<candidate id> <count> [dep id ...]`, or a repeated candidate id) — a Step-4e construction bug, NOT a cyclic graph. `STATUS: FAIL` with `## Notes` line: `malformed dependency graph: <the MALFORMED/DUPLICATE token verbatim>`. Do not write any files; correct the Step-4e emission and re-run.

Trust the script's order and tie-break (ascending `Touches` count, then candidate id) — do not re-sort or re-verify by hand. A real topological sort guarantees the first line's candidate has zero dependencies, so final Task 1 always carries `Depends on: —` — no manual repair needed.

**Fail-open (profile says python3 unavailable):** when `profile.md`'s `Python3 available` fact is `no`, sort by hand — order candidates so every dependency precedes its dependent, breaking remaining ties by ascending `Touches` count then candidate id. If no candidate is placeable while others remain, that is the cycle: `STATUS: FAIL` per the cyclic-dependency `## Notes` line above.

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

### Step 7.0 — Copy source plan + reset status (deterministic)

Before writing any task file, run the bundled committer of the plan-copy edge — it copies the source plan byte-exact into the workflow dir and resets `status.yml` to `current_task: 1`:

```
bash "${CLAUDE_PLUGIN_ROOT}/skills/superbuild-decomposer/scripts/copy_plan.sh" "<src-plan-path>" "<PlanSlug>"
```

Echo both arguments at the call site (the `Plan:` path from the input contract + the `PlanSlug:`). Read the single-line result:

- `PLAN_COPIED` → proceed to Step 7.1.
- `COPY_FAIL <reason>` → `STATUS: FAIL` with `## Notes` line `plan copy failed: <reason>`; write no task files.

The script owns the byte-exact copy and the status reset (the fresh-path `current_task: 1`); trust its result — do not re-`Read` `plan.md` to re-verify it.

### Step 7.1 — Write each task file

Using Step 5's candidate-id → final-task-number mapping, for each final task `N` from 1 to `K`, resolve which candidate fills it and `Write` the file `.temp/.workflows/<PlanSlug>/tasks/<N>.md` with this exact structure.

**The first line MUST be a Conventional-Commits-form commit subject H1** — `# <type>(<scope>): <imperative summary>` (e.g. `# feat(auth): add token refresh`, `# docs(readme): document setup steps`). This H1 is the contract consumed by the scripted commit (`commit-task.sh`), which extracts it verbatim as the commit subject (`T<N>: <subject>`). `<type>` is a Conventional-Commits type (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, `style`); `<scope>` is the affected module / area; the summary is a short imperative phrase, no trailing period. Derive it from the task's verb-phrase + `## Touches`. Do NOT write a `# Task <N> — <verb-phrase>` heading; the `Task <N> of <K>` orientation now lives only in the `>` line below.

```markdown
# <type>(<scope>): <imperative summary>

> Source plan: <relative-or-absolute path to source plan>
> Task <N> of <K>

## Plan context

<2–4 sentence synthesis from the plan title + `> Spec:` reference (if present) + the plan's own `## Scope & acceptance criteria` section (if present) + §3 Decisions resolved relevant to this task. State why this task exists in the plan's bigger picture.>

## Deliverable

<1–3 sentences. What is observably true after this task that was not true before. Use the imperative voice: "Endpoint X accepts payload Y and returns 201", "Migration adds column Z to table T", "User can submit a <form> from the portal". For a logic task (`Mode: tdd`), the Deliverable MUST explicitly name each decision branch / failure mode the logic handles — e.g. "rejects a transition from a terminal state, allows it from an open state, and raises on an unknown state" — because Step 4c emits one `unit` test intent per named branch (1:1) and the task-reviewer FAILs a named branch with no matching test in the diff. Do not leave branches implicit.>

## Touches

- <path-or-glob> — <role: production | test | config | migration | docs>
- <…>

## Mode

`<tdd | code-first-then-tests | e2e-first | tests-none>`

**Why:** <1–2 sentences. Cite the source of the decision: built-in matrix entry / rule file path / §4 testing-direction line / `low confidence — no project rule matched`.>

## Tests

- <Kind> — <intent> — suggested location: <dir-or-glob>; naming per <rule path or sibling pattern>
- <…>

<!-- For tests-none tasks the line is exactly: `- none — <reason matching the Mode justification>` -->

## Depends on

- task <M> — <one-line reason (logical precedence / Touches intersection / §2 ordering directive)>
- <…>

<!-- <M> is the FINAL task number — translate each dependency's candidate id
     through Step 5's mapping before writing this section. When there are no
     dependencies, the section body is the single line `—`. -->

## Task gate

- Build: green
- Tests: <comma-separated identifiers or backticked intent shorthands>

<!-- For tests-none tasks, the entire Task gate is the single line `- Tests: none`. -->
```

As you write each task file, keep a `(N, verb-phrase, path)` triple in memory — where `verb-phrase` is the exact text of the commit-subject H1 (the line after `# `) — the `# Output format` step emits this list verbatim on stdout in `## Task files`, so the superbuild never has to re-`Read` the files just to recover the H1.

**Cutting rules:**

- `# <type>(<scope>): <imperative summary>` (the H1) — a Conventional-Commits-form commit subject; this is the line the scripted commit (`commit-task.sh`) extracts verbatim as the commit subject. It MUST be present and well-formed on every task file. No `# Task <N> — …` heading.
- `## Plan context` — synthesise from the plan title + `> Spec:` (if present) + the plan's own `## Scope & acceptance criteria` section (if present) + §3 Decisions resolved; never lose the plan's substance.
- `## Deliverable` — a clear restatement of the observable outcome. For `Mode: tdd` logic tasks, name every decision branch / failure mode explicitly (the 1:1 anchor for Step 4c and the task-reviewer's CRITICAL-FAIL check). Do NOT copy a plan section line verbatim.
- `## Mode` + `**Why:**` — single source of truth for how this task is executed. No separate "TDD discipline" bullet. The `**Why:**` line states why the task left (or stayed on) the `tdd` baseline: the carve-out that fired, the §4 floor directive, or `tdd baseline — no carve-out matched`.
- `## Tests` — intent + suggested location; the `coder` agent dispatches the precise filename and method name.
- `## Task gate` — what the runner will be told to run. Either runnable shape or `Tests: none`.

## Step 8 — Self-check

Validate the written task files with the bundled structural validator, then run the inline non-scriptable checks.

**Structural validation (scripted):** when `profile.md`'s `Python3 available` fact (Step 1b) is `yes`, run:

```
python3 "${CLAUDE_PLUGIN_ROOT}/skills/superbuild-decomposer/scripts/validate_tasks.py" "<PlanSlug>" "<src-plan-path>"
```

Echo both arguments at the call site (`plan-bytes` / `status-seed` need the source path + slug). Read the result:

- `VALIDATE_OK` → structural checks pass.
- one or more `FAIL <file>:<check>` lines → repair the named file(s) and re-run until `VALIDATE_OK`. If a check cannot be repaired (a structural impossibility in the plan), return `STATUS: FAIL` and name the offending file / check.

The validator covers (trust it; do not re-verify by hand): `h1-form`, `verb-h1`, `section-order`, `mode-enum`, `tests-none-shape`, `tests-empty`, `gate-shape`, `tdd-unit-min`, `e2e-min`, `forward-ref`, `task1-dep`, `cycle`, `plan-bytes`, `status-seed`.

**Fail-open (profile says python3 unavailable):** when `profile.md`'s `Python3 available` fact is `no`, the validator does not start — run this condensed inline checklist by hand instead (the same structural checks):

- Every file has the seven body sections in order, after the commit-subject H1 + `>` orientation lines.
- Every task file's first line is a well-formed Conventional-Commits H1 `# <type>(<scope>): <summary>` and not a `# Task <N>` heading.
- `Mode` value is exactly one of the four-element enum.
- `Mode: tests-none` → `## Tests` body and `## Task gate` body are each the single prescribed line.
- Every other `Mode` → `## Tests` ≥1 entry and `## Task gate` has `- Build: green` + a matching `- Tests:` line.
- `Mode: tdd` → ≥1 `unit` entry; `Mode: e2e-first` → ≥1 `e2e` entry.
- `Depends on` references only task numbers `< N`; no forward/self-references, no cycles; Task 1 has `Depends on: —`.
- `plan.md` exists and matches the source plan byte-for-byte; `status.yml` exists with `current_task: 1`.

**Inline non-scriptable checks (ALWAYS run, both branches):**

- **Branch→test 1:1** — every decision branch / failure mode named in `## Deliverable` has a matching `## Tests` entry (Step 4c).
- **Mode doctrine** — Mode honors the tdd-baseline / ambiguity→tdd / binding-floor doctrine; `**Why:**` justifies any non-`tdd` Mode (Step 4a).
- **Forcing functions applied** — one-concern-one-Mode, extract-pure-testable-helper, port-seam split (Step 3).
- **§4 floor / §2 ordering honored** — each §4 testing-direction directive and §2 ordering directive is reflected in `Mode` / `Tests` / `Depends on`, cited in `**Why:**`.
- No file written outside `.temp/.workflows/<PlanSlug>/`; source plan unmodified.
- Every `## Task files` line carries the `<verb-phrase>` matching its file's H1 byte-for-byte.

If any inline check fails, repair the offending file and re-check before returning.

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
- <one bullet per §4 floor / §2 ordering directive honored (cite the line and task number)>
- <…>
```

Each `<verb-phrase>` MUST match byte-for-byte the commit-subject text written into the matching task file's `# <type>(<scope>): <summary>` H1 heading (Step 7.1) — i.e. the line content after the leading `# `. The superbuild parses this list to seed its progress widget — emitting the line without the verb-phrase forces the dispatcher to re-`Read` every task file just to recover the H1, which the decomposer already knows.

`## Notes` may be empty (omit the section heading entirely) when there is nothing to flag. Non-empty `## Notes` are surfaced to the user for confirmation before work starts; empty notes mean an unattended start — so flag only what genuinely needs a human decision.

Total reply under 80 lines.

# Anti-patterns (forbidden)

Traps with no positive-step home (every other rule lives in its step; the Step 8 checklist points there):

- Falling back to `STATUS: FAIL` because the plan is "incomplete" or lacks a specific §0–§6 section. A missing section degrades to a thin prose fallback, never a failure. Failure is reserved for: empty/unreadable file, no executable intent (no §1 Touch list AND no recognizable intent from title/§3), contradictory requirements, cyclic dependencies, a missing `.temp/.workflows/<PlanSlug>/profile.md` (recipe step did not run — Step 1b fail-closed), a `COPY_FAIL` from the plan-copy script (Step 7.0). Everything else is best-effort + `## Notes`.
- Reading or invoking any other agent or skill. Decomposer is a self-contained reasoning + grouping step.

# Constraint — technology-agnostic

You operate in any language and any framework. The Mode enum (`tdd`, `code-first-then-tests`, `e2e-first`, `tests-none`) is project-agnostic — it describes *styles of work*, not technologies. Project-specific knowledge (test frameworks, naming conventions, layer taxonomy, mandatory test categories) lives in the project's `CLAUDE.md` + `.claude/rules/**` and is read selectively. You never default to an ecosystem assumption.
