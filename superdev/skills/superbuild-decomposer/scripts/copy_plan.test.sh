#!/usr/bin/env bash
# superdev / superbuild-decomposer — copy_plan.test.sh
#
# Deterministic test runs for copy_plan.sh: stdout + exit code AND FS side-effect
# assertions (byte-exact plan.md copy; status.yml reset). Sibling pattern:
# scan_extensions.test.sh, recipe.superdev/.workflowslate.test.sh.
#
# Contract:
#   input  : none. Each case builds an isolated host under `mktemp -d` (honors
#            $TMPDIR); copy_plan.sh runs with CWD = that host.
#   output : "PASS: <case>" per case, then "ALL PASS (N/N)"; a mismatch prints
#            "FAIL: <case> — <detail>" and exits non-zero.
#   cases  : (1) ok -> PLAN_COPIED, exit 0, plan.md cmp-equal to src, status reset;
#            (2) stale plan.md/status.yml -> conscious overwrite + reset to 1;
#            (3) unreadable src -> COPY_FAIL, exit 1, no write;
#            (4) empty / invalid slug -> COPY_FAIL, exit 1, no write;
#            (5) symlink dest plan.md -> removed, real file written inside .superdev/.workflows/.
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUT="$SCRIPT_DIR/copy_plan.sh"
SCRATCH="$(mktemp -d 2>/dev/null || mktemp -d -t decomp_copy)"
trap 'rm -rf "$SCRATCH"' EXIT

PASS_COUNT=0; TOTAL=0; FAILED=0
pass() { echo "PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "FAIL: $1 — $2"; FAILED=$((FAILED + 1)); }

run() { local host="$1"; shift; out="$(cd "$host" && bash "$SUT" "$@" 2>&1)"; RC=$?; }

# --- Case 1 — ok -> PLAN_COPIED, byte-exact copy, status reset ----------------
TOTAL=$((TOTAL + 1))
H1="$SCRATCH/c1"; mkdir -p "$H1"
printf '# plan title\n\nsome body — with em-dash\n' > "$H1/src.md"
run "$H1" src.md my-slug
ok=1; why=""
[ "$RC" -eq 0 ] || { ok=0; why="$why exit=$RC;"; }
[ "$out" = "PLAN_COPIED" ] || { ok=0; why="$why stdout='$out';"; }
cmp -s "$H1/src.md" "$H1/.superdev/.workflows/my-slug/plan.md" || { ok=0; why="$why plan.md not byte-equal;"; }
grep -qxF "current_task: 1" "$H1/.superdev/.workflows/my-slug/status.yml" 2>/dev/null || { ok=0; why="$why status not reset;"; }
if [ "$ok" -eq 1 ]; then pass "ok -> PLAN_COPIED + byte-copy + reset"; else fail "ok -> PLAN_COPIED + byte-copy + reset" "$why"; fi

# --- Case 2 — stale plan.md/status.yml -> conscious overwrite + reset ---------
TOTAL=$((TOTAL + 1))
H2="$SCRATCH/c2"; mkdir -p "$H2/.superdev/.workflows/s"
printf 'NEW PLAN\n' > "$H2/src.md"
printf 'OLD STALE PLAN\n' > "$H2/.superdev/.workflows/s/plan.md"
printf 'current_task: 9\n' > "$H2/.superdev/.workflows/s/status.yml"
run "$H2" src.md s
ok=1; why=""
[ "$out" = "PLAN_COPIED" ] || { ok=0; why="$why stdout='$out';"; }
cmp -s "$H2/src.md" "$H2/.superdev/.workflows/s/plan.md" || { ok=0; why="$why stale plan.md not overwritten;"; }
grep -qxF "current_task: 1" "$H2/.superdev/.workflows/s/status.yml" || { ok=0; why="$why status not reset to 1;"; }
if [ "$ok" -eq 1 ]; then pass "stale plan/status -> overwrite + reset to 1"; else fail "stale plan/status -> overwrite + reset to 1" "$why"; fi

# --- Case 3 — unreadable src -> COPY_FAIL, no write ---------------------------
TOTAL=$((TOTAL + 1))
H3="$SCRATCH/c3"; mkdir -p "$H3"
run "$H3" does-not-exist.md s
if [ "$RC" -eq 0 ]; then fail "unreadable src -> COPY_FAIL" "exit 0"
elif ! printf '%s' "$out" | grep -q '^COPY_FAIL'; then fail "unreadable src -> COPY_FAIL" "stdout='$out'"
elif [ -e "$H3/.superdev/.workflows" ]; then fail "unreadable src -> COPY_FAIL" ".superdev/.workflows written"
else pass "unreadable src -> COPY_FAIL"; fi

# --- Case 4 — empty / invalid slug -> COPY_FAIL, no write ---------------------
bad_ok=1; detail=""
for bad in "" "." ".." ".foo" "a/b" "a b"; do
  H="$SCRATCH/c4_$RANDOM"; mkdir -p "$H"; printf 'x\n' > "$H/src.md"
  run "$H" src.md "$bad"
  if [ "$RC" -eq 0 ] || ! printf '%s' "$out" | grep -q '^COPY_FAIL' || [ -e "$H/.superdev/.workflows" ]; then
    bad_ok=0; detail="$detail [slug='$bad' rc=$RC out='$out']"
  fi
done
TOTAL=$((TOTAL + 1))
if [ "$bad_ok" -eq 1 ]; then pass "empty/invalid slug -> COPY_FAIL"; else fail "empty/invalid slug -> COPY_FAIL" "$detail"; fi

# --- Case 5 — symlink dest -> removed, real file written inside .superdev/.workflows/ --------
TOTAL=$((TOTAL + 1))
H5="$SCRATCH/c5"; mkdir -p "$H5/.superdev/.workflows/s" "$H5/outside"
printf 'PLAN BODY\n' > "$H5/src.md"
printf 'PRE-EXISTING OUTSIDE\n' > "$H5/outside/target.txt"
ln -s "$H5/outside/target.txt" "$H5/.superdev/.workflows/s/plan.md"
run "$H5" src.md s
ok=1; why=""
[ "$out" = "PLAN_COPIED" ] || { ok=0; why="$why stdout='$out';"; }
[ -L "$H5/.superdev/.workflows/s/plan.md" ] && { ok=0; why="$why dest still a symlink;"; }
cmp -s "$H5/src.md" "$H5/.superdev/.workflows/s/plan.md" || { ok=0; why="$why plan.md not the copied src;"; }
grep -qxF "PRE-EXISTING OUTSIDE" "$H5/outside/target.txt" || { ok=0; why="$why outside file was clobbered through the link;"; }
if [ "$ok" -eq 1 ]; then pass "symlink dest -> removed, write stays in .superdev/.workflows/"; else fail "symlink dest -> removed, write stays in .superdev/.workflows/" "$why"; fi

echo ""
if [ "$FAILED" -ne 0 ]; then echo "FAILED ($PASS_COUNT/$TOTAL)"; exit 1; fi
echo "ALL PASS ($PASS_COUNT/$TOTAL)"
