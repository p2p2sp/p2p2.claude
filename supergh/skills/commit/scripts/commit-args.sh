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
#   ""   / all         -> all    (wszystkie zmiany)
#   staged             -> staged (tylko zmiany staged)
#   istniejaca sciezka -> path   (traktowana jako sciezka)
#   cokolwiek innego   -> all    (fallback: tekst nie bedacy istniejaca sciezka,
#                                 np. prozowy opis omylkowo podany zamiast selektora)
#
# Sciezka jest przekazywana do gita VERBATIM. Git na kazdej platformie resolvuje
# natywnie formaty POSIX (src/foo), Windows drive (C:/foo, C:\foo) i MSYS (/c/foo),
# wiec zadna reczna konwersja separatorow nie jest potrzebna.
resolve_commit_selector() {
  local raw="${1:-}"
  case "$raw" in
    ""|[Aa][Ll][Ll])          COMMIT_MODE="all";    COMMIT_PATH="" ;;
    [Ss][Tt][Aa][Gg][Ee][Dd]) COMMIT_MODE="staged"; COMMIT_PATH="" ;;
    *)
      # Selektor path TYLKO gdy string faktycznie wskazuje istniejaca sciezke
      # (na dysku lub w indeksie gita). Dowolny inny tekst nie jest sciezka ->
      # fallback do 'all', by objac realne zmiany zamiast zawezac diff/commit do
      # nieistniejacej sciezki (dawalo to ciche "Nothing to commit").
      if [ -e "$raw" ] || git ls-files --error-unmatch -- "$raw" >/dev/null 2>&1; then
        COMMIT_MODE="path";   COMMIT_PATH="$raw"
      else
        COMMIT_MODE="all";    COMMIT_PATH=""
      fi
      ;;
  esac
}
