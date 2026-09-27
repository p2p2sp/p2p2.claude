# T4 coder notes

- C1 (the redundant-dependency check in plan-index.sh, including its `--split` exemption) was
  already delivered by T1 (prior task); T4 only needed the `plan-rules.md` wiring, so
  `viber/scripts/plan-index.sh` was read-only here and carries no diff from this task.
- The Owned rule's existing sentence ("A shape two tasks need is written by the first one that
  cannot deliver without it.") was extended in place rather than split, per DoD.1's "no new
  bullet for it".
- The new `Minimal` bullet's wording is a near-verbatim echo of the task's own `Delivers` text,
  which is what keeps it aligned with what C1 actually rejects.
