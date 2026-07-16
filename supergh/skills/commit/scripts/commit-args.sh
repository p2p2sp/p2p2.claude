#!/usr/bin/env bash
#
# commit-args.sh — wspolna normalizacja selektora zmian dla skilla commit.
# Sourcuj i wywolaj: resolve_commit_selector "<raw>"
#
# Ustawia zmienne:
#   COMMIT_MODE — all | staged | path
#   COMMIT_PATH — sciezka (tylko dla mode=path), inaczej pusty string
#
# Selektor (case-insensitive dla slow kluczowych; istniejaca sciezka wygrywa
# ze slowem kluczowym — plik/katalog o nazwie "all"/"staged" jest sciezka):
#   istniejaca sciezka -> path   (na dysku lub w indeksie gita)
#   ""   / all         -> all    (wszystkie zmiany)
#   staged             -> staged (tylko zmiany staged)
#   cokolwiek innego   -> all    (fallback: tekst nie bedacy istniejaca sciezka,
#                                 np. prozowy opis omylkowo podany zamiast selektora)
#
# Sciezka jest przekazywana do gita VERBATIM. Git na kazdej platformie resolvuje
# natywnie formaty POSIX (src/foo), Windows drive (C:/foo, C:\foo) i MSYS (/c/foo),
# wiec zadna reczna konwersja separatorow nie jest potrzebna.
resolve_commit_selector() {
  local raw="${1:-}"
  # Sprawdzenie sciezki PRZED slowami kluczowymi: inaczej pliku o nazwie
  # "all"/"staged" nie da sie NIGDY skommitowac pojedynczo (slowo kluczowe
  # przechwytuje selektor i po cichu rozszerza commit na cala prace).
  if [ -n "$raw" ] && { [ -e "$raw" ] || git ls-files --error-unmatch -- "$raw" >/dev/null 2>&1; }; then
    COMMIT_MODE="path"; COMMIT_PATH="$raw"
    return 0
  fi
  case "$raw" in
    ""|[Aa][Ll][Ll])          COMMIT_MODE="all";    COMMIT_PATH="" ;;
    [Ss][Tt][Aa][Gg][Ee][Dd]) COMMIT_MODE="staged"; COMMIT_PATH="" ;;
    *)
      # Tekst nie bedacy istniejaca sciezka -> fallback do 'all', by objac
      # realne zmiany zamiast zawezac diff/commit do nieistniejacej sciezki
      # (dawalo to ciche "Nothing to commit").
      COMMIT_MODE="all";    COMMIT_PATH=""
      ;;
  esac
}
