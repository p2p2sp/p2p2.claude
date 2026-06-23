---
name: dev-orchestrator
description: >-
  Use ONLY when the approved plan's body contains the word "orchestrator". Do NOT auto-trigger on generic intents like "implement", "build", "code", "execute", "carry out" — explicit "orchestrator" mention required (any language).
allowed-tools: Read, Bash, Write, Grep, Glob, Skill, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList, TaskStop
user-invocable: false
model: opus
effort: low
---

!`mkdir -p .temp/.workflows 2>/dev/null || true`

# Orchestrator — Task Pipeline Dispatcher

Drives the implementation of an already-approved plan, task by task. A **thin dispatcher** — every code touch, test run, review judgment, learning capture, and commit goes through a sub-agent with fresh context. Makes no judgment about the code itself.

CRITICAL: Never place two pipeline calls in the same message — the coder/runner/dev-agent-task-reviewer/improver/committer `Skill` calls each depend on the previous one's result, so dispatch exactly one per turn and await it before the next, overriding any general "batch independent calls" guidance.

## Pipeline graph

```
plan.md
   │  (once, before the loop)
   ▼
decomposer  ──►  .temp/.workflows/<slug>/tasks/<N>.md  +  status.yml
   │  (per task N = start..max)
   ▼
coder  ──►  runner  ──►  dev-agent-task-reviewer (Task mode)  ──►  improver  ──►  committer
                │                          │                  (rules)
                └─ BLOCKED ─────────────────┴── BLOCKED ──► unblock-coder pass clears the blocker
                                                  improver is config-gated (skipped when its switch is off)
   │  (after last task, once)
   ▼
dev-agent-final-reviewer (sub-orchestrator)  ──►  go/no-go verdict on stdout
```

Roles in one line each:

