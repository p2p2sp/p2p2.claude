#!/usr/bin/env bash
#
# commit-args.sh - wspolna normalizacja argumentow skilla commit.
# Sourcuj i wywolaj: resolve_commit_selector "<raw>"
#
# Ustawia zmienne:
#   COMMIT_MODE       - all | staged | path
#   COMMIT_PATH       - sciezka (tylko dla mode=path), inaczej pusty string
#   COMMIT_ISSUE_REFS - numery issue podane w argumentach - z linkow GitHub
#                       oraz z golych referencji w stylu "#123" (tak issue
#                       podaje user w promptcie) - unikalne, w kolejnosci
#                       wystapienia ("42" / "42 7"), pusty string gdy zadnej
#                       referencji nie bylo
#
# Selektor (case-insensitive dla slow kluczowych; istniejaca sciezka wygrywa
# ze slowem kluczowym - plik/katalog o nazwie "all"/"staged" jest sciezka):
#   istniejaca sciezka -> path   (na dysku lub w indeksie gita)
#   ""   / all         -> all    (wszystkie zmiany)
#   staged             -> staged (tylko zmiany staged)
#   cokolwiek innego   -> all    (fallback: tekst nie bedacy istniejaca sciezka,
#                                 np. prozowy opis omylkowo podany zamiast selektora)
#
# Sciezka jest przekazywana do gita VERBATIM. Git na kazdej platformie resolvuje
# natywnie formaty POSIX (src/foo), Windows drive (C:/foo, C:\foo) i MSYS (/c/foo),
# wiec zadna reczna konwersja separatorow nie jest potrzebna.
#
# Referencje do issue sa wycinane z argumentow PRZED rozpoznaniem selektora,
# wiec "src/foo #42" nadal rozwiazuje sie do path=src/foo.
add_issue_ref() {
  local num="$1"
  case " $COMMIT_ISSUE_REFS " in
    *" $num "*) : ;;  # duplikat tego samego issue - pomijamy
    *) COMMIT_ISSUE_REFS="${COMMIT_ISSUE_REFS:+$COMMIT_ISSUE_REFS }$num" ;;
  esac
}

# Wycina z $1 wszystkie dopasowania regexa $2, dopisujac numer z grupy $3 do
# COMMIT_ISSUE_REFS; tekst bez dopasowan laduje w COMMIT_SELECTOR_RAW.
# Petla konsumuje prefiks (out += przed-dopasowaniem, scan := po-dopasowaniu),
# wiec skraca sie w kazdej iteracji i zawsze sie konczy - podmiana w miejscu
# moglaby trafic wczesniejsze, niedopasowane wystapienie tego samego tekstu.
strip_issue_refs() {
  local scan="$1" re="$2" grp="$3" out="" full
  while [[ "$scan" =~ $re ]]; do
    full="${BASH_REMATCH[0]}"
    add_issue_ref "${BASH_REMATCH[$grp]}"
    out="$out${scan%%"$full"*} "
    scan="${scan#*"$full"}"
  done
  COMMIT_SELECTOR_RAW="$out$scan"
}

extract_issue_refs() {
  local raw="${1:-}"
  # Gola referencja "#123" wymaga niealfanumerycznej granicy z obu stron, inaczej
  # kolor hex (#1a2b3c) czy fragment URL (#issue-12x) udawalyby numer issue.
  local url_re='(https?://[^[:space:]]+/issues/([0-9]+)[^[:space:]]*)'
  local hash_re='(^|[^[:alnum:]_])(#([0-9]+))([^[:alnum:]_]|$)'
  COMMIT_ISSUE_REFS=""
  # Linki najpierw: URL moze niesc fragment (.../issues/42#issuecomment-1),
  # ktorego reszta po wycieciu calego linku juz nie zostanie.
  strip_issue_refs "$raw" "$url_re" 2
  strip_issue_refs "$COMMIT_SELECTOR_RAW" "$hash_re" 3
  raw="$COMMIT_SELECTOR_RAW"
  # Po wycieciu referencji zostaja zdwojone spacje - scalamy je i przycinamy
  # brzegi, inaczej reszta argumentow nie dopasuje sie do slowa kluczowego ani
  # sciezki.
  while [[ "$raw" == *"  "* ]]; do raw="${raw//  / }"; done
  raw="${raw#"${raw%%[![:space:]]*}"}"
  raw="${raw%"${raw##*[![:space:]]}"}"
  COMMIT_SELECTOR_RAW="$raw"
}

resolve_commit_selector() {
  local raw
  extract_issue_refs "${1:-}"
  raw="$COMMIT_SELECTOR_RAW"
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
