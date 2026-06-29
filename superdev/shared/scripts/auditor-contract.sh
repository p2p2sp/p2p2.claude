#!/bin/sh
# auditor-contract.sh — final-review auditor body assembler.
# IN : $1 = lens name (architecture | code-quality | production-readiness | testing).
# OUT: the lens-agnostic + lens-specific auditor body on stdout, in order:
#        ../references/_input.md   (common Input contract)
#        ../references/lens-<lens>.md  (the chosen lens's How-to-work, 1-6)
#        ../references/_output.md  (common Output format + Constraint)
#      The four superbuild-reviewer-{quality,architecture,testing,readiness} SKILL.md bodies !-inject this AFTER their own
#      inline per-lens header (title / intro / rubric reference). Only the
#      chosen lens fragment enters context.
# Every emitted fragment is PLACEHOLDER-FREE — no ${CLAUDE_PLUGIN_ROOT}: the
# harness substitutes that token once over the raw SKILL.md before !-commands
# run and never re-scans this stdout, so any placeholder here would reach the
# fork unexpanded. The one ${CLAUDE_PLUGIN_ROOT} an auditor needs (the rubric
# path) stays inline in the SKILL.md body, not here.
# Self-locating via $0 (POSIX) — references resolved relative to this script's
# own dir, not the host CWD. Fail-loud: unknown/missing lens -> STATUS: FAIL.
# Self-verifying — the caller injects this output and does NOT re-assemble it.
set -eu
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ref="$dir/../references"
lens=$(printf '%s' "${1:-}" | awk '{print tolower($1)}')

case "$lens" in
  architecture|code-quality|production-readiness|testing) ;;
  *) printf 'STATUS: FAIL — unknown auditor lens: %s\n' "${1:-<empty>}"; exit 1 ;;
esac

f="$ref/lens-$lens.md"
[ -f "$f" ] || { printf 'STATUS: FAIL — missing lens fragment: %s\n' "$f"; exit 1; }
[ -f "$ref/_input.md" ] || { printf 'STATUS: FAIL — missing fragment: %s\n' "$ref/_input.md"; exit 1; }
[ -f "$ref/_output.md" ] || { printf 'STATUS: FAIL — missing fragment: %s\n' "$ref/_output.md"; exit 1; }

cat "$ref/_input.md"
printf '\n'
cat "$f"
printf '\n'
cat "$ref/_output.md"
