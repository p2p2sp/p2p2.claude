status: fail
a plain task commit of a task whose Files list runs past 32767 chars records the task done (one git call per whole list fails on Windows with 'Argument list too long') | tests/viber/commit-task.test.ts | ENOTEMPTY, Directory not empty (withTempDir cleanup, tests/harness/tmp.ts:21)
