# Review T3 - round 1

Verification: ran as written, exit 0 (task-coder.md is 57 lines).

## Blocking

1. viber/skills/implementor/SKILL.md:117 and :130 - DoD.5 / Delivers ("every fresh coder re-run carries on `resume:` each `EXTRA:` path the task's earlier instances returned") is not met for the `WAIT:` re-dispatch. Line 117 lists the re-runs that get the `resume:` line as "a review failure, `retry`, `decide`", which reads as a closed list. The `WAIT:` bullet at :130 says only "dispatch its coder fresh at the same tier". It is not a `retry`, since `retry` raises the tier, and nothing else ties it to the :117 rule. Here is how that breaks: a coder edits unmapped file X (clean at that point, so X goes on `EXTRA:`), then finds unmapped file Y dirty and returns `WAIT: Y`. The fresh instance starts without X on `resume:`. At task-coder.md:25 it then sees X as "carrying changes and absent from your `resume` line" and returns `WAIT: X` for its own predecessor's work. That costs a wasted hold and can then escalate to an ordinary failure. Fix: add the `WAIT:` hold to the :117 enumeration, e.g. "a review failure, a `WAIT:` hold, `retry`, `decide`". Or state in the :130 bullet that the fresh dispatch carries the `resume:` line from :117.
