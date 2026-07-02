#!/usr/bin/env bash
# superui / design-audit — rank.test.sh
#
# Deterministic test runs for rank.py: feed a fixed scores.jsonl, assert the
# gate (score = impact x opportunity, only the top-right quadrant survives) and
# the ranking order. Sibling pattern: validate_tasks.test.sh (guards on python3).
#
# Contract:
#   input  : none. Builds a scores.jsonl under `mktemp -d`; removed on exit.
#   output : "PASS: <case>" per case, then "ALL PASS (N/N)"; a mismatch prints
#            "FAIL: <case>" and exits non-zero.
#   cases  : (1) three HOTSPOTs survive (a 5x5, c & e 4x4); (2) rank 1 is the 5x5
#            file; (3) a 5x2 (already-fine) and a 2x2 (ignore) are skipped, not
#            ranked; (4) tie broken by drift_hits; (5) empty scores -> zero
#            hotspots, rc 0; (6) out-of-range impact/opportunity clamped to 1..5.
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUT="$SCRIPT_DIR/rank.py"

if ! command -v python3 >/dev/null 2>&1; then
  echo "SKIP: python3 not available — rank.py untested on this host"
  exit 0
fi

SCRATCH="$(mktemp -d 2>/dev/null || mktemp -d -t da_rank)"
trap 'rm -rf "$SCRATCH"' EXIT

PASS_COUNT=0; TOTAL=0; FAILED=0
pass() { echo "PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "FAIL: $1 — $2"; FAILED=$((FAILED + 1)); }

SC="$SCRATCH/scores.jsonl"
cat > "$SC" <<'EOF'
{"path":"a.css","impact":5,"opportunity":5,"drift_hits":9}
{"path":"b.css","impact":5,"opportunity":2,"drift_hits":1}
{"path":"c.css","impact":4,"opportunity":4,"drift_hits":3}
{"path":"d.css","impact":2,"opportunity":2,"drift_hits":0}
{"path":"e.css","impact":4,"opportunity":4,"drift_hits":8}
EOF

JSON="$SCRATCH/hotlist.json"; MD="$SCRATCH/hotlist.md"
python3 "$SUT" --scores "$SC" --min-impact 3 --min-opportunity 3 --top 20 \
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
if python3 "$SUT" --scores "$ESC" --run-id e --out-json "$EJSON" --out-md "$EMD" >/dev/null 2>&1 \
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
python3 "$SUT" --scores "$CSC" --run-id c --out-json "$CJSON" --out-md "$CMD" >/dev/null
# 7x9 -> clamp 5x5 -> score 25 (hotspot); 0x-2 -> clamp 1x1 -> score 1 (ignore).
if grep -qF '"score": 25' "$CJSON" && ! grep -qF '"score": 63' "$CJSON" \
   && ! grep -qF '"impact": 7' "$CJSON"; then
  pass "out-of-range impact/opportunity clamped to 1..5"
else fail "clamp" "json=<$(cat "$CJSON")>"; fi

echo ""
if [ "$FAILED" -ne 0 ]; then echo "FAILED ($PASS_COUNT/$TOTAL)"; exit 1; fi
echo "ALL PASS ($PASS_COUNT/$TOTAL)"
