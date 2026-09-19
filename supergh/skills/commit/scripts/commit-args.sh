#!/usr/bin/env bash
#
# commit-args.sh - the shared argument normalisation of the commit skill.
# Source it and call: resolve_commit_selector "<raw>"
#
# It exists because commit-context.sh (which MEASURES the selected set) and
# commit.sh (which STAGES it) each parsed the selector themselves and drifted:
# one treated a file named "all" as a path, the other as the keyword.
#
# Sets these variables:
#   COMMIT_MODE       - all | staged | path
#   COMMIT_PATH       - the path (only for mode=path), otherwise an empty
#                       string
#   COMMIT_ISSUE_REFS - the issue numbers given in the arguments - from GitHub
#                       links and from bare "#123" references (the way a user
#                       names an issue in a prompt) - unique, in order of
#                       appearance ("42" / "42 7"), an empty string when there
#                       was no reference at all
#
# The selector (keywords are case-insensitive; an existing path WINS over a
# keyword - a file or directory named "all"/"staged" is a path):
#   an existing path -> path   (on disk or in the git index)
#   "" / all         -> all    (every change)
#   staged           -> staged (only staged changes)
#   anything else    -> all    (fallback: text that is not an existing path,
#                               e.g. a prose description passed by mistake in
#                               place of a selector)
#
# The path is handed to git VERBATIM. On every platform git natively resolves
# the POSIX (src/foo), Windows-drive (C:/foo, C:\foo) and MSYS (/c/foo) forms,
# so no manual separator conversion is needed.
#
# Issue references are cut out of the arguments BEFORE the selector is
# recognised, so "src/foo #42" still resolves to path=src/foo.
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
