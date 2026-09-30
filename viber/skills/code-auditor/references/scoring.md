# Scoring - the rubric, the gate, the cut

## The 1-5 rubric

Impact and Opportunity use the same 1-5 scale, so the product is comparable across files.

Impact - how much it matters:
- 5 core path, many dependents, high churn
- 4 important, several dependents
- 3 moderate reach
- 2 peripheral
- 1 leaf, vendored or generated

Opportunity - how broken or winnable right now:
- 5 clearly broken, a bug magnet, obvious large win
- 4 strong smell, likely issue, real win
- 3 some concern worth a closer look
- 2 minor or unlikely
- 1 clean, nothing to win

Score against the signals, not vibes. High `churn` + high `dependents` pushes Impact up; high `fix_commits` + high `loc` pushes Opportunity up. A scout may override the prior when reading the file says otherwise, but must say why in the reason field.

Scouts emit strict JSON, one object per line, no prose:

```json
{"path":"src/auth/session.js","impact":5,"opportunity":4,
 "impact_reason":"imported by 30 modules, top-5 churn",
 "opportunity_reason":"3 hotfix commits this month, hand-rolled token parsing"}
```

## The gate

```
score = impact x opportunity          # integer 1..25
```

Each axis clears its own threshold independently (default 3 on both):

- impact >= T and opportunity >= T -> HOTSPOT, investigate
- impact >= T and opportunity < T -> already fine, leave it
- impact < T and opportunity >= T -> nobody cares, skip it
- impact < T and opportunity < T -> ignore

Only HOTSPOT files reach a detective. The rest stay on the hotlist so coverage is visible and the user can override the cut.

- A file scoring 5x2 is NOT a hotspot. High impact, nothing to win - chasing it anyway is the most common waste in the whole run.
- Ties on equal `score` break by higher `impact`, then higher `churn`.
- `--top N` caps dispatch, not the record: gate-clearing files beyond N land in `overflow` and stay on the hotlist. Even with 80 files through the gate, dispatch takes the top N and opens new fronts later rather than spending on all at once.
- `degenerate: true` means files were scored and none reached the Opportunity minimum. That is a distinct outcome from a clean repo and must be reported as such, never as "all clear".

## The edge gate

The edge track scores pairs. A contract defect living between two individually-correct files has no single file to attach to, so it gets its own unit of assessment and its own gate.

Verdicts, one per pair from `edge-scout`: `MATCH`, `MISMATCH`, `UNCLEAR`, `NO_CONTRACT`. `NO_CONTRACT` means the shared literal is coincidental - a different claim from `MATCH`, where both sides do share a real contract and agree on it. `MISMATCH` and `UNCLEAR` are dispatch reasons; `MATCH` and `NO_CONTRACT` stay on record and are never dispatched.

The edge track carries no Opportunity axis: Opportunity is a property of a single file, and no one endpoint's Opportunity can stand for the pair. Pairs rank by verdict class first (`MISMATCH` before `UNCLEAR`), then by a pair-Impact computed from both endpoints' churn and dependents - never by a 2x2 quadrant.

Both gates are deterministic scripts (`rank.ts`, `rank_edges.ts`) so the same sweep cuts the same way every time. Their flags and output schemas live in the script headers.
