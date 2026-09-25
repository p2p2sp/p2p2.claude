#!/bin/sh
#
# issue-templates.sh - decides whether this repository can save an interview's
# or a triage's conclusions as a new GitHub issue and, when it can, lists
# every issue form template with the fields a caller needs to pick one and
# build a `gh issue create` call.
#
# It exists so a caller makes that decision, and reads every template's
# fields, through ONE pre-approved command with a fixed output shape: a
# hand-composed `find` + `gh repo view` + YAML read is several unapproved
# commands, and an issue form's YAML (labels/assignees/projects each
# writable as an inline list, a block of `- item` lines, or one comma
# string) is exactly the kind of deterministic, fixed-format parsing a
# script does once rather than a fork re-deriving it on every run.
#
# Contract:
#   argv   : none. Any argument -> exit 2, nothing on stdout, gh never called.
#   cwd    : anywhere inside the repository. The repository root is resolved
#            here (`git rev-parse --show-toplevel`); outside a repository
#            (or with no `git` on PATH) the cwd itself is used as the root,
#            so the templates lookup below simply finds none there.
#   env    : none of its own; gh reads its usual auth and host config.
#   temp   : one temp file from mktemp in system temp, falls back to $TMPDIR
#            or /tmp, cleaned by EXIT trap.
#   stdout : the three checks below run in order and the first one that
#            fails ends the run right there:
#              1. <repo root>/.github/ISSUE_TEMPLATE/*.yml or *.yaml exist,
#                 other than config.yml/config.yaml (a `.md` template or any
#                 other file in that directory is not one of these and is
#                 never counted or listed);
#              2. gh is on PATH;
#              3. `gh repo view` resolves a repository.
#            On any failing check:
#              STATUS=skip
#              REASON=no-templates|no-gh|no-repo
#            On every check passing, in file name order:
#              STATUS=ready
#              REPO=<repository url>
#              --- template <repo-relative path> ---
#              NAME=<name>
#              DESCRIPTION=<description>
#              TYPE=<type or empty>
#              TITLE=<title or empty>
#              LABELS=<name>, <name>        (empty when none)
#              ASSIGNEES=<login>, <login>   (empty when none)
#              PROJECTS=<project>, <project> (empty when none)
#            repeated per template. Only these seven top-level keys (column 0
#            in the template file) are read; a same-named key nested under
#            `body:` or anywhere else indented is not top-level and is
#            ignored. A value's surrounding quotes are stripped and its CR is
#            stripped either way it is written: inline (`[a, "b"]`), as a
#            block of `- a` lines under the key, or as one comma-separated
#            string.
#   exit   : 0 on both STATUS=ready and STATUS=skip; 2 on any argument.
#
set -u

