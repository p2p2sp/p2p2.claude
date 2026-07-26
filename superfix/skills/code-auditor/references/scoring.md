# Scoring - the 1-5 rubric, the gate, and the hotlist

## The 1-5 rubric

Both Impact and Opportunity are scored on the same 1-5 scale so the product is comparable across files. Anchors:

| Score | Impact (how much it matters) | Opportunity (how broken / winnable now) |
|---|---|---|
| **5** | Core path, many dependents, high churn | Clearly broken / a bug-magnet / obvious large win |
| **4** | Important, several dependents | Strong smell, likely issue, real win |
| **3** | Moderate reach | Some concern worth a closer look |
| **2** | Peripheral | Minor / unlikely |
| **1** | Leaf / vendored / generated | Clean, nothing to win |

Score against the **signals**, not vibes. Use the signal line as the prior: high `churn` + high `dependents` pushes Impact up; high `fix_commits` + high `loc`/complexity pushes Opportunity up. The scout may override the prior if reading the file says otherwise, but it must say why in the reason field.

Scouts emit strict JSON, one object per line, no prose:

```json
{"path":"src/auth/session.js","impact":5,"opportunity":4,
 "impact_reason":"imported by 30 modules, top-5 churn",
 "opportunity_reason":"3 hotfix commits this month, hand-rolled token parsing"}
```

## The combine formula

```
score = impact × opportunity          # integer 1..25
```

Quadrant (the 2×2), using a threshold T (default 3):

- `impact >= T AND opportunity >= T`  → **HOTSPOT** (top-right) → investigate
- `impact >= T AND opportunity <  T`  → **already-fine** → leave it
- `impact <  T AND opportunity >= T`  → **nobody-cares** → skip it
- `impact <  T AND opportunity <  T`  → **ignore**

Only HOTSPOT files are dispatched to detectives. Keep the others in the hotlist output (greyed out) so the user can see coverage and override the cut.

## Tie-breaking & caps
- Break equal `score` ties by higher `impact` first, then higher `churn`.
- `--top N` caps **dispatch**, not the record: gate-clearing files beyond N land in `overflow`, not off the
  hotlist. Even if 80 files clear the gate, dispatch starts with the top N and opens new fronts later
  (Phase 6) rather than spending on all at once - but every gate-clearing file is still visible in
  `hotlist.json` / `hotlist.md`.
- A file that scores 5×2 is NOT a hotspot - high impact but nothing to win. Resist the urge to investigate it just because impact is high. That is the "leave it" cell, and chasing it is the most common waste.

## Hotlist schema (`hotlist.json`)

```json
{
  "run_id": "2026-06-26-bugs",
  "job": "reliability/bugs",
  "min_impact": 3,
  "min_opportunity": 3,
  "top": 18,
  "counts": {"scored": 42, "hotspots": 18, "overflow": 2, "skipped": 22},
  "opportunity_histogram": {"1": 14, "2": 8, "3": 6, "4": 8, "5": 6},
  "degenerate": false,
  "hotspots": [
    {"rank":1,"path":"src/billing/PricingCards.tsx","impact":5,"opportunity":5,
     "score":25,"quadrant":"HOTSPOT","reason":"high impact, high churn"}
  ],
  "overflow": [
    {"rank":19,"path":"src/checkout/Refunds.tsx","impact":4,"opportunity":4,
     "score":16,"quadrant":"HOTSPOT","reason":"cleared the gate, beyond --top"}
  ],
  "skipped": [
    {"path":"src/legal/Terms.tsx","impact":2,"opportunity":2,"score":4,
     "quadrant":"ignore","reason":"low impact, low churn"}
  ]
}
```

`run_id` and `job` are populated verbatim from the `--run-id` / `--job` flags Phase 3 passes. `min_impact` and
`min_opportunity` are the two independent gates each axis must clear on its own (see the combine formula
above) - there is no single `threshold` scalar. `impact` and `opportunity` on every row are clamped to the
1..5 rubric range even when a scout emits a score outside it.

`counts` records the four-way split of every scored file, and its members always sum to `counts.scored`:
`hotspots + overflow + skipped == scored`. `overflow` holds rows that cleared the gate exactly like
`hotspots` but sit beyond the `--top` cap, so they are not dispatched - see Tie-breaking & caps. `hotspots`
and `overflow` rows carry `rank`; `skipped` rows do not.

`opportunity_histogram` counts every scored row by its clamped `opportunity` value, keys `"1"` through `"5"`
in order; its values always sum to `counts.scored`. `degenerate` is `true` when at least one file was scored
and none reached `min_opportunity` - the per-file sweep found nothing to act on. An empty run (`scored: 0`)
is not degenerate, it is empty: `degenerate` is `false` and the histogram is all zeros. When `degenerate` is
`true`, `hotlist.md` carries one `DEGENERATE OPPORTUNITY DISTRIBUTION` line naming the gate and the max
opportunity actually reached - a zero-hotspot run must say so instead of reading as "all clear" (see the edge
gate below, which exists for exactly this case).

`hotlist.md` renders the same data as ranked tables: a hotspots table, an `<details>` overflow table when
`overflow` is non-empty, and an `<details>` skipped table when `skipped` is non-empty, plus a summary line
naming both minimums:

