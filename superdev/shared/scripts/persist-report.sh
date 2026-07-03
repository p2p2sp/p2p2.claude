#!/usr/bin/env bash
# superdev — shared runner core — persist-report.sh
#
# Persist a pipeline-mode runner report to disk and emit its 3-line stdout in ONE
# self-verifying step. The 3-line block is a deterministic PROJECTION of the file on
# disk: a test verdict is emitted ONLY after this script has itself confirmed the report
# landed (regular file, non-empty). This is the guarantee a forked LLM could skip when it
# hand-wrote the `Write` separately from the stdout.
#
# Contract:
#   argv  : $1 = absolute Report path to write the full markdown report to.
#   stdin : the FULL markdown report (the caller passes it via a quoted here-doc).
#   writes: $1 (parent dirs created); stdin is copied VERBATIM (byte-exact).
#   stdout: EXACTLY three lines —
#             STATUS: <PASS|FAIL|BLOCKED|ERROR|TIMEOUT|N/A — <reason>>
#             Report: <$1 verbatim>
#             Summary: <first `## Summary` bullet, verbatim>
#           On any persistence/parse failure: STATUS: ERROR with the reason in Summary
#           (never a fabricated test verdict).
#   exit  : 0 on every emitted 3-line block (incl. ERROR); 2 only on missing/empty $1.
#
# Verify-before-claim: a real test verdict (PASS/FAIL/BLOCKED/…) reaches stdout ONLY when the
#   report is a non-empty regular file on disk. A write that fails (target is a dir, empty
#   body, disk error) or a report with no parseable `## Verdict` yields STATUS: ERROR, so the
#   caller can never receive a verdict whose evidence file is absent.
#
# Safety: reads stdin + the just-written file; writes ONLY $1. No git, no network, no other
#   filesystem mutation. Builtins only for parsing (read / ${VAR#…} / case) — no awk/jq/sed.

set -u
# No set -e: a failed write / unparseable report must become a STATUS: ERROR line, not abort
# the script — the emitted line, not the exit code, carries the verdict (mirrors commit-task.sh).

path="${1:-}"
if [ -z "$path" ]; then
    printf 'persist-report.sh: missing Report path argument\n' >&2
    exit 2
fi

# trim <string> — echo the string with leading/trailing whitespace removed (builtins only).
trim() {
    local s="$1"
    s="${s#"${s%%[![:space:]]*}"}"
    s="${s%"${s##*[![:space:]]}"}"
    printf '%s' "$s"
}

# emit_error <reason> — persistence/parse failure: honest ERROR verdict, never a test verdict.
emit_error() {
    printf 'STATUS: ERROR\nReport: %s\nSummary: %s\n' "$path" "$1"
    exit 0
}

# ── persist (verbatim) + self-verify ─────────────────────────────────────────
mkdir -p "$(dirname -- "$path")" 2>/dev/null || true

# Guard the non-regular-file case (e.g. path is a directory) BEFORE writing, so no shell
# redirection error leaks and the failure resolves cleanly to STATUS: ERROR.
if [ -e "$path" ] && [ ! -f "$path" ]; then
    emit_error "report not persisted (target is not a regular file)"
fi

cat > "$path" 2>/dev/null
write_rc=$?

# Self-verify: the write succeeded AND the report is a non-empty regular file.
# `-s` alone is insufficient — it is true for a directory — so `-f` is required too.
if [ "$write_rc" -ne 0 ] || [ ! -f "$path" ] || [ ! -s "$path" ]; then
    emit_error "report not persisted"
fi

# ── parse STATUS (## Verdict) + Summary (## Summary) from the file ────────────
# State machine over the on-disk report. Section headers (`## …`) switch state; the first
# bullet in each target section is captured. Tolerant of the SKILL schema's backtick styling
# (`- \`PASS\` (exit code: …)`) and of CRLF line endings.
status=""
summary=""
in_verdict=0
in_summary=0

while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}" # strip a trailing CR (CRLF reports authored on Windows)
    case "$line" in
        "## Verdict"*) in_verdict=1; in_summary=0; continue ;;
        "## Summary"*) in_verdict=0; in_summary=1; continue ;;
        "#"*)          in_verdict=0; in_summary=0; continue ;; # any other heading ends both
    esac

    if [ "$in_verdict" = 1 ] && [ -z "$status" ]; then
        case "$line" in
            "- "*)
                v="${line#- }"
                v="${v% (*}"      # drop the trailing " (exit code: …, duration: …)" parenthetical
                v="${v//\`/}"     # drop all backticks (schema wraps the verdict token)
                status="$(trim "$v")"
                ;;
        esac
    fi

    if [ "$in_summary" = 1 ] && [ -z "$summary" ]; then
        case "$line" in
            "- "*)
                s="${line#- }"
                s="${s#\`}"       # strip one leading backtick (schema wraps the aggregate)
                s="${s%\`}"       # strip one trailing backtick
                summary="$(trim "$s")"
                ;;
        esac
    fi
done < "$path"

if [ -z "$status" ]; then
    emit_error "unparseable report: missing or empty ## Verdict"
fi

# ── emit the 3-line projection of the persisted file ─────────────────────────
printf 'STATUS: %s\nReport: %s\nSummary: %s\n' "$status" "$path" "$summary"
