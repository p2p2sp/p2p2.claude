#!/usr/bin/env bash
# superdev / memory-rules — scan_extensions.test.sh
#
# Deterministic test runs for scan_extensions.sh. This repo has no test framework
# (markdown + JSON + bash), so a "test" is a real script run against a scratch
# fixture with an stdout/exit assertion (see plan §8 binding floor).
#
# Contract:
#   input  : none. Builds isolated fixtures under a `mktemp -d` scratch dir
#            (honors $TMPDIR) so the run never touches the real project tree.
#   output : one "PASS: <case>" line per asserted case on stdout, then a final
#            "ALL PASS (N/N)" line. On any mismatch it prints "FAIL: <case>" with
#            the expected vs actual detail and exits non-zero.
#   cases  : (1) git repo, mixed extensions -> "count  ext" lines sorted desc, ext0;
#            (2) non-git dir -> find+FIND_EXCLUDES fallback, non-empty histogram, 0;
#            (3) extension-less file (Makefile) absent from the histogram, exit 0;
#            (4) empty git repo / no tracked files -> empty stdout, exit 0.
#   note   : asserts on scan_extensions.sh stdout AND exit code; the scratch dir is
#            removed on exit (trap). Git fixtures get a throwaway identity so the
#            run works on a machine with no global git config.
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUT="$SCRIPT_DIR/scan_extensions.sh"

SCRATCH="$(mktemp -d 2>/dev/null || mktemp -d -t scan_extensions)"
trap 'rm -rf "$SCRATCH"' EXIT

PASS_COUNT=0
TOTAL=0
FAILED=0

pass() { echo "PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "FAIL: $1"; FAILED=$((FAILED + 1)); }

# git_init <dir> — init a repo with a throwaway identity (no global config needed).
git_init() {
    git -C "$1" init -q
    git -C "$1" config user.email "t@t.t"
    git -C "$1" config user.name "t"
}

# --- Case 1 — git repo, mixed extensions: "count  ext" lines sorted desc, exit 0 -
T1="$SCRATCH/case1"
mkdir -p "$T1/src"
printf 'a\n' > "$T1/src/a.sh"
printf 'b\n' > "$T1/src/b.sh"
printf 'c\n' > "$T1/src/c.sh"        # 3x sh
printf 'd\n' > "$T1/src/d.md"
printf 'e\n' > "$T1/src/e.md"        # 2x md
printf 'f\n' > "$T1/src/f.json"      # 1x json
git_init "$T1"
git -C "$T1" add -A
git -C "$T1" commit -qm init
TOTAL=$((TOTAL + 1))
out="$(cd "$T1" && bash "$SUT")"; rc=$?
# expected exact histogram, sorted descending by count
expected="$(printf '%s\n' '      3 sh' '      2 md' '      1 json')"
if [ "$rc" -ne 0 ]; then
    fail "git-path histogram sorted desc — exit $rc (expected 0)"
elif [ "$out" != "$expected" ]; then
    fail "git-path histogram sorted desc — got:
$out
expected:
$expected"
else
    pass "git-path histogram sorted desc"
fi

# --- Case 2 — non-git dir: find+FIND_EXCLUDES fallback, non-empty histogram, 0 ---
T2="$SCRATCH/case2"                  # NO git init
mkdir -p "$T2/src"
printf 'a\n' > "$T2/src/a.py"
printf 'b\n' > "$T2/src/b.py"
TOTAL=$((TOTAL + 1))
out="$(cd "$T2" && bash "$SUT")"; rc=$?
if [ "$rc" -ne 0 ]; then
    fail "non-git find fallback — exit $rc (expected 0)"
elif [ -z "$out" ]; then
    fail "non-git find fallback — empty histogram (expected non-empty)"
elif ! printf '%s\n' "$out" | grep -q ' py$'; then
    fail "non-git find fallback — 'py' missing from histogram:
$out"
else
    pass "non-git find fallback"
fi

# --- Case 3 — extension-less file (Makefile) absent from histogram, exit 0 -------
T3="$SCRATCH/case3"
mkdir -p "$T3"
printf 'all:\n' > "$T3/Makefile"     # no extension
printf 'x\n'    > "$T3/x.go"
git_init "$T3"
git -C "$T3" add -A
git -C "$T3" commit -qm init
TOTAL=$((TOTAL + 1))
out="$(cd "$T3" && bash "$SUT")"; rc=$?
if [ "$rc" -ne 0 ]; then
    fail "extension-less file not counted — exit $rc (expected 0)"
elif printf '%s\n' "$out" | grep -qiE '(makefile|all:)'; then
    fail "extension-less file not counted — Makefile leaked into histogram:
$out"
elif ! printf '%s\n' "$out" | grep -q ' go$'; then
    fail "extension-less file not counted — 'go' missing (sanity):
$out"
else
    pass "extension-less file not counted"
fi

# --- Case 4 — empty git repo / no tracked files: empty stdout, exit 0 -----------
T4="$SCRATCH/case4"
mkdir -p "$T4"
git_init "$T4"                       # repo with zero tracked files
TOTAL=$((TOTAL + 1))
out="$(cd "$T4" && bash "$SUT")"; rc=$?
if [ "$rc" -ne 0 ]; then
    fail "empty repo exits 0 with no lines — exit $rc (expected 0)"
elif [ -n "$out" ]; then
    fail "empty repo exits 0 with no lines — expected empty stdout, got:
$out"
else
    pass "empty repo exits 0 with no lines"
fi

echo ""
if [ "$FAILED" -ne 0 ]; then
    echo "FAILED ($PASS_COUNT/$TOTAL)"
    exit 1
fi
echo "ALL PASS ($PASS_COUNT/$TOTAL)"
