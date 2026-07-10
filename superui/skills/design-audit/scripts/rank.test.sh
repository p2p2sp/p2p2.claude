#!/usr/bin/env bash
# superui / design-audit — rank.test.sh
#
# Deterministic test runs for rank.py: feed a fixed scores.jsonl, assert the
# gate (score = impact x opportunity, only the top-right quadrant survives) and
# the ranking order. Interpreter guard mirrors shared/scripts/check_python.sh:
# first working python|python3|py (non-empty --version) runs the SUT; none -> SKIP.
#
# Contract:
#   input  : none. Builds a scores.jsonl under `mktemp -d`; removed on exit.
#   output : "PASS: <case>" per case, then "ALL PASS (N/N)"; a mismatch prints
#            "FAIL: <case>" and exits non-zero.
#   cases  : (1) three HOTSPOTs survive (a 5x5, c & e 4x4); (2) rank 1 is the 5x5
#            file; (3) a 5x2 (already-fine) and a 2x2 (ignore) are skipped, not
#            ranked; (4) tie broken by drift_hits; (5) empty scores -> zero
#            hotspots, rc 0; (6) out-of-range impact/opportunity clamped to 1..5;
#            (7) per-axis gate: --min-impact 5 keeps 3x5 out, lets 5x3 in;
#            (8) --top 1 with 3 hotspots -> 2 in beyond_cut, counts sum
#            (scored = hotspots + beyond_cut + skipped + unscored);
#            (9) signals-only file lands in unscored + counter; (10) cluster_hint
#            survives into hotlist.json hotspot rows.
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUT="$SCRIPT_DIR/rank.py"

PY=""
for cmd in python python3 py; do
  command -v "$cmd" >/dev/null 2>&1 || continue
  ver="$("$cmd" --version 2>&1)" || continue
  [ -n "$ver" ] || continue
  PY="$cmd"; break
done
if [ -z "$PY" ]; then
  echo "SKIP: no working python/python3/py — rank.py untested on this host"
  exit 0
fi

SCRATCH="$(mktemp -d 2>/dev/null || mktemp -d -t da_rank)"
trap 'rm -rf "$SCRATCH"' EXIT

