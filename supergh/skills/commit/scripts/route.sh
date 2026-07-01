#!/bin/sh
# route.sh — commit mode router.
# IN : $1 = raw skill argument ($ARGUMENTS). Scanned token-by-token (lowercased, with each
#      token's punctuation stripped down to [a-z0-9] before the match) for the first token
#      whose alphanumeric content is `all` or `staged` — so a model-forwarded phrase like
#      "commit all" or "commit staged, not all" still selects the keyword even through
#      trailing/wrapping punctuation (`all,` / `all.` / `*all*` all match `all`). A token
#      merely CONTAINING the keyword as a substring still does not match: `install` ≠ `all`.
#      all    → fork handoff, staging mode `all`   (agent-committer → commit.sh git add -A)
#      staged → fork handoff, staging mode `index` (agent-committer → commit.sh, no add)
#      empty/no keyword → `context` mode: inline authoring in main + commit.sh paths
# OUT: the chosen playbook on stdout, injected into the skill body:
#      all/staged → a one-line "staging mode:" prefix + references/mode-fork.md (shared).
#      context    → references/mode-session.md + the shared commit-conventions.md (so the
#                   Conventional-Commits rules reach the main context ONLY in this mode).
# Self-locating via $0 (POSIX): references resolved relative to this script's own dir, never
# the host CWD. `commit-conventions.md` lives at <plugin>/shared/references/ (../../../shared).
set -euf
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ref="$dir/../references"
shared_ref="$dir/../../../shared/references"
token=context
for w in $(printf '%s' "${1:-}" | tr 'A-Z' 'a-z'); do
  w=$(printf '%s' "$w" | tr -cd 'a-z0-9')
  case "$w" in
    all)    token=all;    break ;;
    staged) token=staged; break ;;
  esac
done
case "$token" in
  all)
    printf 'staging mode: **all**\n\n'
    cat "$ref/mode-fork.md"
    ;;
  staged)
    printf 'staging mode: **index**\n\n'
    cat "$ref/mode-fork.md"
    ;;
  *)
    cat "$ref/mode-session.md"
    printf '\n\n---\n\n'
    cat "$shared_ref/commit-conventions.md"
    ;;
esac
