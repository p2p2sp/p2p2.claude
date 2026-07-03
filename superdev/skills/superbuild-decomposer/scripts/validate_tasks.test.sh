#!/usr/bin/env bash
# superdev / superbuild-decomposer — validate_tasks.test.sh
#
# Deterministic test runs for validate_tasks.py: a positive fixture proving
# VALIDATE_OK, then one negative fixture per named FAIL marker (the validator is
# a FAIL-detector, so the happy path alone proves nothing — every marker needs a
# negative that triggers it). Sibling pattern: scan_extensions.test.sh.
#
# Contract:
#   input  : none. Each case builds an isolated workflow tree under `mktemp -d`
#            (honors $TMPDIR); the validator runs with CWD = that host.
#   output : "PASS: <case>" per case, then "ALL PASS (N/N)"; a mismatch prints
#            "FAIL: <case> — <detail>" and exits non-zero.
#   cases  : positive VALIDATE_OK + one negative each for h1-form, verb-h1,
#            section-order, mode-enum, tests-none-shape, tests-empty, gate-shape,
#            tdd-unit-min, e2e-min, forward-ref, task1-dep, cycle, plan-bytes,
#            status-seed, slug-invalid, no-tasks.
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUT="$SCRIPT_DIR/validate_tasks.py"

if ! command -v python3 >/dev/null 2>&1; then
  echo "SKIP: python3 not available — validate_tasks.py untested on this host"
  exit 0
fi

SCRATCH="$(mktemp -d 2>/dev/null || mktemp -d -t decomp_validate)"
trap 'rm -rf "$SCRATCH"' EXIT

