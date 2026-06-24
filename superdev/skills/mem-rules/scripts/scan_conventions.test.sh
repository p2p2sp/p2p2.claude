#!/usr/bin/env bash
# superdev / mem-rules — scan_conventions.test.sh
#
# Deterministic test runs for scan_conventions.sh. This repo has no test framework
# (markdown + JSON + bash), so a "test" is a real script run against a scratch
# fixture with an stdout/exit assertion (see plan §8 binding floor).
#
# Contract:
#   input  : none. Builds isolated git fixtures under a `mktemp -d` scratch dir
#            (honors $TMPDIR) so the run never touches the real project tree.
#   output : one "PASS: <case>" line per asserted case on stdout, then a final
#            "ALL PASS (N/N)" line. On any mismatch it prints "FAIL: <case>" with
#            the expected vs actual detail and exits non-zero.
#   cases  : (1) no-`--` backward-compat: signal-file-only invocation emits the
#                same section headers as today and NO "Files by extension" block,
#                exit 0;
#            (2) with `-- "**/*.sh"` the output additionally contains a
#                "=== Files by extension: **/*.sh ===" block listing tracked .sh
#                paths, exit 0;
#            (3) per-glob list is capped — a broad glob over many files emits at
#                most the documented cap of entries, exit 0.
#   note   : asserts on scan_conventions.sh stdout AND exit code; the scratch dir
#            is removed on exit (trap). Git fixtures get a throwaway identity so
#            the run works on a machine with no global git config.
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUT="$SCRIPT_DIR/scan_conventions.sh"
CAP=50

SCRATCH="$(mktemp -d 2>/dev/null || mktemp -d -t scan_conventions)"
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

# --- Case 1 — no-`--` backward-compat: same headers, no extension block, exit 0 --
T1="$SCRATCH/case1"
mkdir -p "$T1/src"
printf 'rule: 1\n' > "$T1/.editorconfig"   # a signal file
printf 'a\n' > "$T1/src/a.sh"
git_init "$T1"
git -C "$T1" add -A
git -C "$T1" commit -qm init
TOTAL=$((TOTAL + 1))
out="$(cd "$T1" && bash "$SUT" .editorconfig)"; rc=$?
if [ "$rc" -ne 0 ]; then
    fail "no-- output structurally identical — exit $rc (expected 0)"
elif printf '%s\n' "$out" | grep -q 'Files by extension'; then
    fail "no-- output structurally identical — unexpected 'Files by extension' block:
$out"
elif ! printf '%s\n' "$out" | grep -qF '=== .editorconfig ==='; then
    fail "no-- output structurally identical — signal-file header missing:
$out"
elif ! printf '%s\n' "$out" | grep -qF '=== git log --oneline -20 ==='; then
    fail "no-- output structurally identical — git log header missing:
$out"
elif ! printf '%s\n' "$out" | grep -qF '=== CLAUDE.md inventory ==='; then
    fail "no-- output structurally identical — CLAUDE.md inventory header missing:
$out"
elif ! printf '%s\n' "$out" | grep -qF '=== Directory tree (depth 2-3) ==='; then
    fail "no-- output structurally identical — directory tree header missing:
$out"
else
    pass "no-- output structurally identical"
fi

# --- Case 2 — `-- "**/*.sh"` adds a Files-by-extension block listing .sh paths ----
T2="$SCRATCH/case2"
mkdir -p "$T2/src"
printf 'a\n' > "$T2/src/a.sh"
printf 'b\n' > "$T2/src/b.sh"
printf 'doc\n' > "$T2/README.md"        # non-.sh, must NOT appear in the .sh block
git_init "$T2"
git -C "$T2" add -A
git -C "$T2" commit -qm init
TOTAL=$((TOTAL + 1))
out="$(cd "$T2" && bash "$SUT" -- '**/*.sh')"; rc=$?
if [ "$rc" -ne 0 ]; then
    fail "-- adds Files-by-extension block — exit $rc (expected 0)"
elif ! printf '%s\n' "$out" | grep -qF '=== Files by extension: **/*.sh ==='; then
    fail "-- adds Files-by-extension block — header missing:
$out"
elif ! printf '%s\n' "$out" | grep -qE 'src/a\.sh'; then
    fail "-- adds Files-by-extension block — 'src/a.sh' not listed:
$out"
elif printf '%s\n' "$out" | grep -qE 'README\.md'; then
    fail "-- adds Files-by-extension block — non-.sh 'README.md' leaked into listing:
$out"
else
    pass "-- adds Files-by-extension block"
fi

# --- Case 3 — per-glob list is capped: broad glob over >CAP files -> CAP lines ----
T3="$SCRATCH/case3"
mkdir -p "$T3/src"
i=0
while [ "$i" -lt $((CAP + 10)) ]; do      # CAP+10 tracked .sh files
    printf 'x\n' > "$T3/src/f$i.sh"
    i=$((i + 1))
done
git_init "$T3"
git -C "$T3" add -A
git -C "$T3" commit -qm init
TOTAL=$((TOTAL + 1))
out="$(cd "$T3" && bash "$SUT" -- '**/*.sh')"; rc=$?
# count the file lines emitted under the "Files by extension" header (until the
# next "===" header or blank-then-header), i.e. lines that look like a tracked path.
listed="$(printf '%s\n' "$out" \
    | awk '/^=== Files by extension: /{f=1;next} /^=== /{f=0} f && NF{print}' \
    | grep -cE 'src/f[0-9]+\.sh' || true)"
if [ "$rc" -ne 0 ]; then
    fail "per-glob list capped — exit $rc (expected 0)"
elif [ "$listed" -gt "$CAP" ]; then
    fail "per-glob list capped — listed $listed entries (expected <= $CAP)"
elif [ "$listed" -ne "$CAP" ]; then
    fail "per-glob list capped — listed $listed entries (expected exactly $CAP given $((CAP + 10)) files)"
else
    pass "per-glob list capped"
fi

echo ""
if [ "$FAILED" -ne 0 ]; then
    echo "FAILED ($PASS_COUNT/$TOTAL)"
    exit 1
fi
echo "ALL PASS ($PASS_COUNT/$TOTAL)"
