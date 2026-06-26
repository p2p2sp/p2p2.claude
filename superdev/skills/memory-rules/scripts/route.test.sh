#!/usr/bin/env bash
# superdev / memory-rules — route.test.sh
#
# Deterministic test runs for route.sh. This repo has no test framework
# (markdown + JSON + bash), so a "test" is a real script run against a scratch
# fixture with an stdout assertion.
#
# Contract:
#   input  : none. Builds isolated fixtures under a `mktemp -d` scratch dir
#            (honors $TMPDIR) so the run never touches the real project tree.
#   output : one "PASS: <case>" line per asserted case on stdout, then a final
#            "ALL PASS (N/N)" line. On any mismatch it prints "FAIL: <case>" and
#            exits non-zero.
#   cases  : (1) "Mode: improver" arg -> first line "MODE: C", body from mode-c;
#            (2) scratch w/o .claude/rules -> "MODE: A" + "state: none", mode-a;
#            (3) scratch w/ a rule        -> "MODE: B" + "state: has-rules", mode-b;
#            (4) empty arg from a rules-less CWD -> "MODE: A" (fail-open default).
#   note   : routing keys only on the leading "Mode: improver" marker and on
#            detect_state.sh's state; the scratch dir is removed on exit (trap).
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUT="$SCRIPT_DIR/route.sh"

SCRATCH="$(mktemp -d 2>/dev/null || mktemp -d -t route)"
trap 'rm -rf "$SCRATCH"' EXIT

PASS_COUNT=0
TOTAL=0
FAILED=0

# assert_line <name> <full-output> <exact-line-that-must-be-present>
assert_line() {
    local name="$1" out="$2" needle="$3"
    TOTAL=$((TOTAL + 1))
    if printf '%s\n' "$out" | grep -qxF "$needle"; then
        echo "PASS: $name"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo "FAIL: $name — missing line '$needle'"
        FAILED=$((FAILED + 1))
    fi
}

# Case 1 — improver marker routes to Mode C (body comes from mode-c.md).
OUT1="$(sh "$SUT" "$(printf 'Mode: improver\nReport path: /x\n\n## Learnings\n- foo')")"
assert_line "improver marker -> MODE: C"          "$OUT1" "MODE: C"
assert_line "Mode C body is mode-c.md"            "$OUT1" "# Mode C — improver-driven authoring (fork)"

# Case 2 — bootstrap, no .claude/rules -> Mode A.
T2="$SCRATCH/case2"; mkdir -p "$T2"
OUT2="$(sh "$SUT" "$T2")"
assert_line "no rules dir -> MODE: A"             "$OUT2" "MODE: A"
assert_line "no rules dir -> state: none"         "$OUT2" "state: none"
assert_line "Mode A body is mode-a.md"            "$OUT2" "# Mode A — uninitialized bootstrap (full reset, plan mode)"

# Case 3 — bootstrap, a rule exists -> Mode B.
T3="$SCRATCH/case3"; mkdir -p "$T3/.claude/rules"
printf '# a rule\n' > "$T3/.claude/rules/foo.md"
OUT3="$(sh "$SUT" "$T3")"
assert_line "rule present -> MODE: B"              "$OUT3" "MODE: B"
assert_line "rule present -> state: has-rules"     "$OUT3" "state: has-rules"
assert_line "Mode B body is mode-b.md"            "$OUT3" "# Mode B — initialized gap-fill (append-only, plan mode)"

# Case 4 — empty arg from a rules-less CWD -> Mode A (fail-open default path ".").
T4="$SCRATCH/case4"; mkdir -p "$T4"
OUT4="$(cd "$T4" && sh "$SUT" "")"
assert_line "empty arg -> MODE: A"                "$OUT4" "MODE: A"

echo ""
if [ "$FAILED" -ne 0 ]; then
    echo "FAILED ($PASS_COUNT/$TOTAL)"
    exit 1
fi
echo "ALL PASS ($PASS_COUNT/$TOTAL)"
