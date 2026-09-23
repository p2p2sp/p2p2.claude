Node was at 11942/12000 chars before editing (only 58 chars of headroom), so the
`Exclusive:` bullet rewrite had to be net-shorter than it read: dropped the "one of the
plan's two optional fields (`Repro:` the other)" aside, since `Repro:` is already covered
elsewhere in the node (the `status.md` `dirty:` bullet) and wasn't required by this task's
DoD. Final count: 11978/12000.

Verified `plan-index.sh`'s C1 leaf check (added by T1) already emits the exact phrase
"no task may depend on it" the verification grep expects - nothing to add there.

Pre-existing dirty `tests/viber/merge-settings.test.ts` left untouched, as T1 also reported.
