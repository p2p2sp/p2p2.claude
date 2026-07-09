#!/usr/bin/env bash
#
# resolve-input.sh — deterministycznie konsumuje etykietowany blok argumentów
# forka i wstrzykuje treść wskazanych plików do jego kontekstu.
#
# Użycie:
#   resolve-input.sh <args-block> <label> [label ...]
#
# Etykieta z prefiksem '?' jest OPCJONALNA (np. "?plan"): brak etykiety lub
# brak pliku -> po prostu pomijana (bez błędu, bez treści). Etykieta bez
# prefiksu jest WYMAGANA.
#
# <args-block>: pełny $ARGUMENTS forka — linie "label: <ścieżka>" (po jednej
# etykiecie na linię). Najpierw waliduje wszystkie etykiety i pliki, dopiero
# potem wypisuje nagłówek + zawartość każdego pliku. Brak WYMAGANEJ etykiety lub
# pliku -> błąd na stderr, exit != 0 i ZERO częściowej treści na stdout (głośna
# awaria ładowania forka — lepsza niż cicha, częściowa praca).
#
set -euo pipefail

block="${1:-}"
shift || true

if [[ -z "$block" || $# -eq 0 ]]; then
  echo "error: usage: resolve-input.sh <args-block> <label> [label ...]" >&2
  exit 1
fi

# wartość etykiety: pierwsza linia "label: value" z bloku, bez CR i skrajnych spacji.
value_of() {
  printf '%s\n' "$block" \
    | tr -d '\r' \
    | sed -n "s/^[[:space:]]*$1:[[:space:]]*//p" \
    | sed -e 's/[[:space:]]*$//' \
    | head -n1
}

# przebieg 1: walidacja wszystkich etykiet i plików (nic nie idzie na stdout).
# etykieta z prefiksem '?' jest opcjonalna: brak etykiety/pliku -> pusta ścieżka
# (pomijana w przebiegu 2), bez błędu.
labels=()
paths=()
for spec in "$@"; do
  optional=0
  label="$spec"
  if [[ "$spec" == \?* ]]; then
    optional=1
    label="${spec#\?}"
  fi
  p="$(value_of "$label")"
  if [[ -z "$p" || ! -f "$p" ]]; then
    if [[ $optional -eq 1 ]]; then
      labels+=("$label")
      paths+=("")
      continue
    fi
    if [[ -z "$p" ]]; then
      echo "error: missing required label '$label:' in fork arguments" >&2
      exit 2
    fi
    echo "error: file for '$label:' not found: $p" >&2
    exit 3
  fi
  labels+=("$label")
  paths+=("$p")
done

# przebieg 2: wstrzyknięcie treści (dopiero gdy wszystko poprawne; opcjonalne
# nieobecne etykiety mają pustą ścieżkę i są pomijane)
i=0
for label in "${labels[@]}"; do
  p="${paths[$i]}"
  i=$((i + 1))
  [[ -z "$p" ]] && continue
  printf '## %s (%s)\n\n' "$label" "$p"
  cat "$p"
  printf '\n'
done
