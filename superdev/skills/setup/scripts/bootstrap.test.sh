#!/usr/bin/env bash
# superdev / setup — bootstrap.test.sh
#
# Deterministic test runs for bootstrap.sh's config.yml + .gitattributes seeding
# behavior. This repo has no test framework (markdown + JSON + bash), so a
# "test" is a real script run against a `mktemp -d` scratch project root with
# stdout + file-state assertions (see plan §8 binding floor).
#
# Contract:
#   input  : none. Builds an isolated scratch project root under `mktemp -d`
#            (honors $TMPDIR) per case and runs bootstrap.sh from there (cwd =
#            scratch root) so the run never touches the real project tree.
#   output : one "PASS: <case>" line per asserted case on stdout, then a final
#            "ALL PASS (N/N)" line. On any mismatch it prints "FAIL: <case>" with
#            the expected vs actual detail and exits non-zero.
#   cases  : (1) seed-when-absent: no .superdev/config.yml -> bootstrap copies the
#                asset, prints the "seeded from template — defaults: adr=false,
#                rules=false" line, exit 0;
#            (2) never-overwrite-when-present: a pre-existing config.yml (flipped
#                switch) is byte-unchanged, prints "already present (left
#                untouched) — current switches:", exit 0;
#            (3) idempotency: two runs in a row leave the seeded config.yml
#                unchanged on the second run and report already-present;
#            (4) legacy-key reconcile: the present-path switch grep reports only
#                the documented keys (adr, rules, memory), never legacy
#                artifacts|help|ui, even when the config carries those legacy keys;
#            (5) .gitattributes seed-when-absent: no .gitattributes -> created with
#                both .superdev/** linguist-generated lines + "created" report;
#            (6) .gitattributes append preserves unrelated rules: an existing file
#                gains both lines, its unrelated rule survives, "appended" report;
#            (7) .gitattributes append only the missing line: with one line already
#                present, only the other is added (no duplicate), "appended";
#            (8) .gitattributes idempotent: a second run reports already-present,
#                adds no duplicate, leaves the file byte-unchanged.
#   note   : asserts on bootstrap.sh stdout AND exit code AND on-disk file state;
#            each scratch dir is removed on exit (trap).
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUT="$SCRIPT_DIR/bootstrap.sh"
ASSET="$(cd "$SCRIPT_DIR/.." && pwd)/assets/config.yml"

SCRATCH="$(mktemp -d 2>/dev/null || mktemp -d -t bootstrap)"
trap 'rm -rf "$SCRATCH"' EXIT

PASS_COUNT=0
TOTAL=0
FAILED=0

