#!/usr/bin/env bash
# superdev / agent-recipe — recipe.template.test.sh
#
# Deterministic test runs for recipe.template.sh's verb dispatch + fail-closed
# `verify` self-check. This repo has no test framework (markdown + JSON + bash),
# so a "test" is a real script run against a `mktemp -d` stub host with stdout +
# exit-code assertions (see plan §8 binding floor; sibling: bootstrap.test.sh,
# scan_extensions.test.sh).
#
# Contract:
#   input  : none. Per case it builds an isolated stub host under a `mktemp -d`
#            scratch dir (honors $TMPDIR): a copy of recipe.template.sh FILLED
#            exactly the way the generator skill fills it (host command bodies,
#            the fingerprinted-file list, the recorded required-tools list, the
#            recorded fingerprint), a fake tool on a scratch PATH, and the
#            fingerprinted source file(s). The run never touches the real tree.
#   output : one "PASS: <case>" line per asserted case on stdout, then a final
#            "ALL PASS (N/N)" line. On any mismatch it prints "FAIL: <case>" with
#            the expected vs actual detail and exits non-zero.
#   cases  : (1) fingerprint unchanged          -> verify exit 0;
#            (2) fingerprint tampered/stale      -> non-zero, stdout carries STALE;
#            (3) recorded tool absent from PATH  -> non-zero (missing-tool);
#            (4) verb body == sentinel N/A       -> exit 0 (PASS-eligible);
#            (5) verb dispatch routes build/test-all/test-filtered/lint/launch/
#                verify/profile to their bodies; unknown verb -> non-zero.
#   note   : asserts on recipe.sh stdout AND exit code; each scratch dir is
#            removed on exit (trap).
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="$SCRIPT_DIR/recipe.template.sh"

SCRATCH="$(mktemp -d 2>/dev/null || mktemp -d -t recipe_template)"
trap 'rm -rf "$SCRATCH"' EXIT

PASS_COUNT=0
TOTAL=0
FAILED=0

