#!/usr/bin/env bash
# superdev / orchestrator — deterministic per-task git committer.
#
# Deterministic POSIX-sh committer that CANNOT fabricate its `sha` tag (being a
# script, it emits a `sha` only after itself verifying the commit landed — the
# failure mode the long-gone phantom-commit retry loop existed to catch). It is
# invoked by the haiku `commiter` passthrough agent inside the per-task
# Workflow, which relays this line verbatim; the workflow parses it with its own
# `parseCommitTag` into `wf_out.commit`. (The ADR sibling `commit-adr.sh` shares
# this exact tag vocabulary and is parsed by the dispatcher's `parse_commit_tag`.)
# Derivation: N from filename, subject from the first `# ` H1; commit message
# `git add -A && git commit -m "T<N>: <subject>"`.
#
# Contract:
#   argv : $1 = path to the per-task file (.temp/.workflows/<slug>/tasks/<N>.md).
#          N      = basename "$1" .md
#          subject= first `# ` H1 line of "$1", leading "# " stripped (verbatim
#                   Conventional-Commits subject authored by agent-decomposer).
#          The committed message is "T<N>: <subject>" — nothing is re-authored.
#   cwd  : the repository whose staged tree is to be committed (caller's cwd;
#          the orchestrator runs this at the repo root). `git add -A` stages
#          everything before committing, matching the old fork's `!`-block.
#   stdout: EXACTLY ONE line — one of (vocabulary identical to dev-committer):
#            <commit sha="<7-40 hex>" files="<count>">T<N>: <subject></commit>
#            <commit status="no-changes"/>
#            <commit status="error"><reason></commit>
#          Any literal "</commit>" inside <subject>/<reason> is escaped "<\/commit>".
#   exit : 0 on every emitted tag (the tag IS the verdict; the orchestrator
#          parses stdout, not the exit code). 2 only on missing/garbage argv.
#
# Verify-before-claim (the whole point of going deterministic):
#   A `sha` tag is emitted ONLY after this script has itself confirmed, with git,
#   that HEAD advanced past the pre-commit HEAD AND the worktree is clean. A
#   non-zero `git commit`, an unmoved HEAD, or a still-dirty tree all yield the
#   `error` tag — NEVER a `sha`. This is the guarantee a forked LLM could not give.
#
# Safety (ported from dev-committer "# Safety"): this script ONLY runs
#   `git add -A` + `git commit -m …` + read-only `git rev-parse`/`status`/
#   `diff-tree`. It NEVER pushes, merges, rebases, amends, resets, --force, or
#   --no-verify, and NEVER edits source/tests/config.

set -u
# No `set -e`: every branch must emit exactly one tag and exit 0 even when a git
# call returns non-zero — the tag, not the exit code, carries the verdict.

# --- one-line tag emitters -------------------------------------------------
# Collapse any newline/CR so the emitted tag is always a single line (the
# consumer's tag parser — the workflow's parseCommitTag — is line-oriented).
# Escape inner </commit>.
sanitize() {
  # $1 = arbitrary text -> single-line, </commit>-escaped, on stdout (no newline)
  printf '%s' "$1" | tr '\n\r' '  ' | sed 's#</commit>#<\\/commit>#g'
}

emit_error() {
  # $1 = reason
  printf '<commit status="error">%s</commit>\n' "$(sanitize "$1")"
  exit 0
}

# --- argument ---------------------------------------------------------------
tf="${1:-}"
if [ -z "$tf" ]; then
  printf '<commit status="error">no task-file argument</commit>\n'
  exit 2
fi
if [ ! -f "$tf" ]; then
  printf '<commit status="error">task file not found: %s</commit>\n' "$(sanitize "$tf")"
  exit 2
fi

# --- empty staged tree -> no-changes (checked BEFORE deriving subject, so an
#     empty-tree no-op never depends on the H1 being present) ----------------
# Stage everything first (matches the old fork's `git add -A` in its `!`-block),
# then ask git whether anything is actually staged for commit.
git add -A >/dev/null 2>&1
if git diff --cached --quiet 2>/dev/null; then
  # exit 0 from --quiet == no staged differences == nothing to commit.
  printf '<commit status="no-changes"/>\n'
  exit 0
fi

# --- derive N + subject -----------------------------------------------------
N="$(basename "$tf" .md)"
subject="$(grep -m1 '^# ' "$tf" 2>/dev/null | sed 's/^# //')"
if [ -z "$subject" ]; then
  emit_error "no H1 subject in task file: $tf"
fi

# --- commit, recording HEAD before/after so the move can be PROVEN ----------
before="$(git rev-parse HEAD 2>/dev/null)"
commit_err="$(git commit -m "T${N}: ${subject}" 2>&1 1>/dev/null)"
commit_rc=$?
after="$(git rev-parse HEAD 2>/dev/null)"

# --- verify the commit actually landed before claiming a sha ---------------
# Any of: non-zero git commit, HEAD did not advance, or a still-dirty worktree
# means the commit did not land -> error tag, never a fabricated sha.
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
files="$(git diff-tree --no-commit-id --name-only -r HEAD 2>/dev/null | grep -c .)"
printf '<commit sha="%s" files="%s">T%s: %s</commit>\n' \
  "$sha" "$files" "$N" "$(sanitize "$subject")"
exit 0
