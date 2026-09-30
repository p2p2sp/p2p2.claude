Every test-runner dispatch of this step carries one more line:

```
baseline: <dir>/work/tests-baseline.md
```

On the last test-runner return of this step:

- `KNOWN: <n>` -> one final-summary line: `<n>` failures recorded in `<dir>/work/tests-baseline.md` still fail.
- `BASELINE: none` -> one final-summary line: the run has no recorded baseline.
