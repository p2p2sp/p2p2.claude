#!/usr/bin/env bash
#
# config.sh - resolves the .claude/viber.yml switches into the block a skill
# preloads when it loads.
#
# It exists because a grep|sed YAML parser is a compound command, and Claude
# Code asks for approval on every member of one - which stalls the step on any
# permission mode that does not auto-accept everything. One script is ONE
# command to the permission engine. It is also the only way `implementor` can
# read the file at all: that skill's body forbids it to open a file.
#
# The file is resolved against the REPOSITORY ROOT, not the caller's cwd: a `!`
# preload runs wherever the session started, and a session started in a
# subdirectory would otherwise find no file and fail open with every switch
# false - silently turning off every layer the user configured.
#
# Every key lives INSIDE its group, and the group is the disambiguation: `runs`
# on its own reads like a count and `memory` like anything, where
# `directories.runs` and `build.memory` cannot be read as anything else, so a
# key of that name outside its group is not this key and is ignored - a legacy
# flat switch included, until /viber:setup moves it. A directory value is
# sanitized because "docs/ is the one home for persisted knowledge" rests on
# it: a slash, a traversal or an absolute path is a configuration error, so the
# default stands and the run is unaffected.
#
# Contract:
#   argv   : none -> the block below. `--branching` -> the branching report
#            (see its own stdout paragraph) in place of the block. Anything else
#            -> the block.
#   cwd    : any directory inside the host project - the repository root is
#            resolved here. Outside a repository, the cwd is the base.
#   env    : none.
#   file   : <repo root>/.claude/viber.yml (optional). No file -> every switch
#            false, every other key at its default.
#   keys   : A group is `<group>:` at column 0; its children are the indented
#            key lines below it, the group ending at the next column-0 key (a
#            blank line or a column-0 comment leaves it open). The first
#            assignment of a child wins; a CR is never part of a value.
#            planning.adr, planning.plain-plan-review, planning.fast-path,
#            build.baseline-tests, build.final-review, build.memory,
#            build.rules, build.qa, build.cleanup, build.monitor, github.issues -
#            switches.
#            One is `true` ONLY as a child of its own group, spelled exactly
#            (case-sensitive), whose value is `true` in any letter case (ended
#            by a space, a comment or the end of the line). A column-0 key of
#            the same name, the key under another group, or an absent key ->
#            false.
#            build.baseline-tests is the one three-valued switch, read the same
#            group-bound way: `full` or `true` (any letter case) -> full, `fast`
#            (any letter case) -> fast, `false`, any other value, an absent key,
#            a column-0 key or the key under another group -> off.
#            github.issue-title (default `{summary}`) and
#            github.pr-title (default `[{issue-number}] {summary}`) - title patterns,
#            children of `github:`. A value opening on a quote with its
#            closing pair -> everything between the two, kept whole; otherwise
#            cut at the first blank followed by `#`, trailing blanks dropped.
#            Empty, a comment alone or absent -> the default.
#            directories.runs (default `_specs`) and
#            directories.specifications (default `specs`) - the directory names
#            under docs/ holding the open runs and the archived ones. Read ONLY
#            from inside the `directories:` group: `directories:` at column 0,
#            its keys indented under it, the group ending at the next top-level
#            key. A same-named key outside the group is ignored. The value is
#            the first such assignment, cut at the first space or `#`, and must
#            match `[A-Za-z0-9._-]+` and be neither `.` nor `..`; anything else
#            -> the default, silently.
#            tiers.min (default `haiku`) and tiers.max (default `opus`) - the
#            model range implementor clamps its dispatches into. Read the same
#            group-bound way; the value is one of haiku, sonnet, opus, fable (any
#            case). The default max stays opus: fable is reached only when a
#            project names it. Anything else -> that key's default; min above
#            max -> both defaults.
#            branching.mode (default `off`) - whether a run works on its own
#            branch. Read the same group-bound way; off, allowed or required
#            (any case, printed lowercase), anything else -> off. The branch
#            bases and name patterns live in `branching.work` entries, read by
#            `--branching` alone.
#   file   : <repo root>/.claude/viber.local.yml (optional, the same layout and
#            key grammar, personal and git-ignored; outside a repository
#            .claude/viber.local.yml under the cwd). It overrides exactly four
#            keys: tiers.min and tiers.max (haiku, sonnet, opus or fable, any
#            case), build.baseline-tests (off, fast, full, true -> full,
#            false -> off) and github.issues (true or false). A valid local
#            value replaces that one key; an empty or invalid one leaves the
#            shared value. The min-above-max reset runs on the merged range.
#            Every other direct child of any group, and every column-0 key
#            carrying a value, is ignored. A direct child is a key line at the
#            indentation of the first key line inside its group; a deeper line
#            is neither read nor named. The first assignment of a key wins, and
#            a key is named once however often the file repeats it.
#            `--branching` never reads this file.
#   stdout : a header line, then one `<group>.<key>: <true|false>` line per
#            switch (`build.baseline-tests: <off|fast|full>`), one `github.<key>: <pattern>` line per title, one
#            `directories.<key>: <name>` line per directory key, one
#            `tiers.<key>: <tier>` line per tier key and the
#            `branching.mode: <mode>` line - dotted, so the block reads the
#            way the file does - in a fixed order:
#              # viber config (resolved)
#              planning.adr: true
#              planning.plain-plan-review: true
#              planning.fast-path: true
#              build.baseline-tests: off
#              build.final-review: true
#              build.memory: true
#              build.rules: true
#              build.qa: false
#              build.cleanup: true
#              build.monitor: false
#              github.issues: false
#              github.issue-title: {summary}
#              github.pr-title: [{issue-number}] {summary}
#              directories.runs: _specs
#              directories.specifications: specs
#              tiers.min: haiku
#              tiers.max: opus
#              branching.mode: off
#            When the local file exists, one line follows the header:
#              # local: <overridden> | ignored: <ignored>
#            <overridden> is the keys that took a local value, in block order,
#            joined by `, ` (`none` when empty); <ignored> the ignored keys in
#            file order (a group child as <group>.<key>, a column-0 key as
#            <key>), joined by `, ` (`none` when empty). Every other line is
#            unchanged. An unreadable local file reads as `none` twice.
#   stdout (--branching): the `branching:` group read by indentation - its
#            direct children are `mode`, `work` and `issue-type-mappings`; a
#            child of `work` is one work entry, its own `base`, `name` and
#            `target` fields below it; a child of `issue-type-mappings` maps an
#            issue type to an entry key. Values are cut at the first space or
#            `#`. Lines, in this order:
#              mode: off|allowed|required
#              entry: <key> | base: <branch> | name: <pattern> | target: <branch>
#              map: <issue type> | <entry key>
#              error: <reason>
#            mode as in the block. `entry:` once per valid work entry, `map:`
#            once per mapping naming a valid entry, each in file order. Entry
#            key `[A-Za-z0-9._-]+`; base and target `[A-Za-z0-9._/-]+`, not
#            starting with `-` or `/`, no `..`; name with one surrounding quote
#            pair stripped, `[A-Za-z0-9._/{}-]+`; an issue type with one
#            surrounding quote pair stripped, kept verbatim. `error:` lines, in
#            this order, zero or more:
#              branching.base and branching.name are no longer read - move them into a branching.work entry
#                (a `base:` or `name:` directly under `branching:`)
#              work entry <key>: invalid key: <key>
#              work entry <key>: missing <base|name|target>
#              work entry <key>: invalid <base|name|target>: <value>
#              work entry <key>: {issue} is now {issue-number}
#                (each of these drops the entry; one entry may print several,
#                its fields checked in base, name, target order)
#              issue-type-mappings: <type> names no work entry: <key>
#                (the mapping is dropped)
#              no valid branching.work entry
#                (a mode other than off only)
#            No file or no group -> `mode: off` alone.
#   exit  : ALWAYS 0 (fail-open - a missing file or key never breaks a run, and
#            a non-zero exit in a `!` preload would abort the whole skill load).
#
set -u

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -n "$repo_root" ] && [ -d "$repo_root" ]; then
  cfg="$repo_root/.claude/viber.yml"
