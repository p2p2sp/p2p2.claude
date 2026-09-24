#!/usr/bin/env bash
#
# run-clock.sh - the run's clock: prints the epoch second a build starts, and
# turns that mark back into the time the build took.
#
# It exists because `implementor` has no other source of time. That skill's
# body forbids it to open a file, so it cannot read one to find a
# timestamp, and the only thing it is handed at load is what its `!` preloads
# print. The arithmetic and the formatting belong here rather than in the
# model: a duration composed in prose is a duration that can be wrong, and the
# orchestrator is meant to REPORT the run's length, not to derive it.
#
# The clock measures the CURRENT SESSION alone. The mark lives in the
# orchestrator's context and nowhere else: nothing is written, no state file is
# kept, and `status.md`'s contract is untouched - a run resumed in another
# session simply starts a new clock.
#
# Contract:
#   argv   : none            -> the start mark.
#            <epoch seconds> -> the time elapsed since that mark. Any further
#                               argument is ignored.
#   cwd    : irrelevant - no file is read and none is written.
#   env    : none.
#   stdout : ONE line.
#              no argument  : "started: <epoch>" (`date +%s`), or
#                             "started: unknown" when the clock cannot be read.
#              one argument : "elapsed: <n>h <nn>m <nn>s", "elapsed: <n>m <nn>s"
#                             or "elapsed: <n>s" - the largest non-zero unit
#                             first, every smaller one zero-padded to two
#                             digits ("43s", "14m 03s", "2h 14m 03s"); hours
#                             never roll over into days. Or "elapsed: unknown"
#                             when the argument is empty or is not a run of
#                             digits (an unsubstituted marker, a
#                             "started: unknown" handed back), when it lies in
#                             the future, or when the clock has moved backwards.
#            `unknown` is a VALUE, not an error - the caller drops the line
#            rather than inventing a duration.
#   exit   : ALWAYS 0. It is called as a `!` preload, where a non-zero exit
#            aborts the whole skill load.
#
set -u

now="$(date +%s 2>/dev/null || true)"
case "$now" in
  '' | *[!0-9]*) now="" ;;
esac

if [ "$#" -eq 0 ]; then
  if [ -n "$now" ]; then
    printf 'started: %s\n' "$now"
  else
    printf 'started: unknown\n'
  fi
  exit 0
fi

started="$1"
case "$started" in
  '' | *[!0-9]*) printf 'elapsed: unknown\n'; exit 0 ;;
esac
if [ -z "$now" ]; then
  printf 'elapsed: unknown\n'
  exit 0
fi

# `10#` on both sides: a value carrying a leading zero is decimal here, never
# octal, which is what bash arithmetic would otherwise make of "0123".
elapsed=$(( 10#$now - 10#$started ))
if [ "$elapsed" -lt 0 ]; then
  printf 'elapsed: unknown\n'
  exit 0
fi

hours=$(( elapsed / 3600 ))
minutes=$(( (elapsed % 3600) / 60 ))
seconds=$(( elapsed % 60 ))

if [ "$hours" -gt 0 ]; then
  printf 'elapsed: %dh %02dm %02ds\n' "$hours" "$minutes" "$seconds"
elif [ "$minutes" -gt 0 ]; then
  printf 'elapsed: %dm %02ds\n' "$minutes" "$seconds"
else
  printf 'elapsed: %ds\n' "$seconds"
fi

exit 0
