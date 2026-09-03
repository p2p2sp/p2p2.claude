#!/usr/bin/env python3
"""Build the idea-validator HTML report from report-data.json.

Usage: python3 build_report.py <report-data.json> <output.html>

Validates the required structure (see references/report-schema.md), fills in
English defaults for any missing UI label, injects the JSON into
assets/report-template.html and writes a single self-contained HTML file.
Exits 1 and lists every problem when required fields are missing, so the
agent fixes the JSON rather than the HTML.
"""
import json
import sys
from pathlib import Path

TEMPLATE = Path(__file__).resolve().parent.parent / "assets" / "report-template.html"

DIMENSION_KEYS = ["problem", "market", "competition", "advantage", "revenue",
                  "distribution", "timing", "side_project_fit", "autopilot_fit"]
KEY_DIMENSIONS = {"problem", "distribution", "autopilot_fit"}
VERDICTS = {"Go", "Pivot", "No-Go"}
CONF = {"high", "medium", "low"}

DEFAULT_LABELS = {
    "verdict": "Verdict", "scorecard": "Scorecard", "weighted_total": "Weighted total",
    "confidence": "Confidence", "dimension": "Dimension", "score": "Score", "weight": "Weight",
    "owner": "Owner", "dissenters": "Dissenters", "evidence": "Evidence", "council": "Council",
    "council_health": "Council health", "agreed": "Agreed points", "disputed": "Disputed points",
    "dissent": "Dissenting opinion", "members": "Member opinions", "round1": "Round 1",
    "round2": "Round 2", "round2_skipped": "Round 2 skipped (--quick)",
    "arguments": "Strongest arguments", "change_my_mind": "What would change my mind",
    "lean_canvas": "Lean Canvas", "assumptions": "Hidden assumptions", "research": "Research",
    "problem": "Problem & customer", "market": "Market", "competition": "Competition",
    "business_model": "Business model", "distribution": "Distribution", "facts": "Facts",
    "conclusions": "Conclusions", "open": "No data / open questions", "quotes": "Voices of users",
    "sizing": "Market sizing", "method": "Method", "regulation": "Regulation",
    "competitors": "Competitors", "graveyard": "Graveyard", "whitespace": "Whitespace",
    "channels": "Channels", "side_project_fit": "Side-project fit", "autopilot_fit": "Autopilot fit",
    "hours_per_week": "hours/week after launch", "killers": "Autopilot killers", "fix": "Proposed fix",
    "risks": "Risks", "likelihood": "Likelihood", "impact": "Impact", "warning_sign": "Early warning",
    "mitigation": "Mitigation", "experiments": "Experiment plan", "hypothesis": "Hypothesis",
    "test": "Test", "metric": "Metric", "pass": "Pass threshold", "fail": "Fail threshold",
    "cost": "Cost", "duration": "Duration", "thresholds": "Decision thresholds (set in advance)",
    "appendix": "Appendix", "data_gaps": "Data gaps", "methodology": "Methodology",
    "sources": "Sources", "outdated": "possibly outdated", "closing_note": "What this report does not say",
    "biggest_risk": "Biggest risk", "conditional_on": "Conditional on", "pivot_suggestion": "What to change",
    "expand_all": "Expand all", "collapse_all": "Collapse all", "generated": "Generated",
    "quick_mode_note": "Quick mode: council without round 2",
    "canvas": {"problem": "Problem", "solution": "Solution", "uvp": "Unique value proposition",
               "unfair_advantage": "Unfair advantage", "customer_segments": "Customer segments",
               "key_metrics": "Key metrics", "channels": "Channels", "costs": "Cost structure",
               "revenue": "Revenue streams"},
}


def check(cond, msg, problems):
    if not cond:
        problems.append(msg)


