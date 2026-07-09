#!/usr/bin/env bash
#
# commit-args.sh — wspolna normalizacja selektora zmian dla skilla commit.
# Sourcuj i wywolaj: resolve_commit_selector "<raw>"
#
# Ustawia zmienne:
#   COMMIT_MODE — all | staged | path
#   COMMIT_PATH — sciezka (tylko dla mode=path), inaczej pusty string
#
# Selektor (case-insensitive dla slow kluczowych):
#   ""   / all    -> all    (wszystkie zmiany)
#   staged        -> staged (tylko zmiany staged)
#   cokolwiek inne -> path   (traktowane jako sciezka)
#
# Sciezka jest przekazywana do gita VERBATIM. Git na kazdej platformie resolvuje
# natywnie formaty POSIX (src/foo), Windows drive (C:/foo, C:\foo) i MSYS (/c/foo),
# wiec zadna reczna konwersja separatorow nie jest potrzebna.
resolve_commit_selector() {
  local raw="${1:-}"
  case "$raw" in
    ""|[Aa][Ll][Ll])          COMMIT_MODE="all";    COMMIT_PATH="" ;;
    [Ss][Tt][Aa][Gg][Ee][Dd]) COMMIT_MODE="staged"; COMMIT_PATH="" ;;
    *)                         COMMIT_MODE="path";   COMMIT_PATH="$raw" ;;
  esac
}
