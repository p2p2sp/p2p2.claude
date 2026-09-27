# T2 coder notes

Replaced the `Fed in order` bullet in `viber/agents/planner-review.md`'s Check section with a
single `Wired` bullet: it keeps the original direct-or-transitive missing-dependency check
verbatim in substance, then adds the reverse direction - naming what each `Depends-on` edge's
dependent consumes from its target, Blocking when it consumes nothing. One bullet, one line, net
file growth 0 lines (well inside the +2 budget). Wording deliberately avoids the Ordered rule's
own phrasing ("burns parallelism" etc.) per the task's constraint.

No other file in the repo references "Fed in order" outside this run's own plan/task docs, so no
EXTRA edits were needed.
