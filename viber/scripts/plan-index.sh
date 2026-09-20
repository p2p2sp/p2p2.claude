#!/usr/bin/env bash
#
# plan-index.sh - compact task index for the orchestrator, plus plan structure
# validation and, on demand, the decomposition the per-task agents read.
#
# Usage:
#   plan-index.sh <plan-file>            validate + index (the planner's call)
#   plan-index.sh <plan-file> --split    ... and decompose (the orchestrator's call)
#
# stdout (the orchestrator's only view of the plan - the decomposed files are read
# by agents):
#   plan: <path>
#   title: <plan title>
#   progress: <done>/<total>
#   skipped: T4                     only when status.md carries the entry
#   unreviewed: T3                  only when status.md carries the entry
#   closed: memory rules            only when status.md carries the entry
#   tasks: id | state | tdd | deps | files | title
#   T1 | done | none     | -  | .claude/settings.json | chore: ...
#   T2 | todo | required | T1 | src/a.ts,src/b.ts     | feat: ...
#   dirty: T2 | src/a.ts            only for a task whose own files are dirty
#
# The run's state is read from status.md beside the plan - "done", "skipped",
# "unreviewed" and "closed", one key per line, "none" for an empty one. The plan
# itself is never written to after it lands, so nothing here parses it for
# progress; a plan with no status.md beside it (one being validated before it
# ever landed, a run whose first commit has not happened) simply has nothing
# done. The three state lines and the "dirty" lines are what a session that did
# not start the build needs. "state" is "done", "skipped" or "todo"; a "dirty"
# line means that task's own files carry uncommitted work, so an earlier session
# was cut off mid-task and a fresh coder would land on top of it. Everything else
# a resume needs is already derivable, so nothing here is stored twice.
#
# "Files:" is a comma-separated list of exact repo-relative file paths - no globs,
# no directories, no annotations - so the same list drives the commit and the
# collision check below.
#
# --split writes, into the plan's OWN directory (docs/_specs/<stamp>_<slug>/):
#   spec.md        - everything above "## Tasks": goal, acceptance criteria, scope,
#                    contracts. The whole specification, and all of it every agent
#                    working on the run needs.
#   tasks/<id>.md  - one task block verbatim, plus a "## Covered criteria" section
#                    carrying the text of the criteria its "Covers:" line names.
#   status.md      - the run's state, created empty and only when it is not there
#                    yet: an existing one carries progress and is never rewritten
#                    here. From then on commit-task.sh is the only writer, which
#                    is what keeps the plan and the specification frozen.
# A coder handed tasks/T3.md CANNOT see the other tasks, so it cannot drift into
# their files - that isolation is the point, not the token saving. tasks/ is
# rebuilt from scratch on every call, so a re-run after a plan edit carries no
# stale task file, and the decomposition is committed together with the plan
# (pathspec-scoped, best-effort): it lives under docs/, so leaving it uncommitted
# would have every later commit-task.sh run report it as left behind.
#
# Validation (exit != 0, nothing on stdout, nothing written) - catches plan drift
# before a build starts:
#   2 - plan file missing or unusable, a second argument that is not --split, or
#       a --split pointed at anything but the run's own <dir>/plan.md
#   3 - no <!-- TASK --> blocks
#   4 - broken task contract (duplicate id, an id that is not [A-Za-z0-9_-]+,
#       missing field, illegal dependency, a "Covers:" criterion absent from the
#       acceptance criteria, an acceptance criterion no task's "Covers:" names, an
#       unparseable "Files:" entry, or the same file listed by two tasks with no
#       dependency path between them - they would run at the same time)
#
# Contract:
#   argv   : the plan file, optionally --split.
#   cwd    : the repository root - the plan path and every path in the index are
#            relative to it.
#   env    : none.
#   exit   : 0 on a valid plan; a git failure during the --split commit never
#            changes that, the decomposed files are already on disk.
#
set -euo pipefail

plan="${1:-}"
mode="${2:-}"

if [[ -z "$plan" ]] || { [[ -n "$mode" ]] && [[ "$mode" != "--split" ]]; }; then
  echo "error: usage: plan-index.sh <plan-file> [--split]" >&2
  exit 2
