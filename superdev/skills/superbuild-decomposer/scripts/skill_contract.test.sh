#!/usr/bin/env bash
# superdev / superbuild-decomposer — skill_contract.test.sh
#
# Reproducible grep-assertions over the rewritten ../SKILL.md — committed evidence
# for the structural (non-scriptable) half of the prose change, instead of a
# one-off desk-check. Asserts the dead tokens of the old free-form contract are
# GONE and the load-bearing new tokens are PRESENT.
#
# Contract:
#   input  : none. Reads ../SKILL.md relative to this script.
#   output : "PASS: <case>" per assertion, then "ALL PASS (N/N)"; any mismatch
#            prints "FAIL: <case> — <detail>" and exits non-zero.
#   absent : `.claude/skills`, `Imperative`, `any markdown`, `no structural
#            section`, `Step 7.0b` (old free-form / imperative-detection contract).
#   present: the `§4 test strategy` binding-floor citation; `${CLAUDE_PLUGIN_ROOT}`
#            in the script call sites.
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL="$SCRIPT_DIR/../SKILL.md"

PASS_COUNT=0; TOTAL=0; FAILED=0
pass() { echo "PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "FAIL: $1 — $2"; FAILED=$((FAILED + 1)); }

if [ ! -f "$SKILL" ]; then echo "FAIL: SKILL.md not found at $SKILL"; exit 1; fi

# assert_absent <case> <fixed-string>   (case-sensitive)
assert_absent() {
  TOTAL=$((TOTAL + 1))
  if grep -qF -- "$2" "$SKILL"; then
    fail "$1" "token still present: '$2' (line $(grep -nF -- "$2" "$SKILL" | head -1 | cut -d: -f1))"
  else pass "$1"; fi
}
# assert_present <case> <fixed-string>
assert_present() {
  TOTAL=$((TOTAL + 1))
  if grep -qF -- "$2" "$SKILL"; then pass "$1"
  else fail "$1" "token missing: '$2'"; fi
}

assert_absent  "no .claude/skills source"        ".claude/skills"
assert_absent  "no Imperative directive token"   "Imperative"
assert_absent  "no 'any markdown' framing"       "any markdown"
assert_absent  "no 'no structural section'"      "no structural section"
assert_absent  "no Step 7.0b reference"          "Step 7.0b"

assert_present "binding floor cites §4 test strategy" '§4 test strategy'
assert_present "script call sites use CLAUDE_PLUGIN_ROOT" '${CLAUDE_PLUGIN_ROOT}'

echo ""
if [ "$FAILED" -ne 0 ]; then echo "FAILED ($PASS_COUNT/$TOTAL)"; exit 1; fi
echo "ALL PASS ($PASS_COUNT/$TOTAL)"
