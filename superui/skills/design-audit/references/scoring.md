# Scoring — the 1-5 rubric, the gate, and the hotlist

Design-audit reuses the Impact x Opportunity law: cheap scouts score every UI file, a deterministic gate keeps only the top-right corner, and detectives investigate the survivors.

- Impact = how much the drift matters — how central/visible the surface: a shared component, a high-traffic page/screen, a file with many importers. "How much does fixing this pay off."
- Opportunity = how much drift is present and how mechanically fixable it is now — many raw literals with exact token matches, off-theme classes, invented variants. "How much is there to win here, now."

## The 1-5 rubric

Both are scored on the same 1-5 scale so the product is comparable across files.

| Score | Impact (how much it matters) | Opportunity (how much drift / winnable now) |
|---|---|---|
| 5 | Core shared component, many importers | Dense drift, exact token matches available |
| 4 | Important surface, several importers | Strong drift, clear replacements |
| 3 | Moderate reach | Some drift worth a closer look |
| 2 | Peripheral | Minor / mostly compliant |
| 1 | Leaf / generated / vendored | Clean, on-system |

Score against the signals, not vibes. Use the signal line as the prior: high `raw_value_hits` + `class_hits` + `inline_style_hits` pushes Opportunity up; a file that many others import pushes Impact up. Override the prior only if reading the file says otherwise, and say why in the reason field.

Scouts emit strict JSON, one object per line, no prose:

```json
{"path":"src/ui/Card.tsx","impact":4,"opportunity":5,"drift_hits":11,
 "cluster_hint":"card",
 "impact_reason":"shared card, imported by 12 screens",
 "opportunity_reason":"11 raw hex/px literals, all have tokens"}
```

`drift_hits` is the scout's own count of drift signals it considers real for the active family (it maps the sweep's `raw_value_hits`/`class_hits`/`inline_style_hits` into one number). `cluster_hint` is a short lowercase noun for the component-like shape the file re-implements, if any (for Wave 2 grouping); empty string if none.

## The combine formula

```
score = impact × opportunity          # integer 1..25
```

Quadrant (the 2x2), using a threshold T (default 3):

- `impact >= T AND opportunity >= T` → HOTSPOT (top-right) → investigate
- `impact >= T AND opportunity <  T` → already-fine → leave it
- `impact <  T AND opportunity >= T` → nobody-cares → skip it
- `impact <  T AND opportunity <  T` → ignore

Only HOTSPOT files are dispatched to detectives. Keep the rest in the hotlist so the user sees coverage and can override the cut.

## Tie-breaking & caps

- Break equal `score` ties by higher `impact` first, then higher `drift_hits`.
- Cap detective dispatch with `--top N`; even if many files clear the gate, start with the top N and open new fronts later rather than spending on all at once.
- A file that scores 5x2 is NOT a hotspot — central but almost nothing to fix. That is the "leave it" cell.

## Hotlist schema (`hotlist.json`)

```json
{
  "run_id": "20260702-101500",
  "threshold": 3,
  "top": 20,
  "counts": {"scored": 214, "hotspots": 9, "skipped": 205},
  "hotspots": [
    {"rank":1,"path":"src/ui/Card.tsx","impact":4,"opportunity":5,
     "score":20,"quadrant":"HOTSPOT","reason":"shared card, 11 raw literals"}
  ],
  "skipped": [
    {"path":"src/legal/Terms.tsx","impact":2,"opportunity":2,"score":4,
     "quadrant":"ignore","reason":"static page, on-system"}
  ]
}
```

`rank.py` writes this plus a `hotlist.md` table rendering the same data.
