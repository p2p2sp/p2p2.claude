#!/usr/bin/env bash
#
# resolve-input.sh - deterministycznie konsumuje etykietowany blok argumentów
# forka i wstrzykuje treść wskazanych plików do jego kontekstu.
#
# Użycie:
#   resolve-input.sh <args-block> <label> [label ...]
#
# Etykieta z prefiksem '?' jest OPCJONALNA (np. "?plan"): brak etykiety lub
# brak pliku -> po prostu pomijana (bez błędu, bez treści). Etykieta bez
# prefiksu jest WYMAGANA.
#
# <args-block>: pełny $ARGUMENTS forka - linie "label: <ścieżka>" (po jednej
# etykiecie na linię). Najpierw waliduje wszystkie etykiety i pliki, dopiero
# potem wypisuje nagłówek + zawartość każdego pliku.
#
# PATH RESOLUTION: a label's value is used as given whenever it resolves against
# the caller's cwd; only when it does not, and the caller sits inside a git
# repository, is a RELATIVE value retried against the repository root
# (`git rev-parse --show-toplevel`) - so a fork started with cwd `src/` still
# reads `docs/.workflows/<run>/plan.md`. An absolute value (POSIX `/x/y.md`, a
# Windows drive letter `C:/x/y.md`) is never joined with the root, and outside a
# repository only the cwd is tried, exactly as before. The cwd candidate always
# wins, so every caller that already resolved correctly keeps its file. The
# heading printed for a label shows the value AS GIVEN, never the resolved path,
# and so does a "not found" error - the resolution stays invisible to the fork.
#
# FAIL-SOFT przy braku WYMAGANEJ etykiety lub pliku: skrypt NIE pada z exit != 0,
# tylko wypisuje na stdout wyraźnie oznaczony blok `## INPUT ERROR` (i ZERO
# częściowej treści plików) oraz kończy exit 0. Powód: ten skrypt biegnie jako
# preload `!command` w SKILL.md forka - nienzerowy exit przerywa CAŁE ładowanie
# forka ("Shell command failed for pattern…"), więc rodzic nie dostaje żadnego
# werdyktu, tylko surowy błąd shella. Fail-soft utrzymuje błąd GŁOŚNYM (widoczny
# w kontekście forka), ale pozwala forkowi się załadować i zgłosić brak wejścia
# (reviewer zwraca VERDICT: FAIL), zamiast cicho ubić cały przepływ.
# Nadal obowiązuje zasada "ZERO częściowej treści": jeśli choć jedna wymagana
# etykieta/plik zawodzi, na stdout idzie WYŁĄCZNIE blok błędu - nigdy wymieszany
# z treścią poprawnych plików (lepiej niż cicha, częściowa praca).
#
set -euo pipefail

# Label parser: the one library, shared with label.sh (the reviewers' preload),
# so the two paths over the same $ARGUMENTS block can never drift apart.
source "$(dirname "${BASH_SOURCE[0]}")/lib_label.sh"

block="${1:-}"
shift || true

# Brak etykiet w wywołaniu to błąd okablowania skilla (autor napisał `!command`
# bez etykiet) - łapany na etapie dev, więc twardy exit. Pusty $block NIE jest
# tu błędem użycia: spływa do walidacji i fail-softuje jak każde brakujące wejście.
if [[ $# -eq 0 ]]; then
  echo "error: usage: resolve-input.sh <args-block> <label> [label ...]" >&2
  exit 1
fi

# wartość etykiety: pierwsza linia "label: value" z bloku, bez CR i skrajnych spacji.
value_of() {
  label_value "$1" "$block"
}

# Repository root, resolved once: the fallback base for a relative label value
# that does not resolve against the caller's cwd. Empty outside a repository (and
# in one with no working tree, where --show-toplevel prints nothing), which keeps
# the pure cwd behaviour. git's absence is not an error here either - the
# resolution is a best effort on top of the cwd, never a precondition.
repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
repo_root="${repo_root%/}"

# True for a value that must never be joined with the repository root: POSIX
# absolute, backslash-rooted, or carrying a Windows drive letter ("C:/x", "C:\x").
is_absolute() {
  case "$1" in
    /* | \\*) return 0 ;;
    [A-Za-z]:*) return 0 ;;
    *) return 1 ;;
  esac
}

# przebieg 1: walidacja wszystkich etykiet i plików (nic nie idzie na stdout).
# etykieta z prefiksem '?' jest opcjonalna: brak etykiety/pliku -> pusta ścieżka
# (pomijana w przebiegu 2), bez błędu. brak WYMAGANEJ etykiety/pliku -> zbieramy
# komunikat do `errors` (fail-soft), NIE przerywamy skryptu.
#
# paths[] carries the path actually READ, shown[] the value as GIVEN - they
# differ only for a value resolved against the repository root.
labels=()
paths=()
shown=()
errors=()
for spec in "$@"; do
  optional=0
  label="$spec"
  if [[ "$spec" == \?* ]]; then
    optional=1
    label="${spec#\?}"
  fi
  p="$(value_of "$label")"
  # cwd first (so an already-correct caller is untouched), repository root only
  # as the fallback for a relative value that did not resolve there.
  resolved="$p"
  if [[ -n "$p" && ! -f "$p" && -n "$repo_root" ]] && ! is_absolute "$p"; then
    resolved="$repo_root/$p"
  fi
  labels+=("$label")
  if [[ -z "$p" || ! -f "$resolved" ]]; then
    paths+=("")
    shown+=("")
    if [[ $optional -eq 1 ]]; then
      continue
    fi
    if [[ -z "$p" ]]; then
      errors+=("missing required label '$label:' in fork arguments")
    else
      errors+=("file for '$label:' not found: $p")
    fi
    continue
  fi
  paths+=("$resolved")
  shown+=("$p")
done

# fail-soft: jakikolwiek brak wymaganego wejścia -> tylko blok błędu na stdout,
# ZERO treści plików, exit 0 (fork się załaduje i zgłosi problem zamiast paść).
if [[ ${#errors[@]} -gt 0 ]]; then
  printf '## INPUT ERROR\n\n'
  printf 'resolve-input.sh could not resolve required fork input:\n'
  for e in "${errors[@]}"; do
    printf -- '- %s\n' "$e"
  done
  printf '\nNo file content was injected - the required input is missing, so you cannot do your job on it.\n'
  printf 'Do NOT proceed as if the input were present and do NOT invent it. Report the missing input and stop.\n'
  printf 'A reviewer returns VERDICT: FAIL stating the input was missing.\n'
  exit 0
fi

# przebieg 2: wstrzyknięcie treści (dopiero gdy wszystko poprawne; opcjonalne
# nieobecne etykiety mają pustą ścieżkę i są pomijane)
i=0
for label in "${labels[@]}"; do
  p="${paths[$i]}"
  s="${shown[$i]}"
  i=$((i + 1))
  [[ -z "$p" ]] && continue
  printf '## %s (%s)\n\n' "$label" "$s"
  cat "$p"
  printf '\n'
done
