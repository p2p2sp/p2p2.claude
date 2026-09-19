#!/usr/bin/env bash
#
# commit-selfcheck.sh - proves a commit actually landed, by comparing HEAD
# before and after it.
#
# It exists because the fork that runs the commit reports a `<sha> | <message>`
# line its caller TRUSTS, and a model cannot be the thing that decides whether
# the commit it just asked for happened. This re-derives the answer from HEAD
# alone, so a fabricated success is not expressible.
#
# Usage:
#   commit-selfcheck.sh <before_sha>
#
# Contract:
#   argv   : $1 before_sha (REQUIRED) - HEAD's SHA from before the commit, or
#            the sentinel "(none)" when HEAD was unborn then.
#   cwd    : the repository the commit was made in - the git call runs in the
#            caller's working directory.
#   env    : none.
#   stdout : ONE word:
#              VERIFIED - HEAD exists AND moved (the commit landed)
#              FAILED   - HEAD is unchanged or still unborn (it did not)
#   exit   : 0 on either word - FAILED is a value, not an error. 1 only on a
#            missing argument, with the usage line on stderr.
set -euo pipefail

before="${1:-}"

if [[ -z "$before" ]]; then
  echo "error: missing required parameter 'before_sha'" >&2
  echo "usage: commit-selfcheck.sh <before_sha>" >&2
  exit 1
fi

# --verify -q: empty (not noise) while HEAD is still unborn (no commit landed).
after="$(git rev-parse --verify -q HEAD 2>/dev/null || true)"

# VERIFIED only when HEAD exists AND moved against before (the "(none)"
# sentinel of a first root commit passes here too; an empty after => FAILED).
if [[ -n "$after" && "$after" != "$before" ]]; then
  echo "VERIFIED"
else
  echo "FAILED"
fi
