#!/usr/bin/env bash
#
# last-commit-date.sh - prints the date of the host repo's latest commit, so a
# skill can tell whether the repo has moved since some earlier date without
# running git itself.
#
# It exists for the `intent` skill's refresh step, which decides whether a
# resumed intent has anything to compare against. That decision used TODAY's
# date as its bound, so any resume on a later day dispatched two Explore agents
# even when the repo had not moved at all. The last commit's date is the bound
# that actually answers the question.
#
# A bundled script rather than an inline `!` preload, for two reasons. `git log`
# exits 128 outside a repository and 127 when git is absent, and a non-zero exit
# in a preload aborts the WHOLE skill load ("Shell command failed for pattern…")
# - `intent` runs in any host project, git or not. And one script is ONE command
# to the permission engine, where a compound `git log … || true` would be split
# into members and prompt for each.
#
# Contract:
#   argv   : none.
#   cwd    : the host project root (a SKILL.md `!` preload runs there).
#   env    : none.
#   stdout : ONE line - the committer date of HEAD as `YYYY-MM-DD`, or the
#            single word `none` when that date cannot be established: no git on
#            PATH, not a git repository, a repository with no commit yet, or any
#            output that is not a `YYYY-MM-DD` date. Committer date, not author
#            date: it records when the commit landed in THIS repo, which is what
#            "has the repo moved" asks - a rebased or cherry-picked commit keeps
#            its old author date. `--date=short` + `%cd` rather than `%cs`, so
#            no git version floor applies.
#   exit   : ALWAYS 0. `none` is a value, never an error - the caller's own
#            contract decides what an unknown repo state means (for `intent`'s
#            refresh step it means "assume it moved").

set -u

stamp="$(git log -1 --date=short --format=%cd 2>/dev/null || true)"

case "$stamp" in
  [0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]) printf '%s\n' "$stamp" ;;
  *) printf 'none\n' ;;
esac

exit 0
