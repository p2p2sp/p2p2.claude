#!/usr/bin/env bash
#
# run-branch.sh - the run branch step of plan-path.sh: which branch a run's
# commits land on, and putting HEAD there before a first landing copies
# anything. Sourced by plan-path.sh, never invoked on its own.
#
# It exists so the branch a project's strategy expects is set by a script at
# the one moment it is still safe - before the run's first file lands - instead
# of depending on the user remembering to branch before planning.
#
# Contract:
#   argv   : none - sourced. Every function takes its own arguments.
#   cwd    : the repository root, as plan-path.sh's own contract pins it.
#   env    : none.
#   file   : the sibling config.sh output (branching.mode, branching.base,
#            branching.name); the plan's frontmatter "branch:" and "issue:"
#            keys and its task blocks' "Repro:" lines.
#   git    : reads HEAD, refs/heads/ and the tree state; branch_land alone
#            moves HEAD, through one checkout, never a fetch.
#   stdout : branch_setup and branch_land print nothing - their result is the
#            br_* variables; the plan_* and branch_expand helpers print one
#            value for a caller to capture. branch_report prints the C3
#            report (plan-path.sh --branch): "mode: off" alone under off or
#            outside a repository, else mode/base/current/new/new-exists/
#            behind/dirty, one "key: value" line each.
#   return : branch_land 0, or 6 with the reason on stderr and HEAD, index
#            and tree untouched. branch_report always 0 - it is read-only and
#            never touches HEAD, the index or the tree.
#
# Outside a git repository branching acts as off. No `set` line of its own: it
# runs under plan-path.sh's.

run_branch_dir="$(dirname -- "${BASH_SOURCE[0]}")"

# The resolved branching values, and the current branch (empty when detached).
# br_line is what plan-path.sh prints after "branch: ", empty under off.
branch_setup() {
  local line
  br_mode=off
  br_base=main
  br_pattern='{type}/{issue}-{slug}'
  br_cur=""
  br_line=""
  while IFS= read -r line; do
    case "$line" in
      'branching.mode: '*) br_mode="${line#branching.mode: }" ;;
      'branching.base: '*) br_base="${line#branching.base: }" ;;
      'branching.name: '*) br_pattern="${line#branching.name: }" ;;
    esac
  done < <(bash "$run_branch_dir/config.sh" 2>/dev/null || true)
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || br_mode=off
  [[ "$br_mode" != off ]] || return 0
  br_cur="$(git symbolic-ref --short -q HEAD 2>/dev/null || true)"
  if [[ -n "$br_cur" ]]; then br_line="$br_cur (kept)"; else br_line="detached (kept)"; fi
}

# The plan frontmatter's "branch:" value, up to its first whitespace.
plan_branch() {
  awk '
NR == 1 { if ($0 !~ /^---[[:space:]]*\r?$/) exit; next }
/^---[[:space:]]*\r?$/ { exit }
/^branch:/ { sub(/^branch:[[:space:]]*/, ""); sub(/[[:space:]].*$/, ""); print; exit }
' "$1"
}

# The issue number of the plan frontmatter's "issue:" URL, empty without one.
# Read the way issue_ref() in commit-task.sh reads it; change the two together.
plan_issue() {
  local line val first=1 num=""
  local fence='^[[:space:]]*---[[:space:]]*$'
  local key='^[[:space:]]*issue:[[:space:]]*(.*)$'
  local url='/issues/([0-9]+)([/?#].*)?[[:space:]]*$'
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    if [[ $first -eq 1 ]]; then
      first=0
      [[ "$line" =~ $fence ]] || return 0
      continue
    fi
    if [[ "$line" =~ $fence ]]; then
      [[ -z "$num" ]] || printf '%s\n' "$num"
      return 0
    fi
    if [[ "$line" =~ $key ]]; then
      num=""
      val="${BASH_REMATCH[1]}"
      if [[ "$val" =~ $url ]]; then num="${BASH_REMATCH[1]}"; fi
    fi
  done < "$1"
}

# "fix" when any task block of the plan carries a "Repro:" line, else "feature".
plan_type() {
  awk '
/^[[:space:]]*<!--[[:space:]]*TASK[[:space:]]*-->[[:space:]]*$/ { intask = 1; next }
/^[[:space:]]*<!--[[:space:]]*\/TASK[[:space:]]*-->[[:space:]]*$/ { intask = 0; next }
intask && /^[[:space:]]*(-[[:space:]]*)?Repro:/ { fix = 1; exit }
END { print (fix ? "fix" : "feature") }
' "$1"
}

