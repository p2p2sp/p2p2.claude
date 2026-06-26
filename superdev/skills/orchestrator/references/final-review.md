# Final whole-plan review

Detail reference for the one-shot terminal gate run after the per-task pipeline completes. The orchestrator delegates the whole review to `superdev:agent-final-reviewer` (which fans out **six parallel lenses** → synthesis), **returns one go/no-go verdict on stdout**, and **writes** `.temp/.workflows/<slug>/final-review.md`. The orchestrator materializes the cumulative patch the four code-quality lenses need and passes its path; it does NOT write the report itself.

## When it runs

- After the per-task pipeline reaches the end of the task list with a successful commit on the last task.
- OR when the starting-task resolution detects the `current_task > max` sentinel (every task already committed in a prior session) and sets `start = current_task` — the widget seed marks every task `completed`, the per-task loop is empty, and control flows into the final review.

The verdict covers the implementation as a whole against the plan's outcome intent, every task file's `## Deliverable` + `## Tests`, and the cumulative diff's code quality / architecture / testing / production readiness — inside the six lenses, not here.

## Resolve `base_sha` + materialize `plan.diff`

Priority for `base_sha` — **first applicable wins**:

1. **Persisted `.temp/.workflows/<slug>/base.sha`** — written after the Task 1 commit. Authoritative for any run that started fresh from Task 1 in this slug. Cross-session safe (survives on disk).
2. **`git merge-base HEAD main`** — last resort for runs that never persisted `base.sha` (e.g. started at `task=N>1` in a fresh repo with no Task 1 commit). The range may then include unrelated commits.

```
persisted_base_path = ".temp/.workflows/<slug>/base.sha"
if exists(persisted_base_path):
    base_sha = Read(persisted_base_path).strip()
else:
    base_sha = git merge-base HEAD main   # last resort: base.sha was never persisted
head_sha = git rev-parse HEAD

diff_path = ".temp/.workflows/<slug>/plan.diff"          # ephemeral transport, NOT truth
bash(f'git diff {base_sha}..{head_sha} > "{diff_path}"')  # the patch the 4 quality lenses scope to
```

`plan.diff` is the cumulative `base..HEAD` patch — ephemeral (like the `orchestration/` reports), regenerated every run, never read back by resume logic.

## Invoke `agent-final-reviewer` (one-shot) and surface the verdict

Invoke `superdev:agent-final-reviewer` **exactly once**, passing the plan path, diff range, patch path, and report path. It fans out its six lenses, synthesizes, writes the report, and returns `STATUS: PASS` (go) or `STATUS: FAIL` (no-go) on stdout with a per-lens breakdown.

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

Surface `final_out` (verdict + per-lens breakdown) verbatim as the terminal result, and point the user at `report_path` for the full "what to fix" backlog. The breakdown may show `N/A` for the runtime gate (`agent-runner` when the host documents no suite) — `N/A` is **non-blocking** (PASS-eligible) in `agent-final-reviewer`'s synthesis, so it does not imply a no-go. The orchestrator parses only the synthesized `PASS`/`FAIL` first line; it never branches on a lens's `N/A`. The widget shows every task `completed` (or, on a halted run, the in-flight task at `in_progress`); no plan-level flip needed.

## Notes

- **One-shot and terminal.** Invoked exactly once; its synthesized verdict is surfaced and the orchestrator stops. **No retry loop**, no `AskUserQuestion`, no improver invocation here — the per-task improver pass already promoted task-level learnings. Project-level follow-ups belong in a new `interview` cycle the user starts after reading the verdict + the `final-review.md` backlog.
- `agent-final-reviewer` owns the retry-free internal fan-out (six lenses → synthesis → report); the orchestrator only resolves `base_sha`, materializes `plan.diff`, invokes it, and relays the result.
- `base_sha` comes from the persisted `base.sha`, which survives across sessions — intentional, since a plan may execute across several sessions (via `task=N` resume) and the final review covers the plan **as a whole**.
- The `git merge-base HEAD main` fallback is used only when `base.sha` was never persisted; the range will then include any unrelated commits since divergence — flag this in the relayed verdict if detectable.
- **The report is written by the fork, not the dispatcher.**

## Anti-patterns specific to the final review

- Skipping the final review when the run started with `task=N>1`. It covers the whole plan, and `base_sha` resolution works cross-session.
- Looping `agent-final-reviewer` after a non-`PASS` verdict. One-shot; the user reads the verdict + report and decides whether to re-plan or fix manually.
- Invoking the `improver` agent after the final review. Final-review learnings are not promoted; the per-task improver pass (inside the workflow) is the only learnings channel.
- Wiring the `coder` agent into the final-review failure path. Plan-level `FAIL` is a project-level issue → a fresh `interview` / re-plan cycle, not a cosmetic coder pass. Always escalate to the user.
- Writing `final-review.md` from the dispatcher. Authored by the fork; the dispatcher only materializes `plan.diff` and passes `Report path:` + `Diff file:`.
- Running any lens (`agent-plan-auditor` / the four `agent-*-auditor` / `agent-runner`) directly from the orchestrator, or invoking the per-task `task-reviewer` for the whole-plan review. The whole-plan gate is `agent-final-reviewer`, invoked once; it owns its internal fan-out.
- Expecting `agent-final-reviewer` to inspect the working tree, or omitting `Diff file:`. After per-task commits the tree is clean — the cumulative change is the `plan.diff` patch over `base_sha..HEAD`, which the four quality lenses read.
