---
name: superbuild
description: >-
  Use ONLY when the approved plan's body contains the §0 marker line `Implementation: superbuild`. Do NOT auto-trigger on generic intents like "implement", "build", "code", "execute", "carry out", nor on a bare mention of "superbuild" in the user's message or plan prose — the `Implementation: superbuild` marker line in the approved plan is the sole trigger (any language).
allowed-tools: Read, Bash, Write, Grep, Glob, Skill, Workflow, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList, TaskStop
user-invocable: false
model: opus
effort: low
---

!`mkdir -p .superdev/.workflows 2>/dev/null || true`

# Superbuild — Task Pipeline Dispatcher

Drives an already-approved plan, task by task. A **thin dispatcher**: every code touch, test run, review, learning capture, and commit runs in a sub-agent with fresh context. Makes no judgment about the code itself.

The per-task inner loop (coder → runner → task-reviewer → improver, with retry / BLOCKED-unblock / loop-guard) is NOT model-driven — it runs inside `scripts/task-pipeline.workflow.js`, invoked **once per task**. The dispatcher's `Skill` calls (decomposer, adr-recorder, final-reviewer) and each per-task `Workflow` call each depend on the previous result: **dispatch exactly one per turn and await it**, overriding any "batch independent calls" guidance.

## Pipeline graph

```
plan.md
   │  (MANDATORY first step every entry — owns the clean-tree guard; FAIL = hard halt)
   ▼
recipe  ──►  writes .superdev/.workflows/<slug>/recipe.sh + profile.md  ──►  recipePath threaded into every Workflow
   │  (once, before decompose — config-gated by `adr`, idempotent via adr.done)
   ▼
adr-recorder  ──►  writes .superdev/adr/<ADR>.md + .superdev/ADR.md  ──►  commit-adr.sh commits them
   │  (once, before the loop)
   ▼
decomposer  ──►  .superdev/.workflows/<slug>/tasks/<N>.md  +  status.yml
   │  (per task N — ONE Workflow invocation drives the whole inner loop)
   ▼
task-pipeline.workflow.js  ──►  coder ─► runner ─► task-reviewer ─► improver ─► commiter
   │   (.js owns retry / BLOCKED-unblock / loop-guard / report-forwarding; commiter runs commit-task.sh on PASS;
   │    returns {status, attempts, lastFailureReportPath, outputTokens, commit?})
   ├─ PASS ──►  read wf_out.commit  ──►  status.yml / base.sha  ──►  widget completed
   └─ FAIL ──►  AskUserQuestion (Retry retry_escalation_attempts more / Abort)
   │  (after last task, once)
   ▼
superbuild-reviewer (sub-dispatcher)  ──►  fans out 6 parallel lenses  ──►  go/no-go verdict on stdout + writes final-review.md
   │  (last step — config-gated by `docs`, idempotent via docs.done; runs on ANY verdict)
   ▼
docs-recorder  ──►  reconciles .superdev/docs/index.md + shards  ──►  commit-docs.sh commits them
```

Roles (one line each):

