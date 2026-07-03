#!/usr/bin/env bash
# superdev / superbuild-decomposer — slug-guard.sh (sourced helper)
#
# Shared PlanSlug validation + extraction for precheck.sh and copy_plan.sh. The
# slug is interpolated into a `.superdev/.workflows/<slug>/` filesystem path, so it is
# validated defense-in-depth before any path is built (path-escape / word-split
# guard) even though the dispatcher normally derives it via basename. This is the
# single copy for this skill's sh scripts; validate_tasks.py repeats the rule
# natively (cross-language, unavoidable).
#
# Contract (functions exported into the sourcing shell):
#   slug_valid <slug>  -> exit 0 when <slug> matches ^[A-Za-z0-9._-]+$ AND does
#                         not begin with a dot (rejects "", ".", "..", ".foo");
#                         exit 1 otherwise. No output. Callers no-op on non-zero.
#   extract_plan_slug  -> reads the raw $ARGUMENTS block on stdin, prints (no
#                         trailing newline) the trimmed value of the FIRST
#                         `PlanSlug:` line, or nothing. Builtins only (read /
#                         ${VAR##}); no awk/jq/sed.
#   note   : sourced, not executed; does NOT enable set -e/-u for the caller.

# Reject empty, leading-dot, or any char outside [A-Za-z0-9._-].
slug_valid() {
  local s="${1:-}"
  case "$s" in
    "")  return 1 ;;
    .*)  return 1 ;;            # leading dot: ".", "..", ".foo"
  esac
  case "$s" in
    *[!A-Za-z0-9._-]*) return 1 ;;   # any char outside the whitelist
  esac
  return 0
}

# Print the trimmed value of the first `PlanSlug:` line read from stdin.
extract_plan_slug() {
  local line val
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"               # strip a CRLF carriage return
    case "$line" in
      PlanSlug:*)
        val="${line#PlanSlug:}"
        val="${val#"${val%%[![:space:]]*}"}"   # ltrim
        val="${val%"${val##*[![:space:]]}"}"   # rtrim
        printf '%s' "$val"
        return 0
        ;;
    esac
  done
  return 0
}
