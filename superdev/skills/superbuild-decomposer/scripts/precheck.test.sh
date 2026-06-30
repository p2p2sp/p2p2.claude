#!/usr/bin/env bash
# superdev / superbuild-decomposer — precheck.test.sh
#
# Deterministic test runs for precheck.sh. This repo has no test framework
# (markdown + JSON + bash), so a "test" is a real script run against a `mktemp -d`
# scratch host with stdout + exit-code AND side-effect (FS) assertions
# (sibling: scan_extensions.test.sh, recipe.template.test.sh).
#
# Contract:
#   input  : none. Each case builds an isolated host under a `mktemp -d` scratch
#            dir (honors $TMPDIR); precheck.sh is run with CWD = that host so its
#            `.temp/.workflows/<slug>/` paths stay inside the scratch.
#   output : one "PASS: <case>" line per asserted case, then "ALL PASS (N/N)".
#            Any mismatch prints "FAIL: <case> — <detail>" and exits non-zero.
#   cases  : (1) no tasks dir -> FRESH, no .temp written;
#            (2) empty slug -> FRESH no-op; (3) invalid slugs -> FRESH no-op;
#            (4) >=1 tasks -> STATUS: PASS block, lines match the superbuild regex
#                with the exact UTF-8 " — " separator, Notes literal, status seeded;
#            (5) task missing `# ` H1 -> `<no title>` + Notes bullet;
#            (6) existing status.yml NOT overwritten; (7) numeric ordering.
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUT="$SCRIPT_DIR/precheck.sh"
SCRATCH="$(mktemp -d 2>/dev/null || mktemp -d -t decomp_precheck)"
trap 'rm -rf "$SCRATCH"' EXIT

PASS_COUNT=0; TOTAL=0; FAILED=0
pass() { echo "PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "FAIL: $1 — $2"; FAILED=$((FAILED + 1)); }

# run <host-dir> <slug> -> stdout of precheck (stderr merged); sets global RC.
run() {
  local host="$1" slug="$2"
  out="$(cd "$host" && bash "$SUT" <<EOF 2>&1
Plan: /x/plan.md
PlanSlug: $slug
EOF
)"; RC=$?
}

REGEX='^- [0-9]+ — .+ — .+\.md$'

# --- Case 1 — no tasks dir -> FRESH, nothing written ---------------------------
TOTAL=$((TOTAL + 1))
H1="$SCRATCH/c1"; mkdir -p "$H1"
run "$H1" my-slug
if [ "$RC" -ne 0 ]; then fail "no tasks -> FRESH" "exit $RC"
elif [ "$out" != "FRESH" ]; then fail "no tasks -> FRESH" "got '$out'"
elif [ -e "$H1/.temp" ]; then fail "no tasks -> FRESH" ".temp was written"
else pass "no tasks -> FRESH"; fi

# --- Case 2 — empty slug -> FRESH no-op ---------------------------------------
TOTAL=$((TOTAL + 1))
H2="$SCRATCH/c2"; mkdir -p "$H2"
run "$H2" ""
if [ "$out" != "FRESH" ] || [ -e "$H2/.temp" ]; then
  fail "empty slug -> FRESH" "got '$out', .temp exists: $([ -e "$H2/.temp" ] && echo yes || echo no)"
else pass "empty slug -> FRESH"; fi

# --- Case 3 — invalid slugs -> FRESH no-op ------------------------------------
bad_ok=1; detail=""
for bad in "." ".." ".foo" "a/b" "a b" "a;b" 'a$b'; do
  H="$SCRATCH/c3_$RANDOM"; mkdir -p "$H"
  run "$H" "$bad"
  if [ "$out" != "FRESH" ] || [ -e "$H/.temp" ]; then
    bad_ok=0; detail="$detail [slug='$bad' -> '$out']"
  fi
done
TOTAL=$((TOTAL + 1))
if [ "$bad_ok" -eq 1 ]; then pass "invalid slugs -> FRESH"; else fail "invalid slugs -> FRESH" "$detail"; fi

