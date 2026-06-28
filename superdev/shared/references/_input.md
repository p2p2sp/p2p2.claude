# Input contract

The harness delivers your input under an `ARGUMENTS:` line. Read:

```
Plan: <absolute path to the original plan file>
Diff range: <base_sha>..HEAD
Diff file: <absolute path to the materialized cumulative patch>
```

`Diff file:` is the authoritative reviewed change (`git diff <base>..HEAD` for the whole plan). If `Diff file:` is absent or its path does not exist, reply `STATUS: FAIL` with a one-line reason naming the missing patch and stop.
