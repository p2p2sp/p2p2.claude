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
# potem wypisuje nagłówek + zawartość każdego pliku.
#
# FAIL-SOFT przy braku WYMAGANEJ etykiety lub pliku: skrypt NIE pada z exit != 0,
# tylko wypisuje na stdout wyraźnie oznaczony blok `## INPUT ERROR` (i ZERO
# częściowej treści plików) oraz kończy exit 0. Powód: ten skrypt biegnie jako
# preload `!command` w SKILL.md forka — nienzerowy exit przerywa CAŁE ładowanie
# forka ("Shell command failed for pattern…"), więc rodzic nie dostaje żadnego
# werdyktu, tylko surowy błąd shella. Fail-soft utrzymuje błąd GŁOŚNYM (widoczny
# w kontekście forka), ale pozwala forkowi się załadować i zgłosić brak wejścia
# (reviewer zwraca VERDICT: FAIL), zamiast cicho ubić cały przepływ.
# Nadal obowiązuje zasada "ZERO częściowej treści": jeśli choć jedna wymagana
# etykieta/plik zawodzi, na stdout idzie WYŁĄCZNIE blok błędu — nigdy wymieszany
# z treścią poprawnych plików (lepiej niż cicha, częściowa praca).
#
set -euo pipefail

block="${1:-}"
shift || true

# Brak etykiet w wywołaniu to błąd okablowania skilla (autor napisał `!command`
# bez etykiet) — łapany na etapie dev, więc twardy exit. Pusty $block NIE jest
# tu błędem użycia: spływa do walidacji i fail-softuje jak każde brakujące wejście.
if [[ $# -eq 0 ]]; then
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
# (pomijana w przebiegu 2), bez błędu. brak WYMAGANEJ etykiety/pliku -> zbieramy
# komunikat do `errors` (fail-soft), NIE przerywamy skryptu.
labels=()
paths=()
errors=()
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
      errors+=("missing required label '$label:' in fork arguments")
    else
      errors+=("file for '$label:' not found: $p")
    fi
    labels+=("$label")
    paths+=("")
    continue
  fi
  labels+=("$label")
  paths+=("$p")
done

# fail-soft: jakikolwiek brak wymaganego wejścia -> tylko blok błędu na stdout,
# ZERO treści plików, exit 0 (fork się załaduje i zgłosi problem zamiast paść).
if [[ ${#errors[@]} -gt 0 ]]; then
  printf '## INPUT ERROR\n\n'
  printf 'resolve-input.sh could not resolve required fork input:\n'
  for e in "${errors[@]}"; do
    printf -- '- %s\n' "$e"
  done
  printf '\nNo file content was injected — the required input is missing, so you cannot do your job on it.\n'
  printf 'Do NOT proceed as if the input were present and do NOT invent it. Report the missing input and stop.\n'
  printf 'A reviewer returns VERDICT: FAIL stating the input was missing.\n'
  exit 0
fi

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
