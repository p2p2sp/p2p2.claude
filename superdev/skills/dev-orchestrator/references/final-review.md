# Final whole-plan review

Detail reference for the one-shot terminal gate run after the per-task pipeline completes. The orchestrator delegates the whole review to the `superdev:dev-agent-final-reviewer` sub-orchestrator, which internally runs `dev-agent-plan-auditor` → `dev-agent-runner` (Scope: full) → `dev-agent-smoke` → synthesis and **returns one go/no-go verdict on stdout**. The orchestrator writes no file at this stage.

## When it runs

- After the per-task pipeline reaches the end of the task list with a successful commit on the last task.
- OR when the starting-task resolution detects the `current_task > max` sentinel in `status.yml` (every task was already committed in a prior session) and sets `start = current_task` — the progress-widget seed then marks every task already `completed`, the per-task loop is empty, and control flows naturally into the final review.

The verdict that `dev-agent-final-reviewer` returns covers the implementation as a whole against the plan's outcome intent and every task file's `## Deliverable` + `## Tests` — that work happens inside the sub-orchestrator, not here.

## Resolve `base_sha`

The orchestrator resolves the diff range and hands it to `dev-agent-final-reviewer` as a `Diff range:` line. Priority order — **first applicable wins**:

1. **Persisted `.temp/.workflows/<slug>/base.sha`** — written after the Task 1 commit. Authoritative for any run that started fresh from Task 1 in this slug. Cross-session safe (it survives on disk across sessions).
2. **`git merge-base HEAD main`** — last-resort fallback for runs that never persisted `base.sha` (e.g. an unusual run that started at `task=N>1` in a fresh repo with no Task 1 commit). The diff range may then include unrelated commits since the branch diverged.

```
persisted_base_path = ".temp/.workflows/<slug>/base.sha"
if exists(persisted_base_path):
    base_sha = Read(persisted_base_path).strip()
else:
    base_sha = git merge-base HEAD main   # last resort: base.sha was never persisted
head_sha = git rev-parse HEAD
```

## Invoke `dev-agent-final-reviewer` (one-shot) and surface the verdict

Invoke `superdev:dev-agent-final-reviewer` **exactly once**, passing the plan path and the resolved diff range. It runs its internal `dev-agent-plan-auditor` → `dev-agent-runner` (Scope: full) → `dev-agent-smoke` → synthesis pipeline and returns `STATUS: PASS` (go) or `STATUS: FAIL` (no-go) on stdout with a sub-step breakdown. There is no template to pass, no `Output template:` line, and no file to write.

```
final_prompt = (
    "Plan: <plan-path>\n"
    "Diff range: " + base_sha + ".." + head_sha
)
final_out = Skill(skill="superdev:dev-agent-final-reviewer", args=final_prompt)
final_status = first_status_line(final_out)
final_verdict = final_status.removeprefix("STATUS: ") if final_status.startswith("STATUS: ") else "FAIL"
print(f"[final] dev-agent-final-reviewer: {final_verdict}")
report final_out and stop the skill
```

Surface `final_out` (the verdict line plus the sub-step breakdown) to the user verbatim as the terminal result. The relayed sub-step breakdown may show `N/A` for a runtime gate (`dev-agent-runner` / `dev-agent-smoke` when the host documents no suite / launch command) — `N/A` is **non-blocking** (PASS-eligible) in `dev-agent-final-reviewer`'s synthesis, so a relayed `N/A` does not imply a no-go. The orchestrator still parses only the synthesized `PASS`/`FAIL` first line (unchanged); it never parses or branches on a sub-step's `N/A`. The widget at this point shows every task widget as `completed` (or, on a halted run, the in-flight task still at `in_progress`); no plan-level flip is needed.

## Notes

- The final review is **one-shot and terminal**. `dev-agent-final-reviewer` is invoked exactly once; its synthesized verdict (`PASS` go / `FAIL` no-go) is surfaced and the orchestrator stops. There is **no retry loop**, no `AskUserQuestion`, no improver invocation at this stage — the per-task improver pass already promoted task-level learnings. Project-level follow-ups belong in a new `interview` cycle started by the user after reading the verdict.
- `dev-agent-final-reviewer` owns the retry-free internal pipeline (`dev-agent-plan-auditor` → full-suite `dev-agent-runner` → `dev-agent-smoke`); the orchestrator only resolves `base_sha`, invokes it, and relays the result. Do not duplicate any of those sub-steps here.
- `base_sha` comes from the persisted `.temp/.workflows/<slug>/base.sha`, which survives on disk across sessions. This is intentional: a plan may have been executed across several sessions (via `task=N` resume), and the final review covers the plan **as a whole**.
- The fallback `git merge-base HEAD main` is used only when `base.sha` was never persisted (e.g. an unusual run that started at `task=2` in a fresh repo with no Task 1 commit). In that case the diff range will include any unrelated commits since the branch diverged — flag this to the user in the relayed verdict if detectable.
- **No file is written.** `dev-agent-final-reviewer` returns its verdict directly on stdout; there is no `final-review.md` (or any other artifact) anymore. The user reads the relayed verdict to decide whether to ship, fix, or re-plan.

## Anti-patterns specific to the final review

- Skipping the final review when the run started with `task=N>1`. The final review covers the whole plan, and `base_sha` resolution works cross-session.
- Looping `dev-agent-final-reviewer` after a non-`PASS` verdict. The final review is one-shot; the user reads the relayed verdict and decides whether to re-plan or fix manually.
- Invoking `improver` after the final review. Final-review learnings are not promoted to `.claude/rules/`; the per-task `improver` pass is the only learnings channel.
- Wiring `coder` into the final-review failure path. Plan-level `FAIL` indicates a project-level issue — it belongs in a fresh `interview` / re-plan cycle, not in a cosmetic coder pass. Always escalate to the user.
- Writing a `final-review.md` (or any file) at this stage. The verdict is returned on stdout by `dev-agent-final-reviewer` and relayed verbatim — there is no on-disk artifact.
- Running any of `dev-agent-final-reviewer`'s sub-steps (`dev-agent-plan-auditor` / `dev-agent-runner` / `dev-agent-smoke`) directly from the orchestrator, or invoking `dev-agent-task-reviewer` for the whole-plan review. The whole-plan gate is `dev-agent-final-reviewer`, invoked once; it owns its internal pipeline.
- Passing the cumulative diff inline, or expecting `dev-agent-final-reviewer` to inspect the working tree. After per-task commits the working tree is clean — hand it the `base_sha..HEAD` range only.