- **recipe** (`superbuild-recipe`) — mandatory first step; derives host build/test/lint/launch verbs once → `recipe.sh` + `profile.md` (the single artifact every downstream fork consumes). Owns the run's clean-tree guard (its fail-closed Step 0); `STATUS: FAIL` = hard halt. Self-skips when its own `recipe.sh verify` passes.
- **adr-recorder** (`superbuild-adr`) — judges the plan and, on a real architectural decision, writes the ADR file(s) + `.superdev/ADR.md` index. Once, before decompose, config-gated by `adr`, committed by `commit-adr.sh`. Never touches the plan or decomposer.
- **decomposer** (`superbuild-decomposer`) — slices the plan into per-task files; once, idempotent.
- **task-pipeline** (`scripts/task-pipeline.workflow.js`) — the deterministic per-task inner loop, one `Workflow` call per task. Owns retry / BLOCKED-unblock / loop-guard / report-forwarding, dispatches the workers below, and runs the commit stage on PASS. Returns `{status: PASS|FAIL, attempts, lastFailureReportPath, outputTokens, commit?}` (`commit` only on PASS; `outputTokens` = run's `budget.spent()` delta, output-only, `null` when unavailable). Behaviour: `references/retry-policy.md`.
- **coder** (`coder` agent) — production code for ONE task; the workflow drives its `Mode: normal` and `Mode: unblock` passes.
- **runner** (`runner` agent → `superbuild-runner` skill) — the workflow dispatches the haiku `runner` agent, which builds the task-scoped args and invokes `superbuild-runner` in pipeline mode; emits `PASS`/`FAIL`/`ERROR`/`TIMEOUT`/`BLOCKED`.
- **task-reviewer** (`task-reviewer` agent) — verifies Deliverable + tests + conventions against the working tree; emits `PASS`/`FAIL`/`BLOCKED`.
- **improver** (`improver` agent) — promotes the task's review learnings into `.claude/rules/` (delegating authoring to `memory-rules`); always `PASS`. Gated by `rules_improver`.
- **commiter** (`commiter` agent → `scripts/commit-task.sh`) — commits the task as the workflow's **final stage**, only on PASS. The script self-verifies (HEAD advanced + clean tree) before emitting a `sha`; the agent only relays its tag; the workflow parses it into `wf_out.commit`. The dispatcher never runs the commit and trusts `wf_out.commit` directly.
- **superbuild-reviewer (sub-dispatcher)** — one-shot terminal gate after the last commit; fans out six parallel lenses via Skill (`superbuild-reviewer-plan` + four `superbuild-reviewer-{quality,architecture,testing,readiness}` code-quality lenses + `superbuild-runner` Scope: full), synthesizes one go/no-go verdict on stdout, and **writes** `.superdev/.workflows/<slug>/final-review.md`. The dispatcher materializes `plan.diff` and passes `Report path:` + `Diff file:`.
- **docs-recorder** (`superbuild-docs`) — the **last** step; reconciles the agent-facing as-built docs in `.superdev/docs/` (index + shards) against the cumulative `plan.diff`. Once, after final review, config-gated by `docs`, runs on ANY final verdict (changes are already committed), committed by `commit-docs.sh`. Reuses the `plan.diff` + `final-review.md` already materialized; never touches source or the plan.

Each worker carries its own input/output contract: the workflow's agents in `agents/<name>.md`; decomposer/runner in their `SKILL.md`; the committer tag in `scripts/commit-task.sh`'s header; the workflow's args/return in `scripts/task-pipeline.workflow.js`'s header. The dispatcher reads only the workflow's `{status, attempts, lastFailureReportPath, outputTokens, commit}` return and the **ADR** / **docs** committers' tags (`parse_commit_tag`). When the workflow's contract changes, update the `.js` header, then this graph and `references/retry-policy.md`.

## Locate the plan

Resolve the plan path **deterministically** — first match wins:

1. **Explicit argument** — `$ARGUMENTS` carries a `Plan: <path>` line (or a bare `.claude/plans/…md` token). Use as-is.
2. **Harness approval signal** — the most recent `ExitPlanMode` approval injects `Your plan has been saved to: <absolute-path>`; anchor on it.
3. **Conversation scan** — else the most recent path matching `\.claude[/\\]plans[/\\][^\s]+\.md`.
4. **None resolved** — stop with one line: `No plan path resolved — re-run with 'Plan: <absolute-path>'.` Do not prompt.

Once resolved, `Read` the plan briefly for orientation. The plan is expected to be SuperPlan-shape (§0–§6); free-form prose is a thin fallback the decomposer degrades to, never required. The dispatcher does not parse it — `decomposer` derives per-task deliverables, modes, tests, ordering. `max` (task count) comes from decomposer's `task_files` map.

## Recipe — mandatory first step (clean-tree guard owner)

The **FIRST** step every entry, before ADR / decompose / loop. `superbuild-recipe` derives the host toolchain once → `recipe.sh` + `profile.md`. It **owns the clean-tree guard** (its fail-closed Step 0) — so the dispatcher never checks `git status --porcelain` itself anywhere. The agent self-skips regeneration when `recipe.sh verify` passes, so invoke it unconditionally.

```
slug = basename(plan-path) without trailing ".md"   # ORIGINAL plan filename — same slug ADR/decompose re-derive
recipe_path = ".superdev/.workflows/<slug>/recipe.sh"    # forwarded to each per-task Workflow as `recipePath`

# Inject the plan CONTENT via dynamic context — pass the BARE ABSOLUTE plan path + the slug.
recipe_out = Skill(skill="superdev:superbuild-recipe", args="<abspath(plan-path)> <slug>")
if first_status_line(recipe_out) != "STATUS: PASS":
    # Hard halt (= decomposer FAIL). FAIL = dirty tree / unresolvable verb / missing tool; the agent named
    # the cause on stdout — surface it verbatim and stop. No clean-tree retry.
    report recipe_out and stop the skill
print("Recipe: ready")
```

The recipe FAIL is the **only** clean-tree gate. `recipe_path` is threaded into every per-task `Workflow` as `recipePath` (the workflow splices it into the coder + runner-wrapper prompts).

## Config switches

<config>

!`cat .superdev/config.yml 2>/dev/null || true`

</config>

Read each boolean as **on only when its value is literally `true`**; a missing key/file/unreadable file = **off** (fail-closed; a project that never ran `/superdev:setup` skips these until it opts in):

- `adr` → run the ADR step below.
- `rules_improver` → run the per-task `improver` step. Forwarded as the workflow's `rulesImprover` arg.
- `docs` → run the as-built docs step after the final review.

Two **integer** keys tune the retry budget, fail-open to `3` (missing key/file or non-integer → `3`):

- `retry_max_attempts` → per-task cap for the first workflow invocation. Forwarded as `retryMaxAttempts`.
- `retry_escalation_attempts` → cap offered on the escalation `AskUserQuestion`; on Retry, forwarded as `retryMaxAttempts`.

A skipped config-gated step prints **one terse line** (`ADR: skipped (disabled)`, `[N/max] improver: skipped (disabled)`, `Docs: skipped (disabled)`) — never a paragraph.

## ADR recording (before decompose)

`superbuild-adr` judges the plan and, on a real architectural decision, **writes the ADR file(s) + `.superdev/ADR.md` itself**; the dispatcher then commits them with `commit-adr.sh`. The **plan is never modified or copied** — the decomposer always gets the ORIGINAL plan and learns nothing about ADRs. The **only** ADR step in the flow. Once per run; the `adr.done` marker (and existing task files) make it idempotent on resume.

```
slug = basename(plan-path) without trailing ".md"   # always the ORIGINAL plan filename
decompose_plan_path = plan-path                      # ALWAYS the original plan — never augmented or copied

# Idempotency gate: ADR step already done, or task files exist (resume past decompose).
if exists(".superdev/.workflows/<slug>/adr.done") OR Glob(".superdev/.workflows/<slug>/tasks/*.md") returns ≥1 path:
    skip to "Decompose the plan into per-task files"

# Config gate: `adr` ≠ literally `true` → skip, mark done so a later resume stays consistent.
if config switch `adr` is not literally `true`:
    print("ADR: skipped (disabled)")
    Write(".superdev/.workflows/<slug>/adr.done", "skipped\n")
    skip to "Decompose the plan into per-task files"

# Clean tree already guaranteed by the recipe step's Step 0 — no git status re-check here.
# superbuild-adr injects the plan CONTENT via `cat $ARGUMENTS` → pass the BARE ABSOLUTE path. The fork
# WRITES the ADR file(s) + index itself and returns only a verdict + commit subject.
adr_out = Skill(skill="superdev:superbuild-adr", args="<abspath(plan-path)>")
if first_status_line(adr_out) == "STATUS: ADR":
    subject = the text after "Commit-subject: " in adr_out (single line)
    commit_out = bash(f'bash "${{CLAUDE_PLUGIN_ROOT}}/skills/superbuild/scripts/commit-adr.sh" "{subject}"').stdout
    commit_result = parse_commit_tag(commit_out)   # same tag shapes as commit-task.sh
    if commit_result[0] == "sha":
        print(f"ADR: recorded ({commit_result[1]})")
    elif commit_result[0] == "no-changes":
        print("ADR: recorder reported ADR but no files to commit — continuing without ADR.")
    else:   # error / malformed
        report f"ADR commit FAILED: {commit_result[1] if len(commit_result) > 1 else commit_out}" and stop
else:
    # STATUS: NO-ADR (or malformed) → nothing written, nothing to commit.
    print("ADR: none")

Write(".superdev/.workflows/<slug>/adr.done", "done\n")   # mark done for idempotent resume
```

The ADR commit lands **before** the per-task loop, so it parents the Task 1 commit; `base.sha` (= `HEAD^` after Task 1) points at it and the final-review diff excludes it — correct, since an ADR is documentation, not plan functionality.

## Decompose the plan into per-task files

Invoke `decomposer` exactly once per run, **before** the loop:

```
# slug + decompose_plan_path (= plan-path) resolved in "ADR recording" above
decomp_prompt = "Plan: <decompose_plan_path>\nPlanSlug: <slug>"
decomp_out = Skill(skill="superdev:superbuild-decomposer", args=decomp_prompt)
if first_status_line(decomp_out) != "STATUS: PASS":
    escalate via AskUserQuestion ("Decomposer failed. Retry or Abort?") and stop on Abort
parse "## Task files" → task_files: dict[N → absolute path to <N>.md], task_titles: dict[N → verb-phrase]
max = len(task_files)
```

Each `## Task files` line is `- <N> — <verb-phrase> — <path>`; parse with `^- (\d+) — (.+) — (.+\.md)$` (group 2 = verb-phrase, group 3 = path). `task_titles` seeds the progress widget without re-reading task files.

Decomposer is idempotent: existing `.superdev/.workflows/<slug>/tasks/*.md` → `STATUS: PASS` + `## Notes: existing task files detected — decomposition skipped`. To force regeneration, delete the directory.

Print `Plan decomposed into <K> task file(s).`

The dispatcher hands per-task work to `task-pipeline.workflow.js` (one `Workflow` per task), not to workers directly — the workflow builds every worker prompt and owns the report paths under `.superdev/.workflows/<slug>/orchestration/task-<N>/<role>-<attempt>.md`. The dispatcher passes only the coarse handles: `taskFile`, `reportDir`, `taskBaseSha`, `recipePath`, `taskGateRunnable`, `rulesImprover`, `retryMaxAttempts`, and (on escalation) `feedbackPath`. The commit stays inside the workflow. Exact prompt shapes + report slots: the workflow's header + `references/retry-policy.md`.

Decomposer's `## Notes` is informational — the superbuild does not gate on it. Material decisions resurface in the final whole-plan review against the cumulative diff.

## Resolve the starting task

First applicable wins:

```
status_path = ".superdev/.workflows/<slug>/status.yml"
current_task = parse_status_yml(status_path)   # None if missing or malformed
arg_task = parse_arg_task($ARGUMENTS)          # integer N if `task=<N>` present, else None

if current_task is not None and current_task > max:
    # Sentinel: every task already committed in a prior session. Set start = current_task so the widget seed
    # marks all completed; the per-task loop is naturally empty for start > max → control falls to final review.
    print(f"Plan {slug} already fully implemented (current_task={current_task}, total={max}); running final review only.")
    start = current_task
elif current_task is not None and current_task <= max:
    status_start = current_task
    if arg_task is not None and arg_task != status_start:
        answer = AskUserQuestion(
            question=f"status.yml says start at Task {status_start}; arguments say Task {arg_task}. Which?",
            options=[f"Task {status_start} (from status.yml)", f"Task {arg_task} (from arguments)"]
        )
        start = status_start if answer.startswith(f"Task {status_start}") else arg_task
    else:
        start = status_start
elif arg_task is not None:
    start = arg_task
else:
    start = 1
```

Helpers: `parse_status_yml`, `parse_arg_task` — see `references/status-parsing.md`.

Print one line: `Implementing <plan-slug> from Task <start> of <max>.`

## Seed the progress widget

A parallel visual channel (next to the dispatcher's coarse `print` line and the workflow's `log` channel — see the two-tier signal in `# Anti-patterns`). Renders the whole task list once, then per-task `TaskUpdate` flips each between `pending`/`in_progress`/`completed`. Every UI call goes through `safe_task_call` (see `references/status-parsing.md`) — a UI error never halts the pipeline.

Run **after** `start` is resolved, **before** the loop. The `current_task > max` sentinel sets `start = max + 1`, so a fully-replayed plan shows every task `completed`.

```
task_widgets: dict[int, str] = {}      # N -> taskId (flat — TaskCreate has no parent field)
for N in 1..max:
    verb = task_titles[N]              # from decomposer's listing — no file read
    task_widgets[N] = safe_task_call(TaskCreate,
        subject=f"Task {N}: {verb}",
        description=f"Pipeline pass for task file `.superdev/.workflows/{slug}/tasks/{N}.md`.",
        activeForm=f"Implementing Task {N}: {verb}")

# Resume: every task below `start` is already committed → mark completed.
for N in 1..(start - 1):
    safe_task_call(TaskUpdate, taskId=task_widgets[N], status="completed")
```

The widget is a **UI overlay, not state of truth** (truth = `status.yml`, task files, `base.sha`, `task-base.sha`, git). `TaskUpdate` has no `failed` state — a terminal failure leaves the task at `in_progress` (the visually-stuck row IS the "halted here" signal); the `print` line carries the diagnostic. Constraints: `references/status-parsing.md`.

## Per-task pipeline

Clean tree is already guaranteed (recipe Step 0). Read the retry-budget config once (fail-open, default `3`):

```
retry_max_attempts        = parse_int_config("retry_max_attempts", default=3)
retry_escalation_attempts = parse_int_config("retry_escalation_attempts", default=3)
rules_improver_on         = config switch `rules_improver` is literally true   # default-disabled

# Output-token accounting (display-only; truth stays in git/status.yml). Each Workflow returns `outputTokens`
# (a budget.spent() delta, output-only, `null` when unavailable). Accumulate every invocation's value.
plan_output_tokens = 0            # Σ across ALL workflow invocations this run
task_output_tokens = {}           # N -> Σ for task N (across attempts/escalations)
```

For each task `N` from `start` to `max`, the dispatcher's job is four bookends: widget flip, `task-base.sha` capture, the workflow call, and (on PASS) commit + state writes / (on FAIL) the escalation prompt. The inner pipeline is **one** `Workflow` call.

```
safe_task_call(TaskUpdate, taskId=task_widgets[N], status="in_progress")   # only this task is in_progress

# Per-task audit/transport dir (ephemeral, NOT truth). The workflow dictates every report path inside it.
orch_dir = f".superdev/.workflows/<slug>/orchestration/task-{N}"

# Persist task-base.sha BEFORE the workflow (attempt-1 capture). The SHA every task-reviewer/coder uses for the
# task diff; stable for the whole task — escalation re-invokes MUST NOT overwrite it. Written once per task.
task_base_sha = bash("git rev-parse HEAD").strip()
Write(".superdev/.workflows/<slug>/task-base.sha", task_base_sha + "\n")

# Is the gate runnable? Pure `Tests: none` → false (runner pass skipped).
gate = extract_task_gate(N)
task_gate_runnable = (gate has "^\s*- Tests:" with non-`none` value) OR (gate has "^\s*- Build: green")

feedback_path = ""           # "" on first invocation; set on escalation Retry
cap = retry_max_attempts     # first invocation; escalation uses retry_escalation_attempts

escalation_loop:   # dispatcher-level (NOT the per-attempt loop — that lives inside the workflow)
    wf_out = Workflow(
        scriptPath="${CLAUDE_PLUGIN_ROOT}/skills/superbuild/scripts/task-pipeline.workflow.js",
        args={
            "taskFile":         task_files[N],
            "reportDir":        orch_dir,
            "taskBaseSha":      task_base_sha,
            "recipePath":       recipe_path,
            "taskGateRunnable": task_gate_runnable,
            "rulesImprover":    rules_improver_on,
            "retryMaxAttempts": cap,
            **({"feedbackPath": feedback_path} if feedback_path != "" else {}),
        },
    )
    # wf_out = {status, attempts, lastFailureReportPath, outputTokens, commit}. `commit` only on PASS.
    print(f"[{N}/{max}] task-pipeline: {wf_out.status} (attempts {wf_out.attempts}/{cap})")   # coarse signal
    if isinstance(wf_out.outputTokens, int):     # sum EVERY invocation (retried work is real consumption)
        plan_output_tokens += wf_out.outputTokens
        task_output_tokens[N] = task_output_tokens.get(N, 0) + wf_out.outputTokens
    if wf_out.status == "PASS":
        break escalation_loop    # commit already ran inside the workflow; fall through to read wf_out.commit
    # FAIL: cap exhausted (or a BLOCKED guard converted to FAIL). Escalate.
    answer = AskUserQuestion(
        question=f"Task {N} failed after {wf_out.attempts} attempts. Latest failure: {wf_out.lastFailureReportPath}. Choose:",
        options=[f"Retry {retry_escalation_attempts} more times", "Abort"]
    )
    if answer starts with "Retry":
        cap = retry_escalation_attempts
        feedback_path = wf_out.lastFailureReportPath   # seed the first coder pass; task_base_sha NOT recomputed
        continue escalation_loop
    else:
        report f"Aborted at Task {N} after {wf_out.attempts} attempts." and stop the skill   # widget stays in_progress

# Commit ran INSIDE the workflow (final stage, only on PASS) via commiter → commit-task.sh; the workflow parsed
# its tag into wf_out.commit. Trust it directly (the script self-verifies HEAD advanced + clean tree before any
# `sha`). Subject authoring lives in superbuild-decomposer (task `# ` H1) + commit-task.sh (`T<N>:`), never here.
#   commit.kind ∈ {sha,sha,files,subject} | {no-changes} | {error,reason} | {malformed,raw}
commit = wf_out.commit
if commit.kind == "sha":
    short_sha = commit.sha
    print(f"[{N}/{max}] commit: {short_sha}")
    if N == 1:    # persist base.sha after the first commit (parent is now HEAD^ — read-only query)
        parent_sha = bash("git rev-parse \"HEAD^\"").strip()
        Write(".superdev/.workflows/<slug>/base.sha", parent_sha + "\n")
    safe_task_call(TaskUpdate, taskId=task_widgets[N], status="completed", description=f"Committed {short_sha}.")
elif commit.kind == "no-changes":
    print(f"[{N}/{max}] commit: no-op (no-changes)")
    safe_task_call(TaskUpdate, taskId=task_widgets[N], status="completed", description="No-op (no-changes).")
elif commit.kind == "error":
    report f"[{N}/{max}] commit FAILED: {commit.reason}" and stop    # widget stays in_progress
else:
    report f"[{N}/{max}] commit MALFORMED: {commit.raw}" and stop    # widget stays in_progress

# status.yml — authoritative task tracker. After task N, next is N+1. After N=max → `current_task: max+1`
# (the "all done" sentinel the starting-task resolution detects on a re-run).
Write(".superdev/.workflows/<slug>/status.yml", f"current_task: {N + 1}\n")
```

### Notes on the loop

- Retry cap, BLOCKED branch, loop-guard, report-forwarding, the commit stage: owned by the workflow (`references/retry-policy.md`). The dispatcher invokes it once per task and reads only its structured return.
- The dispatcher does not parse per-agent `STATUS:` lines — that happens inside the workflow. Its per-task signal is `[<N>/<max>] task-pipeline: <PASS|FAIL> (attempts <K>/<cap>)` + the `commit` line; per-agent granularity lives in the workflow's `phase`/`log` channel.
- The loop iterates zero times when `current_task > max` (whole plan already committed) — control flows into the final review.

## Final whole-plan review

Runs **once**, after the last task commits (or when the `current_task > max` sentinel jumps here). Delegated wholesale to `superdev:superbuild-reviewer`, which fans out six parallel lenses → synthesis, **returns one go/no-go verdict on stdout**, and **writes** the report to the `Report path:` you hand it. The dispatcher materializes the cumulative patch the four quality lenses need (they have no `Bash`).

```
# base_sha priority: persisted .superdev/.workflows/<slug>/base.sha → git merge-base HEAD main. Then head_sha = HEAD.
diff_path   = ".superdev/.workflows/<slug>/plan.diff"      # ephemeral transport, NOT truth
report_path = ".superdev/.workflows/<slug>/final-review.md"
bash(f'git diff {base_sha}..{head_sha} > "{diff_path}"')
final_prompt = (
    "Plan: <plan-path>\n"
    "Diff range: " + base_sha + ".." + head_sha + "\n"
    "Diff file: " + diff_path + "\n"
    "Report path: " + report_path
)
final_out = Skill(skill="superdev:superbuild-reviewer", args=final_prompt)
final_status = first_status_line(final_out)                         # STATUS: PASS / STATUS: FAIL
final_verdict = final_status.removeprefix("STATUS: ") if final_status.startswith("STATUS: ") else "FAIL"
print(f"[final] superbuild-reviewer: {final_verdict} (report: {report_path})")
# Surface final_out (verdict + sub-step breakdown) verbatim, then fall through to the as-built docs step
# below — that is the true last step. Do NOT stop here. plan-path + diff_path + report_path + final_verdict feed it.
surface final_out verbatim
```

`final-review.md` is written by the **fork**, not the dispatcher — the dispatcher only materializes `plan.diff`, passes `Report path:` + `Diff file:`, and surfaces the verdict. The verdict + sub-step breakdown on stdout is surfaced verbatim; point the user at the report. `FAIL` is advisory, not retry-triggering — and does **not** skip the docs step (the work is already committed; see below).

**One-shot.** No retry loop, no `AskUserQuestion`, no `improver` here. Full pseudocode + `base_sha` rationale + anti-patterns: `references/final-review.md`. The as-built docs step below is the only step after this one.

## As-built docs recording (after final review)

The **last** step. `superbuild-docs` reconciles `.superdev/docs/` (index + shards) against the cumulative `plan.diff` and **writes the files itself**; the dispatcher then commits them with `commit-docs.sh`. Runs on ANY final verdict — the per-task commits already landed, so docs must mirror the committed tree even when the final review FAILed (the fork stamps a provisional marker on a FAIL). Config-gated by `docs`; the `docs.done` marker makes it idempotent on resume. Reuses the `diff_path` (`plan.diff`) + `report_path` (`final-review.md`) + `final_verdict` from the final-review step — nothing is re-materialized.

```
# Idempotency gate: docs step already done this run.
if exists(".superdev/.workflows/<slug>/docs.done"):
    stop the skill

# Config gate: `docs` ≠ literally `true` → skip, mark done, stop.
if config switch `docs` is not literally `true`:
    print("Docs: skipped (disabled)")
    Write(".superdev/.workflows/<slug>/docs.done", "skipped\n")
    stop the skill

# superbuild-docs injects plan + plan.diff + final-review CONTENT via `cat` of the four ` ||| `-separated
# paths/fields. The fork WRITES the index + shard(s) itself and returns only a verdict + commit subject.
docs_args = f"{abspath(plan-path)} ||| {abspath(diff_path)} ||| {abspath(report_path)} ||| {final_verdict}"
docs_out = Skill(skill="superdev:superbuild-docs", args=docs_args)
if first_status_line(docs_out) == "STATUS: DOCS":
    subject = the text after "Commit-subject: " in docs_out (single line)
    commit_out = bash(f'bash "${{CLAUDE_PLUGIN_ROOT}}/skills/superbuild/scripts/commit-docs.sh" "{subject}"').stdout
    commit_result = parse_commit_tag(commit_out)   # same tag shapes as commit-adr.sh / commit-task.sh
    if commit_result[0] == "sha":
        print(f"Docs: recorded ({commit_result[1]})")
    elif commit_result[0] == "no-changes":
        print("Docs: recorder reported DOCS but no files to commit — continuing without docs.")
    else:   # error / malformed
        report f"Docs commit FAILED: {commit_result[1] if len(commit_result) > 1 else commit_out}" and stop
else:
    # STATUS: NO-DOCS (or malformed) → nothing written, nothing to commit.
    print("Docs: none")

Write(".superdev/.workflows/<slug>/docs.done", "done\n")   # mark done for idempotent resume
stop the skill
```

The docs commit is separate from any code/ADR commit (its own `docs(spec): …`); it lands after the final review, so it is excluded from the plan diff that review already consumed — correct, since docs are documentation, not plan functionality. A `Docs commit FAILED` is the only hard stop here; `NO-DOCS` / `no-changes` are benign.

## Helpers and pattern reference

Dispatcher-only helpers (`first_status_line`, `parse_status_yml`, `parse_arg_task`, `parse_int_config`, `parse_commit_tag` — used only for the **ADR** and **docs** commits, `safe_task_call`), the commit tag table, and the widget constraints: `references/status-parsing.md`. The per-task committer tag is parsed by the workflow (`parseCommitTag`) and surfaced as `wf_out.commit` — never by the dispatcher. The worker-`STATUS:` regexes, runner verdict tokens, and scope/command helpers live inside the workflow; `extract_task_gate` is used by the dispatcher only to compute `taskGateRunnable`.

## Closing summary

After the final task commits, print one line per completed task, then one aggregate token line.

`metered = plan_output_tokens > 0` (any positive total = at least one real `budget.spent()` delta). When `metered` is false — every invocation returned `null`/`0` — **suppress all `~… tok` annotations and the `~<n>` total** (a `~0` would misrepresent a broken metric).

Per completed task:

```
Task <N>: <verb-phrase> — committed (<short-sha>) [attempts: <K>, ~<task_output_tokens[N]> output tok]
```

For `no-changes` tasks, substitute the sha slot with the status token:

```
Task <N>: <verb-phrase> — no-op (no-changes) [attempts: <K>, ~<task_output_tokens[N]> output tok]
```

When `metered` is false, drop the `, ~<…> output tok` fragment (keep `[attempts: <K>]`).

Then one aggregate line:

- `metered` true:
  ```
  Total: ~<plan_output_tokens> output tokens across <max> task workflow(s) (this run; output-only, per-task pipeline — excludes setup/review forks).
  ```
- `metered` false:
  ```
  Total: output-token metering unavailable this run.
  ```

Then stop. Do not call any further tool.

# Anti-patterns (forbidden)

- Inspecting / reading / modifying source code yourself — every code touch is the `coder` agent's job (inside the workflow). Includes "quick fixes" for pre-existing issues; out-of-scope blockers route through a `BLOCKED` → unblock `coder` pass inside the workflow.
- Running build / test commands yourself — every test goes through `runner` (driven by the workflow).
- Pre-flight environment probes via `Bash` between steps (runtimes, services, container state, versions, network) — even when project conventions tell a normal session to. The workflow delegates the run to `runner`, which surfaces env failures as `FAIL`/`ERROR` and the retry loop handles them. The dispatcher's `Bash` budget is only: the `task-base.sha` capture, the `base.sha` parent capture after Task 1 (`git rev-parse HEAD^`, read-only), and the git queries + `plan.diff` materialization in the final review. The commit is not a dispatcher `Bash` op (it runs inside the workflow).
- Re-implementing anything the workflow owns: the per-task inner loop (per-agent dispatch, BLOCKED-unblock branches, loop-guard), feedback-forwarding (only the most recent failure's path), task-reviewer retry-freshness, the runner `Scope hints:` block. Do NOT call `coder` / `runner` / `task-reviewer` / `improver` / `commiter` / `superbuild-runner` directly — each is dispatched only by the workflow. The dispatcher's only forwarded failure handle is the escalation `feedbackPath` (forwarded without reading the file).
- Skipping the task-pipeline `Workflow` "to save time" on a small task — every task goes through it.
- Re-deriving or overriding the workflow's retry cap. Base cap = `retry_max_attempts` (fail-open `3`), escalation = `retry_escalation_attempts` (fail-open `3`); both forwarded as `retryMaxAttempts`. Do NOT offer a "skip task" option (intentionally absent), and do NOT recompute `task_base_sha` on escalation — the baseline is stable.
- Writing any state file other than: (a) `status.yml` (after each PASS), (b) `base.sha` (once, after Task 1), (c) `task-base.sha` (once per task, before the workflow), (d) `adr.done` (once, after the ADR step), (e) `docs.done` (once, after the docs step). The dispatcher also materializes the ephemeral `plan.diff` (transport, NOT truth) for the final review. The recipe artifacts (`recipe.sh`, `profile.md`), `final-review.md`, and everything under `orchestration/task-<N>/` are written by the forks/workflow, not the dispatcher — they are ephemeral audit/transport, NOT truth (resume relies only on `status.yml` + `task-base.sha` + `base.sha`).
- Re-verifying or retrying any commit. All rest on the self-verifying scripts: `commit-task.sh` / `commit-adr.sh` / `commit-docs.sh` emit a `sha` ONLY after proving HEAD advanced past pre-commit HEAD AND `git status --porcelain` is empty (else an `error` tag, never a fabricated `sha`). The committer agent only RELAYS the line. Trust `wf_out.commit` (and the ADR/docs commit tags) directly: do NOT re-run `git rev-parse HEAD`, do NOT wrap in a phantom-commit retry loop, take the sha straight from the tag. On `error`/`malformed`, hard-stop — never hand-commit.
- Pasting the plan body (or task content) into a sub-agent prompt — the sub-agent reads it itself from the supplied path. The dispatcher hands the workflow only the `taskFile` path.
- Paging any worker report (`coder-K.md`, `task-reviewer-K.md`, `improver-K.md`, `unblock-coder-K.md`, `runner-K.md`) into the dispatcher's context. The dispatcher reads only the workflow's structured return and (for escalation) forwards `lastFailureReportPath` as the next `feedbackPath` without reading it.
- Gating on decomposer's `## Notes` between decomposition and the loop. Material decisions resurface in the final whole-plan review against the cumulative diff.
- Auto-triggering on generic "implement / build / code / execute / carry out" intents, or a bare "superbuild" mention, without the §0 marker line `Implementation: superbuild` in the approved plan body. The trigger is marker-only (a SuperPlan that chose self / vanilla carries `Implementation: self` — never route it to the pipeline).
- Collapsing the **two-tier live signal** into one channel. Tier 1 = the workflow's `phase`/`log` (per-agent signal from inside the `Workflow`). Tier 2 = the dispatcher's coarse `[<N>/<max>] task-pipeline: …` + `commit` line. The widget (`TaskCreate`/`TaskUpdate`) is a third, parallel channel. All independent and mandatory — do NOT suppress the dispatcher's coarse line "because the workflow logged it", and do NOT replace the `print` line or widget with each other.
- Hard-failing the pipeline on a `TaskCreate`/`TaskUpdate` error. The widget is a UI overlay; all calls go through `safe_task_call` (one warning, pipeline continues).
- Adding sub-tasks under a task widget (`TaskCreate` has no `parent` field — intentionally a flat list). Per-agent verdicts and retry counters live in the workflow's `log` + the coarse `print` line.
- Mutating a task widget's `subject` mid-run (appending `attempt 2/3`, `BLOCKED`, a sha). The subject is stable; terminal context (commit sha, `no-op` reason) goes into `description` exactly once, at the `completed` flip. Transient diagnostics belong in `print`.
- Using `completed` for a terminally-failed task (Abort, commit `error`/`malformed`, killed run). There is no `failed` status; leave the in-flight widget at `in_progress` — the stuck row is the truthful "halted here" signal.
- Deleting, pruning, re-seeding, or "cleaning up" the widget list mid-run — **including in response to a Claude Code system reminder that the task list is stale**. That reminder fires precisely when the dispatcher has been busy awaiting a `Workflow` (typically while the **last** task runs) and most tasks are `completed`; obeying it blanks the widget permanently and the deleted rows do NOT return. The list is seeded once and MUST persist verbatim until the closing summary. Never `TaskUpdate(status="deleted")`, never re-`TaskCreate`. (Distinct and expected: the widget legitimately appears empty *during* a sub-agent dispatch — the UI shows the active agent's own empty scope — and reappears when control returns. Re-seeding "to fix it" is the bug, not the blanking.)
