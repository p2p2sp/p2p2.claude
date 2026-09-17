#!/usr/bin/env bash
# Lint a skill directory (containing SKILL.md) or a single agent/skill .md file.
# Prints FAIL / WARN lines. Exit 1 when any FAIL, 0 otherwise. Plain bash only.
#
# A DIRECTORY target lints every .md under it plus its bundled scripts/ and
# references/. A FILE target lints THAT file and nothing else - passing an agent
# .md must never report a sibling agent's violations under this file's run. The
# one exception is a file literally named SKILL.md: its directory IS the skill
# root, so naming it is the same request as naming the directory.

set -u

target="${1:-}"
if [ -z "$target" ]; then
  echo "usage: lint_skill.sh <skill-dir | file.md>" >&2
  exit 2
fi

fails=0
warns=0
fail() { echo "FAIL $1"; fails=$((fails + 1)); }
warn() { echo "WARN $1"; warns=$((warns + 1)); }

# sweep_dir non-empty -> lint every .md under it and its bundled dirs; empty ->
# lint "$main" alone.
sweep_dir=""
if [ -d "$target" ]; then
  main="$target/SKILL.md"
  sweep_dir="$target"
  [ -f "$main" ] || { fail "$target: SKILL.md missing"; echo "FAIL=$fails WARN=$warns"; exit 1; }
else
  main="$target"
  [ -f "$main" ] || { fail "$target: file not found"; echo "FAIL=$fails WARN=$warns"; exit 1; }
  [ "$(basename "$main")" = "SKILL.md" ] && sweep_dir="$(dirname "$target")"
fi

# --- frontmatter ---------------------------------------------------------
first_line="$(head -n 1 "$main")"
if [ "$first_line" != "---" ]; then
  fail "$main: no YAML frontmatter"
  fm=""
  body_start=1
else
  fm_end="$(awk 'NR>1 && /^---[[:space:]]*$/ {print NR; exit}' "$main")"
  if [ -z "$fm_end" ]; then
    fail "$main: frontmatter not closed"
    fm=""
    body_start=1
  else
    fm="$(sed -n "2,$((fm_end - 1))p" "$main")"
    body_start=$((fm_end + 1))
  fi
fi

if [ -n "$fm" ]; then
  name="$(printf '%s\n' "$fm" | sed -n 's/^name:[[:space:]]*//p' | head -n 1 | tr -d "\"'" | tr -d '\r')"
  if [ -z "$name" ]; then
    fail "$main: frontmatter missing name"
  else
    [ "${#name}" -gt 64 ] && fail "$main: name has ${#name} chars, the platform caps it at 64"
    printf '%s' "$name" | grep -Eq '^[a-z0-9]+(-[a-z0-9]+)*$' \
      || fail "$main: name '$name' must be lowercase letters, digits and single hyphens"
    printf '%s' "$name" | grep -Eiq '(anthropic|claude)' \
      && warn "$main: name '$name' uses a reserved word (anthropic, claude)"
  fi
  # single-line value, or a block scalar (>, |) continued on indented lines
  desc="$(printf '%s\n' "$fm" | awk '
    /^description:/ { v = $0; sub(/^description:[[:space:]]*/, "", v); if (v ~ /^[>|]/) v = ""; on = 1; printf "%s", v; next }
    on && /^[[:space:]]+[^[:space:]]/ { s = $0; sub(/^[[:space:]]+/, "", s); printf " %s", s; next }
    on { on = 0 }
  ')"
  if [ -z "$desc" ]; then
    fail "$main: frontmatter missing description"
  else
    desc="${desc# }"  # the awk join above prefixes a space on block scalars
    desc_chars="${#desc}"
    [ "$desc_chars" -gt 1024 ] && fail "$main: description has $desc_chars chars, the platform truncates past 1024 and the trigger words in the tail are lost"
    [ "$desc_chars" -gt 800 ] && [ "$desc_chars" -le 1024 ] && warn "$main: description has $desc_chars chars, approaching the 1024 limit"
    case "$desc" in *"<"*|*">"*) fail "$main: description contains an angle bracket, XML tags are rejected" ;; esac
    desc_words="$(printf '%s' "$desc" | wc -w | tr -d ' ')"
    [ "$desc_words" -lt 15 ] && warn "$main: description has $desc_words words, add what it does and when to trigger"
    [ "$desc_words" -gt 120 ] && warn "$main: description has $desc_words words, metadata should stay around 100"
    printf '%s' "$desc" | grep -Eiq '(use (this|it|when|whenever)|invoke|trigger|whenever)' \
      || warn "$main: description has no explicit when-to-use cue"
  fi
fi

