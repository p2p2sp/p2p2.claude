# Final whole-plan review

Detail reference for the one-shot terminal gate run after the per-task pipeline completes. The orchestrator delegates the whole review to the `superdev:agent-final-reviewer` sub-orchestrator, which fans out **six parallel lenses** (`agent-plan-auditor` + `agent-code-quality-auditor` + `agent-architecture-auditor` + `agent-testing-auditor` + `agent-production-readiness-auditor` + `agent-runner` Scope: full) → synthesis, **returns one go/no-go verdict on stdout**, and **writes** `.temp/.workflows/<slug>/final-review.md`. The orchestrator materializes the cumulative patch the four code-quality lenses need and passes its path; it does NOT write the report itself.

## When it runs

- After the per-task pipeline reaches the end of the task list with a successful commit on the last task.
- OR when the starting-task resolution detects the `current_task > max` sentinel in `status.yml` (every task was already committed in a prior session) and sets `start = current_task` — the progress-widget seed then marks every task already `completed`, the per-task loop is empty, and control flows naturally into the final review.

The verdict that `agent-final-reviewer` returns covers the implementation as a whole against the plan's outcome intent, every task file's `## Deliverable` + `## Tests`, and the cumulative diff's code quality / architecture / testing / production readiness — that work happens inside the six lenses, not here.

## Resolve `base_sha` + materialize `plan.diff`

The orchestrator resolves the diff range, then materializes the cumulative patch the code-quality lenses read (they have no `Bash` to compute `git diff` themselves). Priority order for `base_sha` — **first applicable wins**:

1. **Persisted `.temp/.workflows/<slug>/base.sha`** — written after the Task 1 commit. Authoritative for any run that started fresh from Task 1 in this slug. Cross-session safe (it survives on disk across sessions).
2. **`git merge-base HEAD main`** — last-resort fallback for runs that never persisted `base.sha` (e.g. an unusual run that started at `task=N>1` in a fresh repo with no Task 1 commit). The diff range may then include unrelated commits since the branch diverged.

```
persisted_base_path = ".temp/.workflows/<slug>/base.sha"
if exists(persisted_base_path):
    base_sha = Read(persisted_base_path).strip()
else:
    base_sha = git merge-base HEAD main   # last resort: base.sha was never persisted
head_sha = git rev-parse HEAD

diff_path = ".temp/.workflows/<slug>/plan.diff"          # ephemeral transport artifact, NOT state of truth
bash(f'git diff {base_sha}..{head_sha} > "{diff_path}"')  # the patch the 4 quality lenses scope to
```

`plan.diff` is the cumulative `base..HEAD` patch. It is ephemeral (like the `orchestration/` reports) — not a source of truth, regenerated every run, never read back by resume logic.

## Invoke `agent-final-reviewer` (one-shot) and surface the verdict

Invoke `superdev:agent-final-reviewer` **exactly once**, passing the plan path, the resolved diff range, the patch path, and the report path. It fans out its six lenses, synthesizes, writes the report, and returns `STATUS: PASS` (go) or `STATUS: FAIL` (no-go) on stdout with a per-lens breakdown.

```
report_path = ".temp/.workflows/<slug>/final-review.md"
final_prompt = (
    "Plan: <plan-path>\n"
    "Diff range: " + base_sha + ".." + head_sha + "\n"
    "Diff file: " + diff_path + "\n"
    "Report path: " + report_path
)
final_out = Skill(skill="superdev:agent-final-reviewer", args=final_prompt)
final_status = first_status_line(final_out)
final_verdict = final_status.removeprefix("STATUS: ") if final_status.startswith("STATUS: ") else "FAIL"
print(f"[final] agent-final-reviewer: {final_verdict} (report: {report_path})")
report final_out and stop the skill
```

Surface `final_out` (the verdict line plus the per-lens breakdown) to the user verbatim as the terminal result, and point them at `report_path` for the full prioritized "what to fix" backlog. The relayed breakdown may show `N/A` for the runtime gate (`agent-runner` when the host documents no suite) — `N/A` is **non-blocking** (PASS-eligible) in `agent-final-reviewer`'s synthesis, so a relayed `N/A` does not imply a no-go. The orchestrator parses only the synthesized `PASS`/`FAIL` first line (unchanged); it never parses or branches on a lens's `N/A`. The widget at this point shows every task widget as `completed` (or, on a halted run, the in-flight task still at `in_progress`); no plan-level flip is needed.

## Notes

- The final review is **one-shot and terminal**. `agent-final-reviewer` is invoked exactly once; its synthesized verdict (`PASS` go / `FAIL` no-go) is surfaced and the orchestrator stops. There is **no retry loop**, no `AskUserQuestion`, no improver invocation at this stage — the per-task improver pass already promoted task-level learnings. Project-level follow-ups belong in a new `interview` cycle started by the user after reading the verdict **and the `final-review.md` "what to fix" backlog**.
- `agent-final-reviewer` owns the retry-free internal fan-out (six lenses → synthesis → report); the orchestrator only resolves `base_sha`, materializes `plan.diff`, invokes it, and relays the result. Do not duplicate any of those lenses here.
- `base_sha` comes from the persisted `.temp/.workflows/<slug>/base.sha`, which survives on disk across sessions. This is intentional: a plan may have been executed across several sessions (via `task=N` resume), and the final review covers the plan **as a whole**.
- The fallback `git merge-base HEAD main` is used only when `base.sha` was never persisted (e.g. an unusual run that started at `task=2` in a fresh repo with no Task 1 commit). In that case the diff range will include any unrelated commits since the branch diverged — flag this to the user in the relayed verdict if detectable.
- **The report is written by the fork, not the dispatcher.** `agent-final-reviewer` writes `final-review.md` to the `Report path:` the orchestrator hands it; the orchestrator writes only the ephemeral `plan.diff` and never the report. The user reads the relayed verdict + the report to decide whether to ship, fix, or re-plan.

## Anti-patterns specific to the final review

- Skipping the final review when the run started with `task=N>1`. The final review covers the whole plan, and `base_sha` resolution works cross-session.
- Looping `agent-final-reviewer` after a non-`PASS` verdict. The final review is one-shot; the user reads the relayed verdict + the report and decides whether to re-plan or fix manually.
- Invoking the `improver` agent after the final review. Final-review learnings are not promoted to `.claude/rules/`; the per-task improver pass (inside the workflow) is the only learnings channel.
- Wiring the `coder` agent into the final-review failure path. Plan-level `FAIL` indicates a project-level issue — it belongs in a fresh `interview` / re-plan cycle, not in a cosmetic coder pass. Always escalate to the user.
- Writing `final-review.md` from the dispatcher. The report is authored by the `agent-final-reviewer` fork; the dispatcher only materializes `plan.diff` and passes `Report path:` + `Diff file:`.
- Running any of `agent-final-reviewer`'s lenses (`agent-plan-auditor` / the four `agent-*-auditor` / `agent-runner`) directly from the orchestrator, or invoking the per-task `task-reviewer` agent for the whole-plan review. The whole-plan gate is `agent-final-reviewer` (a skill), invoked once; it owns its internal fan-out.
- Expecting `agent-final-reviewer` to inspect the working tree, or omitting the `Diff file:`. After per-task commits the working tree is clean — the cumulative change is the `plan.diff` patch over the `base_sha..HEAD` range, which the orchestrator materializes and the four quality lenses read.
