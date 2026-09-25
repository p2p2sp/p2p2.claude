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
#   file   : the sibling config.sh output - the plain block (branching.mode,
#            branching.base, branching.name) for the landing, its --branching
#            lines for branch_report; the plan's frontmatter "branch:" and
#            "issue:" keys and its task blocks' "Repro:" lines.
#   gh     : only through the sibling issue-facts.sh, for branch_report's
#            issue type, and only when a mapping exists and the plan has an
#            issue: its TYPE= line, empty on any failure.
#   git    : reads HEAD, refs/heads/ and the tree state; branch_land alone
#            moves HEAD, through one checkout, never a fetch.
#   stdout : branch_setup and branch_land print nothing - their result is the
#            br_* variables; the plan_* and branch_expand helpers print one
#            value for a caller to capture. branch_report prints the C3
#            report of plan-path.sh --branch, whose header shows its lines.
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

# The issue number of the plan frontmatter's "issue:" URL, empty without one;
# with "url" as $2, that URL cut after the number instead. Read the way
# issue_ref() in commit-task.sh reads it; change the two together.
plan_issue() {
  local line val first=1 num="" ref=""
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
      if [[ -n "$num" ]]; then
        if [[ "${2:-}" == url ]]; then printf '%s\n' "$ref"; else printf '%s\n' "$num"; fi
      fi
      return 0
    fi
    if [[ "$line" =~ $key ]]; then
      num=""
      val="${BASH_REMATCH[1]}"
      if [[ "$val" =~ $url ]]; then
        num="${BASH_REMATCH[1]}"
        ref="${val%%/issues/$num*}/issues/$num"
      fi
    fi
  done < "$1"
}

# The GitHub issue type of plan $1's issue, from the TYPE= header line the
# sibling issue-facts.sh prints; empty without an issue or on any failure.
plan_issue_type() {
  local url line
  url="$(plan_issue "$1" url)"
  [[ -n "$url" ]] || return 0
  while IFS= read -r line; do
    case "$line" in
      'TYPE='*) printf '%s\n' "${line#TYPE=}"; return 0 ;;
      '--- body ---') return 0 ;;
    esac
  done < <(sh "$run_branch_dir/issue-facts.sh" "$url" 2>/dev/null || true)
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

# The name pattern $3 (the branching.name pattern when absent) expanded for
# plan $1 and run slug $2: separators left dangling by an empty placeholder are
# dropped, doubled ones collapsed, and a leading or trailing `/` left dangling
# by an empty placeholder at either edge is dropped too, so the result never
# starts or ends with `/`.
branch_expand() {
  local name="${3-$br_pattern}" type issue
  type="$(plan_type "$1")"
  issue="$(plan_issue "$1")"
  name="${name//\{type\}/$type}"
  name="${name//\{issue-number\}/$issue}"
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

# How many commits branch $1 lacks from its configured upstream, "unknown"
# when it has none. The upstream is resolved by name rather than refs/heads/,
# so a base with no local branch (or no tracking ref) reads as unknown instead
# of erroring under errexit.
base_behind() {
  local upstream behind=""
  upstream="$(git rev-parse --abbrev-ref --symbolic-full-name "$1@{upstream}" 2>/dev/null || true)"
  [[ -z "$upstream" ]] || behind="$(git rev-list --count "$1..$upstream" 2>/dev/null || true)"
  [[ "$behind" =~ ^[0-9]+$ ]] || behind="unknown"
  printf '%s\n' "$behind"
}

# The C3 --branch report for plan $1 (run slug $2), built from the sibling
# config.sh --branching lines: read-only, never touches HEAD, the index or the
# tree. Off, or outside a repository, prints only "mode: off". The issue type
# is fetched only when a mapping exists and the plan has an issue. The empty
# array expansions are guarded: bash 3.2 under `set -u` fails on "${a[@]}".
branch_report() {
  local line mode=off issue type="" suggested=none only="" usable=0 m e
  local key rest base name target new exists entry_lines=""
  local -a entries=() maps=() errors=()
  while IFS= read -r line; do
    case "$line" in
      'mode: '*) mode="${line#mode: }" ;;
      'entry: '*) entries+=("${line#entry: }") ;;
      'map: '*) maps+=("${line#map: }") ;;
      'error: '*) errors+=("${line#error: }") ;;
    esac
  done < <(bash "$run_branch_dir/config.sh" --branching 2>/dev/null || true)
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || mode=off
  if [[ "$mode" != allowed && "$mode" != required ]]; then
    printf 'mode: off\n'
    return 0
  fi
  issue="$(plan_issue "$1")"
  if [[ ${#maps[@]} -gt 0 && -n "$issue" ]]; then
    type="$(plan_issue_type "$1")"
    if [[ -z "$type" ]]; then
      errors+=("issue $issue has no issue type")
    else
      for m in ${maps[@]+"${maps[@]}"}; do
        if [[ "${m% | *}" == "$type" ]]; then suggested="${m##* | }"; break; fi
      done
      [[ "$suggested" != none ]] || errors+=("issue type $type is not in branching.issue-type-mappings")
    fi
  fi
  for e in ${entries[@]+"${entries[@]}"}; do
    key="${e%% | *}"
    rest="${e#* | base: }"
    base="${rest%% | *}"
    rest="${rest#* | name: }"
    name="${rest%% | *}"
    target="${e##* | target: }"
    exists=no
    if [[ "$name" == *'{issue-number}'* && -z "$issue" ]]; then
      new=-
    else
      new="$(branch_expand "$1" "$2" "$name")"
      usable=$((usable + 1))
      only="$key"
      if [[ -n "$new" ]] && git show-ref --verify --quiet "refs/heads/$new" 2>/dev/null; then exists=yes; fi
    fi
    entry_lines+="entry: $key | base: $base | target: $target | new: $new | new-exists: $exists | behind: $(base_behind "$base")"$'\n'
  done
  [[ "$suggested" != none || "$usable" -ne 1 ]] || suggested="$only"
  printf 'mode: %s\n' "$mode"
  printf 'issue-type: %s\n' "${type:-none}"
  printf 'suggested: %s\n' "$suggested"
  printf '%s' "$entry_lines"
  line="$(git symbolic-ref --short -q HEAD 2>/dev/null || true)"
  printf 'current: %s\n' "${line:-detached}"
  if [[ -n "$(git status --porcelain 2>/dev/null || true)" ]]; then
    printf 'dirty: yes\n'
  else
    printf 'dirty: no\n'
  fi
  for e in ${errors[@]+"${errors[@]}"}; do printf 'error: %s\n' "$e"; done
}