def validate(d):
    p = []
    def req(path, typ=None):
        cur = d
        for part in path.split("."):
            if not isinstance(cur, dict) or part not in cur:
                p.append(f"missing: {path}")
                return None
            cur = cur[part]
        if typ and not isinstance(cur, typ):
            p.append(f"wrong type: {path} (expected {typ.__name__})")
            return None
        return cur

    for path in ["meta.title", "meta.date", "meta.language", "meta.one_liner",
                 "verdict.label", "verdict.summary", "verdict.biggest_risk",
                 "council.dissent", "council.members", "lean_canvas", "research",
                 "side_project_fit", "autopilot_fit", "experiments", "thresholds", "appendix"]:
        req(path)
    req("meta.quick_mode", bool)
    req("scorecard.total", (int, float))
    dims = req("scorecard.dimensions", list)

    v = d.get("verdict", {})
    check(v.get("label") in VERDICTS, f"verdict.label must be one of {sorted(VERDICTS)}", p)
    if v.get("label") == "Pivot":
        check(bool(v.get("pivot_suggestion")), "verdict.pivot_suggestion required when label == Pivot", p)

    if isinstance(dims, list):
        keys = [x.get("key") for x in dims]
        check(keys == DIMENSION_KEYS, f"scorecard.dimensions keys must be exactly, in order: {DIMENSION_KEYS}", p)
        for x in dims:
            k = x.get("key")
            check(isinstance(x.get("score"), int) and 1 <= x["score"] <= 5, f"dimension {k}: score must be int 1–5", p)
            check(x.get("confidence") in CONF, f"dimension {k}: confidence must be high/medium/low", p)
            check(bool(x.get("justification")), f"dimension {k}: justification missing", p)
            check(isinstance(x.get("evidence"), list) and x["evidence"], f"dimension {k}: evidence list empty (use 'no data found')", p)
            check(x.get("weight") in (1, 2), f"dimension {k}: weight must be 1 or 2", p)
        # weighted total recomputed
        try:
            tot = sum(x["score"] * x["weight"] for x in dims) / sum(x["weight"] for x in dims)
            if abs(tot - float(d["scorecard"]["total"])) > 0.06:
                p.append(f"scorecard.total {d['scorecard']['total']} does not match recomputed {tot:.2f}")
            # verdict rules
            weak_key = [x["key"] for x in dims if x["key"] in KEY_DIMENSIONS and x["score"] <= 2]
            if v.get("label") == "Go" and weak_key:
                p.append(f"verdict Go not allowed: key dimension(s) {weak_key} score ≤ 2 (see dimensions.md verdict rules)")
            low_key = [x["key"] for x in dims if x["key"] in KEY_DIMENSIONS and x.get("confidence") == "low"]
            if v.get("label") == "Go" and low_key and not v.get("conditional_on"):
                p.append(f"verdict Go with low-confidence key dimension(s) {low_key} must set verdict.conditional_on")
        except Exception:
            pass

    c = d.get("council", {})
    check(isinstance(c.get("members"), list) and len(c["members"]) == 7, "council.members must have 7 entries", p)
    check(isinstance(c.get("dissent"), dict) and c["dissent"].get("text"), "council.dissent.text is mandatory", p)
    check("round2_held" in c, "council.round2_held missing", p)
    if d.get("meta", {}).get("quick_mode") is False:
        check(c.get("round2_held") is True, "round2_held must be true unless quick_mode", p)

    lc = d.get("lean_canvas", {})
    for k in ["problem", "customer_segments", "uvp", "solution", "channels", "revenue", "costs", "key_metrics", "unfair_advantage"]:
        check(k in lc, f"lean_canvas.{k} missing", p)

    r = d.get("research", {})
    for k in ["problem", "market", "competition", "business_model", "distribution"]:
        blk = r.get(k)
        check(isinstance(blk, dict), f"research.{k} missing", p)
        if isinstance(blk, dict):
            for sub in ["facts", "conclusions", "open"]:
                check(isinstance(blk.get(sub), list), f"research.{k}.{sub} must be a list", p)

    ex = d.get("experiments")
    check(isinstance(ex, list) and 3 <= len(ex) <= 8, "experiments must have 3–8 entries", p)
    if isinstance(ex, list):
        for e in ex:
            for k in ["hypothesis", "test", "metric", "pass", "fail"]:
                check(bool(e.get(k)), f"experiment {e.get('n')}: {k} missing", p)

    t = d.get("thresholds", {})
    for k in ["go", "pivot", "no_go"]:
        check(bool(t.get(k)), f"thresholds.{k} missing (must be set before experiments run)", p)

    ap = d.get("autopilot_fit", {})
    check(bool(ap.get("hours_per_week_total")), "autopilot_fit.hours_per_week_total missing", p)
    check(isinstance(ap.get("killers"), list), "autopilot_fit.killers must be a list (may be empty)", p)

    ad = d.get("appendix", {})
    check(bool(ad.get("closing_note")), "appendix.closing_note missing", p)
    check(isinstance(ad.get("sources"), list), "appendix.sources must be a list", p)
    return p


def merge_labels(d):
    labels = dict(DEFAULT_LABELS)
    user = d.get("labels") or {}
    canvas = dict(DEFAULT_LABELS["canvas"])
    canvas.update(user.get("canvas") or {})
    labels.update({k: v for k, v in user.items() if k != "canvas"})
    labels["canvas"] = canvas
    d["labels"] = labels
    return d


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(2)
    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    try:
        data = json.loads(src.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        print(f"Cannot parse {src}: {e}")
        sys.exit(1)
    problems = validate(data)
    if problems:
        print(f"{len(problems)} problem(s) in {src}:")
        for x in problems:
            print(f"  - {x}")
        sys.exit(1)
    data = merge_labels(data)
    payload = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    tpl = TEMPLATE.read_text(encoding="utf-8")
    html = (tpl.replace("__REPORT_DATA__", payload)
               .replace("__LANG__", data["meta"]["language"])
               .replace("__TITLE__", data["meta"]["title"].replace("<", "&lt;")))
    out.write_text(html, encoding="utf-8")
    print(f"OK → {out} ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