if [ $# -ne 0 ]; then
  echo "ERROR issue-templates.sh: takes no arguments" >&2
  exit 2
fi

root=$(git rev-parse --show-toplevel 2>/dev/null) || root=""
[ -n "$root" ] || root="."
dir="$root/.github/ISSUE_TEMPLATE"

listf=$(mktemp 2>/dev/null) || listf="${TMPDIR:-/tmp}/p2p2-issue-templates.$$"
: > "$listf" 2>/dev/null || true
trap 'rm -f "$listf"' EXIT

found=0
for f in "$dir"/*.yml "$dir"/*.yaml; do
  [ -e "$f" ] || continue
  base=$(basename "$f")
  case "$base" in
    config.yml | config.yaml) continue ;;
  esac
  printf '%s\n' "$f" >>"$listf"
  found=1
done

if [ "$found" -eq 0 ]; then
  echo "STATUS=skip"
  echo "REASON=no-templates"
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "STATUS=skip"
  echo "REASON=no-gh"
  exit 0
fi

repo_url=$(gh repo view --json url --jq .url 2>/dev/null)
repo_url=$(printf '%s' "$repo_url" | tr -d '\r\n')
if [ -z "$repo_url" ]; then
  echo "STATUS=skip"
  echo "REASON=no-repo"
  exit 0
fi

sort -o "$listf" "$listf"

echo "STATUS=ready"
echo "REPO=$repo_url"

while IFS= read -r f; do
  [ -n "$f" ] || continue
  rel=${f#"$root"/}
  echo "--- template $rel ---"
  # No awk user-defined functions and no doubled parenthesis anywhere below:
  # both read as bash-only syntax to the repo's static #!/bin/sh sweep, which
  # cannot tell an awk `function` keyword or an `if ((a) && (b))` from the
  # bash constructs of the same shape, so the quote-stripping and list-item
  # logic is repeated inline (three top-level keys hold a list) rather than
  # factored into a helper.
  tr -d '\r' <"$f" | awk '
    BEGIN {
      SQ = sprintf("%c", 39)
      islist["labels"] = 1
      islist["assignees"] = 1
      islist["projects"] = 1
      curlist = ""
    }
    {
      line = $0
      if (match(line, /^[A-Za-z_][A-Za-z0-9_-]*:/)) {
        key = substr(line, 1, RLENGTH - 1)
        rest = substr(line, RLENGTH + 1)
        curlist = ""
        if (key == "name" || key == "description" || key == "type" || key == "title") {
          v = rest
          sub(/^[[:space:]]+/, "", v)
          sub(/[[:space:]]+$/, "", v)
          n = length(v)
          if (n >= 2) {
            c = substr(v, 1, 1)
            e = substr(v, n, 1)
            if (c == e && (c == "\"" || c == SQ)) v = substr(v, 2, n - 2)
          }
          scalar[key] = v
        } else if (key in islist) {
          rest2 = rest
          sub(/^[[:space:]]+/, "", rest2)
          sub(/[[:space:]]+$/, "", rest2)
          if (rest2 == "") {
            curlist = key
          } else {
            content = rest2
            if (substr(content, 1, 1) == "[") {
              sub(/^\[/, "", content)
              sub(/\][[:space:]]*$/, "", content)
            }
            nitems = split(content, arr, ",")
            for (ii = 1; ii <= nitems; ii++) {
              item = arr[ii]
              sub(/^[[:space:]]+/, "", item)
              sub(/[[:space:]]+$/, "", item)
              m = length(item)
              if (m >= 2) {
                cc = substr(item, 1, 1)
                ee = substr(item, m, 1)
                if (cc == ee && (cc == "\"" || cc == SQ)) item = substr(item, 2, m - 2)
              }
              if (item != "") {
                if (listn[key] > 0) list[key] = list[key] ", " item
                else list[key] = item
                listn[key]++
              }
            }
          }
        }
        next
      }
      if (curlist != "") {
        if (match(line, /^[[:space:]]*-[[:space:]]*/)) {
          item = substr(line, RLENGTH + 1)
          sub(/^[[:space:]]+/, "", item)
          sub(/[[:space:]]+$/, "", item)
          m = length(item)
          if (m >= 2) {
            cc = substr(item, 1, 1)
            ee = substr(item, m, 1)
            if (cc == ee && (cc == "\"" || cc == SQ)) item = substr(item, 2, m - 2)
          }
          if (item != "") {
            if (listn[curlist] > 0) list[curlist] = list[curlist] ", " item
            else list[curlist] = item
            listn[curlist]++
          }
          next
        }
        trimmed = line
        sub(/^[[:space:]]+/, "", trimmed)
        sub(/[[:space:]]+$/, "", trimmed)
        if (trimmed == "") next
        curlist = ""
      }
    }
    END {
      printf "NAME=%s\n", scalar["name"]
      printf "DESCRIPTION=%s\n", scalar["description"]
      printf "TYPE=%s\n", scalar["type"]
      printf "TITLE=%s\n", scalar["title"]
      printf "LABELS=%s\n", list["labels"]
      printf "ASSIGNEES=%s\n", list["assignees"]
      printf "PROJECTS=%s\n", list["projects"]
    }
  '
done <"$listf"

exit 0