pass() { echo "PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "FAIL: $1 — $2"; FAILED=$((FAILED + 1)); }

# Case 1 — seed-when-absent: no config.yml -> asset copied + seeded report + exit 0.
TOTAL=$((TOTAL + 1))
T1="$SCRATCH/case1"
mkdir -p "$T1"
out="$(cd "$T1" && bash "$SUT")"; rc=$?
if [ "$rc" -ne 0 ]; then
    fail "seed when absent" "exit code $rc (expected 0)"
elif [ ! -f "$T1/.superdev/config.yml" ]; then
    fail "seed when absent" ".superdev/config.yml was not created"
elif ! printf '%s\n' "$out" | grep -qF "config.yml: seeded from template — defaults: adr=false, rules=false"; then
    fail "seed when absent" "missing seeded report line; got: $(printf '%s\n' "$out" | grep -i config.yml)"
elif ! cmp -s "$ASSET" "$T1/.superdev/config.yml"; then
    fail "seed when absent" "seeded config.yml differs from the asset"
else
    pass "seed when absent"
fi

# Case 2 — never-overwrite-when-present: a pre-existing config (flipped switch) is
# byte-unchanged and the present report line + grep is printed, exit 0.
TOTAL=$((TOTAL + 1))
T2="$SCRATCH/case2"
mkdir -p "$T2/.superdev"
printf 'adr:    false\nrules:  true\n' > "$T2/.superdev/config.yml"
before="$(cat "$T2/.superdev/config.yml")"
out="$(cd "$T2" && bash "$SUT")"; rc=$?
after="$(cat "$T2/.superdev/config.yml")"
if [ "$rc" -ne 0 ]; then
    fail "never overwrite when present" "exit code $rc (expected 0)"
elif [ "$before" != "$after" ]; then
    fail "never overwrite when present" "config.yml was modified (expected byte-unchanged)"
elif ! printf '%s\n' "$out" | grep -qF "config.yml: already present (left untouched) — current switches:"; then
    fail "never overwrite when present" "missing present report line"
elif ! printf '%s\n' "$out" | grep -qE '^[[:space:]]*adr:[[:space:]]*false'; then
    fail "never overwrite when present" "current switches not grep'd into output"
else
    pass "never overwrite when present"
fi

# Case 3 — idempotency: two runs in a row leave the seeded config unchanged on the
# second run and report already-present.
TOTAL=$((TOTAL + 1))
T3="$SCRATCH/case3"
mkdir -p "$T3"
( cd "$T3" && bash "$SUT" >/dev/null ); rc1=$?
first="$(cat "$T3/.superdev/config.yml" 2>/dev/null)"
out="$(cd "$T3" && bash "$SUT")"; rc2=$?
second="$(cat "$T3/.superdev/config.yml" 2>/dev/null)"
if [ "$rc1" -ne 0 ] || [ "$rc2" -ne 0 ]; then
    fail "idempotent on second run" "exit codes $rc1/$rc2 (expected 0/0)"
elif [ "$first" != "$second" ]; then
    fail "idempotent on second run" "config.yml changed on the second run"
elif ! printf '%s\n' "$out" | grep -qF "config.yml: already present (left untouched) — current switches:"; then
    fail "idempotent on second run" "second run did not report already-present"
else
    pass "idempotent on second run"
fi

# Case 4 — legacy-key reconcile: with a config carrying legacy keys, the present-path
# grep reports only adr + rules + memory, never artifacts|help|ui, and the output
# never carries the stale "5 switches" text.
TOTAL=$((TOTAL + 1))
T4="$SCRATCH/case4"
mkdir -p "$T4/.superdev"
printf 'adr: true\nartifacts: true\nhelp: true\nrules: true\nmemory: true\nui: true\n' > "$T4/.superdev/config.yml"
out="$(cd "$T4" && bash "$SUT")"; rc=$?
config_lines="$(printf '%s\n' "$out" | grep -E '^[[:space:]]*(adr|artifacts|help|rules|memory|ui):')"
if [ "$rc" -ne 0 ]; then
    fail "switches report limited to adr+rules+memory" "exit code $rc (expected 0)"
elif printf '%s\n' "$config_lines" | grep -qE '^[[:space:]]*(artifacts|help|ui):'; then
    fail "switches report limited to adr+rules+memory" "legacy keys leaked into the switch report"
elif printf '%s\n' "$out" | grep -qiF "5 switches"; then
    fail "switches report limited to adr+rules+memory" "stale '5 switches' text present"
elif ! printf '%s\n' "$config_lines" | grep -qE '^[[:space:]]*adr:' \
    || ! printf '%s\n' "$config_lines" | grep -qE '^[[:space:]]*rules:' \
    || ! printf '%s\n' "$config_lines" | grep -qE '^[[:space:]]*memory:'; then
    fail "switches report limited to adr+rules+memory" "expected adr + rules + memory in the switch report"
else
    pass "switches report limited to adr+rules+memory"
fi

# Case 5 — .gitattributes seed-when-absent: no .gitattributes -> created with both
# linguist-generated lines + "created" report, exit 0.
TOTAL=$((TOTAL + 1))
T5="$SCRATCH/case5"
mkdir -p "$T5"
out="$(cd "$T5" && bash "$SUT")"; rc=$?
if [ "$rc" -ne 0 ]; then
    fail ".gitattributes seed when absent" "exit code $rc (expected 0)"
elif [ ! -f "$T5/.gitattributes" ]; then
    fail ".gitattributes seed when absent" ".gitattributes was not created"
elif ! grep -qE '^\.superdev/\*\*[[:space:]]+linguist-generated=true$' "$T5/.gitattributes"; then
    fail ".gitattributes seed when absent" "missing .superdev/** line"
elif ! grep -qE '^\.superdev/\.workflows/\*\*[[:space:]]+linguist-generated=true$' "$T5/.gitattributes"; then
    fail ".gitattributes seed when absent" "missing .superdev/.workflows/** line"
elif ! printf '%s\n' "$out" | grep -qF ".gitattributes: created with linguist-generated rules"; then
    fail ".gitattributes seed when absent" "missing created report line"
else
    pass ".gitattributes seed when absent"
fi

# Case 6 — .gitattributes append preserves unrelated rules: an existing file with an
# unrelated rule gains both lines, the unrelated rule survives, "appended" report.
TOTAL=$((TOTAL + 1))
T6="$SCRATCH/case6"
mkdir -p "$T6"
printf '*.png binary\n' > "$T6/.gitattributes"
out="$(cd "$T6" && bash "$SUT")"; rc=$?
if [ "$rc" -ne 0 ]; then
    fail ".gitattributes append preserves unrelated" "exit code $rc (expected 0)"
elif ! grep -qxF '*.png binary' "$T6/.gitattributes"; then
    fail ".gitattributes append preserves unrelated" "unrelated rule was lost"
elif ! grep -qE '^\.superdev/\*\*[[:space:]]+linguist-generated=true$' "$T6/.gitattributes"; then
    fail ".gitattributes append preserves unrelated" "missing .superdev/** line"
elif ! grep -qE '^\.superdev/\.workflows/\*\*[[:space:]]+linguist-generated=true$' "$T6/.gitattributes"; then
    fail ".gitattributes append preserves unrelated" "missing .superdev/.workflows/** line"
elif ! printf '%s\n' "$out" | grep -qF ".gitattributes: linguist-generated rules appended"; then
    fail ".gitattributes append preserves unrelated" "missing appended report line"
else
    pass ".gitattributes append preserves unrelated"
fi

# Case 7 — .gitattributes append only the missing line: seed both, strip the
# workflows line, re-run -> only that line is re-added (kept line not duplicated).
TOTAL=$((TOTAL + 1))
T7="$SCRATCH/case7"
mkdir -p "$T7"
( cd "$T7" && bash "$SUT" >/dev/null )
grep -vE '\.workflows' "$T7/.gitattributes" > "$T7/ga.tmp" && mv "$T7/ga.tmp" "$T7/.gitattributes"
out="$(cd "$T7" && bash "$SUT")"; rc=$?
n1="$(grep -cE '^\.superdev/\*\*[[:space:]]+linguist-generated=true$' "$T7/.gitattributes")"
if [ "$rc" -ne 0 ]; then
    fail ".gitattributes append only missing" "exit code $rc (expected 0)"
elif [ "$n1" -ne 1 ]; then
    fail ".gitattributes append only missing" "kept line duplicated ($n1 copies)"
elif ! grep -qE '^\.superdev/\.workflows/\*\*[[:space:]]+linguist-generated=true$' "$T7/.gitattributes"; then
    fail ".gitattributes append only missing" "missing line was not re-appended"
elif ! printf '%s\n' "$out" | grep -qF ".gitattributes: linguist-generated rules appended"; then
    fail ".gitattributes append only missing" "missing appended report line"
else
    pass ".gitattributes append only missing"
fi

# Case 8 — .gitattributes idempotent: a second run reports already-present, adds no
# duplicate, leaves the file byte-unchanged.
TOTAL=$((TOTAL + 1))
T8="$SCRATCH/case8"
mkdir -p "$T8"
( cd "$T8" && bash "$SUT" >/dev/null )
ga_first="$(cat "$T8/.gitattributes")"
out="$(cd "$T8" && bash "$SUT")"; rc=$?
ga_second="$(cat "$T8/.gitattributes")"
n1="$(grep -cE '^\.superdev/\*\*[[:space:]]+linguist-generated=true$' "$T8/.gitattributes")"
if [ "$rc" -ne 0 ]; then
    fail ".gitattributes idempotent" "exit code $rc (expected 0)"
elif [ "$ga_first" != "$ga_second" ]; then
    fail ".gitattributes idempotent" ".gitattributes changed on the second run"
elif [ "$n1" -ne 1 ]; then
    fail ".gitattributes idempotent" ".superdev/** line duplicated ($n1 copies)"
elif ! printf '%s\n' "$out" | grep -qF ".gitattributes: linguist-generated rules already present"; then
    fail ".gitattributes idempotent" "second run did not report already-present"
else
    pass ".gitattributes idempotent"
fi

echo ""
if [ "$FAILED" -ne 0 ]; then
    echo "FAILED ($PASS_COUNT/$TOTAL)"
    exit 1
fi
echo "ALL PASS ($PASS_COUNT/$TOTAL)"
