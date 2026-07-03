#!/usr/bin/env bash
# superdev / superbuild-decomposer — precheck.sh
#
# Step 0 idempotency precheck, `!`-injected at skill load. Reads the raw
# $ARGUMENTS block on stdin (a quoted here-doc), extracts PlanSlug with builtins,
# and decides whether a prior decomposition already exists for that slug.
#
# Contract:
#   stdin : the raw $ARGUMENTS block (the skill's two-line `Plan:` / `PlanSlug:`
#           input). Only the `PlanSlug:` line is consumed; the `Plan:` path is
#           read later by the skill (Step 1a), not here.
#   cwd   : the host repository root (the fork's CWD).
#   stdout: EXACTLY one of —
#            (a) `FRESH`  -> no prior task files; the decomposer proceeds.
#            (b) the verbatim short-circuit block when >=1 task file exists:
#                `STATUS: PASS`, a blank line, `## Task files` (one
#                `- <N> — <verb> — <path>` line per existing task in numeric
#                order; separator format per SKILL.md's `# Output format`), then
#                `## Notes` carrying the literal
#                `existing task files detected — decomposition skipped` plus one
#                bullet per task file missing its `# ` H1.
#   side  : seeds `.superdev/.workflows/<slug>/status.yml` with `current_task: 1`
#           ONLY when absent (the superbuild owns it after the first commit).
#           Never writes when the slug is empty/invalid or no task files exist.
#   slug  : empty / invalid (fails slug_valid) -> `FRESH` no-op, no FS write.
#   exit  : 0 in every case (the stdout block, not the exit code, is the verdict;
#           a non-zero would surface as a load-time injection error).
set -u

SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=slug-guard.sh
. "$SELF_DIR/slug-guard.sh"

slug="$(extract_plan_slug)"

if ! slug_valid "$slug"; then
  printf 'FRESH\n'
  exit 0
fi

wf_dir=".superdev/.workflows/$slug"
tasks_dir="$wf_dir/tasks"

# Collect numeric task IDs (skip non-numeric filenames). A no-match glob stays
# literal, guarded by the `-e` test.
nums=()
for f in "$tasks_dir"/*.md; do
  [ -e "$f" ] || continue
  base="${f##*/}"; n="${base%.md}"
  case "$n" in
    ''|*[!0-9]*) continue ;;
  esac
  nums+=("$n")
done

if [ "${#nums[@]}" -eq 0 ]; then
  printf 'FRESH\n'
  exit 0
fi

# Numeric ascending order.
IFS=$'\n' sorted=($(printf '%s\n' "${nums[@]}" | sort -n)); unset IFS

# Seed status.yml only when absent — the superbuild is authoritative afterwards.
if [ ! -f "$wf_dir/status.yml" ]; then
  mkdir -p "$wf_dir"
  printf 'current_task: 1\n' > "$wf_dir/status.yml"
fi

task_lines=""
note_lines=""
for n in "${sorted[@]}"; do
  path="$tasks_dir/$n.md"
  verb="<no title>"
  have_h1=0
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    [ -z "$line" ] && continue           # skip leading blank lines
    case "$line" in
      '# '?*) verb="${line#\# }"; have_h1=1 ;;
    esac
    break                                # first non-empty line only
  done < "$path"
  [ "$have_h1" -eq 0 ] && note_lines="${note_lines}- task $n ($path) has no \`# \` H1 heading"$'\n'
  task_lines="${task_lines}- $n — $verb — $path"$'\n'
done

printf 'STATUS: PASS\n\n'
printf '## Task files\n'
printf '%s' "$task_lines"
printf '\n## Notes\n'
printf -- '- existing task files detected — decomposition skipped\n'
printf '%s' "$note_lines"
exit 0
