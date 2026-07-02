#!/usr/bin/env python3
"""rank.py — combine scout scores into a gated, ranked HOTLIST for design-audit.

Reads scout verdicts (JSONL, one object per line with at least `path`, `impact`,
`opportunity`) and optionally the deterministic signals JSONL, computes
`score = impact * opportunity`, assigns each file a 2x2 quadrant, drops
everything outside the top-right corner, and writes hotlist.json + hotlist.md.

The cut is deterministic so the same sweep ranks the same way every time.

Usage:
  python3 rank.py --scores scores.jsonl [--signals signals.jsonl] \
      [--min-impact 3] [--min-opportunity 3] [--top 20] \
      [--run-id 20260702-101500] \
      --out-json hotlist.json --out-md hotlist.md
"""
import argparse
import json
import sys


def load_jsonl(path):
    rows = []
    with open(path, "r", encoding="utf-8") as fh:
        for ln, line in enumerate(fh, 1):
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                print(f"warn: skipping malformed line {ln} in {path}", file=sys.stderr)
    return rows


def quadrant(impact, opportunity, t):
    hi_i, hi_o = impact >= t, opportunity >= t
    if hi_i and hi_o:
        return "HOTSPOT"
    if hi_i and not hi_o:
        return "already-fine"   # high impact, nothing to win -> leave it
    if not hi_i and hi_o:
        return "nobody-cares"   # drifted but low impact -> skip it
    return "ignore"


def reason(rec):
    # Prefer the scout's own words; fall back to a signal-derived blurb.
    imp = rec.get("impact_reason")
    opp = rec.get("opportunity_reason")
    if imp or opp:
        return ", ".join(x for x in (imp, opp) if x)
    drift = rec.get("drift_hits")
    if drift is not None and drift != -1:
        return f"drift_hits={drift}"
    return ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scores", required=True)
    ap.add_argument("--signals")
    ap.add_argument("--min-impact", type=int, default=3)
    ap.add_argument("--min-opportunity", type=int, default=3)
    ap.add_argument("--top", type=int, default=20)
    ap.add_argument("--run-id", default="")
    ap.add_argument("--out-json", required=True)
    ap.add_argument("--out-md", required=True)
    args = ap.parse_args()

    t = min(args.min_impact, args.min_opportunity)

    scores = load_jsonl(args.scores)
    sig_by_path = {}
    if args.signals:
        for s in load_jsonl(args.signals):
            if "path" in s:
                sig_by_path[s["path"]] = s

    merged = {}
    for rec in scores:
        path = rec.get("path")
        if path is None:
            continue
        try:
            impact = int(rec["impact"])
            opportunity = int(rec["opportunity"])
        except (KeyError, TypeError, ValueError):
            print(f"warn: skipping record without numeric impact/opportunity: {rec}",
                  file=sys.stderr)
            continue
        row = dict(sig_by_path.get(path, {}))
        row.update(rec)
        row["impact"] = max(1, min(5, impact))
        row["opportunity"] = max(1, min(5, opportunity))
        row["score"] = row["impact"] * row["opportunity"]
        row["quadrant"] = quadrant(row["impact"], row["opportunity"], t)
        row["reason"] = reason(row)
        # last write wins, but keep the higher score if a file was scored twice
        if path not in merged or row["score"] > merged[path]["score"]:
            merged[path] = row

    rows = list(merged.values())
    # rank: score desc, then impact desc, then drift_hits desc
    rows.sort(key=lambda r: (r["score"], r["impact"], r.get("drift_hits", 0) or 0),
              reverse=True)

    hotspots = [r for r in rows if r["quadrant"] == "HOTSPOT"][: args.top]
    skipped = [r for r in rows if r["quadrant"] != "HOTSPOT"]

    for i, r in enumerate(hotspots, 1):
        r["rank"] = i

    out = {
        "run_id": args.run_id,
        "threshold": t,
        "top": args.top,
        "counts": {"scored": len(rows), "hotspots": len(hotspots),
                   "skipped": len(skipped)},
        "hotspots": [
            {k: r.get(k) for k in
             ("rank", "path", "impact", "opportunity", "score", "quadrant", "reason")}
            for r in hotspots
        ],
        "skipped": [
            {k: r.get(k) for k in
             ("path", "impact", "opportunity", "score", "quadrant", "reason")}
            for r in skipped
        ],
    }
    with open(args.out_json, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2)

    # Markdown hotlist (shown to the user before spending frontier detectives).
    lines = []
    lines.append(f"# HOTLIST — {args.run_id or 'run'}")
    lines.append("")
    lines.append(f"Scored {len(rows)} files · {len(hotspots)} hotspots · "
                 f"{len(skipped)} skipped · threshold {t}.")
    lines.append("")
    lines.append("| # | Component | Impact | Opportunity | Score | Reason |")
    lines.append("|---|-----------|:------:|:-----------:|:-----:|--------|")
    for r in hotspots:
        lines.append(f"| {r['rank']} | `{r['path']}` | {r['impact']} | "
                     f"{r['opportunity']} | {r['score']} | {r['reason']} |")
    if skipped:
        lines.append("")
        lines.append("<details><summary>Skipped (not top-right corner)</summary>")
        lines.append("")
        lines.append("| Component | Impact | Opportunity | Score | Quadrant | Reason |")
        lines.append("|-----------|:------:|:-----------:|:-----:|----------|--------|")
        for r in skipped[:50]:
            lines.append(f"| `{r['path']}` | {r['impact']} | {r['opportunity']} | "
                         f"{r['score']} | {r['quadrant']} | {r['reason']} |")
        lines.append("")
        lines.append("</details>")
    with open(args.out_md, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")

    print(f"hotlist: {len(hotspots)} hotspots from {len(rows)} scored files "
          f"-> {args.out_json}, {args.out_md}")


if __name__ == "__main__":
    main()
