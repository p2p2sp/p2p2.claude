#!/usr/bin/env bash
# superdev / read-config.test.sh
#
# Deterministic test runs for read-config.sh's switch resolution. This repo has
# no test framework (markdown + JSON + bash), so a "test" is a real script run
# against a `mktemp -d` scratch project root (cwd = scratch) with stdout + exit
# assertions.
#
# Contract:
#   input  : none. Builds an isolated scratch project root under `mktemp -d`
#            (honors $TMPDIR) per case and runs read-config.sh from there.
#   output : one "PASS: <case>" line per asserted case, then a final
#            "ALL PASS (N/N)" line; any mismatch prints "FAIL: <case>" + detail
#            and exits non-zero.
#   cases  : (1) missing-file: no .superdev/config.yml -> all three keys false,
#                exit 0 (fail-open — the core requirement);
#            (2) all-true: every key set true -> all three true;
#            (3) mixed + comments: seeded-asset shape (adr false, rules true,
#                trailing `# comment`, memory absent) -> adr false, rules true,
#                memory false (absent key = false);
#            (4) non-true values ignored: `yes`/`1`/`True-ish` garbage never
#                resolves to true; only a bare `true` does;
#            (5) fixed shape: header + exactly adr/rules/memory lines in order.
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUT="$SCRIPT_DIR/read-config.sh"

SCRATCH="$(mktemp -d 2>/dev/null || mktemp -d -t readconfig)"
trap 'rm -rf "$SCRATCH"' EXIT

PASS_COUNT=0
TOTAL=0
FAILED=0

pass() { echo "PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "FAIL: $1 — $2"; FAILED=$((FAILED + 1)); }

# Case 1 — missing file: no config -> all false, exit 0 (fail-open).
TOTAL=$((TOTAL + 1))
T1="$SCRATCH/case1"
mkdir -p "$T1"
out="$(cd "$T1" && bash "$SUT")"; rc=$?
if [ "$rc" -ne 0 ]; then
    fail "missing file -> all false" "exit code $rc (expected 0)"
elif [ "$(printf '%s\n' "$out" | grep -c 'true')" -ne 0 ]; then
    fail "missing file -> all false" "some key resolved true without a config file"
elif ! printf '%s\n' "$out" | grep -qxF "adr: false" \
    || ! printf '%s\n' "$out" | grep -qxF "rules: false" \
    || ! printf '%s\n' "$out" | grep -qxF "memory: false"; then
    fail "missing file -> all false" "expected adr/rules/memory all false; got: $out"
else
    pass "missing file -> all false"
fi

# Case 2 — all true.
TOTAL=$((TOTAL + 1))
T2="$SCRATCH/case2"
mkdir -p "$T2/.superdev"
printf 'adr: true\nrules: true\nmemory: true\n' > "$T2/.superdev/config.yml"
out="$(cd "$T2" && bash "$SUT")"; rc=$?
if [ "$rc" -ne 0 ]; then
    fail "all true" "exit code $rc (expected 0)"
elif ! printf '%s\n' "$out" | grep -qxF "adr: true" \
    || ! printf '%s\n' "$out" | grep -qxF "rules: true" \
    || ! printf '%s\n' "$out" | grep -qxF "memory: true"; then
    fail "all true" "expected all three true; got: $out"
else
    pass "all true"
fi

# Case 3 — mixed with a trailing comment + an absent key (the seeded-asset shape).
TOTAL=$((TOTAL + 1))
T3="$SCRATCH/case3"
mkdir -p "$T3/.superdev"
printf '# SuperDev Config\nadr:     false   # ADR capture\nrules:   true    # Rules system\n' > "$T3/.superdev/config.yml"
out="$(cd "$T3" && bash "$SUT")"; rc=$?
if [ "$rc" -ne 0 ]; then
    fail "mixed + absent key" "exit code $rc (expected 0)"
elif ! printf '%s\n' "$out" | grep -qxF "adr: false"; then
    fail "mixed + absent key" "adr should be false"
elif ! printf '%s\n' "$out" | grep -qxF "rules: true"; then
    fail "mixed + absent key" "rules should be true (trailing comment tolerated)"
elif ! printf '%s\n' "$out" | grep -qxF "memory: false"; then
    fail "mixed + absent key" "absent memory key should resolve false"
else
    pass "mixed + absent key"
fi

# Case 4 — non-true values never resolve true; only a bare `true` does.
TOTAL=$((TOTAL + 1))
T4="$SCRATCH/case4"
mkdir -p "$T4/.superdev"
printf 'adr: yes\nrules: 1\nmemory: truthy\n' > "$T4/.superdev/config.yml"
out="$(cd "$T4" && bash "$SUT")"; rc=$?
if [ "$rc" -ne 0 ]; then
    fail "non-true values ignored" "exit code $rc (expected 0)"
elif [ "$(printf '%s\n' "$out" | grep -c 'true')" -ne 0 ]; then
    fail "non-true values ignored" "yes/1/truthy must not resolve to true; got: $out"
else
    pass "non-true values ignored"
fi

# Case 5 — fixed output shape: header + exactly the three keys, in order.
TOTAL=$((TOTAL + 1))
T5="$SCRATCH/case5"
mkdir -p "$T5"
out="$(cd "$T5" && bash "$SUT")"; rc=$?
body="$(printf '%s\n' "$out" | grep -vE '^#')"
expected="$(printf 'adr: false\nrules: false\nmemory: false')"
if [ "$rc" -ne 0 ]; then
    fail "fixed shape" "exit code $rc (expected 0)"
elif ! printf '%s\n' "$out" | grep -qF "# superdev config (resolved)"; then
    fail "fixed shape" "missing header line"
elif [ "$body" != "$expected" ]; then
    fail "fixed shape" "key lines/order differ; got: $body"
else
    pass "fixed shape"
fi

echo ""
if [ "$FAILED" -ne 0 ]; then
    echo "FAILED ($PASS_COUNT/$TOTAL)"
    exit 1
fi
echo "ALL PASS ($PASS_COUNT/$TOTAL)"
