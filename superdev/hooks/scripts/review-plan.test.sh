#!/usr/bin/env bash
# superdev / PreToolUse hook — review-plan.test.sh
#
# Deterministic test runs for review-plan.sh (the ExitPlanMode plan-approval
# gate). This repo has no test framework (markdown + JSON + bash), so a "test"
# is a real hook run against a fabricated JSONL transcript fixture, asserting on
# the emitted permissionDecision.
#
# Contract:
#   input  : none. Builds JSONL transcript fixtures under a `mktemp -d` scratch
#            dir and feeds review-plan.sh the PreToolUse stdin payload
#            {"transcript_path":<fixture>,"tool_name":"ExitPlanMode"}.
#   output : one "PASS: <case>" line per case, then "ALL PASS (N/N)"; a mismatch
#            prints "FAIL: <case> — <detail>" and exits non-zero.
#   cases  : the S-match must bind to the reviewer's OWN first verdict (a later
#            stray `Verdict: PASS` must NOT approve a FAIL'd plan), and a
#            post-PASS Bash mutation of the plan file must re-gate — without
#            false-denying a benign command that merely names the plan path.
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUT="$SCRIPT_DIR/review-plan.sh"

SCRATCH="$(mktemp -d 2>/dev/null || mktemp -d -t review_plan)"
trap 'rm -rf "$SCRATCH"' EXIT

PASS_COUNT=0; TOTAL=0; FAILED=0
pass() { echo "PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "FAIL: $1 — $2"; FAILED=$((FAILED + 1)); }

# --- fixture JSONL lines (single-quoted: every backslash stays literal, mirroring
#     a real Windows transcript where paths are "C:\\Users\\..\\.claude\\plans\\..") -
LW='{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Write","input":{"file_path":"C:\\Users\\dariu\\.claude\\plans\\foo.md","content":"plan"}}]}}'
LR='{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Skill","input":{"skill":"superdev:superplan-reviewer","args":"C:\\Users\\dariu\\.claude\\plans\\foo.md"}}]}}'
LR2='{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Skill","input":{"skill":"superdev:superplan-reviewer","args":"C:\\Users\\dariu\\.claude\\plans\\foo.md\n--- Previous review (round 1) ---\nVerdict: FAIL\n--- Fixes applied ---"}}]}}'
# Simple-path reviewer call — the gate must recognize simpleplan-reviewer, not only superplan-reviewer.
LRS='{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Skill","input":{"skill":"superdev:simpleplan-reviewer","args":"C:\\Users\\dariu\\.claude\\plans\\foo.md"}}]}}'
LPASS='{"type":"user","message":{"content":[{"type":"tool_result","content":"## Superplan Review\n**Verdict:** PASS\nAll good."}]}}'
LFAIL='{"type":"user","message":{"content":[{"type":"tool_result","content":"## Superplan Review\n**Verdict:** FAIL\nFix list: rework step 3."}]}}'
LPASTE='{"type":"user","message":{"content":"here is an older reviewed doc I pasted:\n**Verdict:** PASS looked fine last week"}}'
LLEGEND='{"type":"assistant","message":{"content":"for reference the template legend is:\nVerdict: PASS | FAIL"}}'
LTAMPER_SED='{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Bash","input":{"command":"sed -i s/x/y/ C:\\Users\\dariu\\.claude\\plans\\foo.md"}}]}}'
LTAMPER_REDIR='{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Bash","input":{"command":"cat extra >> C:\\Users\\dariu\\.claude\\plans\\foo.md"}}]}}'
LSTAGE='{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Bash","input":{"command":"git add C:\\Users\\dariu\\.claude\\plans\\foo.md"}}]}}'
LREDIR_OTHER='{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Bash","input":{"command":"echo see foo.md > notes.txt"}}]}}'
# reviewer result whose FIRST verdict-shaped line is a NEGATED/qualified PASS, before the real FAIL
LNEG='{"type":"user","message":{"content":[{"type":"tool_result","content":"## Superplan Review\nVerdict: PASS is NOT warranted; see below.\n**Verdict:** FAIL\nFix list: rework."}]}}'
# further tamper shapes: single `>` redirect, and a `tee` write, both targeting the plan
LTAMPER_GT='{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Bash","input":{"command":"printf x > C:\\Users\\dariu\\.claude\\plans\\foo.md"}}]}}'
LTAMPER_TEE='{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Bash","input":{"command":"echo x | tee C:\\Users\\dariu\\.claude\\plans\\foo.md"}}]}}'
LTAMPER_CP='{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Bash","input":{"command":"cp other C:\\Users\\dariu\\.claude\\plans\\foo.md"}}]}}'
LTAMPER_MV='{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Bash","input":{"command":"mv other C:\\Users\\dariu\\.claude\\plans\\foo.md"}}]}}'
# Format-tolerance fixtures — the reviewer may emit the verdict in several markdown shapes.
# The gate must recognise them all (case-insensitive keyword, optional bold, optional list
# marker, optional back-ticks around the value). CV = the canonical bold+UPPER form the
# reviewers now emit; LV/LF = the exact list+back-tick+UPPER form that historically slipped
# past the old `Verdict:`-only pattern and left the gate stuck.
LPASS_CANON='{"type":"user","message":{"content":[{"type":"tool_result","content":"## Superplan Review\n**VERDICT:** PASS\nAll good."}]}}'
LPASS_LIST='{"type":"user","message":{"content":[{"type":"tool_result","content":"## Superplan Review\n- VERDICT: `PASS`\nAll good."}]}}'
LFAIL_LIST='{"type":"user","message":{"content":[{"type":"tool_result","content":"## Superplan Review\n- VERDICT: `FAIL`\nFix list: rework step 3."}]}}'
# negated UPPER PASS before the real UPPER FAIL — end-anchor must still reject the negation
LNEG_UPPER='{"type":"user","message":{"content":[{"type":"tool_result","content":"## Superplan Review\nVERDICT: PASS is NOT warranted; see below.\n**VERDICT:** FAIL\nFix list: rework."}]}}'

# mkfix <file> <line...> — write a JSONL fixture, one arg per line.
mkfix() { local f="$1"; shift; printf '%s\n' "$@" > "$f"; }

# run_case <name> <fixture-file> <ALLOW|DENY>
run_case() {
  local out dec
  out="$(printf '{"transcript_path":"%s","tool_name":"ExitPlanMode"}' "$2" | bash "$SUT")"
  case "$out" in
    *'"permissionDecision":"allow"'*) dec=ALLOW ;;
    *'"permissionDecision":"deny"'*)  dec=DENY ;;
    *) dec="?<$out>" ;;
  esac
  TOTAL=$((TOTAL + 1))
  if [ "$dec" = "$3" ]; then pass "$1"; else fail "$1" "expected $3 got $dec"; fi
}

