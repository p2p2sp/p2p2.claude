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
#
# ${CLAUDE_PLUGIN_ROOT} resolution: the mode playbooks tell the MAIN-context LLM to later run
# `sh "${CLAUDE_PLUGIN_ROOT}/…/verify-landed.sh"` / `commit.sh` from its own Bash. That harness
# placeholder is substituted ONLY in `!`-injection / hook commands — NOT in Bash the model
# issues itself, and the main session (unlike a fork/agent) carries no CLAUDE_PLUGIN_ROOT env
# var, so it would expand to empty (→ `/skills/…/verify-landed.sh`, exit 127). This script runs
# at `!`-injection time where it CAN self-locate, so it rewrites `${CLAUDE_PLUGIN_ROOT}` to the
# absolute plugin root before the playbook reaches the model. (`root` = $dir/../../.. = plugin
# root; a bundled-cache path carries no sed-special char, so a `|`-delimited replace is safe.)
set -euf
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ref="$dir/../references"
shared_ref="$dir/../../../shared/references"
root=$(CDPATH= cd -- "$dir/../../.." && pwd)
# Emit a reference with the plugin-root placeholder resolved to its absolute path.
inject() { sed "s|\${CLAUDE_PLUGIN_ROOT}|$root|g" "$1"; }
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
    inject "$ref/mode-fork.md"
    ;;
  staged)
    printf 'staging mode: **index**\n\n'
    inject "$ref/mode-fork.md"
    ;;
  *)
    inject "$ref/mode-session.md"
    printf '\n\n---\n\n'
    cat "$shared_ref/commit-conventions.md"
    ;;
esac
