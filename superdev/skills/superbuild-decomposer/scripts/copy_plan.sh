#!/usr/bin/env bash
# superdev / superbuild-decomposer — copy_plan.sh
#
# Step 7.0 deterministic edge: copies the source plan byte-exact into the
# workflow dir (a retrospective side-artefact) and resets status.yml. The copy
# OVERWRITE is intentional — a stale plan.md / status.yml left by a prior run of
# the same slug must be replaced (fresh-path reset to `current_task: 1`).
# Contrast precheck.sh, which only seeds status.yml when absent (Step 0/resume,
# where the superbuild is authoritative).
#
# Contract:
#   argv  : $1 = source plan path; $2 = PlanSlug.
#   cwd   : host repository root.
#   writes: .temp/.workflows/<slug>/plan.md   — byte-exact copy of $1 (overwrite)
#           .temp/.workflows/<slug>/status.yml — `current_task: 1` UNCONDITIONALLY
#   stdout: EXACTLY one line — `PLAN_COPIED` on success, `COPY_FAIL <reason>` else.
#   slug  : empty / invalid (fails slug_valid) -> `COPY_FAIL`, no FS write.
#   guard : if the dest plan.md is a symlink or other non-regular file (a planted
#           link could redirect the write out of .temp/), it is removed before cp.
#   exit  : 0 on PLAN_COPIED; 1 on COPY_FAIL.
set -u

SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=slug-guard.sh
. "$SELF_DIR/slug-guard.sh"

src="${1:-}"
slug="${2:-}"

fail() { printf 'COPY_FAIL %s\n' "$1"; exit 1; }

[ -n "$src" ] || fail "no source plan path"
slug_valid "$slug" || fail "empty or invalid PlanSlug"
[ -f "$src" ] && [ -r "$src" ] || fail "source plan not a readable file: $src"
[ -s "$src" ] || fail "source plan empty: $src"

wf_dir=".temp/.workflows/$slug"
mkdir -p "$wf_dir" || fail "cannot create $wf_dir"

dest="$wf_dir/plan.md"
# symlink / irregular-file guard: never follow a planted link out of .temp/.
if [ -L "$dest" ] || { [ -e "$dest" ] && [ ! -f "$dest" ]; }; then
  rm -f "$dest" || fail "cannot remove non-regular dest: $dest"
fi

cp "$src" "$dest" || fail "cp failed: $src -> $dest"
printf 'current_task: 1\n' > "$wf_dir/status.yml" || fail "cannot write status.yml"

printf 'PLAN_COPIED\n'
exit 0
