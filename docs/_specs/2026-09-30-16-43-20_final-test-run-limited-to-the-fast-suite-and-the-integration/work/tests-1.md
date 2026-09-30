status: fail
a repeated stem is counted by the literal the colliding group lockstep-extends to | tests/viber/collect_signals.test.ts | AssertionError [ERR_ASSERTION]: stderr: sweep extensions: md ts null !== 0
a path that runs out of segments while still colliding gets dependents -1 and dependents_stem null | tests/viber/collect_signals.test.ts | AssertionError [ERR_ASSERTION]: stderr: sweep extensions: md ts null !== 0
a plain task commit of a task whose Files list runs past 32767 chars records the task done (one git call per whole list fails on Windows with 'Argument list too long') | tests/viber/commit-task.test.ts | AssertionError [ERR_ASSERTION]: stderr: git: Argument list too long (34868 chars) 5 !== 0
--landed of a task whose Files list runs past 32767 chars records the task done (one git call per whole list fails on Windows with 'Argument list too long') | tests/viber/commit-task.test.ts | AssertionError [ERR_ASSERTION]: stderr: git: Argument list too long (34945 chars) 126 !== 0
7 seconds ago reads as 7s | tests/viber/run-clock.test.ts | AssertionError [ERR_ASSERTION]: got "elapsed: 9s\n", expected elapsed: 7s (or elapsed: 8s)
59 seconds ago reads as 59s | tests/viber/run-clock.test.ts | AssertionError [ERR_ASSERTION]: got "elapsed: 1m 01s\n", expected elapsed: 59s (or elapsed: 1m 00s)
65 seconds ago reads as 1m 05s | tests/viber/run-clock.test.ts | AssertionError [ERR_ASSERTION]: got "elapsed: 1m 07s\n", expected elapsed: 1m 05s (or elapsed: 1m 06s)
a further argument is ignored | tests/viber/run-clock.test.ts | AssertionError [ERR_ASSERTION]: got "elapsed: 2h 14m 05s\n"