PASS_COUNT=0; TOTAL=0; FAILED=0
pass() { echo "PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "FAIL: $1 — $2"; FAILED=$((FAILED + 1)); }

SC="$SCRATCH/scores.jsonl"
cat > "$SC" <<'EOF'
{"path":"a.css","impact":5,"opportunity":5,"drift_hits":9,"cluster_hint":"card"}
{"path":"b.css","impact":5,"opportunity":2,"drift_hits":1}
{"path":"c.css","impact":4,"opportunity":4,"drift_hits":3}
{"path":"d.css","impact":2,"opportunity":2,"drift_hits":0}
{"path":"e.css","impact":4,"opportunity":4,"drift_hits":8}
EOF

JSON="$SCRATCH/hotlist.json"; MD="$SCRATCH/hotlist.md"
"$PY" "$SUT" --scores "$SC" --min-impact 3 --min-opportunity 3 --top 20 \
  --run-id test --out-json "$JSON" --out-md "$MD" >/dev/null

MDC="$(cat "$MD")"

# Case 1 — three HOTSPOTs (a 5x5, c & e 4x4); b (5x2) and d (2x2) drop out.
TOTAL=$((TOTAL + 1))
if grep -qF '"hotspots": 3' "$JSON"; then pass "three hotspots survive the gate"
else fail "gate count" "$(grep hotspots "$JSON" | head -1)"; fi

# Case 2 — rank 1 is the 5x5 (score 25).
TOTAL=$((TOTAL + 1))
if printf '%s\n' "$MDC" | grep -qE '^\| 1 \| `a\.css` \| 5 \| 5 \| 25 \|'; then
  pass "rank 1 is a.css (5x5=25)"
else fail "rank 1" "$(printf '%s\n' "$MDC" | grep -F '| 1 |')"; fi

# Case 3 — b.css (already-fine) and d.css (ignore) are skipped, never ranked.
TOTAL=$((TOTAL + 1))
if printf '%s\n' "$MDC" | grep -qF 'already-fine' \
   && printf '%s\n' "$MDC" | grep -qF 'ignore' \
   && ! printf '%s\n' "$MDC" | grep -qE '^\| [0-9]+ \| `b\.css`'; then
  pass "5x2 + 2x2 skipped, not ranked"
else fail "skip quadrants" "$(printf '%s\n' "$MDC" | grep -F 'b.css')"; fi

# Case 4 — tie (c & e both 4x4=16) broken by drift_hits: e (8) before c (3).
TOTAL=$((TOTAL + 1))
RANK_E="$(printf '%s\n' "$MDC" | grep -nF '`e.css`' | head -1 | cut -d: -f1)"
RANK_C="$(printf '%s\n' "$MDC" | grep -nF '`c.css`' | head -1 | cut -d: -f1)"
if [ -n "$RANK_E" ] && [ -n "$RANK_C" ] && [ "$RANK_E" -lt "$RANK_C" ]; then
  pass "tie broken by drift_hits (e before c)"
else fail "tie-break" "e-line=$RANK_E c-line=$RANK_C"; fi

# Case 5 — empty scores: clean run, zero hotspots, rc 0.
TOTAL=$((TOTAL + 1))
ESC="$SCRATCH/empty.jsonl"; : > "$ESC"
EJSON="$SCRATCH/e.json"; EMD="$SCRATCH/e.md"
if "$PY" "$SUT" --scores "$ESC" --run-id e --out-json "$EJSON" --out-md "$EMD" >/dev/null 2>&1 \
   && grep -qF '"hotspots": 0' "$EJSON"; then
  pass "empty scores -> zero hotspots, rc 0"
else fail "empty scores" "rc=$? json=<$(cat "$EJSON" 2>/dev/null)>"; fi

# Case 6 — out-of-range impact/opportunity are clamped to 1..5.
TOTAL=$((TOTAL + 1))
CSC="$SCRATCH/clamp.jsonl"
printf '%s\n' \
  '{"path":"hi.css","impact":7,"opportunity":9,"drift_hits":1}' \
  '{"path":"lo.css","impact":0,"opportunity":-2,"drift_hits":1}' > "$CSC"
CJSON="$SCRATCH/c.json"; CMD="$SCRATCH/c.md"
"$PY" "$SUT" --scores "$CSC" --run-id c --out-json "$CJSON" --out-md "$CMD" >/dev/null
# 7x9 -> clamp 5x5 -> score 25 (hotspot); 0x-2 -> clamp 1x1 -> score 1 (ignore).
if grep -qF '"score": 25' "$CJSON" && ! grep -qF '"score": 63' "$CJSON" \
   && ! grep -qF '"impact": 7' "$CJSON"; then
  pass "out-of-range impact/opportunity clamped to 1..5"
else fail "clamp" "json=<$(cat "$CJSON")>"; fi

# Case 7 — per-axis gate: --min-impact 5 --min-opportunity 3 keeps a 3x5 out
# (fails the impact axis -> nobody-cares) and lets a 5x3 in.
TOTAL=$((TOTAL + 1))
ASC="$SCRATCH/axis.jsonl"
printf '%s\n' \
  '{"path":"lowimp.css","impact":3,"opportunity":5,"drift_hits":4}' \
  '{"path":"hiimp.css","impact":5,"opportunity":3,"drift_hits":4}' > "$ASC"
AJSON="$SCRATCH/a.json"; AMD="$SCRATCH/a.md"
"$PY" "$SUT" --scores "$ASC" --min-impact 5 --min-opportunity 3 \
  --run-id a --out-json "$AJSON" --out-md "$AMD" >/dev/null
if grep -qF '"hotspots": 1' "$AJSON" \
   && ! printf '%s\n' "$(cat "$AMD")" | grep -qE '^\| [0-9]+ \| `lowimp\.css`' \
   && printf '%s\n' "$(cat "$AMD")" | grep -qE '^\| [0-9]+ \| `hiimp\.css`'; then
  pass "per-axis gate: min-impact blocks 3x5, admits 5x3"
else fail "per-axis gate" "json=<$(cat "$AJSON")>"; fi

# Case 8 — --top 1 with 3 hotspots: 1 dispatched, 2 beyond the cut, counts sum.
TOTAL=$((TOTAL + 1))
TJSON="$SCRATCH/t.json"; TMD="$SCRATCH/t.md"
"$PY" "$SUT" --scores "$SC" --min-impact 3 --min-opportunity 3 --top 1 \
  --run-id t --out-json "$TJSON" --out-md "$TMD" >/dev/null
N_HOT="$(grep -oE '"hotspots": [0-9]+' "$TJSON" | grep -oE '[0-9]+')"
N_BEY="$(grep -oE '"beyond_cut": [0-9]+' "$TJSON" | grep -oE '[0-9]+')"
N_SKP="$(grep -oE '"skipped": [0-9]+' "$TJSON" | grep -oE '[0-9]+')"
N_UNS="$(grep -oE '"unscored": [0-9]+' "$TJSON" | grep -oE '[0-9]+')"
N_SCR="$(grep -oE '"scored": [0-9]+' "$TJSON" | grep -oE '[0-9]+')"
if [ "$N_HOT" = "1" ] && [ "$N_BEY" = "2" ] \
   && [ "$N_SCR" = "$((N_HOT + N_BEY + N_SKP + N_UNS))" ] \
   && grep -qF 'Beyond the cut' "$TMD" \
   && grep -qF '`c.css`' "$TMD"; then
  pass "--top 1: 2 hotspots beyond the cut, counts sum"
else fail "beyond the cut" "hot=$N_HOT bey=$N_BEY skp=$N_SKP uns=$N_UNS scr=$N_SCR"; fi

# Case 9 — a signals file never scored lands in unscored (coverage reconciled).
TOTAL=$((TOTAL + 1))
SIG="$SCRATCH/signals.jsonl"
printf '%s\n' \
  '{"path":"a.css","ext":"css","raw_value_hits":9,"class_hits":0,"inline_style_hits":0,"loc":10}' \
  '{"path":"ghost.css","ext":"css","raw_value_hits":2,"class_hits":0,"inline_style_hits":0,"loc":5}' > "$SIG"
UJSON="$SCRATCH/u.json"; UMD="$SCRATCH/u.md"
"$PY" "$SUT" --scores "$SC" --signals "$SIG" --run-id u \
  --out-json "$UJSON" --out-md "$UMD" >/dev/null
if grep -qF '"unscored": 1' "$UJSON" && grep -qF '"ghost.css"' "$UJSON" \
   && grep -qF 'ghost.css' "$UMD"; then
  pass "signals-only file lands in unscored"
else fail "unscored" "json=<$(cat "$UJSON")>"; fi

# Case 10 — cluster_hint survives into hotlist.json hotspot rows.
TOTAL=$((TOTAL + 1))
if grep -qF '"cluster_hint": "card"' "$JSON"; then
  pass "cluster_hint preserved in hotlist.json"
else fail "cluster_hint" "$(grep -F 'cluster_hint' "$JSON" | head -2)"; fi

echo ""
if [ "$FAILED" -ne 0 ]; then echo "FAILED ($PASS_COUNT/$TOTAL)"; exit 1; fi
echo "ALL PASS ($PASS_COUNT/$TOTAL)"