fi

if [[ ! -f "$plan" ]]; then
  echo "error: plan file not found: $plan" >&2
  exit 2
fi

# --split rebuilds <dir>/tasks from scratch, so it only ever accepts the run's
# own <dir>/plan.md: pointed at a plan sitting loose in a repository it would
# delete a "tasks" directory belonging to the project.
dir="$(dirname -- "$plan")"
if [[ "$mode" == "--split" ]] && { [[ "${plan##*/}" != "plan.md" ]] || [[ "$dir" == "." || "$dir" == "/" ]]; }; then
  echo "error: --split expects the run's own <dir>/plan.md, got: $plan" >&2
  exit 2
fi

# Uncommitted work, so a task a previous session left half-finished can be told
# apart from one nobody has started. Read once here rather than per task, and
# empty outside a git repository - the index still has to come out.
#   -z   no C-quoting, so a non-ASCII path still compares to a "Files:" entry
changed=""
if git rev-parse --git-dir >/dev/null 2>&1; then
  skiprec=0
  while IFS= read -r -d '' rec; do
    # a rename/copy record is followed by a second one carrying the old path
    if [[ $skiprec -eq 1 ]]; then skiprec=0; continue; fi
    if [[ "${rec:0:2}" == *[RC]* ]]; then skiprec=1; fi
    changed="$changed${rec:3}"$'\n'
  done < <(git status --porcelain --untracked-files=all -z 2>/dev/null)
fi

# The run's state, beside the plan. One key per line, "none" for an empty one;
# a run with no status.md yet has nothing done, which is also the answer for a
# plan validated before it ever landed.
st_done=""
st_skipped=""
st_unreviewed=""
st_closed=""
if [[ -f "$dir/status.md" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    case "$line" in
      done:*)       st_done="${line#done:}" ;;
      skipped:*)    st_skipped="${line#skipped:}" ;;
      unreviewed:*) st_unreviewed="${line#unreviewed:}" ;;
      closed:*)     st_closed="${line#closed:}" ;;
    esac
  done < "$dir/status.md"
fi

# The path travels through ENVIRON, not -v: awk -v expands escape sequences and
# would mangle a Windows path containing backslashes.
plan="$plan" changed="$changed" \
st_done="$st_done" st_skipped="$st_skipped" st_unreviewed="$st_unreviewed" st_closed="$st_closed" \
awk '
function trim(s) { sub(/^[[:space:]]+/, "", s); sub(/[[:space:]]+$/, "", s); return s }
function val(s)  { sub(/^[^:]*:/, "", s); return trim(s) }
function fail(msg) { printf "error: %s\n", msg > "/dev/stderr"; err = 1 }

function listed(s) { s = trim(s); return (s == "none" || s == "-" ? "" : s) }

BEGIN {
  n = 0; ncrit = 0; err = 0; title = ""
  plan = ENVIRON["plan"]
  # what is committed, plus the two decisions and the close that no later
  # session could read off the tree, all of it out of the status file
  done    = listed(ENVIRON["st_done"])
  skipped = listed(ENVIRON["st_skipped"])
  unrev   = listed(ENVIRON["st_unreviewed"])
  closed  = listed(ENVIRON["st_closed"])
  m = split(ENVIRON["changed"], ch, /\n/)
  for (k = 1; k <= m; k++) if (ch[k] != "") chg[ch[k]] = 1
}

# plan title: the first H1
/^#[[:space:]]/ && title == "" { title = trim(substr($0, 2)); next }

# acceptance criteria: the numbered list inside its own section
/^##[[:space:]]/ { incrit = ($0 ~ /Acceptance criteria/) ? 1 : 0 }
incrit && /^[0-9]+\./ {
  c = $0
  sub(/\..*/, "", c)
  crit[c + 0] = 1
  if (c + 0 > ncrit) ncrit = c + 0
}

