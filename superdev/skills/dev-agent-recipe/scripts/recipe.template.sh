#!/usr/bin/env bash
# superdev / dev-agent-recipe — recipe.sh harness TEMPLATE.
#
# This is the FIXED, bundled harness the dev-agent-recipe generator copies into
# `.temp/.workflows/<slug>/recipe.sh` and fills with host-specific values. The
# verb dispatch, the fail-closed `verify` self-check, the `N/A` sentinel, and the
# fingerprint algorithm are FIXED here and never authored by the agent (modeled
# on commit-task.sh: deterministic, self-verifying, trusted by callers). The
# generator fills ONLY the marker lines in the AGENT-FILLED region below — the
# host command bodies, the fingerprinted-file list, the recorded required-tools
# list, and the recorded fingerprint.
#
# Contract:
#   argv : $1 = verb, one of:
#            build                 -> run the host build
#            test-all              -> run the whole host test suite
#            test-filtered <pat>   -> run the host tests matching <pat> ($2)
#            lint                  -> run the host linter
#            launch                -> launch the app for a liveness check
#            verify                -> fail-closed self-check (see below); on a
#                                     match prints "FRESH" and exits 0
#            profile               -> print the path of the sibling profile.md
#            fingerprint           -> print the live fingerprint over the recorded
#                                     file list (debug/self-use; the test + verify
#                                     share this single algorithm)
#          An unknown verb -> non-zero (exit 2) with a one-line error on stderr.
#   cwd  : the host project root (every verb body runs there).
#   exit : a verb body == the sentinel "N/A" (documented-no-suite) -> exit 0
#            (PASS-eligible — the caller maps recipe N/A to its own N/A).
#          `verify`:
#            - any recorded required tool absent from PATH -> non-zero (exit 4),
#              "missing-tool: <tool>" on stderr;
#            - the live fingerprint over the recorded files != the recorded
#              fingerprint (tampered / a tracked toolchain file changed) ->
#              non-zero (exit 3), "STALE" on stderr;
#            - both pass -> "FRESH" on stdout, exit 0.
#          Real verb bodies (build/test-all/test-filtered/lint/launch) propagate
#          the host command's own exit code — a RED test suite under a valid
#          recipe is a non-zero EXIT from `test-all`, NOT a recipe failure; the
#          recipe being runnable is what `verify` proves.
#
# Verify-before-claim: `verify` re-derives the fingerprint from the live host
#   files and re-resolves every recorded tool. It cannot claim FRESH unless the
#   toolchain files are byte-identical to generation time AND every tool resolves
#   — the fail-closed guarantee the consumer forks trust without re-checking.

set -u
# No `set -e`: each branch decides its own exit; a non-zero host command (e.g. a
# red test suite) must propagate, not abort dispatch.

# ============================ AGENT-FILLED REGION ============================
# The generator replaces each marker line below with host-specific content. EVERY
# marker is a line that is EXACTLY "###TOKEN###" on its own — the fill is a
# whole-line swap, so a marker never shares a line with fixed code. Nothing
# outside these marker lines is agent-authored. A *_BODY marker is replaced by ONE
# shell command line, OR the literal "N/A" (documented-no-suite). The
# FINGERPRINTED_FILES / REQUIRED_TOOLS markers are each replaced by a (possibly
# multi-line) list, one entry per line.

# Toolchain files whose bytes define recipe freshness (host CLAUDE.md, lockfiles,
# build manifests…), one path per line, relative to the host project root.
fingerprinted_files() {
  cat <<'__FP_FILES__'
###FINGERPRINTED_FILES###
__FP_FILES__
}

# Executables that MUST resolve on PATH for the recipe to be runnable, one per
# line (bare command name).
required_tools() {
  cat <<'__REQ_TOOLS__'
###REQUIRED_TOOLS###
__REQ_TOOLS__
}

