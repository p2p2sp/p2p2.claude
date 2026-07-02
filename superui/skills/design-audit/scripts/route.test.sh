#!/usr/bin/env bash
# superui / design-audit — route.test.sh
#
# Deterministic test runs for route.sh. This repo has no test framework
# (markdown + JSON + bash), so a "test" is a real script run with an stdout
# assertion. route.sh cats exactly one references/rubric-<family>.md.
#
# Contract:
#   input  : none. Runs the sibling route.sh against the real references/.
#   output : one "PASS: <case>" line per case, then "ALL PASS (N/N)"; a mismatch
#            prints "FAIL: <case>" and exits non-zero.
#   cases  : (1-4) each family -> its rubric H1 marker; (5) uppercase family is
#            lowercased; (6) unknown family -> STATUS: FAIL + non-zero exit;
#            (7) agnostic rubric omits idiom-specific concepts.
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUT="$SCRIPT_DIR/route.sh"

PASS_COUNT=0; TOTAL=0; FAILED=0
assert_line() { # <name> <output> <exact-line>
  TOTAL=$((TOTAL + 1))
  if printf '%s\n' "$2" | grep -qxF "$3"; then
    echo "PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "FAIL: $1 — missing line '$3'"; FAILED=$((FAILED + 1))
  fi
}

# Cases 1-4 — each family routes to its own rubric fragment.
assert_line "css -> css rubric"       "$(sh "$SUT" css)"       "# Drift rubric — CSS/markup family"
assert_line "js-theme -> mui rubric"  "$(sh "$SUT" js-theme)"  "# Drift rubric — JS theme-object family (MUI)"
assert_line "flutter -> dart rubric"  "$(sh "$SUT" flutter)"   "# Drift rubric — Flutter/Dart family"
assert_line "agnostic -> agnostic"    "$(sh "$SUT" agnostic)"  "# Drift rubric — agnostic mode (no idiom)"

# Case 5 — family token is lowercased.
assert_line "CSS uppercased -> css"   "$(sh "$SUT" CSS)"       "# Drift rubric — CSS/markup family"

# Case 6 — unknown family fails loud and non-zero.
TOTAL=$((TOTAL + 1))
if OUT6="$(sh "$SUT" bogus 2>&1)"; then
  echo "FAIL: unknown family — expected non-zero exit"; FAILED=$((FAILED + 1))
elif printf '%s\n' "$OUT6" | grep -qF "STATUS: FAIL"; then
  echo "PASS: unknown family -> STATUS: FAIL + non-zero"; PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "FAIL: unknown family — missing STATUS: FAIL"; FAILED=$((FAILED + 1))
fi

# Case 7 — agnostic rubric explicitly excludes idiom concepts.
assert_line "agnostic omits idiom concepts" "$(sh "$SUT" agnostic)" "Do NOT report idiom-specific concepts — off-theme classes, \`--custom-property\`, inline \`style\`/\`sx\`, or Dart widget specifics. There is no active target to judge them against."

echo ""
if [ "$FAILED" -ne 0 ]; then echo "FAILED ($PASS_COUNT/$TOTAL)"; exit 1; fi
echo "ALL PASS ($PASS_COUNT/$TOTAL)"
