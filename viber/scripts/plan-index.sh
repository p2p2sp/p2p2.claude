#!/usr/bin/env bash
#
# plan-index.sh - compact task index for the orchestrator, plus plan structure validation.
#
# Usage:
#   plan-index.sh <plan-file>
#
# stdout (the orchestrator's only view of the plan - the full body is read by agents):
#   plan: <path>
#   title: <plan title>
#   progress: <done>/<total>
#   tasks: id | state | tdd | deps | files | title
#   01 | done | none     | -  | .claude/settings.json | chore: ...
#   02 | todo | required | 01 | src/a.ts,src/b.ts     | feat: ...
#
# Validation (exit != 0, nothing on stdout) - catches plan drift before a build starts:
#   2 - plan file missing or unusable
#   3 - no <!-- TASK --> blocks
#   4 - broken task contract (duplicate id, missing field, illegal dependency,
#       a "Covers:" criterion absent from the acceptance criteria)
#
set -euo pipefail

plan="${1:-}"

if [[ -z "$plan" ]]; then
  echo "error: usage: plan-index.sh <plan-file>" >&2
  exit 2
fi

if [[ ! -f "$plan" ]]; then
  echo "error: plan file not found: $plan" >&2
  exit 2
fi

# The path travels through ENVIRON, not -v: awk -v expands escape sequences and
# would mangle a Windows path containing backslashes.
plan="$plan" awk '
function trim(s) { sub(/^[[:space:]]+/, "", s); sub(/[[:space:]]+$/, "", s); return s }
function val(s)  { sub(/^[^:]*:/, "", s); return trim(s) }
function fail(msg) { printf "error: %s\n", msg > "/dev/stderr"; err = 1 }

BEGIN { n = 0; ncrit = 0; err = 0; title = ""; done = ""; plan = ENVIRON["plan"] }

# plan title: the first H1
/^#[[:space:]]/ && title == "" { title = trim(substr($0, 2)); next }

# completed tasks: <!-- done: 01 02 -->
/<!--[[:space:]]*done:/ {
  s = $0
  sub(/.*<!--[[:space:]]*done:/, "", s)
  sub(/-->.*/, "", s)
  done = trim(s)
  next
}

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

  # id -> ordinal; a duplicate id is fatal
  for (i = 1; i <= n; i++) {
    if (id[i] == "") { fail("task #" i " has no id"); continue }
    if (id[i] in seen) fail("duplicate task id: " id[i])
    seen[id[i]] = i
  }

  for (i = 1; i <= n; i++) {
    if (tdd[i] != "required" && tdd[i] != "none") fail("task " id[i] ": TDD must be \"required\" or \"none\", got: \"" tdd[i] "\"")
    if (files[i] == "") fail("task " id[i] ": missing Files")
    if (deliv[i] == "") fail("task " id[i] ": missing Delivers")
    if (verif[i] == "") fail("task " id[i] ": missing Verification")
    if (dod[i] == "")   fail("task " id[i] ": missing DoD")

    # Covers must point at an existing acceptance criterion
    cv = covers[i]
    gsub(/[^0-9]+/, " ", cv)
    m = split(trim(cv), cnums, /[[:space:]]+/)
    if (m == 0) fail("task " id[i] ": Covers references no acceptance criterion")
    for (k = 1; k <= m; k++)
      if (!(cnums[k] + 0 in crit)) fail("task " id[i] ": Covers #" cnums[k] ", absent from acceptance criteria")

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

  if (err) exit 4

  # task state from the done list
  ndone = 0
  split(done, dlist, /[[:space:]]+/)
  for (k in dlist) if (dlist[k] != "" && dlist[k] != "-") isdone[dlist[k]] = 1
  for (i = 1; i <= n; i++) if (id[i] in isdone) ndone++

  printf "plan: %s\n", plan
  printf "title: %s\n", title
  printf "progress: %d/%d\n", ndone, n
  printf "tasks: id | state | tdd | deps | files | title\n"
  for (i = 1; i <= n; i++) {
    f = files[i]
    gsub(/,[[:space:]]+/, ",", f)
    printf "%s | %s | %s | %s | %s | %s\n", id[i], (id[i] in isdone ? "done" : "todo"), tdd[i], dnorm[i], f, ttl[i]
  }
}
' "$plan"