```
#  Component                     Impact  Opportunity  Score  Reason
1  src/billing/PricingCards.tsx    5         5         25    high impact, high churn
2  src/billing/Paywall.tsx         5         4         20    revenue risk, high churn
3  src/checkout/Checkout.tsx       4         4         16    drop-off spikes
...
```

The skipped table caps at 50 rows even when more files were skipped - `hotlist.md` truncates for
readability, but `hotlist.json`'s `skipped` array is never truncated and carries every skipped file.

## Edge gate (edges.json)

The edge track scores **pairs**, not files - a contract defect that lives between two individually-correct
files has no single file to attach to, so it needs its own unit of assessment and its own gate. `rank_edges.ts`
is that gate: deterministic, no LLM judgment, run once per sweep against `collect_edges.sh`'s candidates and
`edge-scout`'s verdicts.

Edge record (from `collect_edges.sh`, one per candidate pair):

```json
{"a":"src/api/UserDto.ts","b":"src/db/userSchema.sql","via":"user.dto.ts","vias":["user.dto.ts"],"fanout":2,"shared":1}
```

`a < b` lexicographically. `via` is the linking literal with the highest artifact evidence for the pair (a
literal naming a real tracked file outranks one that merely shares the repo's extension set, which in turn
outranks syntax noise; ties break by lower fanout then lexicographically smaller literal); `vias` carries up
to 3 candidates ranked by that same rule, best first, with `via` always `vias[0]` - a scout-facing prior list,
not part of `rank_edges.ts`'s own projection (`edges.json`/`edges.md` still carry only `via`/`shared`).
`fanout` is how many swept files mention `via`; `shared` is how many distinct literals link this exact pair.

Verdict record (from `edge-scout`, one per pair):

```json
{"a":"src/api/UserDto.ts","b":"src/db/userSchema.sql","verdict":"MISMATCH","reason":"dto adds a field the schema lacks"}
```

`verdict` is exactly `MATCH`, `MISMATCH`, `UNCLEAR`, or `NO_CONTRACT`; `a`/`b` are echoed byte-identical to the
edge record - that is the join key. `NO_CONTRACT` means the shared literal is coincidental (a language
builtin, a common word) - there is no real contract between the two sides to check, which is a different claim
from `MATCH` (both sides do share a real contract, and agree on it). A verdict string outside the four allowed
values is treated as `UNCLEAR`.

`pairImpact` - Impact only, no Opportunity axis on the edge track (`fix_commits` is an Opportunity prior and
plays no part here):

```
pair_impact = churn_a + churn_b + dependents_a + dependents_b
```

A missing signals row for either endpoint, or a `-1` sentinel on either field, contributes 0 for that term.

Sort order for every `MISMATCH` / `UNCLEAR` pair: verdict class first (`MISMATCH` before `UNCLEAR`), then
`pair_impact` descending, then `shared` descending, then `a` then `b` lexicographically. `rank` is assigned
over that whole sorted list before splitting at `--top-edges` into `dispatch` (capped) and `overflow` (the
rest) - the same cap-not-cut shape as the file track's `--top`. `MATCH` and `NO_CONTRACT` pairs are both
dropped from ranking entirely and kept only in their own bucket for the record (`match`, `no_contract`) -
neither is ever dispatched or held in overflow.

`edges.json` schema:

```json
{
  "run_id": "2026-06-26-bugs",
  "job": "reliability/bugs",
  "top_edges": 20,
  "counts": {"pairs": 4, "match": 1, "mismatch": 1, "unclear": 1, "no_contract": 1, "unscored": 0, "dispatch": 2},
  "dispatch": [
    {"rank":1,"a":"src/api/UserDto.ts","b":"src/db/userSchema.sql","via":"user.dto.ts","shared":1,
     "verdict":"MISMATCH","pair_impact":15,"reason":"dto adds a field the schema lacks"}
  ],
  "overflow": [],
  "match": [
    {"a":"src/api/OrderDto.ts","b":"src/db/orderSchema.sql","via":"order.dto.ts","shared":1,
     "verdict":"MATCH","pair_impact":9,"reason":"both sides agree on every field"}
  ],
  "no_contract": [
    {"a":"src/utils/format.ts","b":"src/legal/Terms.tsx","via":"format","shared":1,
     "verdict":"NO_CONTRACT","pair_impact":2,"reason":"shared literal is a common word, no real link"}
  ],
  "degree": [{"path":"src/api/UserDto.ts","degree":3}]
}
```

`counts.pairs` is the union of every pair that appears in either the edge records or the verdicts; a pair
present on only one side is `unscored` - never dispatched, warned once on stderr naming the pair.
`counts.match + counts.mismatch + counts.unclear + counts.no_contract + counts.unscored == counts.pairs`.
`degree[]` is the count of
candidate pairs each path participates in (from the full edge record set, regardless of verdict), sorted
descending and capped at 20 rows - this is what `SKILL.md`'s structural budget reads to pull in
highest-degree files that never clear the pair gate on their own. `edges.md` renders `dispatch` as a ranked
table plus `<details>` blocks for `overflow`, `match`, `no_contract`, and `degree` (a capped Path/Degree table,
omitted when `degree[]` is empty).