else
  cfg=".claude/viber.yml"
fi
local_cfg="$(dirname "$cfg")/viber.local.yml"

# The switch and title lines of the block, in their fixed order, from one pass
# over the file. A column-0 key opens its group; a blank line or a column-0
# comment leaves it open. The first assignment of each child wins.
switches_prog='
/^[^[:space:]#]/ {
  grp = ""
  if (match($0, /^[A-Za-z0-9_-]+[[:space:]]*:/)) { grp = substr($0, 1, RLENGTH); sub(/[[:space:]]*:$/, "", grp) }
  next
}
grp != "" && /^[[:space:]]+[A-Za-z]/ {
  line = $0
  sub(/\r$/, "", line)
  sub(/^[[:space:]]+/, "", line)
  if (line !~ /^[A-Za-z0-9_-]+[[:space:]]*:/) next
  key = line
  sub(/[[:space:]]*:.*$/, "", key)
  val = line
  sub(/^[^:]*:[[:space:]]*/, "", val)
  id = grp "." key
  if (!(id in raw)) raw[id] = val
}
function title(v, dflt,  q, end) {
  q = substr(v, 1, 1)
  end = 0
  if (q == sq || q == "\"") end = index(substr(v, 2), q)
  if (end > 0) v = substr(v, 2, end - 1)
  else {
    if (v ~ /^#/) v = ""
    if (match(v, /[[:space:]]#/)) v = substr(v, 1, RSTART - 1)
    sub(/[[:space:]]+$/, "", v)
  }
  return v == "" ? dflt : v
}
END {
  n = split("planning.adr planning.plain-plan-review planning.fast-path build.baseline-tests build.final-review build.memory build.rules build.qa build.cleanup build.monitor github.issues", ids, " ")
  for (i = 1; i <= n; i++) {
    v = raw[ids[i]]
    sub(/[[:space:]#].*$/, "", v)
    v = tolower(v)
    if (ids[i] == "build.baseline-tests") print ids[i] ": " (v == "full" || v == "true" ? "full" : v == "fast" ? "fast" : "off")
    else print ids[i] ": " (v == "true" ? "true" : "false")
  }
  print "github.issue-title: " title(raw["github.issue-title"], "{summary}")
  print "github.pr-title: " title(raw["github.pr-title"], "[{issue-number}] {summary}")
}
'

# The local overrides, one line each, in file order: `V <group.key> <value>` for
# one of the four overridable keys holding a valid value (baseline-tests
# normalized to off, fast or full), `I <name>` for an ignored key. A group child
# counts only at the indentation of the first key line inside its group.
local_prog='
function clean(v) {
  sub(/^[[:space:]]+/, "", v)
  sub(/[[:space:]#].*$/, "", v)
  return tolower(v)
}
/^[^[:space:]#]/ {
  grp = ""
  l1 = 0
  line = $0
  sub(/\r$/, "", line)
  if (line !~ /^[A-Za-z0-9_-]+[[:space:]]*:/) next
  key = line
  sub(/[[:space:]]*:.*$/, "", key)
  val = line
  sub(/^[^:]*:/, "", val)
  if (clean(val) == "") grp = key
  else if (!(key in seen)) { seen[key] = 1; print "I " key }
  next
}
grp != "" {
  line = $0
  sub(/\r$/, "", line)
  if (!match(line, /^[[:space:]]+/)) next
  ind = RLENGTH
  rest = substr(line, ind + 1)
  if (rest !~ /^[A-Za-z0-9_-]+[[:space:]]*:/) next
  if (l1 == 0) l1 = ind
  if (ind != l1) next
  key = rest
  sub(/[[:space:]]*:.*$/, "", key)
  val = rest
  sub(/^[^:]*:/, "", val)
  val = clean(val)
  id = grp "." key
  if (id in seen) next
  seen[id] = 1
  ok = 0
  if (id == "tiers.min" || id == "tiers.max") ok = (val == "haiku" || val == "sonnet" || val == "opus" || val == "fable")
  else if (id == "build.baseline-tests") {
    ok = (val == "off" || val == "fast" || val == "full" || val == "true" || val == "false")
    if (val == "true") val = "full"
    if (val == "false") val = "off"
  } else if (id == "github.issues") ok = (val == "true" || val == "false")
  if (ok) print "V " id " " val
  else print "I " id
}
'

# The raw value of one key inside one group, empty when the file gives none. The
# awk tracks the group rather than matching the key anywhere: a top-level line
# that is not the group's own closes it, while a blank line and a comment at
# column 0 leave it open, which is how a group is written.
group_value() {
  group="$1"
  key="$2"
  [ -f "$cfg" ] || return 0
  awk -v group="$group" -v key="$key" '
/^[^[:space:]#]/ { ingroup = ($0 ~ "^" group "[[:space:]]*:"); next }
ingroup && $0 ~ "^[[:space:]]+" key "[[:space:]]*:" {
  sub(/^[^:]*:[[:space:]]*/, "")
  sub(/[[:space:]#\r].*$/, "")
  print
  exit
}
' "$cfg"
}

# A directory name, or the fallback. The value is one path SEGMENT, and the
# rejection list is what stops a slash, a traversal or an absolute path from
# turning a docs/ layer into somewhere else.
resolve_dir() {
  value="$(group_value directories "$1" || true)"
  case "$value" in
    ''|.|..|*[!A-Za-z0-9._-]*) value="$2" ;;
  esac
  echo "$value"
}

# A tier's rank, 0 for anything that is not one of the four tiers.
tier_rank() {
  case "$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')" in
    haiku) echo 1 ;;
    sonnet) echo 2 ;;
    opus) echo 3 ;;
    fable) echo 4 ;;
    *) echo 0 ;;
  esac
}

tier_name() {
  case "$1" in
    1) echo haiku ;;
    2) echo sonnet ;;
    4) echo fable ;;
    *) echo opus ;;
  esac
}

