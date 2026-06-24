---
name: dev-orchestrator
description: >-
  Use ONLY when the approved plan's body contains the word "orchestrator". Do NOT auto-trigger on generic intents like "implement", "build", "code", "execute", "carry out" — explicit "orchestrator" mention required (any language).
allowed-tools: Read, Bash, Write, Grep, Glob, Skill, Workflow, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList, TaskStop
user-invocable: false
model: opus
effort: low
---

!`mkdir -p .temp/.workflows 2>/dev/null || true`

# Orchestrator — Task Pipeline Dispatcher

Drives the implementation of an already-approved plan, task by task. A **thin dispatcher** — every code touch, test run, review judgment, learning capture, and commit goes through a sub-agent with fresh context. Makes no judgment about the code itself.

CRITICAL: The per-task inner loop (coder → runner → task-reviewer → improver, with its retry / BLOCKED-unblock / infinite-loop-guard rules) is **not** model-driven any more — it runs inside the deterministic `Workflow` script `scripts/task-pipeline.workflow.js`, invoked **once per task** (see the per-task pipeline). The dispatcher's own remaining `Skill` calls (decomposer, adr-recorder, final-reviewer) and the per-task `Workflow` invocation each depend on the previous one's result, so dispatch exactly one per turn and await it before the next, overriding any general "batch independent calls" guidance.

## Pipeline graph

```
plan.md
   │  (once, before decompose — config-gated by `adr`, idempotent via adr.done)
   ▼
adr-recorder  ──►  writes .superdev/adr/<ADR>.md + .superdev/ADR.md  ──►  commit-adr.sh commits them
   │  (once, before the loop)
   ▼
decomposer  ──►  .temp/.workflows/<slug>/tasks/<N>.md  +  status.yml
   │  (per task N = start..max — ONE Workflow invocation drives the whole inner loop)
   ▼
task-pipeline.workflow.js  ──►  dev-coder ─► runner ─► dev-task-reviewer ─► dev-improver
   │   (the .js owns retry / BLOCKED-unblock / infinite-loop-guard / report-forwarding;       (rules)
   │    returns {status: PASS|FAIL, attempts, lastFailureReportPath})
   ├─ PASS ──►  commit-task.sh  ──►  status.yml / base.sha  ──►  widget completed
   └─ FAIL ──►  AskUserQuestion (Retry retry_escalation_attempts more / Abort)
   │  (after last task, once)
   ▼
dev-agent-final-reviewer (sub-orchestrator)  ──►  go/no-go verdict on stdout
```

Roles in one line each:

