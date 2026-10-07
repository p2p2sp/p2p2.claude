#!/usr/bin/env bash
#
# handoff-path.sh - resolves where the handoff skill writes its file, and on
# which branch the conversation stands.
#
# It exists because the model does not know the current time to the second,
# and the stamp, the repository root and the MSYS-to-Windows path forms are a
# fixed format, not a judgement. It is the skill's `!` preload, so it resolves
# once, before the model reads a word of the body, and the model only fills in
# the `{slug}` placeholder.
#
# Contract:
#   argv   : $1 optional, the first word of the skill arguments (`$0`, which
#            Claude Code leaves as the literal `$0` when no argument was
#            given), surrounding whitespace and one pair of surrounding double
#            quotes dropped, every `\` made `/`. It names the target only when
#            it looks like a path: it holds a `/`, ends in `.md` or is `.`;
#            any other word opens the user's prompt, not a path.
#              absent, empty, `$0` or not path-like -> the directory
#                                   <root>/.temp/viber/handoff.
#              ending in `.md`    -> that file.
#              anything else      -> a directory.
#            Absolute is `/...` or `X:...`; an MSYS
#            form (`/c/x`) goes through `cygpath -m` where that command exists
#            (Git Bash), unchanged elsewhere. A relative target has one leading
#            `./` stripped and is resolved against <root>; `.` alone is <root>.
#            The path is not normalized further (`..` stays as written).
#   cwd    : any directory inside the host project - the repository root is
#            resolved here (`git rev-parse --show-toplevel`). Outside a
#            repository the cwd is the root (`pwd -W` in Git Bash, for the
#            `C:/...` form, else `pwd`).
#   env    : none.
#   reads  : only whether FILE exists, in the `.md` case.
#   writes : nothing. The directory is not created here: the writer does that.
#   stdout : exactly four lines, in this order -
#              FILE=<dir>/<YYYY-MM-DD-HH-MM-SS>_{slug}.md   (a directory; the
#                `{slug}` is literal, the caller substitutes it; the stamp
#                reads `unknown` only when the clock cannot be read), or
#              FILE=<path>.md                               (a file)
#              EXISTS=true | false  - true only for a `.md` target that
#                already exists; a directory target is always false.
#              BRANCH=<name> | none - none outside a repository or on a
#                detached HEAD.
#              TARGET=named | default - named when $1 was taken as the path,
#                so the prompt is the arguments after it; default otherwise,
#                so the prompt is the whole arguments.
#   stderr : always empty.
#   exit   : ALWAYS 0. A non-zero exit in a `!` preload aborts the skill load.
#
set -u

root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$root" ]; then
  root="$(pwd -W 2>/dev/null || pwd)"
fi

branch="$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)"
[ -n "$branch" ] || branch="none"

stamp="$(date +%Y-%m-%d-%H-%M-%S 2>/dev/null || true)"
[ -n "$stamp" ] || stamp="unknown"

arg="${1-}"
arg="${arg#"${arg%%[![:space:]]*}"}"
arg="${arg%"${arg##*[![:space:]]}"}"
case "$arg" in
  \"*\") arg="${arg#\"}"; arg="${arg%\"}" ;;
esac
arg="${arg//\\//}"

named="false"
case "$arg" in
  */* | *.md | .) named="true" ;;
esac

if [ "$named" = "false" ]; then
  target="$root/.temp/viber/handoff"
else
  case "$arg" in
    /*)
      target="$arg"
      if command -v cygpath >/dev/null 2>&1; then
        target="$(cygpath -m "$arg" 2>/dev/null || true)"
        [ -n "$target" ] || target="$arg"
      fi
      ;;
    [A-Za-z]:*)
      target="$arg"
      ;;
    *)
      arg="${arg#./}"
      if [ -z "$arg" ] || [ "$arg" = "." ]; then
        target="$root"
      else
        target="$root/$arg"
      fi
      ;;
  esac
fi

exists="false"
case "$target" in
  *.md)
    file="$target"
    [ -e "$file" ] && exists="true"
    ;;
  *)
    file="${target%/}/${stamp}_{slug}.md"
    ;;
esac

printf 'FILE=%s\n' "$file"
printf 'EXISTS=%s\n' "$exists"
printf 'BRANCH=%s\n' "$branch"
if [ "$named" = "true" ]; then
  printf 'TARGET=named\n'
else
  printf 'TARGET=default\n'
fi

exit 0