# The fingerprint recorded at generation time. The generator replaces the
# `__unfilled …` marker line with a single `echo "<token>"` statement.
recorded_fingerprint() {
  __unfilled FINGERPRINT
}

verb_build() {
  __unfilled BUILD_BODY
}
verb_test_all() {
  __unfilled TEST_ALL_BODY
}
verb_test_filtered() {
  __unfilled TEST_FILTERED_BODY
}
verb_lint() {
  __unfilled LINT_BODY
}
verb_launch() {
  __unfilled LAUNCH_BODY
}
# ========================== END AGENT-FILLED REGION =========================

# __unfilled <marker> — guard: an unfilled marker line that survives generation
# (a generator bug) makes the recipe fail-closed at runtime instead of silently
# no-op'ing. The raw template is therefore syntactically valid (`bash -n` clean)
# yet never runnable until every marker is replaced.
__unfilled() {
  echo "recipe.sh: unfilled template marker: $1 — regenerate the recipe" >&2
  exit 5
}

# --- fixed helpers ----------------------------------------------------------

# live_fingerprint — hash the recorded toolchain files in their recorded order.
# Missing files hash as the literal "MISSING:<path>" so a deleted/renamed file
# changes the fingerprint (=> STALE) rather than silently matching. Uses whatever
# single-stream hasher resolves (sha256sum | shasum | cksum) so it is portable.
live_fingerprint() {
  local f
  {
    while IFS= read -r f; do
      [ -n "$f" ] || continue
      if [ -f "$f" ]; then
        cat -- "$f"
      else
        printf 'MISSING:%s\n' "$f"
      fi
    done <<EOF
$(fingerprinted_files)
EOF
  } | _hash
}

# _hash — read stdin, emit one hash token. Picks the first available hasher.
_hash() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 | awk '{print $1}'
  else
    cksum | awk '{print $1"-"$2}'
  fi
}

# run_body <body-fn> [args…] — invoke a verb body, but honor the "N/A" sentinel:
# a body whose only statement is the sentinel exits 0 (documented-no-suite, PASS-
# eligible) without running anything. Any trailing args (e.g. the test-filtered
# <pat>) are forwarded to the body as its positional parameters.
run_body() {
  local fn="$1"; shift
  # Detect the N/A sentinel by inspecting the body (the generator emits a body
  # whose single statement is the literal "N/A").
  if declare -f "$fn" 2>/dev/null | grep -qE '(^|[^[:alnum:]_])N/A([^[:alnum:]_]|$)'; then
    exit 0
  fi
  "$fn" "$@"
}

# --- verb dispatch ----------------------------------------------------------
verb="${1:-}"
case "$verb" in
  build)         run_body verb_build ;;
  test-all)      run_body verb_test_all ;;
  test-filtered) run_body verb_test_filtered "${2:-}" ;;
  lint)          run_body verb_lint ;;
  launch)        run_body verb_launch ;;
  fingerprint)   live_fingerprint ;;
  verify)
    # missing-tool: any recorded tool absent from PATH -> fail-closed (exit 4).
    while IFS= read -r tool; do
      [ -n "$tool" ] || continue
      if ! command -v "$tool" >/dev/null 2>&1; then
        echo "missing-tool: $tool" >&2
        exit 4
      fi
    done <<EOF
$(required_tools)
EOF
    # stale: live fingerprint != recorded -> fail-closed (exit 3).
    live="$(live_fingerprint)"
    recorded="$(recorded_fingerprint)"
    if [ "$live" != "$recorded" ]; then
      echo "STALE" >&2
      exit 3
    fi
    echo "FRESH"
    exit 0
    ;;
  profile)
    # profile.md is the sibling of this recipe.sh.
    printf '%s/profile.md\n' "$(cd "$(dirname "$0")" && pwd)"
    exit 0
    ;;
  *)
    echo "unknown verb: ${verb:-<none>}" >&2
    exit 2
    ;;
esac
