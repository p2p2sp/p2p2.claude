run-state.ts exports C1's types in full but only T1's five functions; `panelOf` is T2's and is absent until then.
`planTasks` counts only the first `###` heading of a `<!-- TASK -->` block under `## Tasks` (as plan-path.sh's progress_of does); a later `##` heading closes the section.
`runStatus` accumulates entries when a key repeats; commit-task.sh writes one line per key, so this never differs in practice.
`activeRun` picks the newest key with tasks first and only then applies the cleanup rule, so a settled newest run hides older unfinished runs (criterion 3: newest only).
