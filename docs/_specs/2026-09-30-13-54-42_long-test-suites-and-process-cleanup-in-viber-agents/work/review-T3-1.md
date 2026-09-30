Blocking

- viber/agents/test-runner.md:47-50 (DoD.1-3 otherwise met; DoD.4 and DoD.5 hold; Verification passes: counts 1 and 3, no "explicit generous timeout"). The Log step says only "Delete it before the run starts" and never creates `.temp/viber/test-runner/`. On a fresh host the directory does not exist. Then `<test command> > <log> 2>&1` fails on the redirect and so does `echo "exit=$?" >> <log>`. No `exit=` line is ever written and the wait loop repeats forever, because the section says to repeat the wait and there is no cap. Fix: in the Log bullet, say to create the log's directory (for example `mkdir -p .temp/viber/test-runner`) and delete any old log before the run. C2 is silent on this, but the section must not hang on a missing directory.

Minor

- None.
