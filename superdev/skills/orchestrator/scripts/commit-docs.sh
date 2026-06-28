#!/usr/bin/env bash
# superdev / orchestrator — deterministic as-built-docs committer.
#
# Twin of commit-adr.sh, for the post-final-review docs step. The
# agent-docs-recorder fork WRITES the .superdev/docs/ index + shard file(s)
# itself; this script commits exactly those paths. Being deterministic,
# it cannot fabricate its `sha` tag — it emits one ONLY after itself confirming,
# with git, that HEAD advanced and the worktree is clean. The orchestrator
# guarantees a clean tree BEFORE the pipeline runs (recipe Step 0), so the only
# dirty paths at commit time are the docs records; the staging is scoped to them
# regardless.
#
# Contract:
#   argv : $1 = the full commit subject authored by the recorder
#               (e.g. `docs(spec): reconcile auth slice — login + session`).
#               The committed message is "$1" verbatim — NO `T<N>:` prefix
#               (this is not a per-task commit) and nothing is re-authored.
#   cwd  : the repository to commit (caller's cwd; the orchestrator runs this at
#          the repo root).
#   stdout: EXACTLY ONE line — one of (vocabulary identical to commit-task.sh, so
#           the orchestrator's parse_commit_tag is unchanged):
#            <commit sha="<7-40 hex>" files="<count>"><subject></commit>
#            <commit status="no-changes"/>
#            <commit status="error"><reason></commit>
#          Any literal "</commit>" inside <subject>/<reason> is escaped "<\/commit>".
#   exit : 0 on every emitted tag (the tag IS the verdict; the orchestrator
#          parses stdout, not the exit code). 2 only on missing argv.
#
# Verify-before-claim (the whole point of going deterministic):
#   A `sha` tag is emitted ONLY after this script has itself confirmed, with git,
#   that HEAD advanced past the pre-commit HEAD AND the worktree is clean. A
#   non-zero `git commit`, an unmoved HEAD, or a still-dirty tree all yield the
#   `error` tag — NEVER a `sha`.
#
# Safety: this script ONLY runs scoped `git add .superdev/docs`
#   + `git commit -m …` + read-only `git rev-parse`/`status`/`diff-tree`. It NEVER
#   pushes, merges, rebases, amends, resets, --force, or --no-verify, and NEVER
#   edits source/tests/config or stages anything outside the docs paths.

set -u
# No `set -e`: every branch must emit exactly one tag and exit 0 even when a git
# call returns non-zero — the tag, not the exit code, carries the verdict.

# --- one-line tag emitters -------------------------------------------------
# Collapse any newline/CR so the emitted tag is always a single line (the
# orchestrator's parse_commit_tag is line-oriented). Escape inner </commit>.
sanitize() {
  printf '%s' "$1" | tr '\n\r' '  ' | sed 's#</commit>#<\\/commit>#g'
}

emit_error() {
  printf '<commit status="error">%s</commit>\n' "$(sanitize "$1")"
  exit 0
}

# --- argument ---------------------------------------------------------------
subject="${1:-}"
if [ -z "$subject" ]; then
  printf '<commit status="error">no commit-subject argument</commit>\n'
  exit 2
fi

# --- stage ONLY the docs paths ---------------------------------------------
git add .superdev/docs >/dev/null 2>&1

# --- empty staged tree -> no-changes ---------------------------------------
if git diff --cached --quiet 2>/dev/null; then
  printf '<commit status="no-changes"/>\n'
  exit 0
fi

# --- commit, recording HEAD before/after so the move can be PROVEN ----------
before="$(git rev-parse HEAD 2>/dev/null)"
commit_err="$(git commit -m "${subject}" 2>&1 1>/dev/null)"
commit_rc=$?
after="$(git rev-parse HEAD 2>/dev/null)"

# --- verify the commit actually landed before claiming a sha ---------------
if [ "$commit_rc" -ne 0 ]; then
  emit_error "${commit_err:-git commit failed (rc=$commit_rc)}"
fi
if [ "$before" = "$after" ]; then
  emit_error "commit did not land (HEAD unchanged)"
fi
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  emit_error "worktree not clean after commit"
fi

# --- success: sha + file count taken verbatim from git, never composed ------
sha="$(git rev-parse --short HEAD 2>/dev/null)"
files="$(git diff-tree --no-commit-id --name-only -r --root HEAD 2>/dev/null | grep -c .)"
printf '<commit sha="%s" files="%s">%s</commit>\n' \
  "$sha" "$files" "$(sanitize "$subject")"
exit 0
