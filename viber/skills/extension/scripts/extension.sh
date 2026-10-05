#!/usr/bin/env bash
#
# extension.sh - the facts and the one write the `extension` skill needs: which
# agents the host project has, which of them carry the extension marker, what
# `build.extensions` lists, and the registration of one more name.
#
# It exists because the skill must not parse `.claude/viber.yml` or read every
# agent file itself: the list state comes from config.sh, the one parser of
# that file, and the single edit of the `extensions:` line is a deterministic
# text change, so a model never rewrites the configuration by hand.
#
# The file is resolved against the REPOSITORY ROOT, like config.sh: a session
# started in a subdirectory still finds the project's own `.claude/`. Outside a
# repository the cwd is the base.
#
# Contract:
#   argv   : none -> the report below. `--add <name>` -> register <name>.
#            Anything else -> the report.
#   cwd    : any directory inside the host project - the repository root is
#            resolved here. Outside a repository, the cwd is the base.
#   env    : none.
#   file   : <root>/.claude/viber.yml (read; `--add` rewrites its
#            `extensions:` line), <root>/.claude/agents/*.md (read). No other
#            file is read or written.
#   stdout : no argument -> these lines, in this order:
#              CONFIG=ok | no-config | stale
#              LISTED=<name>, <name> | none
#              MISSING=<name>, <name> | none
#              AGENT=<name> | contract | plain
#            CONFIG is `no-config` without a viber.yml, `stale` when the file
#            has no `extensions:` key directly under `build:`, else `ok`.
#            LISTED and MISSING are config.sh's `build.extensions` and
#            `build.extensions-missing`: the listed names with an agent file,
#            and those without one (or invalid), `none` when empty. AGENT is one
#            line per .claude/agents/*.md, sorted by name (byte order), the name
#            being the file name without `.md`; `contract` when the file holds a
#            line that is exactly `<!-- viber:extension -->` (trailing blanks
#            allowed), else `plain`.
#            `--add <name>` -> one line:
#              STATUS=added | present | no-config | stale | invalid-name
#            invalid-name: <name> does not match `^[a-z0-9][a-z0-9-]*$`. Then
#            no-config, then stale (as CONFIG). present: the name is already in
#            the `extensions:` value, wherever its agent file stands - nothing is
#            written. added: the name is appended to that value (comma and blank
#            after the last name, alone when the value is empty), a trailing
#            comment of the line kept as it was. Every refusal leaves every file
#            untouched.
#   exit   : ALWAYS 0 (a refusal is a STATUS= line; the caller reads stdout only).
#
set -u

script_dir="$(dirname "${BASH_SOURCE[0]}")"
repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -n "$repo_root" ] && [ -d "$repo_root" ]; then
  cfg="$repo_root/.claude/viber.yml"
else
  cfg=".claude/viber.yml"
fi
agents_dir="$(dirname "$cfg")/agents"

# The `extensions:` line directly under `build:`, the first assignment, as
# config.sh reads it. The name arrives as ENVIRON["EXT_NAME"], the mode as
# ENVIRON["EXT_WRITE"]. Mode 0 prints `P` when the name is in the value, `A`
# when the key is there without it, nothing when there is no key. Mode 1 prints
# the whole file, that line carrying the name.
ext_prog='
BEGIN { name = ENVIRON["EXT_NAME"]; write = (ENVIRON["EXT_WRITE"] == "1") }
/^[^[:space:]#]/ { inbuild = ($0 ~ /^build[[:space:]]*:/); if (write) print; next }
inbuild && !done && /^[[:space:]]+extensions[[:space:]]*:/ {
  done = 1
  line = $0
  cr = ""
  if (sub(/\r$/, "", line)) cr = "\r"
  match(line, /^[[:space:]]+extensions[[:space:]]*:/)
  prefix = substr(line, 1, RLENGTH)
  v = " " substr(line, RLENGTH + 1)
  comment = ""
  if (match(v, /[[:space:]]#/)) {
    cut = RSTART
    while (cut > 2 && substr(v, cut - 1, 1) ~ /[[:space:]]/) cut--
    comment = substr(v, cut)
    v = substr(v, 1, cut - 1)
  }
  n = split(v, names, ",")
  for (i = 1; i <= n; i++) {
    item = names[i]
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", item)
    if (item == name) found = 1
  }
  if (!write) next
  sub(/^[[:space:]]+/, "", v)
  sub(/[[:space:]]+$/, "", v)
  print prefix " " (v == "" ? name : v ", " name) comment cr
  next
}
write { print }
END { if (!write && done) print (found ? "P" : "A") }
'

state() {
  [ -f "$cfg" ] || { echo no-config; return 0; }
  probe="$(EXT_NAME="$1" EXT_WRITE=0 awk "$ext_prog" "$cfg" 2>/dev/null || true)"
  case "$probe" in
    P) echo present ;;
    A) echo ok ;;
    *) echo stale ;;
  esac
}

add_name() {
  name="${1:-}"
  case "$name" in
    ''|-*|*[!a-z0-9-]*) echo "STATUS=invalid-name"; return 0 ;;
  esac
  st="$(state "$name")"
  case "$st" in
    no-config) echo "STATUS=no-config" ;;
    stale) echo "STATUS=stale" ;;
    present) echo "STATUS=present" ;;
    *)
      tmp="$(mktemp 2>/dev/null || true)"
      if [ -n "$tmp" ] && EXT_NAME="$name" EXT_WRITE=1 awk "$ext_prog" "$cfg" > "$tmp" 2>/dev/null; then
        cat "$tmp" > "$cfg"
        echo "STATUS=added"
      else
        echo "STATUS=stale"
      fi
      [ -z "$tmp" ] || rm -f "$tmp"
      ;;
  esac
}

report() {
  st="$(state "")"
  case "$st" in
    no-config|stale) echo "CONFIG=$st" ;;
    *) echo "CONFIG=ok" ;;
  esac
  listed=none
  missing=none
  while IFS= read -r line; do
    case "$line" in
      "build.extensions: "*) listed="${line#build.extensions: }" ;;
      "build.extensions-missing: "*) missing="${line#build.extensions-missing: }" ;;
    esac
  done < <(bash "$script_dir/../../../scripts/config.sh" 2>/dev/null || true)
  echo "LISTED=$listed"
  echo "MISSING=$missing"
  while IFS= read -r name; do
    [ -n "$name" ] || continue
    if grep -q '^<!-- viber:extension -->[[:space:]]*$' "$agents_dir/$name.md" 2>/dev/null; then
      echo "AGENT=$name | contract"
    else
      echo "AGENT=$name | plain"
    fi
  done < <(
    for f in "$agents_dir"/*.md; do
      [ -f "$f" ] || continue
      b="${f##*/}"
      printf '%s\n' "${b%.md}"
    done | LC_ALL=C sort
  )
}

if [ "${1:-}" = "--add" ]; then
  add_name "${2:-}"
else
  report
fi

exit 0