# run_case_deny_contains <name> <fixture-file> <substring> — assert DENY AND that the
# emitted permissionDecisionReason carries <substring> (locks message content, not just
# the decision). "deny" precedes the reason in the JSON, so the ordered pattern holds.
run_case_deny_contains() {
  local out
  out="$(printf '{"transcript_path":"%s","tool_name":"ExitPlanMode"}' "$2" | bash "$SUT")"
  TOTAL=$((TOTAL + 1))
  case "$out" in
    *'"permissionDecision":"deny"'*"$3"*) pass "$1" ;;
    *) fail "$1" "expected DENY containing '$3', got <$out>" ;;
  esac
}

# A — genuine happy path W->R->PASS -> allow
mkfix "$SCRATCH/A"  "$LW" "$LR" "$LPASS"
run_case "A happy W->R->PASS -> allow" "$SCRATCH/A" ALLOW

# A2 — Simple-path happy path W->R(simpleplan-reviewer)->PASS -> allow
mkfix "$SCRATCH/A2" "$LW" "$LRS" "$LPASS"
run_case "A2 Simple-path W->R(simpleplan-reviewer)->PASS -> allow" "$SCRATCH/A2" ALLOW

# B — genuine FAIL only -> deny
mkfix "$SCRATCH/B"  "$LW" "$LR" "$LFAIL"
run_case "B genuine FAIL only -> deny" "$SCRATCH/B" DENY

# G — reviewer FAIL then a later pasted 'Verdict: PASS' -> deny (no false-allow)
mkfix "$SCRATCH/G"  "$LW" "$LR" "$LFAIL" "$LPASTE"
run_case "G FAIL + later pasted PASS -> deny" "$SCRATCH/G" DENY

# H — reviewer FAIL then a 'Verdict: PASS | FAIL' legend line -> deny
mkfix "$SCRATCH/H"  "$LW" "$LR" "$LFAIL" "$LLEGEND"
run_case "H FAIL + template legend PASS -> deny" "$SCRATCH/H" DENY

# T1 — genuine PASS then Bash `sed -i` on the plan path -> deny (tamper)
mkfix "$SCRATCH/T1" "$LW" "$LR" "$LPASS" "$LTAMPER_SED"
run_case "T1 PASS then sed -i on plan -> deny" "$SCRATCH/T1" DENY

# T2 — genuine PASS then Bash `>>` redirect into the plan path -> deny (tamper)
mkfix "$SCRATCH/T2" "$LW" "$LR" "$LPASS" "$LTAMPER_REDIR"
run_case "T2 PASS then >> into plan -> deny" "$SCRATCH/T2" DENY