# The name pattern expanded for plan $1 and run slug $2: separators left
# dangling by an empty placeholder are dropped, doubled ones collapsed, and a
# leading or trailing `/` left dangling by an empty placeholder at either edge
# is dropped too, so the result never starts or ends with `/`.
branch_expand() {
  local name="$br_pattern" type issue
  type="$(plan_type "$1")"
  issue="$(plan_issue "$1")"
  name="${name//\{type\}/$type}"
  name="${name//\{issue\}/$issue}"
  name="${name//\{slug\}/$2}"
  printf '%s\n' "$name" \
    | sed -E -e 's#[-_.]+/#/#g' -e 's#/[-_.]+#/#g' -e 's#^[-_.]+##' -e 's#[-_.]+$##' -e 's#/+#/#g' -e 's#-+#-#g' -e 's#^/+##' -e 's#/+$##'
}

# Puts HEAD on the run branch of plan $1 (run slug $2) and sets br_line.
branch_land() {
  local target
  [[ "$br_mode" != off ]] || return 0
  target="$(plan_branch "$1")"
  [[ "$target" != none ]] || target=""
  if [[ -z "$target" ]]; then
    [[ "$br_mode" == required ]] || return 0
    if [[ -z "$br_cur" ]]; then
      echo "error: HEAD is detached, branching is required and the plan records no branch" >&2
      return 6
    fi
    [[ "$br_cur" == "$br_base" ]] || return 0
    target="$(branch_expand "$1" "$2")"
    if [[ -z "$target" ]]; then
      echo "error: the run branch name pattern expanded to an empty name" >&2
      return 6
    fi
  fi
  if [[ "$br_mode" == required && "$target" == "$br_base" ]]; then
    echo "error: branching is required and the run branch is the base itself: $br_base" >&2
    return 6
  fi
  # check-ref-format --branch expands @{-n}, so a name it hands back changed is
  # a shorthand for another branch, not a name
  if [[ "$target" == -* || "$(git check-ref-format --branch "$target" 2>/dev/null || true)" != "$target" ]]; then
    echo "error: invalid run branch name: $target" >&2
    return 6
  fi
  [[ "$target" != "$br_cur" ]] || return 0
  local action=switched from="refs/heads/$target" head_c to_c
  if ! git show-ref --verify --quiet "$from"; then
    action=created
    from="refs/heads/$br_base"
    if ! git show-ref --verify --quiet "$from"; then
      echo "error: base branch $br_base does not exist locally - nothing is fetched, create it first" >&2
      return 6
    fi
  fi
  # a checkout carries uncommitted work along only while HEAD keeps its commit;
  # moving it elsewhere on a dirty tree could lose or tangle that work
  head_c="$(git rev-parse -q --verify 'HEAD^{commit}' 2>/dev/null || true)"
  to_c="$(git rev-parse -q --verify "$from^{commit}" 2>/dev/null || true)"
  if [[ "$head_c" != "$to_c" && -n "$(git status --porcelain 2>/dev/null || true)" ]]; then
    echo "error: uncommitted changes and $target is at another commit - commit or stash them first" >&2
    return 6
  fi
  if [[ "$action" == switched ]]; then
    git checkout -q "$target" -- >/dev/null || action=""
  else
    git checkout -q -b "$target" "$br_base" -- >/dev/null || action=""
  fi
  if [[ -z "$action" ]]; then
    echo "error: could not put HEAD on the run branch $target" >&2
    return 6
  fi
  br_line="$target ($action)"
}

# The C3 --branch report for plan $1 (run slug $2): read-only, never touches
# HEAD, the index or the tree. Off, or outside a repository (branch_setup
# already forced br_mode to off there), prints only "mode: off".
branch_report() {
  if [[ "$br_mode" == off ]]; then
    printf 'mode: off\n'
    return 0
  fi
  local new upstream behind
  new="$(branch_expand "$1" "$2")"
  printf 'mode: %s\n' "$br_mode"
  printf 'base: %s\n' "$br_base"
  if [[ -n "$br_cur" ]]; then printf 'current: %s\n' "$br_cur"; else printf 'current: detached\n'; fi
  printf 'new: %s\n' "$new"
  if git show-ref --verify --quiet "refs/heads/$new" 2>/dev/null; then
    printf 'new-exists: yes\n'
  else
    printf 'new-exists: no\n'
  fi
  # the base's configured upstream, resolved by name rather than refs/heads/
  # so a base with no local branch (or no tracking ref) reads as unknown
  # instead of erroring under errexit.
  upstream="$(git rev-parse --abbrev-ref --symbolic-full-name "$br_base@{upstream}" 2>/dev/null || true)"
  if [[ -n "$upstream" ]]; then
    behind="$(git rev-list --count "$br_base..$upstream" 2>/dev/null || true)"
    [[ "$behind" =~ ^[0-9]+$ ]] || behind="unknown"
  else
    behind="unknown"
  fi
  printf 'behind: %s\n' "$behind"
  if [[ -n "$(git status --porcelain 2>/dev/null || true)" ]]; then
    printf 'dirty: yes\n'
  else
    printf 'dirty: no\n'
  fi
}
