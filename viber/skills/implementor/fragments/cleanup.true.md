Dispatch `viber:closeout` (Agent tool) carrying one line and nothing else:

```
run: <dir>
```

Carry its `DRIFT:` and `PATH:` lines to the final summary. `VERDICT: DENIED` -> `AskUserQuestion`: retry / accept, `accept` then read as `BLOCKED`. `VERDICT: BLOCKED` -> no archive commit landed; name its `REASON:` in the final summary, plus, on a `DRIFT:` other than `none`, that `<dir>/spec.md` holds uncommitted drift markers, and that a failed git step may have left the run moved but uncommitted (`git status` shows it).

Continue.