pass() { echo "PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "FAIL: $1 — $2"; FAILED=$((FAILED + 1)); }

# fill_recipe <dest> <fp_files_block> <req_tools_block> <fingerprint> \
#             <build_body> <test_all_body> <test_filtered_body> <lint_body> \
#             <launch_body>
# Produces a filled recipe.sh at <dest> by replacing the template's agent-fill
# markers — the same substitution the generator skill performs. Each *_body is a
# single shell line (or the sentinel "N/A"). Marker convention: a line that is
# exactly "###<TOKEN>###" is replaced wholesale by the supplied value.
fill_recipe() {
    local dest="$1" fp_files="$2" req_tools="$3" fp="$4"
    local build="$5" test_all="$6" test_filtered="$7" lint="$8" launch="$9"
    # Each marker is a whole-line swap. *_BODY markers become a single indented
    # shell statement line; the FINGERPRINT marker becomes an `echo "<fp>"` so
    # recorded_fingerprint() prints the recorded token (the generator fills the
    # markers the same way).
    local fp_line="  echo \"$fp\""
    awk -v fp_files="$fp_files" -v req_tools="$req_tools" -v fp_line="$fp_line" \
        -v build="  $build" -v test_all="  $test_all" -v test_filtered="  $test_filtered" \
        -v lint="  $lint" -v launch="  $launch" '
        $0 == "###FINGERPRINTED_FILES###"  { print fp_files; next }
        $0 == "###REQUIRED_TOOLS###"       { print req_tools; next }
        $0 == "  __unfilled FINGERPRINT"        { print fp_line; next }
        $0 == "  __unfilled BUILD_BODY"         { print build; next }
        $0 == "  __unfilled TEST_ALL_BODY"      { print test_all; next }
        $0 == "  __unfilled TEST_FILTERED_BODY" { print test_filtered; next }
        $0 == "  __unfilled LINT_BODY"          { print lint; next }
        $0 == "  __unfilled LAUNCH_BODY"        { print launch; next }
        { print }
    ' "$TEMPLATE" > "$dest"
}

# compute_fp <recipe.sh> <fp_files...> — re-derive the fingerprint the same way
# the template's `verify` does, so the test records a matching value in case 1.
# The template exposes its hashing via `recipe.sh fingerprint` (a debug verb that
# prints the live fingerprint over the recorded file list); the test uses that so
# it can never drift from the implementation's own algorithm.

# Build a stub host: a fake tool on a scratch PATH + a source file to fingerprint.
make_host() {
    local dir="$1"
    mkdir -p "$dir/bin" "$dir/src"
    printf '#!/usr/bin/env bash\necho "stubtool $*"\n' > "$dir/bin/stubtool"
    chmod +x "$dir/bin/stubtool"
    printf 'echo build me\n' > "$dir/src/buildfile"
}

# --- Case 1 — fingerprint unchanged -> verify exit 0 ---------------------------
TOTAL=$((TOTAL + 1))
T1="$SCRATCH/case1"
make_host "$T1"
# fill with a placeholder fingerprint first, derive the real one, then refill.
fill_recipe "$T1/recipe.sh" "src/buildfile" "stubtool" "PLACEHOLDER" \
    "stubtool build" "stubtool test" "stubtool test \$1" "stubtool lint" "stubtool run"
real_fp="$(cd "$T1" && PATH="$T1/bin:$PATH" bash recipe.sh fingerprint 2>/dev/null)"
fill_recipe "$T1/recipe.sh" "src/buildfile" "stubtool" "$real_fp" \
    "stubtool build" "stubtool test" "stubtool test \$1" "stubtool lint" "stubtool run"
out="$(cd "$T1" && PATH="$T1/bin:$PATH" bash recipe.sh verify 2>&1)"; rc=$?
if [ "$rc" -ne 0 ]; then
    fail "fingerprint unchanged -> verify exit 0" "exit $rc (expected 0); out: $out"
elif ! printf '%s\n' "$out" | grep -qF "FRESH"; then
    fail "fingerprint unchanged -> verify exit 0" "verify did not report FRESH; out: $out"
else
    pass "fingerprint unchanged -> verify exit 0"
fi

# --- Case 2 — fingerprint tampered/stale -> non-zero, stdout/stderr carry STALE -
# Record the real fingerprint, then mutate a fingerprinted file so the live hash
# diverges from the recorded one. verify must fail-closed with STALE.
TOTAL=$((TOTAL + 1))
T2="$SCRATCH/case2"
make_host "$T2"
fill_recipe "$T2/recipe.sh" "src/buildfile" "stubtool" "PLACEHOLDER" \
    "stubtool build" "stubtool test" "stubtool test \$1" "stubtool lint" "stubtool run"
real_fp="$(cd "$T2" && PATH="$T2/bin:$PATH" bash recipe.sh fingerprint 2>/dev/null)"
fill_recipe "$T2/recipe.sh" "src/buildfile" "stubtool" "$real_fp" \
    "stubtool build" "stubtool test" "stubtool test \$1" "stubtool lint" "stubtool run"
printf 'echo TAMPERED\n' >> "$T2/src/buildfile"   # toolchain file changed -> stale
out="$(cd "$T2" && PATH="$T2/bin:$PATH" bash recipe.sh verify 2>&1)"; rc=$?
if [ "$rc" -eq 0 ]; then
    fail "fingerprint tampered -> non-zero STALE" "verify exited 0 (expected non-zero); out: $out"
elif ! printf '%s\n' "$out" | grep -qF "STALE"; then
    fail "fingerprint tampered -> non-zero STALE" "missing STALE marker; rc=$rc out: $out"
else
    pass "fingerprint tampered -> non-zero STALE"
fi

# --- Case 3 — recorded tool absent from PATH -> non-zero (missing-tool) ---------
# Record a tool that does not resolve on the scratch PATH. verify must fail-closed
# with a missing-tool error BEFORE it reaches the fingerprint check.
TOTAL=$((TOTAL + 1))
T3="$SCRATCH/case3"
make_host "$T3"
fill_recipe "$T3/recipe.sh" "src/buildfile" "definitely_absent_tool_xyz" "PLACEHOLDER" \
    "stubtool build" "stubtool test" "stubtool test \$1" "stubtool lint" "stubtool run"
real_fp="$(cd "$T3" && PATH="$T3/bin:$PATH" bash recipe.sh fingerprint 2>/dev/null)"
fill_recipe "$T3/recipe.sh" "src/buildfile" "definitely_absent_tool_xyz" "$real_fp" \
    "stubtool build" "stubtool test" "stubtool test \$1" "stubtool lint" "stubtool run"
# Use a minimal PATH that has the hasher but not the recorded tool.
out="$(cd "$T3" && PATH="$T3/bin:$PATH" bash recipe.sh verify 2>&1)"; rc=$?
if [ "$rc" -eq 0 ]; then
    fail "missing tool -> non-zero" "verify exited 0 (expected non-zero); out: $out"
elif ! printf '%s\n' "$out" | grep -qiF "missing-tool"; then
    fail "missing tool -> non-zero" "missing the missing-tool marker; rc=$rc out: $out"
else
    pass "missing tool -> non-zero"
fi

# --- Case 4 — documented-no-suite verb body N/A -> exit 0 (PASS-eligible) -------
# A verb whose host body is the sentinel "N/A" must exit 0 WITHOUT running the
# body. "N/A" is not a runnable command, so if the sentinel were not honored the
# verb would exit non-zero (command-not-found) — exit 0 proves the sentinel path.
TOTAL=$((TOTAL + 1))
T4="$SCRATCH/case4"
make_host "$T4"
fill_recipe "$T4/recipe.sh" "src/buildfile" "stubtool" "PLACEHOLDER" \
    "stubtool build" "N/A" "N/A" "N/A" "N/A"
out="$(cd "$T4" && PATH="$T4/bin:$PATH" bash recipe.sh test-all 2>&1)"; rc=$?
if [ "$rc" -ne 0 ]; then
    fail "N/A verb body -> exit 0" "test-all exited $rc (expected 0); out: $out"
else
    pass "N/A verb body -> exit 0"
fi

# --- Case 5 — verb dispatch routes each verb to its body; unknown verb non-zero -
# The stub tool echoes "stubtool <args>", so each real verb's body output proves
# which body ran (and that test-filtered forwards its <pat>). profile prints the
# sibling profile.md path; an unknown verb exits non-zero.
TOTAL=$((TOTAL + 1))
T5="$SCRATCH/case5"
make_host "$T5"
fill_recipe "$T5/recipe.sh" "src/buildfile" "stubtool" "PLACEHOLDER" \
    "stubtool BUILDV" "stubtool TESTALLV" "stubtool FILTV \$1" "stubtool LINTV" "stubtool LAUNCHV"
real_fp="$(cd "$T5" && PATH="$T5/bin:$PATH" bash recipe.sh fingerprint 2>/dev/null)"
fill_recipe "$T5/recipe.sh" "src/buildfile" "stubtool" "$real_fp" \
    "stubtool BUILDV" "stubtool TESTALLV" "stubtool FILTV \$1" "stubtool LINTV" "stubtool LAUNCHV"
run5() { (cd "$T5" && PATH="$T5/bin:$PATH" bash recipe.sh "$@" 2>&1); }
dispatch_ok=1; detail=""
check_routes() {
    # <verb-args...> -- <expected-substring>
    local expect="${@: -1}"; local args=("${@:1:$#-1}")
    local o; o="$(run5 "${args[@]}")"; local r=$?
    if [ "$r" -ne 0 ] || ! printf '%s\n' "$o" | grep -qF "$expect"; then
        dispatch_ok=0; detail="$detail [${args[*]} -> rc=$r out='$o' want='$expect']"
    fi
}
check_routes build         BUILDV
check_routes test-all      TESTALLV
check_routes test-filtered MyPattern FILTV
check_routes test-filtered MyPattern MyPattern   # <pat> forwarded into the body
check_routes lint          LINTV
check_routes launch        LAUNCHV
check_routes verify        FRESH
# profile -> prints the sibling profile.md path
po="$(run5 profile)"; pr=$?
if [ "$pr" -ne 0 ] || ! printf '%s\n' "$po" | grep -qF "profile.md"; then
    dispatch_ok=0; detail="$detail [profile -> rc=$pr out='$po']"
fi
# unknown verb -> non-zero
uo="$(run5 bogusverb)"; ur=$?
if [ "$ur" -eq 0 ]; then
    dispatch_ok=0; detail="$detail [unknown verb exited 0, expected non-zero; out='$uo']"
fi
if [ "$dispatch_ok" -eq 1 ]; then
    pass "verb dispatch routes each verb + unknown verb non-zero"
else
    fail "verb dispatch routes each verb + unknown verb non-zero" "$detail"
fi

echo ""
if [ "$FAILED" -ne 0 ]; then
    echo "FAILED ($PASS_COUNT/$TOTAL)"
    exit 1
fi
echo "ALL PASS ($PASS_COUNT/$TOTAL)"