/<!--[[:space:]]*TASK[[:space:]]*-->/ {
  intask = 1; n++
  id[n] = ""; ttl[n] = ""; tdd[n] = ""; deps[n] = ""; files[n] = ""
  covers[n] = ""; deliv[n] = ""; verif[n] = ""; dod[n] = ""
  next
}
/<!--[[:space:]]*\/TASK[[:space:]]*-->/ { intask = 0; next }

intask {
  if ($0 ~ /^###[[:space:]]/) {
    h = trim(substr($0, 4))
    p = index(h, " - ")
    if (p == 0) { fail("task heading must be \"### <id> - <title>\", got: " h); next }
    id[n]  = trim(substr(h, 1, p - 1))
    ttl[n] = trim(substr(h, p + 3))
    next
  }
  if ($0 ~ /^-[[:space:]]*TDD:/)          { tdd[n]    = val($0); next }
  if ($0 ~ /^-[[:space:]]*Covers:/)       { covers[n] = val($0); next }
  if ($0 ~ /^-[[:space:]]*Depends-on:/)   { deps[n]   = val($0); next }
  if ($0 ~ /^-[[:space:]]*Files:/)        { files[n]  = val($0); next }
  if ($0 ~ /^-[[:space:]]*Delivers:/)     { deliv[n]  = val($0); next }
  if ($0 ~ /^-[[:space:]]*Verification:/) { verif[n]  = val($0); next }
  if ($0 ~ /^-[[:space:]]*DoD:/)          { dod[n]    = val($0); next }
}

