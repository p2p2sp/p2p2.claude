# Scoring — the 1-5 rubric, the gate, and the hotlist

Design-audit reuses the Impact x Opportunity law: cheap scouts score every UI file, a deterministic gate keeps only the top-right corner, and detectives investigate the survivors.

- Impact = how much the drift matters — how central/visible the surface: a shared component, a high-traffic page/screen, a file with many importers. "How much does fixing this pay off."
- Opportunity = how much drift is present and how mechanically fixable it is now — many raw literals with exact token matches, off-theme classes, invented variants. "How much is there to win here, now."

## The 1-5 rubric

Both axes are scored on the same 1-5 scale so the product is comparable across files. These anchors are duplicated verbatim in the `design-scout` agent definition (which cannot read this file at runtime) — keep the two copies identical.

Impact (how much it matters):
- 5: Core shared component, many importers
- 4: Important surface, several importers
- 3: Moderate reach
- 2: Peripheral
- 1: Leaf / generated / vendored

Opportunity (how much drift / winnable now):
- 5: Dense drift, exact token matches available
- 4: Strong drift, clear replacements
- 3: Some drift worth a closer look
- 2: Minor / mostly compliant
- 1: Clean, on-system

Score against the signals, not vibes. Use the signal line as the prior: high `raw_value_hits` + `class_hits` + `inline_style_hits` pushes Opportunity up; a file that many others import pushes Impact up. Override the prior only if reading the file says otherwise, and say why in the reason field.

Scouts emit strict JSON, one object per line, no prose:

```json
{"path":"src/ui/Card.tsx","impact":4,"opportunity":5,"drift_hits":11,
 "cluster_hint":"card",
 "impact_reason":"shared card, imported by 12 screens",
 "opportunity_reason":"11 raw hex/px literals, all have tokens"}
```

`drift_hits` is the scout's own count of drift signals it considers real for the active family (it maps the sweep's `raw_value_hits`/`class_hits`/`inline_style_hits` into one number). `cluster_hint` is a short lowercase noun for the component-like shape the file re-implements, if any (for Wave 2 grouping); empty string if none. It survives ranking — `rank.py` carries it into the hotlist's hotspot rows so Wave 2 dispatch can group by it.

## The combine formula

```
score = impact × opportunity          # integer 1..25
```

Quadrant (the 2x2), gated PER AXIS: `--min-impact` (default 3) gates the impact axis, `--min-opportunity` (default 3) gates the opportunity axis — the two thresholds are independent, never collapsed into one:

- `impact >= min-impact AND opportunity >= min-opportunity` → HOTSPOT (top-right) → investigate
- `impact >= min-impact AND opportunity < min-opportunity` → already-fine → leave it
- `impact < min-impact AND opportunity >= min-opportunity` → nobody-cares → skip it
- `impact < min-impact AND opportunity < min-opportunity` → ignore

Only HOTSPOT files are dispatched to detectives. Everything else stays visible in the hotlist so the user sees coverage and can override the cut.

## Tie-breaking, caps, coverage

- Break equal `score` ties by higher `impact` first, then higher `drift_hits`.
- Cap detective dispatch with `--top N`: hotspots past the cap are NOT dropped — they land in the hotlist's `beyond_cut` section (ranked, visible, available for a manual override or a later front); start with the top N and open new fronts later rather than spending on all at once.
- Files present in `signals.jsonl` that never got a scout score land in the hotlist's `unscored` section with a counter — a swept file never disappears silently.
- Counts invariant: `scored = hotspots + beyond_cut + skipped + unscored`.
- Duplicate scores for one path: the higher-scoring record wins; on a tie the first record is kept.
- A file that scores 5x2 is NOT a hotspot — central but almost nothing to fix. That is the "leave it" cell.

## Hotlist schema (`hotlist.json`)

```json
{
  "run_id": "20260702-101500",
  "min_impact": 3,
  "min_opportunity": 3,
  "top": 20,
  "counts": {"scored": 214, "hotspots": 9, "beyond_cut": 2,
             "skipped": 202, "unscored": 1},
  "hotspots": [
    {"rank":1,"path":"src/ui/Card.tsx","impact":4,"opportunity":5,
     "score":20,"quadrant":"HOTSPOT","cluster_hint":"card",
     "reason":"shared card, 11 raw literals"}
  ],
  "beyond_cut": [
    {"rank":10,"path":"src/ui/Tile.tsx","impact":3,"opportunity":3,
     "score":9,"quadrant":"HOTSPOT","cluster_hint":"metric-tile",
     "reason":"cleared the gate, past --top"}
  ],
  "skipped": [
    {"path":"src/legal/Terms.tsx","impact":2,"opportunity":2,"score":4,
     "quadrant":"ignore","reason":"static page, on-system"}
  ],
  "unscored": ["src/ui/Unranked.tsx"]
}
```

`rank.py` writes this plus a `hotlist.md` rendering the same data (hotspot table, a "Beyond the cut" section, the skipped list, and the unscored list).
