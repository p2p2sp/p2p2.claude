#!/usr/bin/env bash
# read-config.sh - rozwiązuje przełączniki .claude/superdev.yml do stałego bloku
# wstrzykiwanego do simplebuild / superbuild przy ładowaniu skila.
#
# Powstał, bo parser YAML z grep|sed to komenda złożona - a Claude Code rozbija
# komendy złożone i pyta o zgodę na KAŻDY człon (patrz setup/bootstrap.sh), co
# zabija krok na trybach uprawnień, które nie auto-akceptują wszystkiego.
# Zamknięcie w jednym skrypcie sprawia, że silnik uprawnień widzi JEDNĄ komendę.
#
# Kontrakt:
#   argv : brak.
#   cwd  : root projektu (blok `!` w SKILL.md wykonuje się przy ładowaniu tam).
#   env  : brak.
#   plik : .claude/superdev.yml (opcjonalny). Brak pliku -> wszystko false.
#   klucze: adr, rules, memory, docs. Klucz jest `true` WYŁĄCZNIE gdy plik ma linię
#           pasującą do `^\s*<klucz>\s*:\s*true` (koniec wartości ograniczony
#           spacją/komentarzem/końcem linii). Brak klucza -> false.
#   stdout: nagłówek + jedna linia `<klucz>: <true|false>` na każdy klucz,
#           w stałej kolejności. Wartości znormalizowane do true/false.
#   exit : zawsze 0 (fail-open - brak pliku/klucza nigdy nie wywala mechanizmu).

set -u

cfg=".claude/superdev.yml"

# true wtw. gdy w configu jest linia `^\s*<klucz>\s*:\s*true` (wartość ograniczona
# spacją / `#` / końcem linii). Brak pliku lub brak dopasowania -> false.
resolve() {
  key="$1"
  if [ -f "$cfg" ] && grep -qiE "^[[:space:]]*${key}[[:space:]]*:[[:space:]]*true([[:space:]]|#|$)" "$cfg"; then
    echo "true"
  else
    echo "false"
  fi
}

echo "# superdev config (resolved)"
for key in adr rules memory docs; do
  printf '%s: %s\n' "$key" "$(resolve "$key")"
done

exit 0
