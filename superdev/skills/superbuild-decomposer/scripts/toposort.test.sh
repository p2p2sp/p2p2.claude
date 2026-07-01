#!/usr/bin/env bash
# superdev / superbuild-decomposer — toposort.test.sh
#
# Deterministic test runs for toposort.py: cases proving order, tie-break by
# ascending touches-count then candidate id, and cycle detection (including a
# cycle that coexists with an otherwise-valid acyclic prefix). Sibling
# pattern: validate_tasks.test.sh.
#
# Contract:
#   input  : none. Each case feeds toposort.py a small graph on stdin and
#            reads stdout + exit code — the script has zero filesystem side
#            effects, so no mktemp scratch host is needed.
#   output : "PASS: <case>" per case, then "ALL PASS (N/N)"; a mismatch
#            prints "FAIL: <case> — <detail>" and exits non-zero.
#   cases  : single candidate; linear chain; diamond with equal touches-count
#            (tie-break by id); diamond with unequal touches-count (tie-break
#            by count); 2-node cycle; multi-node cycle with an acyclic
#            prefix.
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUT="$SCRIPT_DIR/toposort.py"

if ! command -v python3 >/dev/null 2>&1; then
  echo "SKIP: python3 not available — toposort.py untested on this host"
  exit 0
fi

PASS_COUNT=0; TOTAL=0; FAILED=0
pass() { echo "PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "FAIL: $1 — $2"; FAILED=$((FAILED + 1)); }

# run <stdin-content> -> sets OUT (stdout) and RC (exit code)
run() {
  OUT="$(python3 "$SUT" <<<"$1")"; RC=$?
}

# --- Case 1 — single candidate, no deps ---------------------------------------
TOTAL=$((TOTAL + 1))
run "1 1"
if [ "$RC" -eq 0 ] && [ "$OUT" = "1 1" ]; then pass "single candidate"
else fail "single candidate" "rc=$RC out=<$OUT>"; fi

# --- Case 2 — linear chain 1<-2<-3 --------------------------------------------
TOTAL=$((TOTAL + 1))
run "$(printf '1 1\n2 1 1\n3 1 2\n')"
expected="$(printf '1 1\n2 2\n3 3')"
if [ "$RC" -eq 0 ] && [ "$OUT" = "$expected" ]; then pass "linear chain"
else fail "linear chain" "rc=$RC out=<$OUT>"; fi

# --- Case 3 — diamond, equal touches-count -> tie-break by ascending id ------
TOTAL=$((TOTAL + 1))
run "$(printf '1 1\n2 1 1\n3 1 1\n4 1 2 3\n')"
expected="$(printf '1 1\n2 2\n3 3\n4 4')"
if [ "$RC" -eq 0 ] && [ "$OUT" = "$expected" ]; then pass "diamond, equal touches-count tie-break"
else fail "diamond, equal touches-count tie-break" "rc=$RC out=<$OUT>"; fi

# --- Case 4 — diamond, unequal touches-count -> tie-break by count -----------
TOTAL=$((TOTAL + 1))
run "$(printf '1 1\n2 5 1\n3 1 1\n4 1 2 3\n')"
expected="$(printf '1 1\n2 3\n3 2\n4 4')"
if [ "$RC" -eq 0 ] && [ "$OUT" = "$expected" ]; then pass "diamond, unequal touches-count tie-break"
else fail "diamond, unequal touches-count tie-break" "rc=$RC out=<$OUT>"; fi

# --- Case 5 — 2-node cycle -----------------------------------------------------
TOTAL=$((TOTAL + 1))
run "$(printf '1 1 2\n2 1 1\n')"
if [ "$RC" -eq 1 ] && [ "$OUT" = "CYCLE 1 2" ]; then pass "2-node cycle"
else fail "2-node cycle" "rc=$RC out=<$OUT>"; fi

# --- Case 6 — multi-node cycle coexists with an acyclic prefix ----------------
TOTAL=$((TOTAL + 1))
run "$(printf '1 1\n2 1 1\n3 1 4\n4 1 5\n5 1 3\n')"
if [ "$RC" -eq 1 ] && [ "$OUT" = "CYCLE 3 4 5" ]; then pass "multi-node cycle with acyclic prefix"
else fail "multi-node cycle with acyclic prefix" "rc=$RC out=<$OUT>"; fi

echo ""
if [ "$FAILED" -ne 0 ]; then echo "FAILED ($PASS_COUNT/$TOTAL)"; exit 1; fi
echo "ALL PASS ($PASS_COUNT/$TOTAL)"
