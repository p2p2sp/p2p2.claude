# Final review - slice 1 (T1, T2, T3, T4, T5)

## Blocking

### 1. The running set outlives its run: a later run's pending tasks show as `running`

- Location: `viber/hooks/register.tsx:53` (`const running = new Set<string>()`), `viber/hooks/register.tsx:62` (`run = loaded` in `refresh`), `viber/hooks/register.tsx:88` (`running.add(id)`)
- What is wrong: `running` holds bare task ids (`dispatchedTaskId` returns `T2`, not a run-qualified id). It is never cleared or pruned, and nothing scopes it to the run that dispatched it. When one session builds run A (its coders and reviewers dispatched for T1..Tn) and then plans and builds run B, B's tasks with the same ids are pending, not done or skipped, so `panelOf(run, [...running])` (`viber/hooks/panel/run-state.ts:146-157`) ranks them `running` before any of B's own coders is dispatched. The button count stays right, but the pane misreports state.
- Proof: spec Glossary "Running task - a task of the active run whose coder or reviewer was dispatched in this session"; acceptance criterion 6 and S3 (`Given an active run whose task T2 is pending / When the session dispatches ... task: <run>/tasks/T2.md / Then T2 shows as running`). Run B's T1 was never dispatched, yet it shows `running`. `work/T4-coder.md` says it outright: "`running` is never pruned".
- Fix: tie the running set to the active run. In `refresh`, after `const loaded = await loadRun($)` and the `seq` check, clear `running` when `loaded?.key` differs from the previous `run?.key` (this includes the run turning null). Alternatively, save the run key with each id when the `Agent` hook adds it, and pass `panelOf` only the ids saved under the current `run.key`. Both keep criterion 6 for the active run and drop ids left over from an earlier run.