END {
  if (n == 0) { printf "error: no <!-- TASK --> blocks in %s\n", plan > "/dev/stderr"; exit 3 }

  # id -> ordinal; a duplicate id is fatal, and the id also names the task file
  # --split writes, so it stays a bare token
  for (i = 1; i <= n; i++) {
    if (id[i] == "") { fail("task #" i " has no id"); continue }
    if (id[i] !~ /^[A-Za-z0-9_-]+$/) fail("task id \"" id[i] "\": letters, digits, \"-\" and \"_\" only - it names the task file")
    if (id[i] in seen) fail("duplicate task id: " id[i])
    seen[id[i]] = i
  }

  for (i = 1; i <= n; i++) {
    if (tdd[i] != "required" && tdd[i] != "none") fail("task " id[i] ": TDD must be \"required\" or \"none\", got: \"" tdd[i] "\"")
    if (files[i] == "") fail("task " id[i] ": missing Files")
    if (deliv[i] == "") fail("task " id[i] ": missing Delivers")
    if (verif[i] == "") fail("task " id[i] ": missing Verification")
    if (dod[i] == "")   fail("task " id[i] ": missing DoD")

    # Files: bare repo-relative paths, so commit-task.sh can stage them and the
    # collision check below can compare them literally
    nf[i] = 0
    m = split(files[i], fl, /,/)
    for (k = 1; k <= m; k++) {
      p = trim(fl[k])
      sub(/^\.\//, "", p)
      if (p == "")                     { fail("task " id[i] ": empty entry in Files"); continue }
      if (p ~ /[*?]/ || index(p, "[")) { fail("task " id[i] ": Files entry \"" p "\" is a glob, list exact paths"); continue }
      if (p ~ /^\// || p ~ /^~/)       { fail("task " id[i] ": Files entry \"" p "\" must be repo-relative"); continue }
      if (p ~ /\/$/)                   { fail("task " id[i] ": Files entry \"" p "\" is a directory, list each file"); continue }
      if (p ~ /[[:space:]]/)           { fail("task " id[i] ": Files entry \"" p "\" is not a bare path, drop the annotation"); continue }
      fset[i, p] = 1
      fpath[i, ++nf[i]] = p
    }

    # Covers must point at an existing acceptance criterion; the reverse direction
    # is checked once, after this loop
    cv = covers[i]
    gsub(/[^0-9]+/, " ", cv)
    m = split(trim(cv), cnums, /[[:space:]]+/)
    if (m == 0) fail("task " id[i] ": Covers references no acceptance criterion")
    for (k = 1; k <= m; k++)
      if (!(cnums[k] + 0 in crit)) fail("task " id[i] ": Covers #" cnums[k] ", absent from acceptance criteria")
      else covered[cnums[k] + 0] = 1

    # a dependency may only point at an earlier existing task, which makes the graph acyclic by construction
    d = deps[i]
    if (d == "" || d == "none" || d == "-") { dnorm[i] = "-"; continue }
    gsub(/,/, " ", d)
    m = split(trim(d), dn, /[[:space:]]+/)
    out = ""
    for (k = 1; k <= m; k++) {
      if (!(dn[k] in seen)) { fail("task " id[i] ": Depends-on " dn[k] ", no such task"); continue }
      if (seen[dn[k]] >= i) { fail("task " id[i] ": Depends-on " dn[k] " must reference an earlier task"); continue }
      out = (out == "" ? dn[k] : out "," dn[k])
    }
    dnorm[i] = (out == "" ? "-" : out)
  }

  # tasks with no dependency path between them run at the same time, so they may not
  # share a file; deps point backwards only, so one forward pass resolves ancestry
  if (!err) {
    for (i = 1; i <= n; i++) {
      if (dnorm[i] == "-") continue
      m = split(dnorm[i], dn, /,/)
      for (k = 1; k <= m; k++) {
        j = seen[dn[k]]
        anc[i, j] = 1
        for (t = 1; t < j; t++) if ((j, t) in anc) anc[i, t] = 1
      }
    }
    for (i = 1; i <= n; i++)
      for (j = i + 1; j <= n; j++) {
        if ((j, i) in anc) continue
        for (k = 1; k <= nf[i]; k++)
          if ((j, fpath[i, k]) in fset)
            fail("tasks " id[i] " and " id[j] " both list " fpath[i, k] ", with no dependency path between them")
      }
  }

  # a criterion no task covers would run through the whole build unnoticed -
  # nothing downstream gates the specification as a whole. Walked by number, not
  # with "for (c in crit)", which awk iterates in no defined order.
  for (c = 1; c <= ncrit; c++)
    if ((c in crit) && !(c in covered)) fail("acceptance criterion #" c " is covered by no task")

  if (err) exit 4

  # task state from the done list, and the tasks the user dropped from the
  # skipped one - both are settled, neither is dispatched again
  ndone = 0
  split(done, dlist, /[[:space:]]+/)
  for (k in dlist) if (dlist[k] != "" && dlist[k] != "-") isdone[dlist[k]] = 1
  split(skipped, slist, /[[:space:]]+/)
  for (k in slist) if (slist[k] != "" && slist[k] != "-") isskipped[slist[k]] = 1
  for (i = 1; i <= n; i++) if (id[i] in isdone) ndone++

  printf "plan: %s\n", plan
  printf "title: %s\n", title
  printf "progress: %d/%d\n", ndone, n
  if (skipped != "") printf "skipped: %s\n", skipped
  if (unrev   != "") printf "unreviewed: %s\n", unrev
  if (closed  != "") printf "closed: %s\n", closed
  printf "tasks: id | state | tdd | deps | files | title\n"
  for (i = 1; i <= n; i++) {
    f = ""
    for (k = 1; k <= nf[i]; k++) f = (f == "" ? fpath[i, k] : f "," fpath[i, k])
    state = (id[i] in isdone ? "done" : (id[i] in isskipped ? "skipped" : "todo"))
    printf "%s | %s | %s | %s | %s | %s\n", id[i], state, tdd[i], dnorm[i], f, ttl[i]
  }

  # a task whose own files carry uncommitted work: an earlier session was cut
  # off inside it, and a fresh coder would land on top of what it left
  for (i = 1; i <= n; i++) {
    d = ""
    for (k = 1; k <= nf[i]; k++)
      if (fpath[i, k] in chg) d = (d == "" ? fpath[i, k] : d "," fpath[i, k])
    if (d != "") printf "dirty: %s | %s\n", id[i], d
  }
}
' "$plan"

[[ "$mode" == "--split" ]] || exit 0

# --- the decomposition, beside the plan ---
# A second pass over a file the first one just proved well-formed: every id is
# present, unique and a bare token, so nothing here has to guard against drift.
rm -rf -- "$dir/tasks"
mkdir -p -- "$dir/tasks"

dir="$dir" awk '
function trim(s) { sub(/^[[:space:]]+/, "", s); sub(/[[:space:]]+$/, "", s); return s }

BEGIN { dir = ENVIRON["dir"] }
{ line[NR] = $0 }

END {
  # the cut: everything above the task list is the specification
  for (i = 1; i <= NR; i++) if (line[i] ~ /^##[[:space:]]*Tasks/) { cut = i; break }
  if (!cut) cut = NR + 1

  spec = dir "/spec.md"
  for (i = 1; i < cut; i++) print line[i] > spec
  close(spec)

  # acceptance criteria by number: the "N." line plus its continuations, ended by
  # the next number, a blank line or the end of the section
  for (i = 1; i < cut; i++) {
    s = line[i]
    if (s ~ /^##[[:space:]]/) { incrit = (s ~ /Acceptance criteria/); cur = 0; continue }
    if (!incrit) continue
    if (s ~ /^[0-9]+\./)    { c = s; sub(/\..*/, "", c); cur = c + 0; crit[cur] = s; continue }
    if (trim(s) == "")      { cur = 0; continue }
    if (cur) crit[cur] = crit[cur] "\n" s
  }

  # one file per task: the block verbatim, then the text of the criteria it covers
  for (i = cut; i <= NR; i++) {
    if (line[i] ~ /<!--[[:space:]]*TASK[[:space:]]*-->/)   { intask = 1; body = ""; id = ""; cov = ""; continue }
    if (line[i] ~ /<!--[[:space:]]*\/TASK[[:space:]]*-->/) {
      intask = 0
      if (id == "") continue
      f = dir "/tasks/" id ".md"
      printf "%s", body > f
      m = split(cov, cn, /[[:space:]]+/)
      if (m > 0) {
        printf "\n## Covered criteria\n" > f
        for (k = 1; k <= m; k++) if (cn[k] != "" && (cn[k] + 0) in crit) printf "%s\n", crit[cn[k] + 0] > f
      }
      close(f)
      n++
      continue
    }
    if (!intask) continue
    body = body line[i] "\n"
    if (id == "" && line[i] ~ /^###[[:space:]]/) {
      h = trim(substr(line[i], 4)); p = index(h, " - ")
      id = (p ? trim(substr(h, 1, p - 1)) : trim(h))
    }
    if (line[i] ~ /^-[[:space:]]*Covers:/) {
      c = line[i]; sub(/^[^:]*:/, "", c); gsub(/[^0-9]+/, " ", c); cov = trim(c)
    }
  }
  printf "decomposed: %d tasks into %s\n", n, dir > "/dev/stderr"
}
' "$plan"

# --- the run's state file ---
# Created here, with the run, and only when it is not there yet: a resume splits
# again and must find its progress untouched. commit-task.sh is its only other
# writer, and the plan beside it is never written to again at all.
if [[ ! -f "$dir/status.md" ]]; then
  total="$(grep -cE '<!--[[:space:]]*TASK[[:space:]]*-->' -- "$plan" || true)"
  {
    printf '# status\n\n'
    printf 'progress: 0/%s\n' "${total:-0}"
    printf 'done: none\n'
    printf 'skipped: none\n'
    printf 'unreviewed: none\n'
    printf 'closed: none\n'
  } > "$dir/status.md"
fi

# --- and into the history ---
# The decomposition lives under docs/, so it has to be committed by somebody: no
# task's "Files:" list names it, and commit-task.sh stages nothing it was not
# given. The pathspec keeps this to the run's own directory even when the caller
# left something else staged, and every failure here is swallowed - the files are
# on disk either way, and a build must not stop because git refused a chore commit.
if git rev-parse --git-dir >/dev/null 2>&1; then
  git add -A -- "$dir" >/dev/null 2>&1 || true
  if ! git diff --cached --quiet -- "$dir" 2>/dev/null; then
    git commit -m "chore(viber): decompose plan ${dir##*/}" -- "$dir" >&2 || true
  fi
fi

exit 0