# --- body size -----------------------------------------------------------
total_lines="$(wc -l < "$main" | tr -d ' ')"
body_lines=$((total_lines - body_start + 1))
[ "$body_lines" -gt 500 ] && fail "$main: body has $body_lines lines (limit 500), move detail to references/"
[ "$body_lines" -gt 400 ] && [ "$body_lines" -le 500 ] && warn "$main: body has $body_lines lines, approaching the 500 limit"

# --- content checks over every markdown file ----------------------------
check_file() {
  f="$1"
  # emoji: 4-byte UTF-8 sequences and common 3-byte symbol ranges
  if LC_ALL=C grep -nq $'\xF0\x9F' "$f" || LC_ALL=C grep -nEq $'\xE2[\x9C-\x9E]|\xE2\x98|\xE2\x9A' "$f"; then
    fail "$f: emoji found"
  fi
  # em dash / en dash
  LC_ALL=C grep -nq $'\xE2\x80[\x93\x94]' "$f" && fail "$f: em/en dash found, use plain hyphen"
  # tables
  grep -nEq '^[[:space:]]*\|' "$f" && fail "$f: markdown table found"
  # italics: single *x* or _x_ not part of ** / __ / identifiers
  grep -nEq '(^|[^*[:alnum:]])\*[^* ][^*]*[^* ]\*([^*[:alnum:]]|$)' "$f" && warn "$f: possible italics with *...*"
  grep -nEq '(^|[[:space:]])_[^_ ][^_]*[^_ ]_([[:space:][:punct:]]|$)' "$f" && warn "$f: possible italics with _..._"
  # Project instruction file reads. A WARN, not a FAIL: pointing a worker at its
  # OWN project's CLAUDE.md is wrong (the harness injects that), but the same
  # sentence is CORRECT when the memory belongs to a repo the worker was pointed
  # AT, and it is not an instruction at all inside a template whose body gets
  # written into a generated CLAUDE.md. Telling those apart is judgment, and a
  # false FAIL on a judgment call is worse than no check. The qualifier filter
  # drops the foreign-repo reading, which is the one shape decidable from a line.
  if grep -nEi '(read|load|check|consult)[^.]*CLAUDE\.md' "$f" \
    | grep -Eiqv '(host|target|audited|under audit|repo you were given)'; then
    warn "$f: names a CLAUDE.md read, the harness injects the worker's own project memory"
  fi
  # shouting
  shouts="$(grep -oE '\b(MUST|NEVER|ALWAYS|CRITICAL|IMPORTANT)\b' "$f" | wc -l | tr -d ' ')"
  [ "$shouts" -gt 5 ] && warn "$f: $shouts all-caps directives, replace with a short why"
  # caller narrative cues
  grep -nEiq '(you are (invoked|called|spawned) by|is (invoked|called) by the|as part of the .* pipeline|the caller (passes|sends|gives))' "$f" \
    && warn "$f: caller narrative cue in body, keep routing in description: only"
  # external tools in bash
  grep -nEq '(^|[[:space:]|;(])(jq|bc)([[:space:]]|$)' "$f" && warn "$f: uses jq or bc, keep to clean bash"
}

if [ -n "$sweep_dir" ]; then
  while IFS= read -r f; do
    [ -n "$f" ] && check_file "$f"
  done <<EOF
$(find "$sweep_dir" -type f -name '*.md' 2>/dev/null)
EOF
else
  check_file "$main"
fi

# --- scripts -------------------------------------------------------------
if [ -n "$sweep_dir" ] && [ -d "$sweep_dir/scripts" ]; then
  for s in "$sweep_dir"/scripts/*; do
    [ -f "$s" ] || continue
    [ "$(basename "$s")" = "lint_skill.sh" ] && continue
    grep -nEq '(^|[[:space:]|;(])(jq|bc)([[:space:]]|$)' "$s" && warn "$s: uses jq or bc, keep to clean bash"
    case "$s" in
      *.sh) [ -x "$s" ] || warn "$s: not executable" ;;
    esac
  done
fi

# --- references ----------------------------------------------------------
if [ -n "$sweep_dir" ] && [ -d "$sweep_dir/references" ]; then
  for r in "$sweep_dir"/references/*.md; do
    [ -f "$r" ] || continue
    rl="$(wc -l < "$r" | tr -d ' ')"
    if [ "$rl" -gt 100 ]; then
      if ! head -n 40 "$r" | grep -Eiq '(table of contents|^## contents|^# contents|^- \[.*\]\(#)'; then
        if [ "$rl" -gt 300 ]; then
          fail "$r: $rl lines without a table of contents"
        else
          warn "$r: $rl lines without a table of contents, partial reads see only the head"
        fi
      fi
    fi
    grep -q "$(basename "$r")" "$main" || warn "$r: not referenced from $(basename "$main")"
  done
fi

echo "FAIL=$fails WARN=$warns"
[ "$fails" -eq 0 ]
