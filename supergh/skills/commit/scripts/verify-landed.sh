#!/bin/sh
# supergh — skills/commit/scripts/verify-landed.sh
# Deterministic git-truth backstop for the `commit` FORK path (all/staged). The
# fork (`agent-committer`, haiku) is supposed to run `commit.sh` and relay its
# `✓ <sha>` line verbatim — but a fork can skip the script and FABRICATE that
# line (a phantom commit the script never made). `commit.sh` cannot fabricate
# its own line, but that guarantee protects the script, not the LLM relay hop
# above it. So the main-context `commit` resolver does NOT trust the relayed
# line: it freezes HEAD before delegating, then calls this script, which derives
# the verdict from git ALONE (HEAD before vs after) and IGNORES whatever the
# fork claimed. A fabricated `✓` cannot survive — an unmoved HEAD is reported as
# `not-landed`, never as a success.
#
# Contract:
#   argv : $1 = before — pre-commit HEAD short/long sha, or the literal `NONE`
#               (empty repo / no HEAD). Frozen by the caller BEFORE the fork ran.
#          $2 = mode   — staging mode, one of `all` | `index` (the value
#               route.sh injected; `index` is the `staged` request).
#   cwd  : the repository the fork committed into (caller's cwd; repo root).
#   stdout: EXACTLY ONE line — the user-facing result, relayed verbatim:
#            ✓ <short-sha> <subject> (<N> files)   — a commit landed (HEAD moved)
#            nothing to commit                     — empty staged set (index mode:
#                                                    nothing was ever staged; all
#                                                    mode: `git add -A` would
#                                                    legitimately stage nothing —
#                                                    worktree AND index both clean)
#            not-landed                            — HEAD did not move though it
#                                                    should have (fork fabricated
#                                                    its line / never committed);
#                                                    the caller does ONE retry,
#                                                    then reports a hard error.
#   exit : 0 on every emitted line (the line IS the verdict). 2 only on bad argv.
#
# Verify-before-claim: a `✓` is emitted ONLY when `before != after`, i.e. git
#   itself proves HEAD advanced. The success line is RECONSTRUCTED from git
#   (rev-parse + log -1 + diff-tree), never composed from the fork's text.
#   KEEP THE SUCCESS-LINE RECIPE IN SYNC WITH commit.sh:141-142 (same fork/main
#   trust boundary; no build/lint guards this duplication).
#
# Safety: read-only — runs ONLY `git rev-parse` / `git diff` / `git log` /
#   `git diff-tree`. Never stages, commits, pushes, or edits anything.
set -u
# No `set -e`: each branch must emit exactly one line and exit 0.

before="${1:-}"
mode="${2:-}"

if [ -z "$before" ]; then
  printf 'error: missing before-HEAD argument\n'; exit 2
fi
case "$mode" in
  all|index) : ;;
  *) printf 'error: bad mode: %s (want all|index)\n' "$mode"; exit 2 ;;
esac

# Capture HEAD now. `--verify --quiet` prints NOTHING and fails cleanly on an
# unborn HEAD (a bare `git rev-parse HEAD` instead echoes the literal "HEAD" to
# stdout, which would defeat the NONE fallback). `|| echo NONE` then keeps
# after == before (NONE == NONE) under `set -u` on an empty repo, so a failed
# commit takes the not-landed arm and never falsely enters the HEAD-moved branch.
# The caller's <head-before> capture MUST use this same form.
after="$(git rev-parse --verify --quiet HEAD 2>/dev/null || echo NONE)"

# --- HEAD moved -> a commit landed; reconstruct the truth from git -----------
if [ "$before" != "$after" ]; then
  sha="$(git rev-parse --short HEAD 2>/dev/null)"
  subject="$(git log -1 --format=%s 2>/dev/null)"
  files="$(git diff-tree --no-commit-id --name-only -r --root -m HEAD 2>/dev/null | sort -u | grep -c .)"
  printf '\xe2\x9c\x93 %s %s (%s files)\n' "$sha" "$subject" "$files"
  exit 0
fi

# --- HEAD unmoved ------------------------------------------------------------
# A legitimate no-op needs proof matching what commit.sh itself would have seen:
#  - `index` mode never stages anything (no `git add` anywhere in that path), so
#    the pre-existing staged set is the right proof — `--cached` alone.
#  - `all` mode's commit.sh runs `git add -A` before its own no-op check, so an
#    empty INDEX there is only meaningful together with a clean WORKTREE too.
#    This script never stages anything itself, so `--cached` alone cannot tell a
#    legitimate no-op (worktree really is clean after `add -A`) apart from a fork
#    that fabricated its line without ever calling `commit.sh` (worktree still
#    dirty, index simply was never touched) — that gap must fall through to
#    `not-landed`, not be reported as a no-op.
if [ "$mode" = index ] && git diff --cached --quiet 2>/dev/null; then
  printf 'nothing to commit\n'
  exit 0
fi
if [ "$mode" = all ] && git diff --quiet 2>/dev/null && git diff --cached --quiet 2>/dev/null; then
  printf 'nothing to commit\n'
  exit 0
fi
printf 'not-landed\n'
exit 0
