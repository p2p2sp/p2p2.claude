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
- Cap detective dispatch with `--top N`; even if 80 files clear the gate, start with the top N and open new fronts later (Phase 6) rather than spending on all at once.
- A file that scores 5×2 is NOT a hotspot - high impact but nothing to win. Resist the urge to investigate it just because impact is high. That is the "leave it" cell, and chasing it is the most common waste.

## Hotlist schema (`hotlist.json`)

```json
{
  "run_id": "2026-06-26-bugs",
  "job": "reliability/bugs",
  "threshold": 3,
  "top": 20,
  "hotspots": [
    {"rank":1,"path":"src/billing/PricingCards.tsx","impact":5,"opportunity":5,
     "score":25,"quadrant":"HOTSPOT","reason":"high impact, high churn"}
  ],
  "skipped": [
    {"path":"src/legal/Terms.tsx","impact":2,"opportunity":2,"score":4,
     "quadrant":"ignore","reason":"low impact, low churn"}
  ]
}
```

`hotlist.md` renders the same data as a ranked table:

```
#  Component                     Impact  Opportunity  Score  Reason
1  src/billing/PricingCards.tsx    5         5         25    high impact, high churn
2  src/billing/Paywall.tsx         5         4         20    revenue risk, high churn
3  src/checkout/Checkout.tsx       4         4         16    drop-off spikes
...
```