- **adr-recorder** (`dev-agent-adr-recorder`) — judges the approved plan and, on a real architectural decision, writes the ADR file(s) + `.superdev/ADR.md` index itself; runs once before decompose, config-gated by `adr`, committed by `commit-adr.sh`. Never touches the plan or the decomposer.
- **decomposer** (`dev-agent-decomposer`) — slices the source plan into per-task files; runs once, idempotent.
- **task-pipeline** (`scripts/task-pipeline.workflow.js`) — the deterministic per-task inner loop, invoked once per task via the `Workflow` tool. It owns the retry / BLOCKED-unblock / infinite-loop-guard / report-forwarding logic (formerly model-interpreted) and dispatches the worker agents below; it returns `{status: PASS|FAIL, attempts, lastFailureReportPath}`. Behaviour documented in `references/retry-policy.md`.
- **dev-coder** (the `dev-coder` plugin agent) — writes production code for ONE task; the workflow drives both its `Mode: normal` and `Mode: unblock` (blocker-clearing) passes.
- **runner** (`dev-agent-runner`, a skill — invoked by the workflow's runner wrapper agent in pipeline mode) — runs the task's build/test/lint command; emits `PASS` / `FAIL` / `ERROR` / `TIMEOUT` / `BLOCKED`.
- **dev-task-reviewer** (the `dev-task-reviewer` plugin agent, Task mode) — verifies the task Deliverable + tests + conventions against the working tree; emits `PASS` / `FAIL` / `BLOCKED`.
- **dev-improver** (the `dev-improver` plugin agent) — promotes the committed task's review learnings into `.claude/rules/` (delegating the authoring to the `mem-rules` skill); always `PASS` (no failure mode). Gated by the `rules_improver` switch (skipped when off).
- **committer** (`scripts/commit-task.sh`) — commits the task; the dispatcher runs `bash "${CLAUDE_PLUGIN_ROOT}/skills/dev-orchestrator/scripts/commit-task.sh" "<task_file>"` inline AFTER the workflow returns PASS. The script derives the commit subject (the task file's `# ` H1) and the `T<N>:` prefix itself (the dispatcher synthesizes no subject), and emits a tagged single line parsed by `parse_commit_tag`. Being deterministic, the script cannot fabricate its tag — it emits a `sha` **only** after itself verifying HEAD advanced and the tree is clean, so the dispatcher trusts the tag directly (no re-verification, no retry loop).
- **dev-agent-final-reviewer (sub-orchestrator)** — one-shot terminal gate after the last task is committed; internally runs `dev-agent-plan-auditor` → `dev-agent-runner` (Scope: full) → `dev-agent-smoke` → synthesis and returns a single go/no-go verdict on stdout (no file written).

The worker agents the workflow dispatches (`dev-coder` / `dev-task-reviewer` / `dev-improver`) each carry their full input/output contract in their own `agents/<name>.md` `# Input contract` + `# Output format` sections; the decomposer / runner keep theirs in their `SKILL.md`. The committer's tagged output shape lives in the header comment of `scripts/commit-task.sh`; the workflow's args / return contract lives in the header comment of `scripts/task-pipeline.workflow.js`. The dispatcher itself reads only the workflow's `{status, lastFailureReportPath}` return and the committer's tag — the per-agent STATUS parsing now lives inside the `.js`. When the workflow's arg/return contract changes, update the `.js` header, then this graph and `references/retry-policy.md`.

## Locate the plan

Resolve the plan file path **deterministically** — first match wins:

1. **Explicit argument** — `$ARGUMENTS` carries a `Plan: <path>` line (or a bare `.claude/plans/…md` path token). Use it as-is.
2. **Harness approval signal** — the most recent `ExitPlanMode` approval in this session injects the literal line `Your plan has been saved to: <absolute-path>`; that path is the authoritative handle for the just-approved plan. Anchor on it.
3. **Conversation scan** — otherwise take the most recent path matching `\.claude[/\\]plans[/\\][^\s]+\.md` mentioned in the conversation.
4. **None resolved** (e.g. a fresh session after `/clear` with no `Plan:` argument) — **stop** with one line: `No plan path resolved — re-run with 'Plan: <absolute-path>'.` Do not prompt interactively.

Once resolved, `Read` the plan briefly for orientation. The plan can be any markdown — ExtraPlan-shape (with §1 Scope, §2 Context, §3 Mental model, §4 Files to change, §5 Assumptions, …) or looser free-form prose. The dispatcher does not parse it; the `decomposer` handles all interpretation and derives per-task deliverables, modes, tests, and ordering. `max` (total task count) is derived from the `task_files` map returned by decomposer.

## Config switches

<config>

!`cat .superdev/config.yml 2>/dev/null || true`

</config>

The host project may disable optional pipeline steps via `config` (preloaded above). Read each switch as a boolean — a key is **off only when its value is literally `false`**; a missing key, missing file, or unreadable file means **on** (fail-open, default-enabled, so a project that never ran `/superdev:setup` runs the full pipeline). The boolean switches this dispatcher honors:

- `adr: false` → skip the ADR-recording step below.
- `rules_improver: false` → skip the per-task `dev-improver` step. The dispatcher forwards this as the workflow's `rulesImprover` arg (the workflow runs/skips the improver pass itself).

Two non-boolean **integer** keys tune the retry budget; both are read fail-open with a default of `3` (a missing key / file / unreadable file = `3`, a non-integer value = `3`):

- `retry_max_attempts: <int>` → the per-task attempt cap for the first workflow invocation. Forwarded as the workflow's `retryMaxAttempts` arg.
- `retry_escalation_attempts: <int>` → the cap offered on the escalation `AskUserQuestion` ("Retry `<retry_escalation_attempts>` more"); on Retry it is forwarded as `retryMaxAttempts` for the re-invocation.

When a config-gated step is skipped, print **one terse line** in the normal progress channel (`ADR: skipped (disabled)`, `[N/max] dev-improver: skipped (disabled)`) — never a paragraph explaining what the step does or why it is off.

## ADR recording (before decompose)

Record any architectural decision the approved plan carries as an ADR. The `dev-agent-adr-recorder` fork **judges and writes the ADR file(s) + the `.superdev/ADR.md` index itself**; the dispatcher then commits those files with `commit-adr.sh`. The **plan is never modified or copied** — the decomposer always receives the ORIGINAL plan and learns nothing about ADRs. This is the **only** ADR step in the whole flow (plan mode no longer does it). Run it **once per pipeline run**; the `adr.done` marker (and existing task files) make it idempotent on resume.

```
slug = basename(plan-path) without trailing ".md"   # always the ORIGINAL plan filename
decompose_plan_path = plan-path                      # ALWAYS the original plan — never augmented or copied

# Idempotency gate: this run already did the ADR step (marker), or task files exist (resume past decompose).
if exists(".temp/.workflows/<slug>/adr.done") OR Glob(".temp/.workflows/<slug>/tasks/*.md") returns ≥1 path:
    skip to "Decompose the plan into per-task files"

# Config gate: ADR capture disabled (`adr: false`) → skip, and mark done so a later resume stays consistent.
if config switch `adr` is false:
    print("ADR: skipped (disabled)")
    Write(".temp/.workflows/<slug>/adr.done", "skipped\n")
    skip to "Decompose the plan into per-task files"

# Clean-tree guard for the ADR commit. SEPARATE from, and STRICTLY EARLIER than, the per-task pre-flight
# (which runs inside the loop, after decompose). The recorder's writes must land on a clean tree so the
# scoped ADR commit captures only the ADR files. Hard-abort on dirty WIP — do NOT merge with the pre-flight.
porcelain = bash("git status --porcelain").stdout
if porcelain.strip() != "":
    print("Working tree is not clean — orchestrator cannot run with uncommitted changes.")
    print("Uncommitted paths:")
    print(porcelain)
    print("Resolve manually (commit, stash, or discard) and re-run orchestrator.")
    stop the skill

# dev-agent-adr-recorder injects the plan CONTENT via dynamic context (`cat $ARGUMENTS`), so pass the BARE
# ABSOLUTE path. The fork WRITES the ADR file(s) + index itself and returns only a verdict + commit subject.
adr_out = Skill(skill="superdev:dev-agent-adr-recorder", args="<abspath(plan-path)>")
if first_status_line(adr_out) == "STATUS: ADR":
    subject = the text after "Commit-subject: " in adr_out (single line)
    commit_out = bash(f'bash "${{CLAUDE_PLUGIN_ROOT}}/skills/dev-orchestrator/scripts/commit-adr.sh" "{subject}"').stdout
    commit_result = parse_commit_tag(commit_out)   # same tag shapes as commit-task.sh
    if commit_result[0] == "sha":
        print(f"ADR: recorded ({commit_result[1]})")
    elif commit_result[0] == "no-changes":
        # Anomaly: recorder said ADR but wrote nothing committable. Warn and proceed (no ADR landed).
        print("ADR: recorder reported ADR but no files to commit — continuing without ADR.")
    else:   # error / malformed
        report f"ADR commit FAILED: {commit_result[1] if len(commit_result) > 1 else commit_out}" and stop
else:
    # STATUS: NO-ADR (or malformed) → nothing was written; nothing to commit.
    print("ADR: none")

Write(".temp/.workflows/<slug>/adr.done", "done\n")   # mark the ADR step done for idempotent resume
```

The ADR commit lands **before** the per-task loop, so it is the parent of the Task 1 commit; `base.sha` (= `HEAD^` after Task 1) points at it and the final-review diff excludes it — correct, since an ADR is documentation, not plan functionality to verify. The `slug` is derived from the **original** plan filename and the plan content handed to the decomposer is byte-identical to the user's approved plan.

## Decompose the plan into per-task files

Invoke `decomposer` exactly once per pipeline run, **before** the per-task loop:

```
# slug + decompose_plan_path (always = plan-path) were resolved in "ADR recording (before decompose)" above
decomp_prompt = "Plan: <decompose_plan_path>\nPlanSlug: <slug>"
decomp_out = Skill(skill="superdev:dev-agent-decomposer", args=decomp_prompt)
if first_status_line(decomp_out) != "STATUS: PASS":
    escalate to user via AskUserQuestion ("Decomposer failed. Retry or Abort?") and stop on Abort
parse "## Task files" → task_files: dict[N → absolute path to <N>.md], task_titles: dict[N → verb-phrase]
max = len(task_files)
```

Each `## Task files` line is in the shape `- <N> — <verb-phrase> — <path>`; parse with the regex `^- (\d+) — (.+) — (.+\.md)$` (group 2 is the verb-phrase, group 3 is the path — `.md` suffix and the absence of spaces in the dispatcher's `.temp/.workflows/<slug>/tasks/<N>.md` convention make the split unambiguous). `task_titles` is consumed by the progress-widget seed below — without it the dispatcher would have to `Read` every task file just to recover the H1 the decomposer already knows.

Decomposer is idempotent: if `.temp/.workflows/<slug>/tasks/*.md` already exists from a prior run, it returns the existing paths with `STATUS: PASS` and `## Notes: existing task files detected — decomposition skipped`. To force regeneration, delete the directory manually.

Print one line: `Plan decomposed into <K> task file(s).`

The dispatcher hands the per-task work order to the `task-pipeline.workflow.js` script (one `Workflow` invocation per task), not to the worker agents directly — the workflow builds every worker prompt (`Task file:`, `Report path:`, `Mode:`, `Feedback:`, `Task base:`, `Runner report:`, `Previous coder report:`, `Task-reviewer report:`) itself and owns the report-path slots under `.temp/.workflows/<slug>/orchestration/task-<N>/<role>-<attempt>.md`. The dispatcher passes the workflow only the coarse handles: `taskFile`, `reportDir`, `taskBaseSha`, `taskGateRunnable`, `rulesImprover`, `retryMaxAttempts`, and (on an escalation re-invoke) `feedbackPath`. The commit step (the `scripts/commit-task.sh` run) is unaffected and stays in the dispatcher, after the workflow returns PASS. The exact worker-prompt shapes and the report filename slots are documented in the workflow's header comment + `references/retry-policy.md`.

Decomposer's `## Notes` section is informational only — the orchestrator does not gate on it. Any material decision worth flagging will resurface in the final whole-plan `dev-agent-final-reviewer` against the cumulative diff, where the user can act on it with full evidence rather than on a pre-implementation hypothesis.

## Resolve the starting task

Resolution order (first applicable wins):

```
status_path = ".temp/.workflows/<slug>/status.yml"
current_task = parse_status_yml(status_path)   # None if file missing or malformed

arg_task = parse_arg_task($ARGUMENTS)   # integer N if `task=<N>` present, else None

if current_task is not None and current_task > max:
    # Sentinel: every task was already committed in a prior session.
    # Set `start = current_task` so the progress-widget seed marks every task
    # already completed (resume loop covers 1..start-1 = 1..max). The per-task
    # loop is naturally empty for `start > max`, so control falls through
    # to the final review. No explicit `goto` needed.
    print(f"Plan {slug} already fully implemented (current_task={current_task}, total={max}); running final review only.")
    start = current_task
elif current_task is not None and current_task <= max:
    status_start = current_task
    if arg_task is not None and arg_task != status_start:
        # The two sources disagree — let the user resolve, with preview of each option.
        answer = AskUserQuestion(
            question=f"status.yml says start at Task {status_start}; arguments say Task {arg_task}. Which?",
            options=[
                f"Task {status_start} (from status.yml)",
                f"Task {arg_task} (from arguments)",
            ]
        )
        start = status_start if answer.startswith(f"Task {status_start}") else arg_task
    else:
        start = status_start
elif arg_task is not None:
    start = arg_task
else:
    start = 1
```

Helpers:

- `parse_status_yml(path)` — return `None` when the file is missing or unreadable. Otherwise `Read` the file and match the first non-empty line against the regex `^current_task:\s*(\d+)\s*$`. Return `int(match.group(1))` on success, `None` on any parse error (missing key, non-integer value, unexpected extra content).
- `parse_arg_task($ARGUMENTS)` — return integer `N` for the first match of `task=(\d+)` in the argument string, else `None`.

Print a single line to the user: `Implementing <plan-slug> from Task <start> of <max>.`

## Seed the progress widget

A parallel visual channel (next to the dispatcher's coarse per-task `print` line and the workflow's own `log` channel — see the two-tier signal in `# Anti-patterns`). Renders the whole task list once, then per-task `TaskUpdate` calls flip each task between `pending` / `in_progress` / `completed` as the pipeline progresses. Soft-fail: every UI call goes through `safe_task_call` (see `references/status-parsing.md`); a UI error never halts the pipeline.

Run **after** the starting-task resolution has resolved `start` and **before** the per-task loop. The `current_task > max` sentinel sets `start = current_task` (max + 1) — the progress-widget seed still runs in that branch, so a fully-replayed plan shows the widget with every task already marked `completed`.

```
# One task per task (flat — TaskCreate has no parent field).
task_widgets: dict[int, str] = {}      # N -> taskId
for N in 1..max:
    verb = task_titles[N]              # parsed from the decomposer's `## Task files` listing — no file read
    task_widgets[N] = safe_task_call(TaskCreate,
        subject=f"Task {N}: {verb}",
        description=f"Pipeline pass for task file `.temp/.workflows/{slug}/tasks/{N}.md`.",
        activeForm=f"Implementing Task {N}: {verb}",
    )

# Resume: every task below `start` is already committed — flip its task to completed
# so the widget reflects git history. The task at `start` (if any) flips to in_progress
# on entry to the per-task pipeline (no special-case here). The "all-replayed" sentinel
# sets `start = max + 1`, so this loop marks every task completed; the per-task loop
# then iterates zero times and control flows naturally into the final review.
for N in 1..(start - 1):
    safe_task_call(TaskUpdate, taskId=task_widgets[N], status="completed")
```

**Notes on the widget.**

- Flat list — `TaskCreate` exposes no `parent` field. The widget renders one row per task.
- `TaskUpdate` accepts only `pending` / `in_progress` / `completed` / `deleted`. There is no `failed` state — a terminal task failure leaves the task at `in_progress`, signalling visually that the pipeline halted on it. The accompanying `print` line carries the diagnostic.
- All `TaskCreate` / `TaskUpdate` calls go through `safe_task_call`. The widget is a **UI overlay, not state of truth**: the source of truth for run state remains `status.yml`, the per-task task files, `base.sha`, and `task-base.sha` (see `# Anti-patterns`).

## Per-task pipeline

### Working-tree pre-flight

Before entering the per-task loop, check the working tree **once** — fires only on the first task actually executed in this orchestrator run.

```
# Carve-out: sentinel branch (pipeline already complete) — the starting-task resolution
# set start = max + 1 so no workflow will run. The final review is read-only. Skip pre-flight.
if start > max:
    pass    # proceed to the final review only
else:
    porcelain = bash("git status --porcelain").stdout
    if porcelain.strip() != "":
        # Hard-abort. The dispatcher refuses to run with uncommitted WIP — the per-task
        # diff scoping (Step 0 in the dev-task-reviewer agent, "verify before revert" in the dev-coder
        # agent) relies on `task-base.sha = HEAD captured before the workflow runs`, and dirty WIP
        # poisons that baseline by conflating user changes with coder edits.
        print("Working tree is not clean — orchestrator cannot run with uncommitted changes.")
        print("Uncommitted paths:")
        print(porcelain)
        print("Resolve manually (commit, stash, or discard) and re-run orchestrator.")
        stop the skill
```

The check fires only **once per orchestrator run**, just before the per-task loop entry. Subsequent tasks skip it — by then the committer has committed each previous task and the tree is clean by construction. Resume-from-task-N scenarios DO hit this check on the first executed task, which is correct: a clean tree is the precondition for `task-base.sha` to be meaningful. Hard-abort, not stash — the dispatcher does not move user data; the user owns the working tree.

Read the retry-budget config values once (fail-open, default `3`):

```
retry_max_attempts        = parse_int_config("retry_max_attempts", default=3)        # missing/file-absent/non-int → 3
retry_escalation_attempts = parse_int_config("retry_escalation_attempts", default=3) # missing/file-absent/non-int → 3
rules_improver_on         = config switch `rules_improver` is not literally false     # default-enabled
```

For each task `N` from `start` to `max`, run this loop. The per-task inner pipeline (coder → runner → task-reviewer → improver, with all retry / BLOCKED-unblock / infinite-loop-guard / report-forwarding mechanics) is driven by **one** `Workflow` invocation against `task-pipeline.workflow.js`; the dispatcher's own job per task is the four bookends: widget flip, `task-base.sha` capture, the workflow call, and (on PASS) the commit + state writes (on FAIL) the escalation prompt.

```
# Progress widget: flip this task's widget from `pending` (seeded by the progress-widget seed) to
# `in_progress`. The current task is the only one in_progress at any given time.
# UI overlay — `safe_task_call` soft-fails.
safe_task_call(TaskUpdate, taskId=task_widgets[N], status="in_progress")

# Per-task audit/transport directory. The workflow dictates every report path inside it.
# Ephemeral — NOT state of truth (see Anti-patterns + the state-files list).
orch_dir = f".temp/.workflows/<slug>/orchestration/task-{N}"

# Persist task-base.sha BEFORE the workflow runs (this is the dispatcher's attempt-1 capture). It is the
# SHA every task-reviewer/coder invocation inside the workflow uses to compute the task diff; the
# coder agent's "verify before revert" reads this file, and the workflow forwards the same SHA on the
# task-reviewer's `Task base:` line. The baseline is stable for the whole task — escalation re-invokes
# MUST NOT overwrite it, so this write happens once per task, before the first workflow call.
task_base_sha = bash("git rev-parse HEAD").strip()
Write(".temp/.workflows/<slug>/task-base.sha", task_base_sha + "\n")

# Is the task gate runnable? (Build: green / Tests: <non-none>) — the workflow needs this as a flag so
# it knows whether to run the runner pass. A pure `Tests: none` task → taskGateRunnable=false.
gate = extract_task_gate(N)   # the lines under "## Task gate" in the task file
task_gate_runnable = (gate contains "^\s*- Tests:" with non-`none` value) OR (gate contains "^\s*- Build: green")

# Invoke the deterministic per-task pipeline ONCE. It owns the whole inner loop and returns
# {status: "PASS"|"FAIL", attempts, lastFailureReportPath}. Escalation re-invokes pass feedbackPath.
feedback_path = ""           # "" on the first invocation of this task; set on an escalation Retry below
cap = retry_max_attempts     # first invocation uses the base cap; escalation uses retry_escalation_attempts

escalation_loop:   # dispatcher-level loop (NOT the per-attempt loop — that lives inside the workflow)
    wf_out = Workflow(
        scriptPath="${CLAUDE_PLUGIN_ROOT}/skills/dev-orchestrator/scripts/task-pipeline.workflow.js",
        args={
            "taskFile":         task_files[N],
            "reportDir":        orch_dir,
            "taskBaseSha":      task_base_sha,
            "taskGateRunnable": task_gate_runnable,
            "rulesImprover":    rules_improver_on,
            "retryMaxAttempts": cap,
            **({"feedbackPath": feedback_path} if feedback_path != "" else {}),
        },
    )
    # wf_out is the workflow's structured return: {status, attempts, lastFailureReportPath}.
    print(f"[{N}/{max}] task-pipeline: {wf_out.status} (attempts {wf_out.attempts}/{cap})")  # coarse per-task signal
    if wf_out.status == "PASS":
        break escalation_loop    # fall through to the commit step
    # FAIL: the workflow exhausted its cap (or a BLOCKED guard converted to FAIL). Escalate to the user.
    answer = AskUserQuestion(
        question=f"Task {N} failed after {wf_out.attempts} attempts. Latest failure: {wf_out.lastFailureReportPath}. Choose:",
        options=[f"Retry {retry_escalation_attempts} more times", "Abort"]
    )
    if answer starts with "Retry":
        # Re-invoke with a fresh cap (retry_escalation_attempts) and seed the first coder pass with the
        # last failure's report as Feedback. task_base_sha is NOT recomputed — the baseline is stable.
        cap = retry_escalation_attempts
        feedback_path = wf_out.lastFailureReportPath
        continue escalation_loop
    else:
        # Task widget stays at `in_progress` (no `failed` state). The visually-stuck
        # task + the abort message are the user's terminal signal.
        report f"Aborted at Task {N} after {wf_out.attempts} attempts." and stop the skill

# commit step (deterministic script `scripts/commit-task.sh`, run inline) — reached ONLY after the
# workflow returned PASS. The script is the committer: it stages everything, commits `T<N>: <subject>`,
# and — being deterministic — emits a `sha` tag ONLY after itself verifying HEAD advanced past the
# pre-commit HEAD and the tree is clean (a non-zero commit / unmoved HEAD / dirty tree all yield an
# `error` tag, never a fabricated `sha`). That self-verification is why the old phantom-commit re-verify
# + 3× retry loop is gone: a script cannot hallucinate its tool result the way the Haiku committer fork
# could, so the dispatcher trusts the tag directly. The reported sha is taken from the tag (the script
# itself read it via `git rev-parse --short HEAD` after proving the move). See scripts/commit-task.sh
# (header contract) and references/status-parsing.md (parse_commit_tag).
# The dispatcher authors NO commit subject. Subject authoring lives in dev-agent-decomposer (which writes
# each task file's `# ` H1 as a Conventional-Commits-form subject) + commit-task.sh (which reads that
# H1 and prefixes `T<N>:`). The dispatcher just hands the script the TASK FILE PATH; the script
# derives `N` from the filename and `<subject>` from the file's H1 and runs `git commit` verbatim.
task_file_path = f".temp/.workflows/{slug}/tasks/{N}.md"   # == task_files[N]
commit_out = bash(f'bash "${{CLAUDE_PLUGIN_ROOT}}/skills/dev-orchestrator/scripts/commit-task.sh" "{task_file_path}"').stdout
commit_result = parse_commit_tag(commit_out)   # see Helpers and pattern reference — returns one of: ("sha", "<hex>", files, subject) | ("no-changes",) | ("error", stderr) | ("malformed", raw)
if commit_result[0] == "sha":
    # Trust the tag — the script proved the commit landed before emitting it.
    short_sha = commit_result[1]
    print(f"[{N}/{max}] commit: {short_sha}")
    # Persist base.sha after the first successful commit (see the final review). Parent is HEAD^
    # now that HEAD points at the new commit — derived from git.
    if N == 1:
        parent_sha = bash("git rev-parse \"HEAD^\"").strip()
        Write(".temp/.workflows/<slug>/base.sha", parent_sha + "\n")
    # Progress widget: flip task widget to completed with the commit sha.
    safe_task_call(TaskUpdate, taskId=task_widgets[N], status="completed",
                   description=f"Committed {short_sha}.")
elif commit_result[0] == "no-changes":
    print(f"[{N}/{max}] commit: no-op ({commit_result[0]})")
    # Progress widget: task still counts as done — flip to completed with a note.
    safe_task_call(TaskUpdate, taskId=task_widgets[N], status="completed",
                   description=f"No-op ({commit_result[0]}).")
elif commit_result[0] == "error":
    # Task widget stays at `in_progress` (no `failed` state) — the visually-stuck
    # widget mirrors the halted pipeline. surface error and abort the run —
    # the script failed cleanly, no point retrying via coder.
    report f"[{N}/{max}] commit FAILED: {commit_result[1]}" and stop
else:
    # Same handling as the error branch — task widget stays at `in_progress`.
    report f"[{N}/{max}] commit MALFORMED: {commit_result[1]}" and stop

# Update status.yml — authoritative task tracker (see the starting-task resolution order).
# After commit of task N, the next task to execute is N+1. After commit of the
# last task N=max, this writes `current_task: max+1` — the "all done" sentinel
# that the starting-task resolution detects if the user re-runs orchestrator in a new session.
Write(".temp/.workflows/<slug>/status.yml", f"current_task: {N + 1}\n")

# continue to next task N
```

### Notes on the loop

- Retry cap, BLOCKED branch mechanics, infinite-loop guard, and report-forwarding: now owned by `scripts/task-pipeline.workflow.js` and documented (behaviourally) in `references/retry-policy.md`. The dispatcher does NOT re-implement any of it — it invokes the workflow once per task and reads its `{status, attempts, lastFailureReportPath}` return.
- The dispatcher does not parse per-agent `STATUS:` lines any more — that happens inside the workflow's `agent()` boundary. The dispatcher reads only the workflow's structured return and the committer's tag. Its live-progress channel per task is the single coarse line `[<N>/<max>] task-pipeline: <PASS|FAIL> (attempts <K>/<cap>)` plus the `commit` line; the per-agent `[<N>/<max>] <agent>: <VERDICT>` granularity now lives in the workflow's own `phase`/`log` channel.
- The per-task loop iterates zero times when `status.yml`'s `current_task` exceeds `max` — the user re-ran orchestrator after the whole plan was committed. The starting-task resolution sets `start = current_task`, the progress-widget seed marks every task already `completed`, the per-task loop is empty, and control flows into the final whole-plan review.
- Progress widget updates (`TaskUpdate` on task entry / commit success / no-op commit) live alongside the `print` lines and never replace them — see the "Progress tree (TaskCreate)" section in `references/retry-policy.md`.

## Final whole-plan review

Runs **once**, after the per-task pipeline has reached the end of the task list with a successful commit on the last task (or when the starting-task resolution's `current_task > max` sentinel jumps here directly). Delegated wholesale to the `superdev:dev-agent-final-reviewer` sub-orchestrator, which internally runs `dev-agent-plan-auditor` → `dev-agent-runner` (Scope: full) → `dev-agent-smoke` → synthesis and **returns a single go/no-go verdict on stdout**. It writes no file.

```
# Resolve base_sha (priority: persisted .temp/.workflows/<slug>/base.sha → git merge-base HEAD main),
# then head_sha = git rev-parse HEAD. dev-agent-final-reviewer takes the diff range as a `Diff range:` line.
final_prompt = (
    "Plan: <plan-path>\n"
    "Diff range: " + base_sha + ".." + head_sha
)
final_out = Skill(skill="superdev:dev-agent-final-reviewer", args=final_prompt)
final_status = first_status_line(final_out)                         # one of STATUS: PASS / STATUS: FAIL
final_verdict = final_status.removeprefix("STATUS: ") if final_status.startswith("STATUS: ") else "FAIL"
print(f"[final] dev-agent-final-reviewer: {final_verdict}")
# Surface the returned verdict to the user as the terminal result — no file is written or persisted.
report final_out and stop the skill
```

The dispatcher does **not** write a `final-review.md` — that artifact no longer exists. The verdict (`STATUS: PASS` go / `STATUS: FAIL` no-go) plus the sub-step breakdown that `dev-agent-final-reviewer` returns on stdout IS the terminal result; surface it verbatim to the user. The widget at this point shows every task widget as `completed` (or, on a halted run, the in-flight task still at `in_progress`); no plan-level flip is needed. `FAIL` is advisory, not retry-triggering.

**One-shot and terminal.** No retry loop, no `AskUserQuestion`, no `improver` invocation at this stage. Full pseudocode, `base_sha` resolution priority rationale, and final-review-specific anti-patterns: see `references/final-review.md`.

## Helpers and pattern reference

`parse_commit_tag` shape table, the progress-widget constraints used by the progress-widget seed, and the dispatcher-only named helpers still referenced by the pseudocode above (`first_status_line` — for the decomposer / adr-recorder / final-reviewer replies; `parse_status_yml`, `parse_arg_task`, `parse_int_config`, `parse_commit_tag`, `safe_task_call`): see `references/status-parsing.md`. The former worker-`STATUS:` regexes, the runner verdict tokens, and the scope/command-construction helpers (`extract_scope_paths`, `extract_scope_test_names`, `build_test_command_or_build_command`) now live inside `scripts/task-pipeline.workflow.js` (and its runner wrapper agent), not the dispatcher; `extract_task_gate` is used by the dispatcher only to compute the boolean `taskGateRunnable` flag it forwards to the workflow.

## Closing summary

After the final task commits, print one line per completed task:

```
Task <N>: <verb-phrase> — committed (<short-sha>) [attempts: <K>]
```

For tasks that resolved to `no-changes` (committer returned a no-op tag, see the commit step), substitute the sha slot with the literal status token:

```
Task <N>: <verb-phrase> — no-op (no-changes) [attempts: <K>]
```

Then stop. Do not call any further tool.

# Anti-patterns (forbidden)

- Inspecting, reading, or modifying source code yourself. Every code touch is the `dev-coder` agent's job (inside the workflow).
- Running build / test commands yourself. Every test invocation goes through `runner` (driven by the workflow's runner wrapper agent).
- Re-implementing the per-task inner loop in the dispatcher (per-agent coder/runner/task-reviewer/improver dispatch, the BLOCKED-unblock branches, the infinite-loop guard, report-forwarding). That logic lives ENTIRELY in `scripts/task-pipeline.workflow.js`; the dispatcher invokes the workflow once per task and reads only its `{status, attempts, lastFailureReportPath}` return. Do NOT call `dev-coder` / `dev-task-reviewer` / `dev-improver` / `dev-agent-runner` directly from the dispatcher.
- Pre-flight environment probes via `Bash` between pipeline steps (checking runtimes, services, container state, tool versions, network reachability, etc.) — even when project conventions tell a normal session to verify them before running tests. Those conventions target sessions that run tests directly; the workflow delegates the run to `runner`, which surfaces any environment failure as `FAIL` / `ERROR` and the standard retry loop handles it. The dispatcher's `Bash` budget is reserved for the `task-base.sha` capture, the commit step, and the git queries in the final review.
- Skipping the task-pipeline `Workflow` invocation "to save time" on a small task — every task goes through it.
- Re-deriving or overriding the workflow's retry cap. The base cap comes from `retry_max_attempts` (fail-open `3`), the escalation cap from `retry_escalation_attempts` (fail-open `3`); both are forwarded as `retryMaxAttempts`. Do NOT offer a "skip task" option to the user (intentionally absent), and do NOT recompute `task_base_sha` on the escalation re-invoke — the baseline is stable for the whole task.
- Writing any state file other than (a) the authoritative task tracker `.temp/.workflows/<slug>/status.yml` (the commit step — orchestrator updates after each successful commit), (b) the persisted `.temp/.workflows/<slug>/base.sha` written once after the Task 1 commit (the commit step), (c) the per-task baseline `.temp/.workflows/<slug>/task-base.sha` written once per task before the workflow call (the per-task pipeline), and (d) the `.temp/.workflows/<slug>/adr.done` marker written once after the ADR-recording step (its idempotency guard on resume). The final review writes **no** file — `dev-agent-final-reviewer` returns its go/no-go verdict on stdout and the dispatcher surfaces it directly. Plan + task files + git + those four small state files are the only sources of truth — **except** for everything else under `.temp/.workflows/<slug>/orchestration/<task-N>/` (the `coder-K.md`, `dev-task-reviewer-K.md`, `improver-K.md`, `unblock-coder-K.md`, and `runner-K.md` reports the workflow's agents write themselves to their workflow-dictated `Report path:`), which is an **ephemeral audit/transport layer**, NOT state of truth: resume logic relies only on `status.yml` + `task-base.sha` + `base.sha`, and a crash recovery overwrites any prior attempt's report at the same numeric slot.
- Editing, updating, creating any source file yourself — including "quick fixes" for pre-existing issues. Out-of-scope blockers are handled inside the workflow by routing a `BLOCKED` verdict through an unblock `dev-coder` pass. The dispatcher never touches source files directly.
- Re-verifying or retrying either commit step. Both committers — the per-task `scripts/commit-task.sh` and the ADR `scripts/commit-adr.sh` — are deterministic scripts, not Haiku forks: each emits a `sha` tag ONLY after itself proving HEAD advanced past the pre-commit HEAD **and** `git status --porcelain` is empty (a non-zero commit / unmoved HEAD / dirty tree all yield an `error` tag, never a fabricated `sha`). A script cannot hallucinate its tool result, so the dispatcher trusts the tag directly: do NOT re-run `git rev-parse HEAD` to re-check the move, do NOT wrap the call in a phantom-commit retry loop, and take the reported sha straight from the tag (`commit_result[1]`). On an `error` / `malformed` tag, hard-stop — never hand-commit from the dispatcher to paper over a failed commit.
- Pasting the plan body into a sub-agent prompt — the sub-agent reads the plan (or task file) itself from the supplied path. The dispatcher hands the workflow only the `taskFile` path, never task content.
- Paging any worker report (`coder-K.md`, `dev-task-reviewer-K.md`, `improver-K.md`, `unblock-coder-K.md`, `runner-K.md`) into the dispatcher's own context. Those reports are written by the workflow's agents to their workflow-dictated `Report path:`; the dispatcher reads none of them — only the workflow's structured return and (for escalation) its `lastFailureReportPath`, which it forwards back as the next `feedbackPath` without reading the file.
- Re-implementing inside the dispatcher anything the workflow already owns: feedback-forwarding (only the most recent failure's path is forwarded — the workflow enforces this), task-reviewer retry-freshness, the runner `Scope hints:` block, or the unblock branches. The dispatcher's only forwarded failure handle is the escalation `feedbackPath`.
- Gating on decomposer's `## Notes` section between decomposition and the per-task pipeline. The orchestrator never prompts the user about notes — any material decision will resurface in the final whole-plan review against the cumulative diff, where the user can act on real evidence rather than a hypothesis.
- Auto-triggering on generic "implement / build / code / execute / carry out" intents without the literal word "orchestrator" appearing either in the user's message or in the plan body. The trigger contract is explicit-mention-only; treating descriptive paraphrases as a trigger violates the skill's frontmatter `description` and surprises the user with a heavy pipeline they did not request.
- Collapsing the **two-tier live signal** into one channel. Per-task progress now has two tiers: (tier 1) the workflow's own `phase` / `log` channel emits the fine-grained per-agent signal (`Coder` / `Runner` / `Review` phases, per-attempt lines) from inside the `Workflow` invocation; (tier 2) the dispatcher emits the coarse per-task line `[<N>/<max>] task-pipeline: <PASS|FAIL> (attempts <K>/<cap>)` plus the `commit` line, and the progress-widget (`TaskCreate` / `TaskUpdate`) renders a third, parallel visual channel. Do NOT suppress the dispatcher's coarse line "because the workflow already logged it", and do NOT replace the dispatcher's `print` line or the widget with each other — they are independent channels and both must emit on every per-task transition.
- Hard-failing the pipeline on a `TaskCreate` / `TaskUpdate` error. The widget is a UI overlay, not state of truth (state of truth = `status.yml`, the task files, `base.sha`, `task-base.sha`, and git history). All widget calls go through `safe_task_call`; a UI error prints one warning and the pipeline continues.
- Adding sub-tasks under a task widget (per-agent invocations, retry attempts, BLOCKED nodes, …). `TaskCreate` has no `parent` field — the widget is intentionally a flat list of `Task <N>: <verb-phrase>` rows. Per-agent verdicts and retry counters live in the workflow's `log` channel + the dispatcher's coarse `print` line, never in the widget.
- Mutating a task widget's `subject` mid-run (e.g. appending `attempt 2/3`, `BLOCKED`, or a short sha to the label). The subject is stable for the lifetime of the run; transient diagnostics belong in `print`. Terminal context (commit sha, `no-op` reason, abort cause) goes into the widget's `description` exactly once — at the same moment the status flips to `completed` (or, for terminal failures, the description is left as the seed text since the status stays at `in_progress`).
- Using `completed` to mark a terminally-failed task (Abort, commit `error` / `malformed`, killed run). `TaskUpdate` has no `failed` status; a green-checked `completed` row would lie. The orchestrator leaves the in-flight task widget at `in_progress` — the visually-stuck row is the truthful "the pipeline halted here" signal. Diagnostic detail lives in the corresponding `print` line.
- Deleting, pruning, re-seeding, or otherwise "cleaning up" the task widget list at any point during a run — **including in response to a Claude Code system reminder that the task list is *stale* and should be *cleaned up***. That reminder fires precisely when the dispatcher has not touched `Task*` tools for a while (it has been busy awaiting the per-task `Workflow` invocation) and most tasks are already `completed` — i.e. typically while the **last** task's workflow is mid-run — so obeying it blanks the widget exactly when the user is watching the final task, and the deleted `completed` rows do **not** come back. The flat list is seeded **once** by the progress-widget seed and MUST persist verbatim until the skill ends at the closing summary; `completed` rows stay visible (checked) for the whole run. Never call `TaskUpdate(status="deleted")`, never re-`TaskCreate` an existing task, and ignore any stale-list cleanup prompt while the orchestrator is running. (Distinct, expected, and NOT a cue to re-seed: the widget legitimately appears empty *during* a workflow / sub-agent dispatch — the UI shows the active agent's own empty task scope — and the parent list reappears when control returns. That transient blanking is platform behavior; re-seeding "to fix it" is the bug, not the blanking.)
