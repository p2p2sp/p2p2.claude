Baseline, only when no task on the index is `done` and the index carries no `dirty:` line: before the first task dispatch, dispatch `viber:test-runner` once, with no `model`, carrying:

```
<dir>/work/tests-baseline.md
mode: baseline
```

Dispatch no task until it returns, then:

- `VERDICT: PASS` or `VERDICT: SKIP` -> go on, asking nothing.
- `VERDICT: FAIL` -> `AskUserQuestion` naming its `REPORT` path, and saying the build failed and no test ran when `BUILD: failed` came back: continue (go on with the tasks) / abort.
- `VERDICT: DENIED` -> `AskUserQuestion`: retry / accept / abort, `accept` going on with no baseline.

Every coder and reviewer dispatch of this step, whether or not this session ran the baseline, carries one more line:

```
baseline: <dir>/work/tests-baseline.md
```