PASS_COUNT=0; TOTAL=0; FAILED=0
pass() { echo "PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "FAIL: $1 — $2"; FAILED=$((FAILED + 1)); }

GATE='- Build: green
- Tests: x'

# emit_task <path> <h1> <mode> <depends-body> <tests-body> <gate-body>
emit_task() {
  cat > "$1" <<EOF
$2

> Source plan: src.md
> Task N of K

## Plan context

context line

## Deliverable

deliverable line

## Touches

- a/b — production

## Mode

\`$3\`

**Why:** reason.

## Tests

$5

## Depends on

$4

## Task gate

$6
EOF
}

# new_host <slug> -> echoes the host dir, seeds src.md + plan.md (byte-equal) + status.yml
new_host() {
  local slug="$1"
  local host="$SCRATCH/h_${slug}_$RANDOM"
  mkdir -p "$host/.superdev/.workflows/$slug/tasks"
  printf '# the plan\n\nbody\n' > "$host/src.md"
  cp "$host/src.md" "$host/.superdev/.workflows/$slug/plan.md"
  printf 'current_task: 1\n' > "$host/.superdev/.workflows/$slug/status.yml"
  echo "$host"
}

run() { local host="$1" slug="$2"; out="$(cd "$host" && python3 "$SUT" "$slug" src.md 2>&1)"; RC=$?; }

# assert_ok <case> <host> <slug>
assert_ok() {
  TOTAL=$((TOTAL + 1)); run "$2" "$3"
  if [ "$RC" -eq 0 ] && [ "$out" = "VALIDATE_OK" ]; then pass "$1"
  else fail "$1" "rc=$RC out=<$out>"; fi
}
# assert_fail <case> <host> <slug> <expected-marker>
assert_fail() {
  TOTAL=$((TOTAL + 1)); run "$2" "$3"
  if [ "$RC" -ne 0 ] && printf '%s\n' "$out" | grep -qF ":$4"; then pass "$1"
  else fail "$1" "expected marker ':$4', rc=$RC out=<$out>"; fi
}

# --- Positive — VALIDATE_OK ---------------------------------------------------
H="$(new_host ok)"; D="$H/.superdev/.workflows/ok/tasks"
emit_task "$D/1.md" '# feat(core): add validator' tdd '—' \
  '- unit — rejects empty input — suggested location: t/
- unit — accepts non-empty — suggested location: t/' "$GATE"
emit_task "$D/2.md" '# docs(readme): document it' tests-none '- task 1 — uses validator' \
  '- none — docs only' '- Tests: none'
assert_ok "positive -> VALIDATE_OK" "$H" ok

# --- h1-form (no Conventional-Commits type) -----------------------------------
H="$(new_host hf)"; emit_task "$H/.superdev/.workflows/hf/tasks/1.md" '# add a thing' tdd '—' '- unit — u' "$GATE"
assert_fail "h1-form" "$H" hf h1-form

# --- verb-h1 (forbidden legacy `# Task N` heading) ----------------------------
H="$(new_host vh)"; emit_task "$H/.superdev/.workflows/vh/tasks/1.md" '# Task 1 — do thing' tdd '—' '- unit — u' "$GATE"
assert_fail "verb-h1" "$H" vh verb-h1

# --- section-order (missing/disordered sections) ------------------------------
H="$(new_host so)"
cat > "$H/.superdev/.workflows/so/tasks/1.md" <<'EOF'
# feat(a): x

## Deliverable

d

## Plan context

c
EOF
assert_fail "section-order" "$H" so section-order

# --- mode-enum ----------------------------------------------------------------
H="$(new_host me)"; emit_task "$H/.superdev/.workflows/me/tasks/1.md" '# feat(a): x' bogusmode '—' '- unit — u' "$GATE"
assert_fail "mode-enum" "$H" me mode-enum

# --- tests-none-shape (tests-none with a real test list) ----------------------
H="$(new_host tn)"; emit_task "$H/.superdev/.workflows/tn/tasks/1.md" '# docs(a): x' tests-none '—' '- unit — u' "$GATE"
assert_fail "tests-none-shape" "$H" tn tests-none-shape

# --- tests-empty (runnable mode, empty Tests) ---------------------------------
H="$(new_host te)"; emit_task "$H/.superdev/.workflows/te/tasks/1.md" '# feat(a): x' code-first-then-tests '—' '(no bullets here)' "$GATE"
assert_fail "tests-empty" "$H" te tests-empty

# --- gate-shape (runnable mode missing Build/Tests gate lines) ----------------
H="$(new_host gs)"; emit_task "$H/.superdev/.workflows/gs/tasks/1.md" '# feat(a): x' tdd '—' '- unit — u' '- something else'
assert_fail "gate-shape" "$H" gs gate-shape

# --- tdd-unit-min (tdd with no unit Kind) -------------------------------------
H="$(new_host tu)"; emit_task "$H/.superdev/.workflows/tu/tasks/1.md" '# feat(a): x' tdd '—' '- integration — i' "$GATE"
assert_fail "tdd-unit-min" "$H" tu tdd-unit-min

# --- e2e-min (e2e-first with no e2e Kind) -------------------------------------
H="$(new_host em)"; emit_task "$H/.superdev/.workflows/em/tasks/1.md" '# feat(a): x' e2e-first '—' '- unit — u' "$GATE"
assert_fail "e2e-min" "$H" em e2e-min

# --- forward-ref (dep >= N) ---------------------------------------------------
H="$(new_host fr)"; D="$H/.superdev/.workflows/fr/tasks"
emit_task "$D/1.md" '# feat(a): x' tdd '—' '- unit — u' "$GATE"
emit_task "$D/2.md" '# feat(b): y' tdd '- task 2 — self' '- unit — u' "$GATE"
assert_fail "forward-ref" "$H" fr forward-ref

# --- task1-dep (Task 1 has a dependency) --------------------------------------
H="$(new_host td)"; D="$H/.superdev/.workflows/td/tasks"
emit_task "$D/1.md" '# feat(a): x' tdd '- task 2 — bad' '- unit — u' "$GATE"
emit_task "$D/2.md" '# feat(b): y' tdd '—' '- unit — u' "$GATE"
assert_fail "task1-dep" "$H" td task1-dep

# --- cycle --------------------------------------------------------------------
H="$(new_host cy)"; D="$H/.superdev/.workflows/cy/tasks"
emit_task "$D/1.md" '# feat(a): x' tdd '- task 2 — c' '- unit — u' "$GATE"
emit_task "$D/2.md" '# feat(b): y' tdd '- task 1 — c' '- unit — u' "$GATE"
assert_fail "cycle" "$H" cy cycle

# --- plan-bytes (plan.md != source) -------------------------------------------
H="$(new_host pb)"; emit_task "$H/.superdev/.workflows/pb/tasks/1.md" '# feat(a): x' tdd '—' '- unit — u' "$GATE"
printf 'DRIFTED COPY\n' > "$H/.superdev/.workflows/pb/plan.md"
assert_fail "plan-bytes" "$H" pb plan-bytes

# --- status-seed (status.yml missing) -----------------------------------------
H="$(new_host se)"; emit_task "$H/.superdev/.workflows/se/tasks/1.md" '# feat(a): x' tdd '—' '- unit — u' "$GATE"
rm "$H/.superdev/.workflows/se/status.yml"
assert_fail "status-seed" "$H" se status-seed

# --- slug-invalid -------------------------------------------------------------
H="$(new_host ok)"   # any host; the bad slug never resolves a path
assert_fail "slug-invalid" "$H" "../evil" slug-invalid

# --- no-tasks (valid slug, empty tasks dir) -----------------------------------
H="$SCRATCH/notasks"; mkdir -p "$H/.superdev/.workflows/empty/tasks"; printf 'x\n' > "$H/src.md"
assert_fail "no-tasks" "$H" empty no-tasks

echo ""
if [ "$FAILED" -ne 0 ]; then echo "FAILED ($PASS_COUNT/$TOTAL)"; exit 1; fi
echo "ALL PASS ($PASS_COUNT/$TOTAL)"