# N1 — genuine PASS then `git add <plan>` (stage, not mutate) -> allow (no false-deny)
mkfix "$SCRATCH/N1" "$LW" "$LR" "$LPASS" "$LSTAGE"
run_case "N1 PASS then git add plan -> allow" "$SCRATCH/N1" ALLOW

# N2 — genuine PASS then a redirect to ANOTHER file that only names the plan -> allow
mkfix "$SCRATCH/N2" "$LW" "$LR" "$LPASS" "$LREDIR_OTHER"
run_case "N2 PASS then redirect-to-other names plan -> allow" "$SCRATCH/N2" ALLOW

# N3 — genuine PASS then a later stray pasted PASS (must still allow, not over-deny)
mkfix "$SCRATCH/N3" "$LW" "$LR" "$LPASS" "$LPASTE"
run_case "N3 genuine PASS + later stray PASS -> allow" "$SCRATCH/N3" ALLOW

# R2 — round-2 re-review: prior FAIL rides ON the reviewer-call line, then genuine PASS -> allow
mkfix "$SCRATCH/R2" "$LW" "$LR2" "$LPASS"
run_case "R2 round-2 re-review PASS -> allow" "$SCRATCH/R2" ALLOW

# NEG — a negated 'Verdict: PASS is NOT ...' precedes the real FAIL verdict -> deny
mkfix "$SCRATCH/NEG" "$LW" "$LR" "$LNEG"
run_case "NEG negated PASS before real FAIL -> deny" "$SCRATCH/NEG" DENY

# T3 — genuine PASS then a single `>` redirect into the plan -> deny (tamper)
mkfix "$SCRATCH/T3" "$LW" "$LR" "$LPASS" "$LTAMPER_GT"
run_case "T3 PASS then single > into plan -> deny" "$SCRATCH/T3" DENY

# T4 — genuine PASS then `tee` writing the plan -> deny (tamper)
mkfix "$SCRATCH/T4" "$LW" "$LR" "$LPASS" "$LTAMPER_TEE"
run_case "T4 PASS then tee into plan -> deny" "$SCRATCH/T4" DENY

# T5 — genuine PASS then `cp` overwriting the plan -> deny (tamper)
mkfix "$SCRATCH/T5" "$LW" "$LR" "$LPASS" "$LTAMPER_CP"
run_case "T5 PASS then cp over plan -> deny" "$SCRATCH/T5" DENY

# T6 — genuine PASS then `mv` overwriting the plan -> deny (tamper)
mkfix "$SCRATCH/T6" "$LW" "$LR" "$LPASS" "$LTAMPER_MV"
run_case "T6 PASS then mv over plan -> deny" "$SCRATCH/T6" DENY

# FC — canonical bold+UPPER `**VERDICT:** PASS` -> allow
mkfix "$SCRATCH/FC" "$LW" "$LR" "$LPASS_CANON"
run_case "FC canonical **VERDICT:** PASS -> allow" "$SCRATCH/FC" ALLOW

# FL — list marker + back-ticked UPPER `- VERDICT: \`PASS\`` (the historical miss) -> allow
mkfix "$SCRATCH/FL" "$LW" "$LR" "$LPASS_LIST"
run_case "FL list+backtick VERDICT: \`PASS\` -> allow" "$SCRATCH/FL" ALLOW

# FF — same shape carrying FAIL must still deny, not slip through -> deny
mkfix "$SCRATCH/FF" "$LW" "$LR" "$LFAIL_LIST"
run_case "FF list+backtick VERDICT: \`FAIL\` -> deny" "$SCRATCH/FF" DENY

# NEGU — negated UPPER PASS before the real UPPER FAIL -> deny
mkfix "$SCRATCH/NEGU" "$LW" "$LR" "$LNEG_UPPER"
run_case "NEGU negated UPPER PASS before real FAIL -> deny" "$SCRATCH/NEGU" DENY

# P — plain path: plan-file WRITE only, NO reviewer call at all -> deny, and the deny
# reason defaults to naming simpleplan-reviewer (super/simple/plain gated identically).
mkfix "$SCRATCH/P" "$LW"
run_case "P plain: W only, no reviewer -> deny" "$SCRATCH/P" DENY
run_case_deny_contains "P plain: deny defaults to simpleplan-reviewer" "$SCRATCH/P" "simpleplan-reviewer"

echo ""
if [ "$FAILED" -ne 0 ]; then
  echo "FAILED ($PASS_COUNT/$TOTAL)"
  exit 1
fi
echo "ALL PASS ($PASS_COUNT/$TOTAL)"
