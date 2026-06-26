#!/usr/bin/env bash
# superdev / memory-rules — detect_state.test.sh
#
# Deterministic test runs for detect_state.sh. This repo has no test framework
# (markdown + JSON + bash), so a "test" is a real script run against a scratch
# `.claude/rules/` fixture with an stdout assertion (see plan §8 binding floor).
#
# Contract:
#   input  : none. Builds isolated fixtures under a `mktemp -d` scratch dir
#            (honors $TMPDIR) so the run never touches the real project tree.
#   output : one "PASS: <case>" line per asserted case on stdout, then a final
#            "ALL PASS (N/N)" line. On any mismatch it prints "FAIL: <case>" with
#            the expected vs actual `state:` line and exits non-zero.
#   cases  : (1) nested rule `.claude/rules/<dir>/x.md` -> has-rules, exit 0;
#            (2) frozen-only `_*.md` flat AND nested -> none, exit 0;
#            (3) empty/absent rules dir -> none, exit 0.
#   note   : asserts on the final `state:` line of detect_state.sh stdout AND on
#            its exit code; the scratch dir is removed on exit (trap).
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUT="$SCRIPT_DIR/detect_state.sh"

SCRATCH="$(mktemp -d 2>/dev/null || mktemp -d -t detect_state)"
trap 'rm -rf "$SCRATCH"' EXIT

PASS_COUNT=0
TOTAL=0
FAILED=0

# run_case <name> <fixture-dir> <expected-state>
# fixture-dir is the path passed as $1 to detect_state.sh (its .claude/rules is
# resolved beneath it). Asserts the final `state:` line and exit 0.
run_case() {
    local name="$1" target="$2" expected="$3"
    TOTAL=$((TOTAL + 1))

    local out rc actual
    out="$(bash "$SUT" "$target")"
    rc=$?
    actual="$(printf '%s\n' "$out" | grep '^state:' | tail -n 1)"

    if [ "$rc" -ne 0 ]; then
        echo "FAIL: $name — exit code $rc (expected 0)"
        FAILED=$((FAILED + 1))
        return
    fi
    if [ "$actual" != "state: $expected" ]; then
        echo "FAIL: $name — expected 'state: $expected', got '$actual'"
        FAILED=$((FAILED + 1))
        return
    fi
    echo "PASS: $name"
    PASS_COUNT=$((PASS_COUNT + 1))
}

# Case 1 — nested rule yields has-rules (a flat scan would miss <dir>/x.md).
T1="$SCRATCH/case1"
mkdir -p "$T1/.claude/rules/backend"
printf '# nested rule\n' > "$T1/.claude/rules/backend/api.md"
run_case "nested rule yields has-rules" "$T1" "has-rules"

# Case 2 — only frozen `_*.md` basenames, flat AND nested, yields none.
T2="$SCRATCH/case2"
mkdir -p "$T2/.claude/rules/backend"
printf '# frozen flat\n'   > "$T2/.claude/rules/_skills.md"
printf '# frozen nested\n' > "$T2/.claude/rules/backend/_research.md"
run_case "frozen-only (flat+nested) yields none" "$T2" "none"

# Case 3 — empty/absent rules dir yields none.
T3="$SCRATCH/case3"          # no .claude/rules created at all
mkdir -p "$T3"
run_case "empty/absent dir yields none" "$T3" "none"

echo ""
if [ "$FAILED" -ne 0 ]; then
    echo "FAILED ($PASS_COUNT/$TOTAL)"
    exit 1
fi
echo "ALL PASS ($PASS_COUNT/$TOTAL)"