# The --branching report. Nesting is told by indentation alone: the first line
# inside the group fixes the depth of its direct children, the first line under
# `work` or `issue-type-mappings` the depth of theirs. Everything is collected
# first, so a mapping written above the entries it names still resolves.
branching_report() {
  out=""
  if [ -f "$cfg" ]; then
    out="$(awk -v sq="'" '
function unquote(s,  q) {
  q = substr(s, 1, 1)
  if (length(s) >= 3 && (q == sq || q == "\"") && substr(s, length(s)) == q) s = substr(s, 2, length(s) - 2)
  return s
}
/^[^[:space:]#]/ { ingroup = ($0 ~ /^branching[[:space:]]*:/); sec = ""; next }
!ingroup { next }
/^[[:space:]]*(#|$)/ { next }
{
  match($0, /^[[:space:]]*/)
  ind = RLENGTH
  line = substr($0, ind + 1)
  q = substr(line, 1, 1)
  close_at = 0
  if (q == sq || q == "\"") close_at = index(substr(line, 2), q)
  if (close_at > 0) {
    key = substr(line, 2, close_at - 1)
    rest = substr(line, close_at + 2)
  } else {
    key = line
    sub(/[[:space:]]*:.*$/, "", key)
    rest = substr(line, length(key) + 1)
  }
  val = rest
  sub(/^[[:space:]]*:[[:space:]]*/, "", val)
  sub(/[[:space:]#].*$/, "", val)

  if (l1 == 0 || ind <= l1) {
    if (l1 == 0) l1 = ind
    sec = key
    l2 = 0
    if (key == "mode" && !modeset) { mode = tolower(val); modeset = 1 }
    if (key == "base" || key == "name") legacy = 1
    next
  }
  if (sec == "work") {
    if (l2 == 0 || ind <= l2) {
      if (l2 == 0) l2 = ind
      cur = ++n
      ekey[cur] = key
      next
    }
    if ((key == "base" || key == "name" || key == "target") && !((cur, key) in field)) field[cur, key] = val
    next
  }
  if (sec == "issue-type-mappings") {
    if (l2 == 0) l2 = ind
    if (ind > l2) next
    m++
    mtype[m] = key
    mkey[m] = unquote(val)
  }
}
END {
  if (mode != "allowed" && mode != "required") mode = "off"
  print "mode: " mode
  if (legacy) err[++e] = "branching.base and branching.name are no longer read - move them into a branching.work entry"
  split("base name target", fields, " ")
  for (i = 1; i <= n; i++) {
    bad = 0
    if (ekey[i] !~ /^[A-Za-z0-9._-]+$/) { err[++e] = "work entry " ekey[i] ": invalid key: " ekey[i]; bad = 1 }
    for (j = 1; j <= 3; j++) {
      f = fields[j]
      v = field[i, f]
      if (f == "name") v = unquote(v)
      if (v == "") { err[++e] = "work entry " ekey[i] ": missing " f; bad = 1; continue }
      if (f == "name") ok = (v ~ /^[A-Za-z0-9._\/{}-]+$/)
      else ok = (v ~ /^[A-Za-z0-9._\/-]+$/ && v !~ /^[-\/]/ && index(v, "..") == 0)
      if (!ok) { err[++e] = "work entry " ekey[i] ": invalid " f ": " v; bad = 1; continue }
      if (f == "name" && index(v, "{issue}")) { err[++e] = "work entry " ekey[i] ": {issue} is now {issue-number}"; bad = 1 }
      value[f] = v
    }
    if (bad) continue
    valid[ekey[i]] = 1
    nvalid++
    print "entry: " ekey[i] " | base: " value["base"] " | name: " value["name"] " | target: " value["target"]
  }
  for (i = 1; i <= m; i++) {
    if (mkey[i] in valid) print "map: " mtype[i] " | " mkey[i]
    else err[++e] = "issue-type-mappings: " mtype[i] " names no work entry: " mkey[i]
  }
  if (mode != "off" && !nvalid) err[++e] = "no valid branching.work entry"
  for (i = 1; i <= e; i++) print "error: " err[i]
}
' "$cfg" 2>/dev/null || true)"
  fi
  [ -n "$out" ] || out="mode: off"
  printf '%s\n' "$out"
}

if [ "${1:-}" = "--branching" ]; then
  branching_report
  exit 0
fi

src="$cfg"
[ -f "$src" ] || src=/dev/null
block="$(awk -v sq="'" "$switches_prog" "$src" 2>/dev/null || true)"
[ -n "$block" ] || block="$(awk -v sq="'" "$switches_prog" /dev/null)"

loc_bt=""
loc_gi=""
loc_min=""
loc_max=""
loc_ignored=""
overridden=""
if [ -f "$local_cfg" ]; then
  while IFS=' ' read -r tag id val; do
    case "$tag" in
      V)
        case "$id" in
          build.baseline-tests) loc_bt="$val" ;;
          github.issues) loc_gi="$val" ;;
          tiers.min) loc_min="$val" ;;
          tiers.max) loc_max="$val" ;;
        esac
        ;;
      I) loc_ignored="${loc_ignored:+$loc_ignored, }$id" ;;
    esac
  done < <(awk "$local_prog" "$local_cfg" 2>/dev/null || true)
  [ -z "$loc_bt" ] || overridden="${overridden:+$overridden, }build.baseline-tests"
  [ -z "$loc_gi" ] || overridden="${overridden:+$overridden, }github.issues"
  [ -z "$loc_min" ] || overridden="${overridden:+$overridden, }tiers.min"
  [ -z "$loc_max" ] || overridden="${overridden:+$overridden, }tiers.max"
