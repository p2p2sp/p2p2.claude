#!/bin/sh
# supergh — shared/scripts/commit.sh
# Self-verifying staging + commit + verification for ONE commit. The single git
# MUTATION point of the supergh commit chain: both callers (the `commit` skill in
# `context` mode, and the `agent-committer` fork in `all`/`staged` mode) author the
# subject/footer themselves, then hand them here — they run NO `git add` / `git commit`
# of their own. Like the orchestrator's `commit-task.sh`, this script CANNOT fabricate
# its success line: it emits a `✓ <sha>` only AFTER itself proving, with git, that HEAD
# advanced and the staged set landed — the failure mode an LLM relay could not catch.
#
# Contract:
#   argv : $1 = staging mode — one of:
#            all    → `git add -A`            (stage every modified/new/deleted file)
#            index  → no `git add`            (commit the index exactly as it stands)
#            paths  → `git add -- <paths…>`   (stage ONLY $4… , nothing else)
#          $2 = subject — one-line Conventional-Commits subject (authored by the caller).
#          $3 = footer  — optional issue footer (e.g. "Refs: #42"); empty string "" = none.
#          $4… = paths  — required for `paths` mode, ignored otherwise.
#   cwd  : the repository to commit (caller's cwd; the resolver/fork run at repo root).
#   stdout: EXACTLY ONE human-readable line — relayed verbatim to the user by the caller:
#            ✓ <short-sha> <subject> (<N> files)   — commit landed & verified
#            nothing to commit                     — no-op gate (empty staged set)
#            error: <reason>                        — single-line failure (git stderr or guard)
#   exit : 0 on every emitted line (the line IS the verdict; callers read stdout, not rc).
#          2 only on missing/garbage argv (bad mode, missing subject, paths mode w/o paths).
#
# Verify-before-claim (the whole point):
#   A `✓ <sha>` is emitted ONLY after this script confirms `before != after` HEAD AND the
#   index is empty afterwards (`git diff --cached --quiet`). A non-zero `git commit`, an
#   unmoved HEAD, or a still-dirty index all yield `error: …` — NEVER a fabricated sha.
#   NB: unlike commit-task.sh this does NOT assert a fully clean worktree — `index`/`paths`
#   modes intentionally leave OTHER changes unstaged, so "empty index" is the correct proof.
#
# Safety: runs ONLY `git add` + `git commit -m …` + read-only `git rev-parse`/`diff`/
#   `diff-tree`. NEVER pushes, merges, rebases, amends, resets, --force, or --no-verify, and
#   NEVER edits source/tests/config.
set -u
# No `set -e`: a non-zero git call must be turned into an `error:` line, not abort the script.

# --- one-line error emitter (collapse newlines so the line stays single) ----
emit_error() {
  printf 'error: %s\n' "$(printf '%s' "$1" | tr '\n\r' '  ')"
  exit 0
}

# --- parse argv -------------------------------------------------------------
mode="${1:-}"
subject="${2:-}"
footer="${3:-}"
# Remaining args (after mode/subject/footer) are the explicit paths for `paths` mode.
if [ "$#" -gt 3 ]; then shift 3; else set --; fi

case "$mode" in
  all|index|paths) : ;;
  *) printf 'error: bad staging mode: %s (want all|index|paths)\n' "$mode"; exit 2 ;;
esac
if [ -z "$subject" ]; then
  printf 'error: missing subject\n'; exit 2
fi
if [ "$mode" = paths ] && [ "$#" -eq 0 ]; then
  printf 'error: paths mode requires at least one path\n'; exit 2
fi

# --- stage per mode ---------------------------------------------------------
case "$mode" in
  all)   git add -A >/dev/null 2>&1 || emit_error "git add -A failed" ;;
  paths) git add -- "$@" >/dev/null 2>&1 || emit_error "git add of paths failed" ;;
  index) : ;;  # commit the index as-is
esac

# --- no-op gate: nothing staged after staging -> nothing to commit ----------
if git diff --cached --quiet 2>/dev/null; then
  printf 'nothing to commit\n'
  exit 0
fi

# --- commit, recording HEAD before/after so the move can be PROVEN ----------
before="$(git rev-parse HEAD 2>/dev/null || true)"
if [ -n "$footer" ]; then
  commit_err="$(git commit -m "$subject" -m "$footer" 2>&1 1>/dev/null)"
else
  commit_err="$(git commit -m "$subject" 2>&1 1>/dev/null)"
fi
commit_rc=$?
after="$(git rev-parse HEAD 2>/dev/null || true)"

# --- verify the commit actually landed before claiming a sha ----------------
if [ "$commit_rc" -ne 0 ]; then
  emit_error "${commit_err:-git commit failed (rc=$commit_rc)}"
fi
if [ "$before" = "$after" ]; then
  emit_error "commit did not land (HEAD unchanged)"
fi
if ! git diff --cached --quiet 2>/dev/null; then
  emit_error "staged changes remain after commit"
fi

# --- success: sha + file count taken verbatim from git, never composed ------
# KEEP THIS RECIPE IN SYNC WITH skills/commit/scripts/verify-landed.sh (the
# main-context backstop reconstructs the same ✓ line; no build/lint catches desync).
sha="$(git rev-parse --short HEAD 2>/dev/null)"
files="$(git diff-tree --no-commit-id --name-only -r --root HEAD 2>/dev/null | grep -c .)"
printf '\xe2\x9c\x93 %s %s (%s files)\n' "$sha" "$subject" "$files"
exit 0
