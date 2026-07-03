#!/usr/bin/env bash
# superdev / superbuild-runner — persist-report.test.sh
#
# Framework-free harness for persist-report.sh. A "test" runs the real script against a
# `mktemp -d` scratch host and asserts BOTH the 3-line stdout / exit code AND the on-disk
# side effect (byte-exact copy, evidence preserved). Contract: input markdown on stdin +
# a report path arg → verified persistence + a deterministic 3-line projection.
# The final cases (AC5) grep the sibling ../SKILL.md to lock the rewired pipeline contract.
set -u

if ! command -v bash >/dev/null 2>&1; then
    echo "SKIP: bash not available — persist-report.sh untested on this host"
    exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUT="$SCRIPT_DIR/persist-report.sh"
SKILL="$SCRIPT_DIR/../SKILL.md"

SCRATCH="$(mktemp -d 2>/dev/null || mktemp -d -t persistreport)"
trap 'rm -rf "$SCRATCH"' EXIT

PASS_COUNT=0; TOTAL=0; FAILED=0
pass() { echo "PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "FAIL: $1 — $2"; FAILED=$((FAILED + 1)); }

# run <report-path> <stdin-file> — run SUT; sets out, rc.
run() { out="$(bash "$SUT" "$1" < "$2")"; rc=$?; }
want_line() { printf '%s\n' "$out" | grep -qxF "$1"; }   # exact whole line present
want_sub()  { printf '%s\n' "$out" | grep -qF  "$1"; }   # substring present
nlines()    { printf '%s\n' "$out" | grep -c '^'; }

# --- Case 1 — PASS happy path (plain verdict, byte-exact persistence) ----------
TOTAL=$((TOTAL + 1))
d="$SCRATCH/c1"; mkdir -p "$d"
cat > "$d/in.md" <<'EOF'
## Command
- `bash recipe.sh build` (cwd: `(repo root)`)

## Verdict
- PASS (exit code: 0, duration: 9.65s)

## Summary
- dotnet build: Build succeeded
EOF
p="$d/report.md"; run "$p" "$d/in.md"
if [ "$rc" -ne 0 ]; then fail "PASS happy path" "exit $rc (expected 0)"
elif [ ! -f "$p" ] || ! cmp -s "$p" "$d/in.md"; then fail "PASS happy path" "report not written byte-exact"
elif [ "$(nlines)" -ne 3 ]; then fail "PASS happy path" "stdout not exactly 3 lines: <$out>"
elif ! want_line "STATUS: PASS"; then fail "PASS happy path" "missing STATUS: PASS; got: <$out>"
elif ! want_line "Report: $p"; then fail "PASS happy path" "missing Report line"
elif ! want_line "Summary: dotnet build: Build succeeded"; then fail "PASS happy path" "wrong Summary; got: <$out>"
else pass "PASS happy path"; fi

# --- Case 2 — BLOCKED, backtick-styled verdict/summary + Out-of-scope ----------
TOTAL=$((TOTAL + 1))
d="$SCRATCH/c2"; mkdir -p "$d"
cat > "$d/in.md" <<'EOF'
## Verdict
- `BLOCKED` (exit code: `1`, duration: `3.2s`)

## Summary
- `12 passed, 3 failed`

## Out-of-scope
- path: `src/Other/Thing.cs:42`
EOF
p="$d/report.md"; run "$p" "$d/in.md"
if ! cmp -s "$p" "$d/in.md"; then fail "BLOCKED backtick" "report not byte-exact"
elif ! want_line "STATUS: BLOCKED"; then fail "BLOCKED backtick" "backticks not stripped; got: <$out>"
elif ! want_line "Summary: 12 passed, 3 failed"; then fail "BLOCKED backtick" "summary backticks not stripped; got: <$out>"
else pass "BLOCKED backtick"; fi

# --- Case 3 — N/A verdict: multi-word reason reproduced verbatim ---------------
TOTAL=$((TOTAL + 1))
d="$SCRATCH/c3"; mkdir -p "$d"
cat > "$d/in.md" <<'EOF'
## Verdict
- N/A — no suite to run (exit code: 0, duration: 0.1s)

## Summary
- no build/test/lint suite in this repo
EOF
p="$d/report.md"; run "$p" "$d/in.md"
if ! want_line "STATUS: N/A — no suite to run"; then fail "N/A verbatim" "reason not reproduced; got: <$out>"
else pass "N/A verbatim"; fi

# --- Case 4 — FAIL verdict -----------------------------------------------------
TOTAL=$((TOTAL + 1))
d="$SCRATCH/c4"; mkdir -p "$d"
cat > "$d/in.md" <<'EOF'
## Verdict
- FAIL (exit code: 1, duration: 2.0s)

## Failures
- `Foo.Bar.Test` — `expected 1 got 2`

## Summary
- 41 passed, 1 failed
EOF
p="$d/report.md"; run "$p" "$d/in.md"
if ! want_line "STATUS: FAIL"; then fail "FAIL verdict" "got: <$out>"
elif ! want_line "Summary: 41 passed, 1 failed"; then fail "FAIL verdict" "wrong summary; got: <$out>"
else pass "FAIL verdict"; fi

# --- Case 5 — missing ## Verdict → STATUS: ERROR, evidence still persisted -----
TOTAL=$((TOTAL + 1))
d="$SCRATCH/c5"; mkdir -p "$d"
cat > "$d/in.md" <<'EOF'
## Command
- `bash recipe.sh build`

## Summary
- something
EOF
p="$d/report.md"; run "$p" "$d/in.md"
if ! want_line "STATUS: ERROR"; then fail "missing Verdict" "expected STATUS: ERROR; got: <$out>"
elif ! want_sub "Verdict"; then fail "missing Verdict" "reason should name Verdict; got: <$out>"
elif [ ! -f "$p" ] || ! cmp -s "$p" "$d/in.md"; then fail "missing Verdict" "evidence not preserved byte-exact"
else pass "missing Verdict"; fi

# --- Case 6 — Report path is a directory → STATUS: ERROR (not a verdict) -------
TOTAL=$((TOTAL + 1))
d="$SCRATCH/c6"; mkdir -p "$d/report.md" # the report path itself is a directory
cat > "$d/in.md" <<'EOF'
## Verdict
- PASS (exit code: 0)

## Summary
- should never be emitted
EOF
p="$d/report.md"; run "$p" "$d/in.md"
if [ "$rc" -ne 0 ]; then fail "path is directory" "exit $rc (expected 0)"
elif ! want_line "STATUS: ERROR"; then fail "path is directory" "expected STATUS: ERROR; got: <$out>"
elif want_line "STATUS: PASS"; then fail "path is directory" "leaked a PASS verdict for an unwritten report"
else pass "path is directory"; fi

# --- Case 7 — empty stdin → STATUS: ERROR (empty file is not persisted) --------
TOTAL=$((TOTAL + 1))
d="$SCRATCH/c7"; mkdir -p "$d"; : > "$d/empty.md"
p="$d/report.md"; run "$p" "$d/empty.md"
if ! want_line "STATUS: ERROR"; then fail "empty stdin" "expected STATUS: ERROR; got: <$out>"
else pass "empty stdin"; fi

# --- Case 8 — missing argv → exit 2, no verdict --------------------------------
TOTAL=$((TOTAL + 1))
out="$(bash "$SUT" < /dev/null)"; rc=$?
if [ "$rc" -ne 2 ]; then fail "missing argv" "exit $rc (expected 2)"
elif want_sub "STATUS:"; then fail "missing argv" "emitted a verdict on bad argv: <$out>"
else pass "missing argv"; fi

# --- Case 9 — Summary with parentheses preserved verbatim ----------------------
TOTAL=$((TOTAL + 1))
d="$SCRATCH/c9"; mkdir -p "$d"
cat > "$d/in.md" <<'EOF'
## Verdict
- PASS (exit code: 0, duration: 1.2s)

## Summary
- eslint: 0 problems (0 errors, 0 warnings)
EOF
p="$d/report.md"; run "$p" "$d/in.md"
if ! want_line "STATUS: PASS"; then fail "summary parens" "got: <$out>"
elif ! want_line "Summary: eslint: 0 problems (0 errors, 0 warnings)"; then fail "summary parens" "parens not preserved; got: <$out>"
else pass "summary parens"; fi

# --- Case 10 — CRLF report: CR stripped for parse, bytes preserved on disk -----
TOTAL=$((TOTAL + 1))
d="$SCRATCH/c10"; mkdir -p "$d"
printf '## Verdict\r\n- PASS (exit code: 0)\r\n\r\n## Summary\r\n- crlf ok\r\n' > "$d/in.md"
p="$d/report.md"; run "$p" "$d/in.md"
if ! cmp -s "$p" "$d/in.md"; then fail "CRLF report" "CRLF bytes not preserved on disk"
elif ! want_line "STATUS: PASS"; then fail "CRLF report" "CR not stripped for parse; got: <$out>"
elif ! want_line "Summary: crlf ok"; then fail "CRLF report" "summary CR not stripped; got: <$out>"
else pass "CRLF report"; fi

# --- Case 11 — missing parent dir: script's own mkdir -p lands the report ------
TOTAL=$((TOTAL + 1))
d="$SCRATCH/c11"; mkdir -p "$d"
cat > "$d/in.md" <<'EOF'
## Verdict
- PASS (exit code: 0)

## Summary
- nested ok
EOF
p="$d/sub/nested/report.md" # parent dirs absent — persist-report.sh must create them
run "$p" "$d/in.md"
if [ ! -f "$p" ] || ! cmp -s "$p" "$d/in.md"; then fail "missing parent dir" "report not created under absent parents"
elif ! want_line "STATUS: PASS"; then fail "missing parent dir" "got: <$out>"
else pass "missing parent dir"; fi

# --- Case 12 — AC5: ../SKILL.md rewired (Write gone, script + inline clause) ---
TOTAL=$((TOTAL + 1))
if [ ! -f "$SKILL" ]; then fail "SKILL rewired" "SKILL.md not found at $SKILL"
elif grep -E '^allowed-tools:' "$SKILL" | grep -q 'Write'; then fail "SKILL rewired" "allowed-tools still lists Write"
elif ! grep -q 'persist-report.sh' "$SKILL"; then fail "SKILL rewired" "pipeline mode does not invoke persist-report.sh"
elif ! grep -q 'do NOT persist anything' "$SKILL"; then fail "SKILL rewired" "inline mode stdout-only clause missing"
else pass "SKILL rewired"; fi

echo ""
if [ "$FAILED" -ne 0 ]; then echo "FAILED ($PASS_COUNT/$TOTAL)"; exit 1; fi
echo "ALL PASS ($PASS_COUNT/$TOTAL)"