fi

echo "# viber config (resolved)"
if [ -f "$local_cfg" ]; then
  printf '# local: %s | ignored: %s\n' "${overridden:-none}" "${loc_ignored:-none}"
fi
if [ -n "$loc_bt$loc_gi" ]; then
  while IFS= read -r line; do
    case "$line" in
      "build.baseline-tests: "*) [ -z "$loc_bt" ] || line="build.baseline-tests: $loc_bt" ;;
      "github.issues: "*) [ -z "$loc_gi" ] || line="github.issues: $loc_gi" ;;
    esac
    printf '%s\n' "$line"
  done < <(printf '%s\n' "$block")
else
  printf '%s\n' "$block"
fi
printf 'directories.runs: %s\n' "$(resolve_dir runs _specs)"
printf 'directories.specifications: %s\n' "$(resolve_dir specifications specs)"

min="$(tier_rank "$(group_value tiers min || true)")"
max="$(tier_rank "$(group_value tiers max || true)")"
[ "$min" -eq 0 ] && min=1
[ "$max" -eq 0 ] && max=3
[ -z "$loc_min" ] || min="$(tier_rank "$loc_min")"
[ -z "$loc_max" ] || max="$(tier_rank "$loc_max")"
if [ "$min" -gt "$max" ]; then
  min=1
  max=3
fi
printf 'tiers.min: %s\n' "$(tier_name "$min")"
printf 'tiers.max: %s\n' "$(tier_name "$max")"

mode="$(printf '%s' "$(group_value branching mode || true)" | tr '[:upper:]' '[:lower:]')"
case "$mode" in
  off|allowed|required) ;;
  *) mode=off ;;
esac

printf 'branching.mode: %s\n' "$mode"

exit 0
