# Changelog entry format

## Template

```
# <Title>

- Date: <YYYY-MM-DD>
- Run: <workdir basename>
- Commits: <base SHA>..<HEAD SHA>
- ADR: <path>            (only when an ADR was written for this run)
- Areas: <a>, <b>

## What changed
<prose, confirmed against the code>

## Why
<the chosen approach, rejected alternatives, and why>

## Decisions
- <load-bearing decision 1>
- <load-bearing decision 2> (ADR: <path>)

## Deviations from plan
<one line per deviation with its why, or "no deviations">
```

## Index line

Prepended to `docs/changelog/README.md`, directly after the `# Changelog` heading block:

```
- <YYYY-MM-DD> - [<Title>](<YYYY-MM-DD>-<slug>.md) - <areas>
```

## Worked example

```
# Add retry backoff to the sync worker

- Date: 2026-09-07
- Run: 2026-09-07-add-retry-backoff-to-the-sync-worker
- Commits: a1b2c3d..e4f5a6b
- ADR: docs/adr/20260907140501-exponential-backoff-strategy.md
- Areas: superdev/scripts, tests/superdev

## What changed
`sync-run.sh` now retries a failed push up to 5 times with exponential
backoff (1s, 2s, 4s, 8s, 16s) instead of failing on the first error. The
retry loop lives in a new `retry_with_backoff()` helper shared by both the
push and pull paths.

## Why
Transient network failures were surfacing as hard build failures with no
recovery path. Retrying immediately (flat interval) was considered and
rejected - it hammers a still-recovering endpoint; exponential backoff
was chosen to give the remote room to recover, capped at 5 attempts so a
genuinely broken remote still fails fast enough to report.

## Decisions
- Retry lives in a shared helper, not duplicated per call site (ADR: docs/adr/20260907140501-exponential-backoff-strategy.md)
- Cap fixed at 5 attempts rather than made configurable - no caller needed a different cap

## Deviations from plan
no deviations
```

## Never write these

- Raw task narration ("Task 3 did X, Task 4 did Y") - the entry describes the shipped change, not the build's steps.
- A file-by-file listing - that duplicates `## capture`'s `### Files` blocks and adds nothing; describe behavior instead.
- Marketing tone ("blazing fast", "seamless", "powerful") - flat, factual prose only.
- Links to run files that will be cleaned up (`docs/.workflows/...` paths, the intent file, the spec) - those are removed once the run is gated closed; link only to durable artifacts (an ADR under `docs/adr/`).
</content>
