---
name: dev-orchestrate
description: >-
  Use ONLY when the approved plan's body contains the word "orchestrator" (e.g. an "Execution: orchestrator" line). Drives the `coder` → `runner` → `dev-task-review` → `improver` → `committer` pipeline task by task, then invokes the `dev-final-review` sub-orchestrator once and surfaces its go/no-go verdict. Do NOT auto-trigger on generic intents like "implement", "build", "code", "execute", "carry out" — explicit "orchestrator" mention required (any language). Do NOT invoke the implementation skills (decomposer/coder/dev-task-review/improver) directly outside this dispatcher — each pipeline-bound skill's own frontmatter description carries the do-not-call-directly notice, and each skill's own `# Output format` section is the authoritative source for its STATUS contract.
allowed-tools: Read, Bash, Write, Grep, Glob, Skill, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList, TaskStop
user-invocable: false
model: opus
effort: low
---

!`mkdir -p .temp/.workflows 2>/dev/null || true`

# Orchestrator — Task Pipeline Dispatcher

Drives the implementation of an already-approved plan, task by task. A **thin dispatcher** — every code touch, test run, review judgment, learning capture, and commit goes through a sub-agent with fresh context. Makes no judgment about the code itself.

CRITICAL: Never place two pipeline calls in the same message — the coder/runner/dev-task-review/improver/committer `Skill` calls each depend on the previous one's result, so dispatch exactly one per turn and await it before the next, overriding any general "batch independent calls" guidance.

## Pipeline graph

```
plan.md
   │  (once, before the loop)
   ▼
decomposer  ──►  .temp/.workflows/<slug>/tasks/<N>.md  +  status.yml
   │  (per task N = start..max)
   ▼
coder  ──►  runner  ──►  dev-task-review (Task mode)  ──►  improver  ──►  committer
                │                          │
                └─ BLOCKED ─────────────────┴── BLOCKED ──► unblock-coder pass clears the blocker
   │  (after last task, once)
   ▼
dev-final-review (sub-orchestrator)  ──►  go/no-go verdict on stdout
```

Roles in one line each:

- **decomposer** — slices the source plan into per-task files; runs once, idempotent.
- **coder** — writes production code for ONE task; also handles unblock passes when `Feedback` starts with `BLOCKED:`.
- **runner** — runs the task's build/test/lint command; emits `PASS` / `FAIL` / `ERROR` / `TIMEOUT` / `BLOCKED`.
- **dev-task-review (Task mode)** — verifies the task Deliverable + tests + conventions against the working tree; emits `PASS` / `FAIL` / `BLOCKED`.
- **improver** — promotes dev-task-review learnings into `.claude/rules/`; always `PASS` (no failure mode).
- **committer** (fork skill) — commits the task; receives the **task file path** and itself derives the commit subject (the task file's `# ` H1) and the `T<N>:` prefix (the dispatcher synthesizes no subject); emits a tagged single line, parsed by `parse_commit_tag`. A tagged `sha` is **not** proof of a commit — the dispatcher verifies HEAD advanced (and the tree is clean) before trusting it, re-invoking the committer up to 3× on a phantom commit.
- **dev-final-review (sub-orchestrator)** — one-shot terminal gate after the last task is committed; internally runs `dev-plan-audit` → `dev-run` (Scope: full) → `dev-smoke` → synthesis and returns a single go/no-go verdict on stdout (no file written).

Each pipeline-bound skill (`decomposer`/`coder`/`dev-task-review`/`improver`) carries the full input/output contract in its own `SKILL.md`'s `# Input contract` + `# Output format` sections. The committer skill's tagged output shape lives in its `# Output format` section. The runner's verdict shape lives in `skills/runner/SKILL.md` `# Output format`. The dispatcher pseudocode in the per-task pipeline below uses those contracts verbatim — when a contract changes, update the skill file, then the helpers in `references/status-parsing.md`.

## Locate the plan

Find the most recent plan path mentioned in the conversation (the just-approved plan from `ExitPlanMode`, or any line matching `\.claude[/\\]plans[/\\][^\s]+\.md`).

If no path is found in the conversation (e.g., after `/clear` or in a fresh session), call `AskUserQuestion` asking the user to paste the plan path. Single question, single option "Other" answer.

Once resolved, `Read` the plan briefly for orientation. The plan can be any markdown — ExtraPlan-shape (with §1 Scope, §2 Context, §3 Mental model, §4 Files to change, §5 Assumptions, …) or looser free-form prose. The dispatcher does not parse it; the `decomposer` handles all interpretation and derives per-task deliverables, modes, tests, and ordering. `max` (total task count) is derived from the `task_files` map returned by decomposer.

## Precondition: plan-review PASS (mode-agnostic)

**Before dispatching any pipeline stage** (ADR analysis, decompose, the per-task loop), confirm THIS plan was approved by `superdev:dev-plan-review` with `STATUS: PASS`. The planning discipline must hold equally in plan mode and accept-edits mode:

- In **plan mode** the `ExitPlanMode` `PreToolUse` hook (`review-plan.sh`) already enforces this — it denies the plan's approval until `dev-plan-review` returned `STATUS: PASS`. So if the plan reached this dispatcher via an `ExitPlanMode` approval in this session, the gate is already satisfied; do not re-run it.
- In **accept-edits mode** there is **no `ExitPlanMode` event**, so no hook fires — the dispatcher itself MUST enforce the gate.

```
# Look for evidence in THIS session of a passed dev-plan-review for the current plan:
#   - the plan arrived via an ExitPlanMode approval (plan mode — hook already gated it), OR
#   - a prior `superdev:dev-plan-review` call for THIS plan path returned `STATUS: PASS`.
if no such evidence exists:
    pr_out = Skill(skill="superdev:dev-plan-review", args="Plan: <plan-path>")
    if first_status_line(pr_out) != "STATUS: PASS":
        report "Plan has not passed dev-plan-review — refusing to start the pipeline." and stop the skill
    # STATUS: PASS → gate satisfied; proceed.
```

This precondition gates the whole orchestration: no decompose, no coder, no commit happens until the plan carries a `dev-plan-review` `STATUS: PASS` for this plan. It never auto-fixes the plan — on a non-PASS it stops and leaves re-planning to the user.

## ADR analysis (before decompose)

Judge whether the approved plan carries an architectural decision worth recording as an ADR. This is the **only** ADR step in the whole flow — plan mode no longer does it. Run it **once per pipeline run, only when decomposition will actually happen**; skip entirely on a resumed run where task files already exist (the decomposer would no-op, and the ADR was already materialized).

```
slug = basename(plan-path) without trailing ".md"   # always the ORIGINAL plan filename
decompose_plan_path = plan-path                      # default: hand the original plan to the decomposer

# Idempotency gate: skip ADR analysis on resume.
if Glob(".temp/.workflows/<slug>/tasks/*.md") returns ≥1 path:
    skip to "Decompose the plan into per-task files"   # decompose_plan_path stays = plan-path

adr_out = Skill(skill="superdev:dev-adr", args="Plan: <plan-path>")
if first_status_line(adr_out) == "STATUS: ADR":
    # Splice the ADR into a COPY — never modify the user's plan file.
    augmented = read(plan-path)
        + "\n\n## Architectural decisions (ADR)\n\n"
        + every "## ADR-NNNN — <title>" block and its matching "## Deferred-write directive", verbatim from adr_out
    Write(".temp/.workflows/<slug>/plan.adr-augmented.md", augmented)
    decompose_plan_path = ".temp/.workflows/<slug>/plan.adr-augmented.md"
# STATUS: NO-ADR (or malformed) → leave decompose_plan_path = plan-path; decompose the plan unchanged
```

The `decomposer` recognizes the appended `## Architectural decisions (ADR)` section and materializes it as a dedicated `tests-none` task (ADR body written verbatim, seeding `.docs/adr/` + `.docs/ADR.md`) — see its Step 2/3. The `slug` stays derived from the **original** plan filename, so `.temp/.workflows/<slug>/` is unchanged; only the plan *content* handed to the decomposer differs. The augmented copy also becomes the decomposer's `plan.md` side-artefact (Step 7.0), so the on-disk audit trail includes the ADR.

## Decompose the plan into per-task files

Invoke `decomposer` exactly once per pipeline run, **before** the per-task loop:

```
# slug + decompose_plan_path were resolved in "ADR analysis (before decompose)" above
decomp_prompt = "Plan: <decompose_plan_path>\nPlanSlug: <slug>"
decomp_out = Skill(skill="superdev:dev-decompose", args=decomp_prompt)
if first_status_line(decomp_out) != "STATUS: PASS":
    escalate to user via AskUserQuestion ("Decomposer failed. Retry or Abort?") and stop on Abort
parse "## Task files" → task_files: dict[N → absolute path to <N>.md], task_titles: dict[N → verb-phrase]
max = len(task_files)
```

Each `## Task files` line is in the shape `- <N> — <verb-phrase> — <path>`; parse with the regex `^- (\d+) — (.+) — (.+\.md)$` (group 2 is the verb-phrase, group 3 is the path — `.md` suffix and the absence of spaces in the dispatcher's `.temp/.workflows/<slug>/tasks/<N>.md` convention make the split unambiguous). `task_titles` is consumed by the progress-widget seed below — without it the dispatcher would have to `Read` every task file just to recover the H1 the decomposer already knows.

Decomposer is idempotent: if `.temp/.workflows/<slug>/tasks/*.md` already exists from a prior run, it returns the existing paths with `STATUS: PASS` and `## Notes: existing task files detected — decomposition skipped`. To force regeneration, delete the directory manually.

Print one line: `Plan decomposed into <K> task file(s).`

For every downstream `coder` / `dev-task-review` invocation in the per-task pipeline, the dispatcher passes a single `Task file: <task_files[N]>` line (not the plan path + a task number). Each pipeline-bound implementation skill (`coder` / `dev-task-review` Task mode / `improver`) — and the `runner` skill in the runner pass — additionally receives a `Report path:` line dictated by the dispatcher and writes its full markdown report to that path itself; the on-stdout response is the three-line minimal shape (`STATUS:` / `Report:` / `Summary:`). The `dev-task-review` Task-mode prompt additionally carries a `Task base: <task_base_sha>` line (the SHA the dispatcher already holds from the attempt-1 `task-base.sha` write) so the dev-task-review can skip re-reading `.temp/.workflows/<slug>/task-base.sha`; the file read stays its fallback when the line is absent — see the dev-task-review's Step 0. The `Feedback:` line carried by `coder` becomes an absolute path to the upstream agent's on-disk report (dev-task-review-report path for retries / unblock; runner-report path is not forwarded directly — the dev-task-review's report is the unblock entry point in the dev-task-review pass). The improver pass still gets `Plan: <plan-path>` because its work is project-wide, not task-scoped, and receives `Task-reviewer report: <path>` instead of an inline dev-task-review body. The commit step (committer skill) is unaffected. Inter-agent files live under the per-task audit directory `.temp/.workflows/<slug>/orchestration/task-<N>/<role>-<attempt>.md` — see the per-task pipeline below for the exact filename slots.

Decomposer's `## Notes` section is informational only — the orchestrator does not gate on it. Any material decision worth flagging will resurface in the final whole-plan dev-task-review against the cumulative diff, where the user can act on it with full evidence rather than on a pre-implementation hypothesis.

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

A second visual channel (next to the `print` lines from `references/retry-policy.md`). Renders the whole task list once, then per-task `TaskUpdate` calls flip each task between `pending` / `in_progress` / `completed` as the pipeline progresses. Soft-fail: every UI call goes through `safe_task_call` (see `references/status-parsing.md`); a UI error never halts the pipeline.

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
# set start = max + 1 so no coder/dev-task-review will run. The final review is read-only. Skip pre-flight.
if start > max:
    pass    # proceed to the final review only
else:
    porcelain = bash("git status --porcelain").stdout
    if porcelain.strip() != "":
        # Hard-abort. The dispatcher refuses to run with uncommitted WIP — the per-task
        # diff scoping (Step 0 in the dev-task-review skill, "verify before revert" in the coder
        # agent) relies on `task-base.sha = HEAD at attempt 1 start`, and dirty WIP
        # poisons that baseline by conflating user changes with coder edits.
        print("Working tree is not clean — orchestrator cannot run with uncommitted changes.")
        print("Uncommitted paths:")
        print(porcelain)
        print("Resolve manually (commit, stash, or discard) and re-run orchestrator.")
        stop the skill
```

The check fires only **once per orchestrator run**, just before the per-task loop entry. Subsequent tasks skip it — by then the committer has committed each previous task and the tree is clean by construction. Resume-from-task-N scenarios DO hit this check on the first executed task, which is correct: a clean tree is the precondition for `task-base.sha` to be meaningful. Hard-abort, not stash — the dispatcher does not move user data; the user owns the working tree.

For each task `N` from `start` to `max`, run this loop:

```
# Progress widget: flip this task's widget from `pending` (seeded by the progress-widget seed) to
# `in_progress`. The current task is the only one in_progress at any given time.
# UI overlay — `safe_task_call` soft-fails.
safe_task_call(TaskUpdate, taskId=task_widgets[N], status="in_progress")

attempt = 0
last_failure_path = ""            # absolute path to the most recent upstream agent's report on disk (reviewer-K.md / runner-K.md / unblock-coder-K.md); "" on attempt 1
last_pass_verdict = {}            # tracks the previous BLOCKED verdict for the runner / dev-task-review passes — used by the infinite-loop guard
last_coder_report_path = ""       # carries previous-attempt coder report path forward to the next reviewer invocation (Previous coder report: …)

# Per-task audit/transport directory. The dispatcher dictates every report path inside it.
# Ephemeral — NOT state of truth (see Anti-patterns + the state-files list).
orch_dir = f".temp/.workflows/<slug>/orchestration/task-{N}"

loop:
    attempt += 1

    # Persist task-base.sha at start of attempt 1 only. This is the SHA every dev-task-review/coder
    # invocation in this task will use to compute the task diff. Retries on the same task
    # MUST NOT overwrite it — the baseline is stable for the whole task. The dev-task-review skill's
    # Step 0 and the coder skill's "verify before revert" both read this file.
    if attempt == 1:
        task_base_sha = bash("git rev-parse HEAD").strip()
        Write(".temp/.workflows/<slug>/task-base.sha", task_base_sha + "\n")

    # invoke coder
    coder_report_path = f"{orch_dir}/coder-{attempt}.md"
    impl_prompt = (
        f"Task file: <task_files[N]>\n"
        f"Report path: {coder_report_path}\n"
        f"Mode: normal\n"
        f"Feedback: {last_failure_path or '—'}"
    )
    impl_out = Skill(skill="superdev:dev-code", args=impl_prompt)
    impl_status = first_status_line(impl_out)                # "STATUS: PASS" / "STATUS: FAIL" / malformed
    verdict = "PASS" if impl_status == "STATUS: PASS" else "FAIL"
    suffix = "" if verdict == "PASS" and attempt == 1 else f" (attempt {attempt}/3)"
    print(f"[{N}/{max}] coder: {verdict}{suffix}")     # live-progress signal — see "Notes on the loop"
    if impl_status != "STATUS: PASS":
        last_failure_path = coder_report_path        # the FAIL evidence lives in the coder's own report this attempt
        last_coder_report_path = ""                  # any prior rationale is invalidated by a FAIL
        if attempt >= 3: goto escalation
        continue
    # PASS: if a prior attempt FAILed (last_failure_path != "") and this coder pass returned PASS,
    # forward the coder report path to the next dev-task-review invocation as `Previous coder report:`.
    # See references/retry-policy.md and the dev-task-review skill's Task-mode input contract.
    last_coder_report_path = coder_report_path if last_failure_path != "" else ""

    # invoke runner (skipped on pure `Tests: none`)
    gate = extract_task_gate(N)          # the lines under "## Task gate" in the task file
    scope_paths = extract_scope_paths(N)  # glob/prefix list from the task's `## Touches` bullets
    scope_tests = extract_scope_test_names(N)  # identifier or intent-shorthand patterns derived from `## Task gate` `Tests:` (e.g. `Tests: <Namespace>.<Module>Tests.<TestName>, rejects status transition closed→open` → `<Namespace>.<Module>Tests.*` + literal intent strings)

    if gate contains line matching "^\s*- Tests:" with non-`none` value OR gate contains line matching "^\s*- Build: green":
        cmd = build_test_command_or_build_command(gate, project_CLAUDE.md)
        # Dispatcher dictates the report path; the runner writes its own full markdown there (pipeline mode,
        # see skills/runner/SKILL.md). The 3-line stdout reply (STATUS / Report / Summary) is parsed below.
        # The path slot is overwritten on crash recovery (same attempt slot).
        runner_report_path = f"{orch_dir}/runner-{attempt}.md"
        # TASK-SCOPED run: pass only this task's `Scope hints:` and NEVER `Scope: full`. dev-run is
        # task-scoped by default (only the current task's tests); the full suite runs once at the end,
        # inside dev-final-review (which supplies `Scope: full` itself). The per-task loop must never
        # trigger the whole suite.
        runner_prompt = (
            cmd + "\n\n"
            f"Report path: {runner_report_path}\n\n"
            "Scope hints:\n  paths:\n    - <each scope_paths entry>\n  test names:\n    - <each scope_tests entry>"
        )
        runner_out = Skill(skill="superdev:dev-run", args=runner_prompt)
        runner_status = first_status_line(runner_out)                  # "STATUS: PASS|FAIL|BLOCKED|ERROR|TIMEOUT" or malformed
        v = runner_status.removeprefix("STATUS: ") if runner_status.startswith("STATUS: ") else "FAIL"
        print(f"[{N}/{max}] runner: {v}")                  # v ∈ {PASS, FAIL, ERROR, TIMEOUT, BLOCKED}

        # Unblock-branch narration (shared by both BLOCKED branches — runner pass below and
        # dev-task-review pass further down). A `BLOCKED` verdict means every failure is out-of-scope:
        # route it through a `Mode: unblock` coder pass (Feedback = the BLOCKING agent's report on
        # disk) that clears the blocker, then restart that same pass — without incrementing `attempt`,
        # since only a *successful* unblock is free. Infinite-loop guard: `last_pass_verdict[<pass>]`
        # tracks whether this pass already returned BLOCKED on the previous iteration; BLOCKED twice in
        # a row is forcibly converted to FAIL (increments `attempt`) so a non-unblocking unblock cannot
        # spin forever. The two pseudocode blocks stay explicit on purpose — they differ only in
        # feedback-path, guard-key, and restart-target. Full mechanics: references/retry-policy.md.
        if v == "BLOCKED":
            if last_pass_verdict.get("runner") == "BLOCKED":   # guard (narration above)
                last_failure_path = runner_report_path
                if attempt >= 3: goto escalation
                continue
            last_pass_verdict["runner"] = "BLOCKED"
            unblock_report_path = f"{orch_dir}/unblock-coder-{attempt}.md"
            unblock_prompt = (
                f"Task file: <task_files[N]>\n"
                f"Report path: {unblock_report_path}\n"
                f"Mode: unblock\n"
                f"Feedback: {runner_report_path}"
            )
            unblock_out = Skill(skill="superdev:dev-code", args=unblock_prompt)
            unblock_verdict = "PASS" if first_status_line(unblock_out) == "STATUS: PASS" else "FAIL"
            print(f"[{N}/{max}] coder (unblock): {unblock_verdict}")
            if first_status_line(unblock_out) != "STATUS: PASS":
                last_failure_path = unblock_report_path
                if attempt >= 3: goto escalation
                continue
            restart runner pass   # successful unblock — no attempt increment (narration above)
        elif v != "PASS":
            last_failure_path = runner_report_path
            if attempt >= 3: goto escalation
            continue
        last_pass_verdict["runner"] = "PASS"
    # else: pure `Tests: none` and no `Build: green` — skip runner entirely

    # invoke dev-task-review
    # The dispatcher passes path-based handles only. The runner report on disk supplies the
    # execution evidence; the previous coder report (when present) carries the verify-before-revert
    # rationale. Task-reviewer Reads both files itself — see its Task-mode input contract.
    reviewer_report_path = f"{orch_dir}/dev-task-review-{attempt}.md"
    if runner_ran_this_attempt:        # true iff the runner pass was entered AND its final verdict was PASS
        runner_report_line = runner_report_path
    else:
        # Pure `Tests: none` (no `Build: green`) — runner was not invoked; dev-task-review skips runner verification.
        runner_report_line = "none"
    # `task_base_sha` was resolved at attempt-1 start (the `task-base.sha` write above). Passing it
    # spares the dev-task-review one `Read` of `.temp/.workflows/<slug>/task-base.sha`; the file stays on disk
    # and the dev-task-review falls back to reading it if this line is ever absent — see its Step 0.
    rev_prompt = (
        f"Task file: <task_files[N]>\n"
        f"Runner report: {runner_report_line}\n"
        f"Task base: {task_base_sha}\n"
        f"Report path: {reviewer_report_path}"
    )
    if last_coder_report_path != "":   # see "Capture coder report path" above + references/retry-policy.md
        rev_prompt += f"\nPrevious coder report: {last_coder_report_path}"
    rev_out = Skill(skill="superdev:dev-task-review", args=rev_prompt)
    rev_status = first_status_line(rev_out)   # one of PASS / FAIL / BLOCKED (see the final review)
    rev_verdict = rev_status.removeprefix("STATUS: ") if rev_status.startswith("STATUS: ") else "FAIL"
    print(f"[{N}/{max}] dev-task-review: {rev_verdict}")

    # Same unblock-branch narration as the runner pass above (feedback-path / guard-key / restart-target differ).
    if rev_status == "STATUS: BLOCKED":
        if last_pass_verdict.get("dev-task-review") == "BLOCKED":   # guard (narration above)
            last_failure_path = reviewer_report_path
            if attempt >= 3: goto escalation
            continue
        last_pass_verdict["dev-task-review"] = "BLOCKED"
        unblock_report_path = f"{orch_dir}/unblock-coder-{attempt}.md"
        unblock_prompt = (
            f"Task file: <task_files[N]>\n"
            f"Report path: {unblock_report_path}\n"
            f"Mode: unblock\n"
            f"Feedback: {reviewer_report_path}"
        )
        unblock_out = Skill(skill="superdev:dev-code", args=unblock_prompt)
        unblock_verdict = "PASS" if first_status_line(unblock_out) == "STATUS: PASS" else "FAIL"
        print(f"[{N}/{max}] coder (unblock): {unblock_verdict}")
        if first_status_line(unblock_out) != "STATUS: PASS":
            last_failure_path = unblock_report_path
            if attempt >= 3: goto escalation
            continue
        restart dev-task-review pass   # successful unblock — no attempt increment (narration above)
    elif rev_status != "STATUS: PASS":
        last_failure_path = reviewer_report_path
        if attempt >= 3: goto escalation
        continue
    last_pass_verdict["dev-task-review"] = "PASS"

    # invoke improver (always; never blocks)
    improver_report_path = f"{orch_dir}/improver-{attempt}.md"
    imp_prompt = (
        f"Plan: <plan-path>\n"
        f"Task-reviewer report: {reviewer_report_path}\n"
        f"Report path: {improver_report_path}"
    )
    imp_out = Skill(skill="superdev:dev-improve", args=imp_prompt)
    imp_verdict = "PASS" if first_status_line(imp_out) == "STATUS: PASS" else "FAIL"
    print(f"[{N}/{max}] improver: {imp_verdict}")

    # commit step (committer skill, context: fork). The committer self-checks the worktree, but a
    # tagged `sha` is NOT proof the commit landed: the Haiku fork can hallucinate the tool result —
    # narrate the `git commit`, invent a SHA, and leave the tree dirty with HEAD unmoved. So wrap the
    # committer in a bounded retry loop (≤3) that VERIFIES HEAD actually advanced (and the tree is
    # clean) before trusting the tag. Source of truth for the reported sha is `git rev-parse --short
    # HEAD` AFTER that check — never commit_result[1] (may be fabricated even on a real commit).
    # See references/status-parsing.md (parse_commit_tag note).
    pre_commit_head = bash("git rev-parse HEAD").strip()
    # The dispatcher authors NO commit subject. Subject authoring lives entirely in dev-decompose (which
    # writes each task file's `# ` H1 as a Conventional-Commits-form subject) + dev-committer (which reads
    # that H1 and prefixes `T<N>:`). The dispatcher just hands the committer the TASK FILE PATH; the
    # committer derives `N` from the filename and `<subject>` from the file's H1 and runs `git commit`
    # verbatim (no diff analysis, no subject synthesis). See skills/dev-committer/SKILL.md (`# Input contract`).
    task_file_path = f".temp/.workflows/{slug}/tasks/{N}.md"   # == task_files[N]
    commit_tries = 0
    commit_loop:
        commit_tries += 1
        # Pass the TASK FILE PATH as the committer's argument; on a phantom-commit retry pass the SAME
        # path (idempotent — the file and its derived subject are stable across tries).
        commit_out = Skill(skill="superdev:dev-committer", args=task_file_path)
        commit_result = parse_commit_tag(commit_out)   # see Helpers and pattern reference — returns one of: ("sha", "<hex>", N, subject) | ("no-changes",) | ("error", stderr) | ("malformed", raw)
        if commit_result[0] == "sha":
            # A `sha` tag is NOT proof — verify the commit really landed before trusting it.
            post_commit_head = bash("git rev-parse HEAD").strip()
            dirty = bash("git status --porcelain").strip() != ""
            if post_commit_head == pre_commit_head or dirty:
                # Phantom commit: committer reported a `sha` but HEAD did not move (and/or the tree is
                # still dirty) — the fabricated-SHA failure. Re-invoke the committer; changes are still
                # staged and the fork re-runs `git add -A`, so the retry is safe and idempotent.
                print(f"[{N}/{max}] commit: UNVERIFIED (HEAD unchanged) — retrying committer")
                if commit_tries >= 3:
                    # Terminal: 3 committer invocations all failed to land. Task widget stays at
                    # `in_progress` (no `failed` state) — the visually-stuck row mirrors the halted
                    # pipeline. Do NOT hand-commit from the dispatcher; hard-stop instead.
                    report "[{N}/{max}] commit FAILED: committer reported a commit that did not land (HEAD unchanged after 3 tries)" and stop
                continue commit_loop
            # Real commit confirmed — TRUST GIT, not the reported sha.
            short_sha = bash("git rev-parse --short HEAD").strip()
            print(f"[{N}/{max}] commit: {short_sha}")
            # Persist base.sha after the first successful commit (see the final review). Parent is HEAD^
            # now that HEAD points at the new commit — derived from git, never from commit_result[1].
            if N == 1:
                parent_sha = bash("git rev-parse \"HEAD^\"").strip()
                Write(".temp/.workflows/<slug>/base.sha", parent_sha + "\n")
            # Progress widget: flip task widget to completed with the commit sha.
            safe_task_call(TaskUpdate, taskId=task_widgets[N], status="completed",
                           description=f"Committed {short_sha}.")
            break commit_loop   # commit landed — proceed to the status.yml update
        elif commit_result[0] == "no-changes":
            print(f"[{N}/{max}] commit: no-op ({commit_result[0]})")
            # Progress widget: task still counts as done — flip to completed with a note.
            safe_task_call(TaskUpdate, taskId=task_widgets[N], status="completed",
                           description=f"No-op ({commit_result[0]}).")
            break commit_loop
        elif commit_result[0] == "error":
            # Task widget stays at `in_progress` (no `failed` state) — the visually-stuck
            # widget mirrors the halted pipeline. surface error and abort the run —
            # committer failed cleanly, no point retrying via coder.
            report f"[{N}/{max}] commit FAILED: {commit_result[1]}" and stop
        else:
            # Same handling as the error branch — task widget stays at `in_progress`.
            report f"[{N}/{max}] commit MALFORMED: {commit_result[1]}" and stop

    # Update status.yml — authoritative task tracker (see the starting-task resolution order).
    # After commit of task N, the next task to execute is N+1. After commit of the
    # last task N=max, this writes `current_task: max+1` — the "all done" sentinel
    # that the starting-task resolution detects if the user re-runs orchestrator in a new session.
    Write(".temp/.workflows/<slug>/status.yml", f"current_task: {N + 1}\n")

    break to next task

escalation:
    answer = AskUserQuestion(
        question="Task <N> failed 3 times. Latest failure attached below. Choose:",
        options=["Retry 3 more times", "Abort"]
    )
    if answer == "Retry 3 more times":
        attempt = 0
        continue
    else:
        # Task widget stays at `in_progress` (no `failed` state). The visually-stuck
        # task + the abort message are the user's terminal signal.
        report "Aborted at Task <N> after 3 attempts." and stop the skill
```

### Notes on the loop

- Retry cap, BLOCKED branch mechanics, infinite-loop guard, live-progress format, and escalation rules: see `references/retry-policy.md`.
- Implementation agents (`coder` / `dev-task-review` Task mode / `improver`) reply on stdout with only `STATUS:` / `Report:` / `Summary:`. The dispatcher parses `STATUS:` via `first_status_line` (regex unchanged — see `references/status-parsing.md`) and may surface the agent's one-line `Summary:` alongside the live-progress `[<N>/<max>] <agent>: <VERDICT>` line for context; the `Report:` path is what gets forwarded into downstream prompts.
- The per-task loop iterates zero times when `status.yml`'s `current_task` exceeds `max` — the user re-ran orchestrator after the whole plan was committed. The starting-task resolution sets `start = current_task`, the progress-widget seed marks every task already `completed`, the per-task loop is empty, and control flows into the final whole-plan review.
- Progress widget updates (`TaskUpdate` on task entry / commit success / no-op commit) live alongside the `print` lines and never replace them — see the "Progress tree (TaskCreate)" section in `references/retry-policy.md`.

## Final whole-plan review

Runs **once**, after the per-task pipeline has reached the end of the task list with a successful commit on the last task (or when the starting-task resolution's `current_task > max` sentinel jumps here directly). Delegated wholesale to the `superdev:dev-final-review` sub-orchestrator, which internally runs `dev-plan-audit` → `dev-run` (Scope: full) → `dev-smoke` → synthesis and **returns a single go/no-go verdict on stdout**. It writes no file.

```
# Resolve base_sha (priority: persisted .temp/.workflows/<slug>/base.sha → git log --grep="^T1: " → git merge-base HEAD main),
# then head_sha = git rev-parse HEAD. dev-final-review takes the diff range as a `Diff range:` line.
final_prompt = (
    "Plan: <plan-path>\n"
    "Diff range: " + base_sha + ".." + head_sha
)
final_out = Skill(skill="superdev:dev-final-review", args=final_prompt)
final_status = first_status_line(final_out)                         # one of STATUS: PASS / STATUS: FAIL
final_verdict = final_status.removeprefix("STATUS: ") if final_status.startswith("STATUS: ") else "FAIL"
print(f"[final] dev-final-review: {final_verdict}")
# Surface the returned verdict to the user as the terminal result — no file is written or persisted.
report final_out and stop the skill
```

The dispatcher does **not** write a `final-review.md` — that artifact no longer exists. The verdict (`STATUS: PASS` go / `STATUS: FAIL` no-go) plus the sub-step breakdown that `dev-final-review` returns on stdout IS the terminal result; surface it verbatim to the user. The widget at this point shows every task widget as `completed` (or, on a halted run, the in-flight task still at `in_progress`); no plan-level flip is needed. `FAIL` is advisory, not retry-triggering.

**One-shot and terminal.** No retry loop, no `AskUserQuestion`, no `improver` invocation at this stage. Full pseudocode, `base_sha` resolution priority rationale, and final-review-specific anti-patterns: see `references/final-review.md`.

## Helpers and pattern reference

STATUS regex per agent class, `parse_commit_tag` shape table, runner verdict tokens, the progress-widget constraints used by the progress-widget seed, and all the named helpers referenced by the per-task-pipeline pseudocode (`first_status_line`, `parse_status_yml`, `parse_arg_task`, `parse_commit_tag`, `extract_task_gate`, `extract_scope_paths`, `extract_scope_test_names`, `extract_section`, `build_test_command_or_build_command`, `safe_task_call`): see `references/status-parsing.md`.

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

- Inspecting, reading, or modifying source code yourself. Every code touch is the `coder`'s job.
- Running build / test commands yourself. Every test invocation goes through `runner`.
- Pre-flight environment probes via `Bash` between pipeline steps (checking runtimes, services, container state, tool versions, network reachability, etc.) — even when project conventions tell a normal session to verify them before running tests. Those conventions target sessions that run tests directly; the dispatcher delegates the run to `runner`, which surfaces any environment failure as `FAIL` / `ERROR` and the standard 3 + 3 loop handles it. The dispatcher's `Bash` budget is reserved for the git queries in the final review.
- Skipping the `dev-task-review` step "to save time" on a small task.
- Adding retries beyond the documented `3` + `3` cap, or offering a "skip task" option to the user (intentionally absent). Also forbidden: a separate retry budget for `BLOCKED` — the unblock branch shares the same cap, with successful unblock passes free of attempt-counter increment.
- Writing any state file other than (a) the authoritative task tracker `.temp/.workflows/<slug>/status.yml` (the commit step — orchestrator updates after each successful commit), (b) the persisted `.temp/.workflows/<slug>/base.sha` written once after the Task 1 commit (the commit step), and (c) the per-task baseline `.temp/.workflows/<slug>/task-base.sha` (re)written at the start of every task's attempt 1 (the per-task pipeline, before the coder pass). The final review writes **no** file — `dev-final-review` returns its go/no-go verdict on stdout and the dispatcher surfaces it directly. Plan + task files + git + those three small state files are the only sources of truth — **except** for everything else under `.temp/.workflows/<slug>/orchestration/<task-N>/` (the `coder-K.md`, `dev-task-review-K.md`, `improver-K.md`, `unblock-coder-K.md`, and `runner-K.md` reports the implementation / tool skills write themselves to their dispatcher-dictated `Report path:`), which is an **ephemeral audit/transport layer**, NOT state of truth: resume logic relies only on `status.yml` + `task-base.sha` + `base.sha`, and a crash recovery overwrites any prior attempt's report at the same numeric slot.
- Editing, updating, creating any file yourself — including "quick fixes" for pre-existing issues surfaced by runner. Out-of-scope blockers are handled by routing the `BLOCKED` verdict through an unblock `coder` pass (see the runner pass / dev-task-review pass). The dispatcher never touches source files directly.
- Treating the committer's tagged `sha` as proof the commit landed. The Haiku committer fork can hallucinate the tool result — narrate the `git commit`, invent a SHA, and leave the tree dirty with HEAD unmoved. After a `sha` tag the dispatcher MUST verify `git rev-parse HEAD` advanced past the pre-commit HEAD **and** `git status --porcelain` is empty, re-invoking the committer (changes are still staged) up to 3× before a hard-stop; the reported sha is taken from `git rev-parse --short HEAD`, never `commit_result[1]`. Never hand-commit from the dispatcher to paper over a phantom commit.
- Pasting the plan body into a sub-agent prompt — the sub-agent reads the plan (or task file) itself from the supplied path.
- Inlining any pipeline-bound skill's reply (coder / dev-task-review / improver / runner) into a downstream skill's prompt — verbatim, summarised, filtered, or otherwise. The on-stdout reply of those agents is the three-line minimal shape (`STATUS:` / `Report:` / `Summary:`); the full markdown lives at the dispatcher-dictated `Report path:`, and downstream prompts carry **paths only** (`Feedback: …`, `Runner report: …`, `Task-reviewer report: …`, `Previous coder report: …`). The runner follows the same discipline when invoked with `Report path:` (pipeline mode): it writes its own markdown to that path and replies on stdout with the 3-line block — the dispatcher MUST NOT re-`Write` the runner report from its own context, and MUST NOT page the full markdown into the dispatcher prompt.
- Forwarding more than one failure to the next coder run. Only the most recent failure's report path goes in `Feedback`.
- Telling `dev-task-review` it is a retry attempt. Each review must be a fresh judgment.
- Skipping the `Scope hints:` block when invoking runner inside this pipeline. Without it the runner cannot emit `BLOCKED` and the whole runner unblock path becomes unreachable.
- Aggregating per-agent progress lines into a single summary line, or skipping them "to save tokens". The minimal format `[<N>/<max>] <agent-name>: <VERDICT>` is already at the lower bound; further compression breaks the live-signal contract with the user.
- Gating on decomposer's `## Notes` section between decomposition and the per-task pipeline. The orchestrator never prompts the user about notes — any material decision will resurface in the final whole-plan dev-task-review against the cumulative diff, where the user can act on real evidence rather than a hypothesis.
- Auto-triggering on generic "implement / build / code / execute / carry out" intents without the literal word "orchestrator" appearing either in the user's message or in the plan body. The trigger contract is explicit-mention-only; treating descriptive paraphrases as a trigger violates the skill's frontmatter `description` and surprises the user with a heavy pipeline they did not request.
- Replacing the `print` live-progress lines with `TaskCreate` / `TaskUpdate` "because the widget is enough". The `print` lines are the **sole live-signal contract** (see `references/retry-policy.md` — "Live-progress lines"); the progress widget is a **second, independent channel**, never a substitute. Both must emit on every transition.
- Hard-failing the pipeline on a `TaskCreate` / `TaskUpdate` error. The widget is a UI overlay, not state of truth (state of truth = `status.yml`, the task files, `base.sha`, `task-base.sha`, and git history). All widget calls go through `safe_task_call`; a UI error prints one warning and the pipeline continues.
- Adding sub-tasks under a task widget (per-agent invocations, retry attempts, BLOCKED nodes, …). `TaskCreate` has no `parent` field — the widget is intentionally a flat list of `Task <N>: <verb-phrase>` rows. Per-agent verdicts and retry counters live in the `print` channel, never in the widget.
- Mutating a task widget's `subject` mid-run (e.g. appending `attempt 2/3`, `BLOCKED`, or a short sha to the label). The subject is stable for the lifetime of the run; transient diagnostics belong in `print`. Terminal context (commit sha, `no-op` reason, abort cause) goes into the widget's `description` exactly once — at the same moment the status flips to `completed` (or, for terminal failures, the description is left as the seed text since the status stays at `in_progress`).
- Using `completed` to mark a terminally-failed task (Abort, commit `error` / `malformed`, killed run). `TaskUpdate` has no `failed` status; a green-checked `completed` row would lie. The orchestrator leaves the in-flight task widget at `in_progress` — the visually-stuck row is the truthful "the pipeline halted here" signal. Diagnostic detail lives in the corresponding `print` line.
- Deleting, pruning, re-seeding, or otherwise "cleaning up" the task widget list at any point during a run — **including in response to a Claude Code system reminder that the task list is *stale* and should be *cleaned up***. That reminder fires precisely when the dispatcher has not touched `Task*` tools for a while (it has been busy dispatching sub-agents) and most tasks are already `completed` — i.e. typically while the **last** task's `coder` is mid-run — so obeying it blanks the widget exactly when the user is watching the final task, and the deleted `completed` rows do **not** come back. The flat list is seeded **once** by the progress-widget seed and MUST persist verbatim until the skill ends at the closing summary; `completed` rows stay visible (checked) for the whole run. Never call `TaskUpdate(status="deleted")`, never re-`TaskCreate` an existing task, and ignore any stale-list cleanup prompt while the orchestrator is running. (Distinct, expected, and NOT a cue to re-seed: the widget legitimately appears empty *during* a sub-agent dispatch — the UI shows the active agent's own empty task scope — and the parent list reappears when control returns. That transient blanking is platform behavior; re-seeding "to fix it" is the bug, not the blanking.)
