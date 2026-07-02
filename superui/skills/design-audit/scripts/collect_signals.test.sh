#!/usr/bin/env bash
# superui / design-audit — collect_signals.test.sh
#
# Deterministic test runs for collect_signals.sh against a scratch fixture tree
# (no git; the script's find-fallback path). A "test" is a real run with a JSONL
# assertion. Sibling pattern: route.test.sh.
#
# Contract:
#   input  : none. Builds fixtures under `mktemp -d` (honors $TMPDIR); removed on exit.
#   output : "PASS: <case>" per case, then "ALL PASS (N/N)"; a mismatch prints
#            "FAIL: <case>" and exits non-zero.
#   cases  : (1) flutter counts Dart literals, class/inline = 0; (2) css counts
#            raw values; (3) js-theme counts inline sx literals; (4) agnostic
#            zeroes class_hits/inline_style_hits on every line; (5) unknown family
#            -> STATUS: FAIL + non-zero; (6) empty tree -> empty output, rc 0;
#            (7) --scope narrows to a subtree; (8) vendor/build/minified excluded;
#            (9) a path with a space emits well-formed, quoted JSON.
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUT="$SCRIPT_DIR/collect_signals.sh"

SCRATCH="$(mktemp -d 2>/dev/null || mktemp -d -t da_signals)"
trap 'rm -rf "$SCRATCH"' EXIT

PASS_COUNT=0; TOTAL=0; FAILED=0
pass() { echo "PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "FAIL: $1 — $2"; FAILED=$((FAILED + 1)); }

# --- fixture tree -------------------------------------------------------------
FX="$SCRATCH/proj"; mkdir -p "$FX"
cat > "$FX/ui.dart" <<'EOF'
Widget build(BuildContext c) => Container(
  color: Color(0xFF112233),
  padding: EdgeInsets.all(16),
  child: Text('x', style: TextStyle(fontSize: 14)),
);
EOF
cat > "$FX/styles.css" <<'EOF'
.card { color: #fff; padding: 12px; }
EOF
cat > "$FX/Card.jsx" <<'EOF'
export const Card = () => <div style={{}}><span sx={{ color: '#111827' }} /></div>;
EOF

line_of() { printf '%s\n' "$1" | grep -F "$2"; }

# Case 1 — flutter: Dart literals counted; class/inline = 0.
TOTAL=$((TOTAL + 1))
OUT="$(sh "$SUT" flutter "$FX")"
L="$(line_of "$OUT" 'ui.dart')"
if printf '%s' "$L" | grep -qF '"class_hits":0,"inline_style_hits":0' \
   && ! printf '%s' "$L" | grep -qF '"raw_value_hits":0'; then
  pass "flutter counts Dart literals, class/inline = 0"
else fail "flutter" "line=<$L>"; fi

# Case 2 — css: raw values counted (non-zero).
TOTAL=$((TOTAL + 1))
OUT="$(sh "$SUT" css "$FX")"
L="$(line_of "$OUT" 'styles.css')"
if [ -n "$L" ] && ! printf '%s' "$L" | grep -qF '"raw_value_hits":0'; then
  pass "css counts raw values"
else fail "css" "line=<$L>"; fi

# Case 3 — js-theme: inline sx literal counted (non-zero).
TOTAL=$((TOTAL + 1))
OUT="$(sh "$SUT" js-theme "$FX")"
L="$(line_of "$OUT" 'Card.jsx')"
if [ -n "$L" ] && ! printf '%s' "$L" | grep -qF '"inline_style_hits":0'; then
  pass "js-theme counts inline sx"
else fail "js-theme" "line=<$L>"; fi

# Case 4 — agnostic: every output line has class_hits/inline_style_hits = 0.
TOTAL=$((TOTAL + 1))
OUT="$(sh "$SUT" agnostic "$FX")"
BAD="$(printf '%s\n' "$OUT" | grep -v '^$' | grep -vF '"class_hits":0,"inline_style_hits":0' || true)"
if [ -n "$OUT" ] && [ -z "$BAD" ]; then
  pass "agnostic zeroes class/inline on every line"
else fail "agnostic" "offending=<$BAD>"; fi

# Case 5 — unknown family fails loud and non-zero.
TOTAL=$((TOTAL + 1))
if OUT="$(sh "$SUT" bogus "$FX" 2>&1)"; then
  fail "unknown family" "expected non-zero exit"
elif printf '%s\n' "$OUT" | grep -qF "STATUS: FAIL"; then
  pass "unknown family -> STATUS: FAIL + non-zero"
else fail "unknown family" "missing STATUS: FAIL (out=<$OUT>)"; fi

# Case 6 — empty tree: empty output, rc 0 (no set -e abort on zero matches).
TOTAL=$((TOTAL + 1))
EMPTY="$SCRATCH/empty"; mkdir -p "$EMPTY"
if OUT="$(sh "$SUT" css "$EMPTY")" && [ -z "$OUT" ]; then
  pass "empty tree -> empty output, rc 0"
else fail "empty tree" "rc=$? out=<$OUT>"; fi

# Case 7 — --scope narrows the sweep to a subtree.
TOTAL=$((TOTAL + 1))
mkdir -p "$FX/inside" "$FX/outside"
printf '.a{color:#abc}\n' > "$FX/inside/in.css"
printf '.b{color:#def}\n' > "$FX/outside/out.css"
OUT="$(sh "$SUT" css "$FX" --scope inside)"
if printf '%s\n' "$OUT" | grep -qF 'inside/in.css' \
   && ! printf '%s\n' "$OUT" | grep -qF 'outside/out.css'; then
  pass "--scope narrows to subtree"
else fail "--scope" "out=<$OUT>"; fi

# Case 8 — vendor/build/minified paths are excluded.
TOTAL=$((TOTAL + 1))
mkdir -p "$FX/node_modules"
printf '.x{color:#111}\n' > "$FX/node_modules/dep.css"
printf '.y{color:#222}\n' > "$FX/app.min.css"
OUT="$(sh "$SUT" css "$FX")"
if ! printf '%s\n' "$OUT" | grep -qF 'node_modules/dep.css' \
   && ! printf '%s\n' "$OUT" | grep -qF 'app.min.css'; then
  pass "vendor + minified excluded"
else fail "exclusion" "out=<$OUT>"; fi

# Case 9 — a path with a space emits well-formed, quoted JSON (esc() path).
TOTAL=$((TOTAL + 1))
mkdir -p "$FX/with space"
printf '.z{color:#333}\n' > "$FX/with space/s.css"
OUT="$(sh "$SUT" css "$FX")"
L="$(line_of "$OUT" 'with space/s.css')"
case "$L" in
  '{"path":"'*'with space/s.css","ext":"css"'*'}') pass "spaced path -> well-formed JSON" ;;
  *) fail "spaced path" "line=<$L>" ;;
esac

echo ""
if [ "$FAILED" -ne 0 ]; then echo "FAILED ($PASS_COUNT/$TOTAL)"; exit 1; fi
echo "ALL PASS ($PASS_COUNT/$TOTAL)"