# --- Case 4 — >=1 tasks -> block, exact separator, seed -----------------------
TOTAL=$((TOTAL + 1))
H4="$SCRATCH/c4"; mkdir -p "$H4/.temp/.workflows/my-slug/tasks"
printf '# feat(x): do thing\n\nbody\n' > "$H4/.temp/.workflows/my-slug/tasks/1.md"
run "$H4" my-slug
expected_line1="- 1 — feat(x): do thing — .temp/.workflows/my-slug/tasks/1.md"
ok=1; why=""
[ "$RC" -eq 0 ] || { ok=0; why="$why exit=$RC;"; }
printf '%s\n' "$out" | head -1 | grep -qxF "STATUS: PASS" || { ok=0; why="$why no STATUS:PASS;"; }
printf '%s\n' "$out" | grep -qxF -- "$expected_line1" || { ok=0; why="$why missing exact task line;"; }
printf '%s\n' "$out" | grep -E "$REGEX" | grep -q . || { ok=0; why="$why no regex-matching task line;"; }
printf '%s\n' "$out" | grep -qF "existing task files detected — decomposition skipped" || { ok=0; why="$why no Notes literal;"; }
grep -qxF "current_task: 1" "$H4/.temp/.workflows/my-slug/status.yml" 2>/dev/null || { ok=0; why="$why status not seeded;"; }
if [ "$ok" -eq 1 ]; then pass "tasks -> block + exact separator + seed"; else fail "tasks -> block + exact separator + seed" "$why out=<$out>"; fi

# --- Case 5 — task missing H1 -> <no title> + Notes bullet --------------------
TOTAL=$((TOTAL + 1))
H5="$SCRATCH/c5"; mkdir -p "$H5/.temp/.workflows/s/tasks"
printf 'no heading here\n' > "$H5/.temp/.workflows/s/tasks/1.md"
run "$H5" s
ok=1; why=""
printf '%s\n' "$out" | grep -qF -- "- 1 — <no title> — .temp/.workflows/s/tasks/1.md" || { ok=0; why="$why no <no title> line;"; }
printf '%s\n' "$out" | grep -qF 'has no `# ` H1 heading' || { ok=0; why="$why no missing-H1 Notes bullet;"; }
if [ "$ok" -eq 1 ]; then pass "missing H1 -> <no title> + Notes"; else fail "missing H1 -> <no title> + Notes" "$why out=<$out>"; fi

# --- Case 6 — existing status.yml NOT overwritten -----------------------------
TOTAL=$((TOTAL + 1))
H6="$SCRATCH/c6"; mkdir -p "$H6/.temp/.workflows/s/tasks"
printf '# feat(x): a\n' > "$H6/.temp/.workflows/s/tasks/1.md"
printf 'current_task: 7\n' > "$H6/.temp/.workflows/s/status.yml"
run "$H6" s
if grep -qxF "current_task: 7" "$H6/.temp/.workflows/s/status.yml"; then
  pass "existing status.yml untouched"
else fail "existing status.yml untouched" "status.yml changed to: $(cat "$H6/.temp/.workflows/s/status.yml")"; fi

# --- Case 7 — numeric ordering (1, 2, 10 not 1, 10, 2) ------------------------
TOTAL=$((TOTAL + 1))
H7="$SCRATCH/c7"; mkdir -p "$H7/.temp/.workflows/s/tasks"
for n in 1 2 10; do printf '# feat(x): t%s\n' "$n" > "$H7/.temp/.workflows/s/tasks/$n.md"; done
run "$H7" s
got_order="$(printf '%s\n' "$out" | grep -E "$REGEX" | sed -E 's/^- ([0-9]+) .*/\1/' | tr '\n' ',')"
if [ "$got_order" = "1,2,10," ]; then pass "numeric ordering"; else fail "numeric ordering" "order='$got_order'"; fi

echo ""
if [ "$FAILED" -ne 0 ]; then echo "FAILED ($PASS_COUNT/$TOTAL)"; exit 1; fi
echo "ALL PASS ($PASS_COUNT/$TOTAL)"