- **decomposer** — slices the source plan into per-task files; runs once, idempotent.
- **coder** — writes production code for ONE task; also handles unblock passes when `Feedback` starts with `BLOCKED:`.
- **runner** — runs the task's build/test/lint command; emits `PASS` / `FAIL` / `ERROR` / `TIMEOUT` / `BLOCKED`.
- **dev-agent-task-reviewer (Task mode)** — verifies the task Deliverable + tests + conventions against the working tree; emits `PASS` / `FAIL` / `BLOCKED`.
- **improver** — promotes the committed task's dev-agent-task-reviewer learnings into `.claude/rules/`; always `PASS` (no failure mode). Gated by the `rules_improver` switch (skipped when off).
- **committer** (`scripts/commit-task.sh`) — commits the task; the dispatcher runs `bash "${CLAUDE_PLUGIN_ROOT}/skills/dev-orchestrator/scripts/commit-task.sh" "<task_file>"` inline. The script derives the commit subject (the task file's `# ` H1) and the `T<N>:` prefix itself (the dispatcher synthesizes no subject), and emits a tagged single line parsed by `parse_commit_tag`. Being deterministic, the script cannot fabricate its tag — it emits a `sha` **only** after itself verifying HEAD advanced and the tree is clean, so the dispatcher trusts the tag directly (no re-verification, no retry loop).
- **dev-agent-final-reviewer (sub-orchestrator)** — one-shot terminal gate after the last task is committed; internally runs `dev-agent-plan-auditor` → `dev-agent-runner` (Scope: full) → `dev-agent-smoke` → synthesis and returns a single go/no-go verdict on stdout (no file written).

Each pipeline-bound skill (`decomposer`/`coder`/`dev-agent-task-reviewer`/`improver`) carries the full input/output contract in its own `SKILL.md`'s `# Input contract` + `# Output format` sections. The committer's tagged output shape lives in the header comment of `scripts/commit-task.sh`. The runner's verdict shape lives in `skills/runner/SKILL.md` `# Output format`. The dispatcher pseudocode in the per-task pipeline below uses those contracts verbatim — when a contract changes, update the skill file, then the helpers in `references/status-parsing.md`.

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

The host project may disable optional pipeline steps via `config` (preloaded above). Read each switch as a boolean — a key is **off only when its value is literally `false`**; a missing key, missing file, or unreadable file means **on** (fail-open, default-enabled, so a project that never ran `/superdev:setup` runs the full pipeline). The switches this dispatcher honors:

- `adr: false` → skip the ADR-analysis step below.
- `rules_improver: false` → skip the per-task `dev-agent-improver` step.

When a config-gated step is skipped, print **one terse line** in the normal progress channel (`ADR: skipped (disabled)`, `[N/max] dev-agent-improver: skipped (disabled)`) — never a paragraph explaining what the step does or why it is off.

## ADR analysis (before decompose)

Judge whether the approved plan carries an architectural decision worth recording as an ADR. This is the **only** ADR step in the whole flow — plan mode no longer does it. Run it **once per pipeline run, only when decomposition will actually happen**; skip entirely on a resumed run where task files already exist (the decomposer would no-op, and the ADR was already materialized).

```
slug = basename(plan-path) without trailing ".md"   # always the ORIGINAL plan filename
decompose_plan_path = plan-path                      # default: hand the original plan to the decomposer

# Config gate: ADR capture disabled (`adr: false` in .superdev/config.yml) → skip entirely.
if config switch `adr` is false:
    print("ADR: skipped (disabled)")
    skip to "Decompose the plan into per-task files"   # decompose_plan_path stays = plan-path

# Idempotency gate: skip ADR analysis on resume.
if Glob(".temp/.workflows/<slug>/tasks/*.md") returns ≥1 path:
    skip to "Decompose the plan into per-task files"   # decompose_plan_path stays = plan-path

# dev-agent-adr-analyzer injects the plan CONTENT via dynamic context (`cat $ARGUMENTS`), so pass the BARE ABSOLUTE path.
adr_out = Skill(skill="superdev:dev-agent-adr-analyzer", args="<abspath(plan-path)>")
if first_status_line(adr_out) == "STATUS: ADR":
    # Splice the ADR into a COPY — never modify the user's plan file.
    augmented = read(plan-path)
        + "\n\n## Architectural decisions (ADR)\n\n"
        + every "## ADR-NNNN — <title>" block and its matching "## Deferred-write directive", verbatim from adr_out
    Write(".temp/.workflows/<slug>/plan.adr-augmented.md", augmented)
    decompose_plan_path = ".temp/.workflows/<slug>/plan.adr-augmented.md"
# STATUS: NO-ADR (or malformed) → leave decompose_plan_path = plan-path; decompose the plan unchanged
```

The `decomposer` recognizes the appended `## Architectural decisions (ADR)` section and materializes it as a dedicated `tests-none` task (ADR body written verbatim, seeding `.superdev/adr/` + `.superdev/ADR.md`) — see its Step 2/3. The `slug` stays derived from the **original** plan filename, so `.temp/.workflows/<slug>/` is unchanged; only the plan *content* handed to the decomposer differs. The augmented copy also becomes the decomposer's `plan.md` side-artefact (Step 7.0), so the on-disk audit trail includes the ADR.

## Decompose the plan into per-task files

Invoke `decomposer` exactly once per pipeline run, **before** the per-task loop:

```
# slug + decompose_plan_path were resolved in "ADR analysis (before decompose)" above
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

For every downstream `coder` / `dev-agent-task-reviewer` invocation in the per-task pipeline, the dispatcher passes a single `Task file: <task_files[N]>` line (not the plan path + a task number). Each pipeline-bound implementation skill (`coder` / `dev-agent-task-reviewer` Task mode / `improver`) — and the `runner` skill in the runner pass — additionally receives a `Report path:` line dictated by the dispatcher and writes its full markdown report to that path itself; the on-stdout response is the three-line minimal shape (`STATUS:` / `Report:` / `Summary:`). The `dev-agent-task-reviewer` Task-mode prompt additionally carries a `Task base: <task_base_sha>` line (the SHA the dispatcher already holds from the attempt-1 `task-base.sha` write) so the dev-agent-task-reviewer uses it directly (no file read); `Task base:` is required — the dev-agent-task-reviewer BLOCKs if the line is ever absent (see its Step 0). The `Feedback:` line carried by `coder` becomes an absolute path to the upstream agent's on-disk report (dev-agent-task-reviewer-report path for retries / unblock; runner-report path is not forwarded directly — the dev-agent-task-reviewer's report is the unblock entry point in the dev-agent-task-reviewer pass). The improver pass receives only `Task-reviewer report: <path>` (its rules-learnings source) instead of an inline dev-agent-task-reviewer body. It is config-gated (`rules_improver`) and skipped with one terse line when off. The commit step (the `scripts/commit-task.sh` run) is unaffected. Inter-agent files live under the per-task audit directory `.temp/.workflows/<slug>/orchestration/task-<N>/<role>-<attempt>.md` — see the per-task pipeline below for the exact filename slots.

Decomposer's `## Notes` section is informational only — the orchestrator does not gate on it. Any material decision worth flagging will resurface in the final whole-plan dev-agent-task-reviewer against the cumulative diff, where the user can act on it with full evidence rather than on a pre-implementation hypothesis.

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
# set start = max + 1 so no coder/dev-agent-task-reviewer will run. The final review is read-only. Skip pre-flight.
if start > max:
    pass    # proceed to the final review only
else:
    porcelain = bash("git status --porcelain").stdout
    if porcelain.strip() != "":
        # Hard-abort. The dispatcher refuses to run with uncommitted WIP — the per-task
        # diff scoping (Step 0 in the dev-agent-task-reviewer skill, "verify before revert" in the coder
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
last_pass_verdict = {}            # tracks the previous BLOCKED verdict for the runner / dev-agent-task-reviewer passes — used by the infinite-loop guard
last_coder_report_path = ""       # carries previous-attempt coder report path forward to the next reviewer invocation (Previous coder report: …)

# Per-task audit/transport directory. The dispatcher dictates every report path inside it.
# Ephemeral — NOT state of truth (see Anti-patterns + the state-files list).
orch_dir = f".temp/.workflows/<slug>/orchestration/task-{N}"

loop:
    attempt += 1

    # Persist task-base.sha at start of attempt 1 only. This is the SHA every dev-agent-task-reviewer/coder
    # invocation in this task will use to compute the task diff. Retries on the same task
    # MUST NOT overwrite it — the baseline is stable for the whole task. The coder skill's "verify before
    # revert" reads this file; the dev-agent-task-reviewer gets the same SHA on its `Task base:` line.
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
    impl_out = Skill(skill="superdev:dev-agent-coder", args=impl_prompt)
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
    # forward the coder report path to the next dev-agent-task-reviewer invocation as `Previous coder report:`.
    # See references/retry-policy.md and the dev-agent-task-reviewer skill's Task-mode input contract.
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
        # TASK-SCOPED run: pass only this task's `Scope hints:` and NEVER `Scope: full`. dev-agent-runner is
        # task-scoped by default (only the current task's tests); the full suite runs once at the end,
        # inside dev-agent-final-reviewer (which supplies `Scope: full` itself). The per-task loop must never
        # trigger the whole suite.
        runner_prompt = (
            cmd + "\n\n"
            f"Report path: {runner_report_path}\n\n"
            "Scope hints:\n  paths:\n    - <each scope_paths entry>\n  test names:\n    - <each scope_tests entry>"
        )
        runner_out = Skill(skill="superdev:dev-agent-runner", args=runner_prompt)
        runner_status = first_status_line(runner_out)                  # "STATUS: PASS|FAIL|BLOCKED|ERROR|TIMEOUT" or malformed
        v = runner_status.removeprefix("STATUS: ") if runner_status.startswith("STATUS: ") else "FAIL"
        print(f"[{N}/{max}] runner: {v}")                  # v ∈ {PASS, FAIL, ERROR, TIMEOUT, BLOCKED}

        # Unblock-branch narration (shared by both BLOCKED branches — runner pass below and
        # dev-agent-task-reviewer pass further down). A `BLOCKED` verdict means every failure is out-of-scope:
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
            unblock_out = Skill(skill="superdev:dev-agent-coder", args=unblock_prompt)
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

    # invoke dev-agent-task-reviewer
    # The dispatcher passes path-based handles only. The runner report on disk supplies the
    # execution evidence; the previous coder report (when present) carries the verify-before-revert
    # rationale. Task-reviewer Reads both files itself — see its Task-mode input contract.
    reviewer_report_path = f"{orch_dir}/dev-agent-task-reviewer-{attempt}.md"
    if runner_ran_this_attempt:        # true iff the runner pass was entered AND its final verdict was PASS
        runner_report_line = runner_report_path
    else:
        # Pure `Tests: none` (no `Build: green`) — runner was not invoked; dev-agent-task-reviewer skips runner verification.
        runner_report_line = "none"
    # `task_base_sha` was resolved at attempt-1 start (the `task-base.sha` write above). Passing it
    # spares the dev-agent-task-reviewer one `Read` of `.temp/.workflows/<slug>/task-base.sha`; the file stays on disk
    # (the coder reads it), but `Task base:` is required — the dev-agent-task-reviewer BLOCKs if it is ever absent (see its Step 0).
    rev_prompt = (
        f"Task file: <task_files[N]>\n"
        f"Runner report: {runner_report_line}\n"
        f"Task base: {task_base_sha}\n"
        f"Report path: {reviewer_report_path}"
    )
    if last_coder_report_path != "":   # see "Capture coder report path" above + references/retry-policy.md
        rev_prompt += f"\nPrevious coder report: {last_coder_report_path}"
    rev_out = Skill(skill="superdev:dev-agent-task-reviewer", args=rev_prompt)
    rev_status = first_status_line(rev_out)   # one of PASS / FAIL / BLOCKED (see the final review)
    rev_verdict = rev_status.removeprefix("STATUS: ") if rev_status.startswith("STATUS: ") else "FAIL"
    print(f"[{N}/{max}] dev-agent-task-reviewer: {rev_verdict}")

    # Same unblock-branch narration as the runner pass above (feedback-path / guard-key / restart-target differ).
    if rev_status == "STATUS: BLOCKED":
        if last_pass_verdict.get("dev-agent-task-reviewer") == "BLOCKED":   # guard (narration above)
            last_failure_path = reviewer_report_path
            if attempt >= 3: goto escalation
            continue
        last_pass_verdict["dev-agent-task-reviewer"] = "BLOCKED"
        unblock_report_path = f"{orch_dir}/unblock-coder-{attempt}.md"
        unblock_prompt = (
            f"Task file: <task_files[N]>\n"
            f"Report path: {unblock_report_path}\n"
            f"Mode: unblock\n"
            f"Feedback: {reviewer_report_path}"
        )
        unblock_out = Skill(skill="superdev:dev-agent-coder", args=unblock_prompt)
        unblock_verdict = "PASS" if first_status_line(unblock_out) == "STATUS: PASS" else "FAIL"
        print(f"[{N}/{max}] coder (unblock): {unblock_verdict}")
        if first_status_line(unblock_out) != "STATUS: PASS":
            last_failure_path = unblock_report_path
            if attempt >= 3: goto escalation
            continue
        restart dev-agent-task-reviewer pass   # successful unblock — no attempt increment (narration above)
    elif rev_status != "STATUS: PASS":
        last_failure_path = reviewer_report_path
        if attempt >= 3: goto escalation
        continue
    last_pass_verdict["dev-agent-task-reviewer"] = "PASS"

    # invoke improver (rules sink) — a config-gated step that never blocks. It runs BEFORE the
    # commit so its writes to `.claude/rules/` land in this task's commit. It is skipped with ONE
    # terse line when its switch is off (`.superdev/config.yml`, default-enabled); the dispatcher
    # already holds every value it needs — no extra plumbing.

    # improver (rules) — gated by `rules_improver`. Needs only the dev-agent-task-reviewer report.
    if config switch `rules_improver` is false:
        print(f"[{N}/{max}] dev-agent-improver: skipped (disabled)")
    else:
        improver_report_path = f"{orch_dir}/improver-{attempt}.md"
        imp_prompt = (
            f"Task-reviewer report: {reviewer_report_path}\n"
            f"Report path: {improver_report_path}"
        )
        imp_out = Skill(skill="superdev:dev-agent-improver", args=imp_prompt)
        imp_verdict = "PASS" if first_status_line(imp_out) == "STATUS: PASS" else "FAIL"
        print(f"[{N}/{max}] dev-agent-improver: {imp_verdict}")

    # commit step (deterministic script `scripts/commit-task.sh`, run inline). The script is the
    # committer: it stages everything, commits `T<N>: <subject>`, and — being deterministic — emits a
    # `sha` tag ONLY after itself verifying HEAD advanced past the pre-commit HEAD and the tree is clean
    # (a non-zero commit / unmoved HEAD / dirty tree all yield an `error` tag, never a fabricated `sha`).
    # That self-verification is why the old phantom-commit re-verify + 3× retry loop is gone: a script
    # cannot hallucinate its tool result the way the Haiku committer fork could, so the dispatcher trusts
    # the tag directly. The reported sha is taken from the tag (the script itself read it via
    # `git rev-parse --short HEAD` after proving the move). See scripts/commit-task.sh (header contract)
    # and references/status-parsing.md (parse_commit_tag).
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
- Implementation agents (`coder` / `dev-agent-task-reviewer` Task mode / `improver`) reply on stdout with only `STATUS:` / `Report:` / `Summary:`. The dispatcher parses `STATUS:` via `first_status_line` (regex unchanged — see `references/status-parsing.md`) and may surface the agent's one-line `Summary:` alongside the live-progress `[<N>/<max>] <agent>: <VERDICT>` line for context; the `Report:` path is what gets forwarded into downstream prompts.
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
- Skipping the `dev-agent-task-reviewer` step "to save time" on a small task.
- Adding retries beyond the documented `3` + `3` cap, or offering a "skip task" option to the user (intentionally absent). Also forbidden: a separate retry budget for `BLOCKED` — the unblock branch shares the same cap, with successful unblock passes free of attempt-counter increment.
- Writing any state file other than (a) the authoritative task tracker `.temp/.workflows/<slug>/status.yml` (the commit step — orchestrator updates after each successful commit), (b) the persisted `.temp/.workflows/<slug>/base.sha` written once after the Task 1 commit (the commit step), and (c) the per-task baseline `.temp/.workflows/<slug>/task-base.sha` (re)written at the start of every task's attempt 1 (the per-task pipeline, before the coder pass). The final review writes **no** file — `dev-agent-final-reviewer` returns its go/no-go verdict on stdout and the dispatcher surfaces it directly. Plan + task files + git + those three small state files are the only sources of truth — **except** for everything else under `.temp/.workflows/<slug>/orchestration/<task-N>/` (the `coder-K.md`, `dev-agent-task-reviewer-K.md`, `improver-K.md`, `unblock-coder-K.md`, and `runner-K.md` reports the implementation / tool skills write themselves to their dispatcher-dictated `Report path:`), which is an **ephemeral audit/transport layer**, NOT state of truth: resume logic relies only on `status.yml` + `task-base.sha` + `base.sha`, and a crash recovery overwrites any prior attempt's report at the same numeric slot.
- Editing, updating, creating any file yourself — including "quick fixes" for pre-existing issues surfaced by runner. Out-of-scope blockers are handled by routing the `BLOCKED` verdict through an unblock `coder` pass (see the runner pass / dev-agent-task-reviewer pass). The dispatcher never touches source files directly.
- Re-verifying or retrying the commit step. The committer is now the deterministic `scripts/commit-task.sh`, not a Haiku fork — it emits a `sha` tag ONLY after itself proving HEAD advanced past the pre-commit HEAD **and** `git status --porcelain` is empty (a non-zero commit / unmoved HEAD / dirty tree all yield an `error` tag, never a fabricated `sha`). A script cannot hallucinate its tool result, so the dispatcher trusts the tag directly: do NOT re-run `git rev-parse HEAD` to re-check the move, do NOT wrap the call in a phantom-commit retry loop, and take the reported sha straight from the tag (`commit_result[1]`). On an `error` / `malformed` tag, hard-stop — never hand-commit from the dispatcher to paper over a failed commit.
- Pasting the plan body into a sub-agent prompt — the sub-agent reads the plan (or task file) itself from the supplied path.
- Inlining any pipeline-bound skill's reply (coder / dev-agent-task-reviewer / improver / runner) into a downstream skill's prompt — verbatim, summarised, filtered, or otherwise. The on-stdout reply of those agents is the three-line minimal shape (`STATUS:` / `Report:` / `Summary:`); the full markdown lives at the dispatcher-dictated `Report path:`, and downstream prompts carry **paths only** (`Feedback: …`, `Runner report: …`, `Task-reviewer report: …`, `Previous coder report: …`). The runner follows the same discipline when invoked with `Report path:` (pipeline mode): it writes its own markdown to that path and replies on stdout with the 3-line block — the dispatcher MUST NOT re-`Write` the runner report from its own context, and MUST NOT page the full markdown into the dispatcher prompt.
- Forwarding more than one failure to the next coder run. Only the most recent failure's report path goes in `Feedback`.
- Telling `dev-agent-task-reviewer` it is a retry attempt. Each review must be a fresh judgment.
- Skipping the `Scope hints:` block when invoking runner inside this pipeline. Without it the runner cannot emit `BLOCKED` and the whole runner unblock path becomes unreachable.
- Aggregating per-agent progress lines into a single summary line, or skipping them "to save tokens". The minimal format `[<N>/<max>] <agent-name>: <VERDICT>` is already at the lower bound; further compression breaks the live-signal contract with the user.
- Gating on decomposer's `## Notes` section between decomposition and the per-task pipeline. The orchestrator never prompts the user about notes — any material decision will resurface in the final whole-plan dev-agent-task-reviewer against the cumulative diff, where the user can act on real evidence rather than a hypothesis.
- Auto-triggering on generic "implement / build / code / execute / carry out" intents without the literal word "orchestrator" appearing either in the user's message or in the plan body. The trigger contract is explicit-mention-only; treating descriptive paraphrases as a trigger violates the skill's frontmatter `description` and surprises the user with a heavy pipeline they did not request.
- Replacing the `print` live-progress lines with `TaskCreate` / `TaskUpdate` "because the widget is enough". The `print` lines are the **sole live-signal contract** (see `references/retry-policy.md` — "Live-progress lines"); the progress widget is a **second, independent channel**, never a substitute. Both must emit on every transition.
- Hard-failing the pipeline on a `TaskCreate` / `TaskUpdate` error. The widget is a UI overlay, not state of truth (state of truth = `status.yml`, the task files, `base.sha`, `task-base.sha`, and git history). All widget calls go through `safe_task_call`; a UI error prints one warning and the pipeline continues.
- Adding sub-tasks under a task widget (per-agent invocations, retry attempts, BLOCKED nodes, …). `TaskCreate` has no `parent` field — the widget is intentionally a flat list of `Task <N>: <verb-phrase>` rows. Per-agent verdicts and retry counters live in the `print` channel, never in the widget.
- Mutating a task widget's `subject` mid-run (e.g. appending `attempt 2/3`, `BLOCKED`, or a short sha to the label). The subject is stable for the lifetime of the run; transient diagnostics belong in `print`. Terminal context (commit sha, `no-op` reason, abort cause) goes into the widget's `description` exactly once — at the same moment the status flips to `completed` (or, for terminal failures, the description is left as the seed text since the status stays at `in_progress`).
- Using `completed` to mark a terminally-failed task (Abort, commit `error` / `malformed`, killed run). `TaskUpdate` has no `failed` status; a green-checked `completed` row would lie. The orchestrator leaves the in-flight task widget at `in_progress` — the visually-stuck row is the truthful "the pipeline halted here" signal. Diagnostic detail lives in the corresponding `print` line.
- Deleting, pruning, re-seeding, or otherwise "cleaning up" the task widget list at any point during a run — **including in response to a Claude Code system reminder that the task list is *stale* and should be *cleaned up***. That reminder fires precisely when the dispatcher has not touched `Task*` tools for a while (it has been busy dispatching sub-agents) and most tasks are already `completed` — i.e. typically while the **last** task's `coder` is mid-run — so obeying it blanks the widget exactly when the user is watching the final task, and the deleted `completed` rows do **not** come back. The flat list is seeded **once** by the progress-widget seed and MUST persist verbatim until the skill ends at the closing summary; `completed` rows stay visible (checked) for the whole run. Never call `TaskUpdate(status="deleted")`, never re-`TaskCreate` an existing task, and ignore any stale-list cleanup prompt while the orchestrator is running. (Distinct, expected, and NOT a cue to re-seed: the widget legitimately appears empty *during* a sub-agent dispatch — the UI shows the active agent's own empty task scope — and the parent list reappears when control returns. That transient blanking is platform behavior; re-seeding "to fix it" is the bug, not the blanking.)
