#!/usr/bin/env bash
#
# decompose.sh - parsuje zatwierdzony plan i rozbija go na pliki robocze.
#
# Użycie:
#   decompose.sh <plan-file> [commit-prefix]
#
# commit-prefix (opcjonalny, domyślnie "simplebuild") - prefiks komunikatu
# commita dekompozycji, np. "superbuild".
#
# Obsługuje oba szablony planów:
#   - simpleplan: nagłówek to Title + sekcja HEADER (Goal/Context/Acceptance)
#   - superplan:  nagłówek to Title + Spec (brak sekcji HEADER)
#
# The plan file is resolved to an absolute path and, inside a git repository,
# the script moves to the repository root before deriving anything - so a run
# started from a subdirectory builds the same working dir, prints the same
# index and commits the same paths as one started from the root. The plan's own
# "Spec:" and "Intent:" values are read AFTER that move, so a relative one of
# either resolves against the repository root, never against the caller's cwd
# (a spec named relative to the cwd is then "spec file not found", exit 4).
# Outside a repository the cwd stays put and paths resolve against it, as before.
#
# Działanie:
#   - katalog roboczy: gdy linia "Intent:" planu (albo, w jej braku, "Spec:")
#     wskazuje na plik już leżący pod docs/.workflows/, ADOPTOWANY jako katalog
#     roboczy jest PEŁNY katalog tego pliku - intent.md i spec.md lądują obok
#     plan-header.md/plan.md/tasks/. Dotyczy to każdego poziomu zagnieżdżenia:
#     dla fazy biegu, czyli docs/.workflows/<bieg>/phases/NN-<slug>/intent.md,
#     katalogiem roboczym jest docs/.workflows/<bieg>/phases/NN-<slug>, a korzeń
#     biegu pozostaje nietknięty (superspec zapisuje spec.md obok przekazanego
#     intentu, więc spec fazy ląduje w tym samym katalogu bez żadnej zmiany).
#     W przeciwnym razie (żadna ścieżka nie leży pod docs/.workflows/, np. stary
#     bieg sprzed tej zmiany) wracamy do dotychczasowej nazwy pochodnej od
#     tytułu planu, docs/.workflows/<data>-<slug>/. Ścieżka absolutna
#     z segmentem docs/.workflows/ jest normalizowana do postaci względem repo.
#     Adoptowany katalog zawsze istniał przed tym biegiem,
#     więc gwarancja poniżej (trap nie usuwa katalogu, który biegowi nie
#     przynależy) obejmuje go automatycznie: błąd dekompozycji nigdy nie
#     kasuje cudzego intent.md/spec.md.
#   - zapisuje nagłówek planu do plan-header.md
#   - kopiuje pełny plan obok nagłówka jako plan.md
#   - tworzy status.md z numerem ostatnio przetworzonego taska (start: 00);
#     istniejący status.md jest zachowywany (wznowienie)
#   - zapisuje bazowy SHA builda (HEAD sprzed commita dekompozycji) do base.md;
#     istniejący base.md jest zachowywany (wznowienie); brak commitów -> none
#   - rozdziela taski (sekcje TASK) do plików tasks/task-NN.md; each of the four
#     block markers (the HEADER open/close and TASK open/close HTML comments)
#     opens or closes a block ONLY when it is the whole line, trailing
#     whitespace (a CR included) allowed. A marker quoted inside a longer line -
#     a plan whose prose or task body talks about the markers themselves, even
#     in backticks - is ordinary content: it opens nothing and is copied into
#     the task file verbatim
#   - do każdego taska dopisywana jest sekcja "### Covered criteria" z verbatim
#     treścią kryteriów wskazanych w jego linii "Covers:"; źródło to spec
#     (tor superbuild) albo sekcja "## Acceptance criteria" z nagłówka planu
#     (tor simplebuild); kryterium nieobecne w źródle -> exit 5, a komunikat
#     (jak i ostrzeżenie o braku "Covers:") nazywa task tytułem z jego
#     nagłówka "## " w formie `<tytuł>` (<nazwa-pliku>)
#   - tor superbuild (plan z linią "Spec:"): dodatkowo waliduje istnienie pliku
#     speca (brak -> exit 4) i dopisuje do plan-header.md sekcje "## Out of scope"
#     i "## Constraints / assumptions" ze speca
#   - tworzy pusty katalog implementation/ na raporty reviewera (Final Review)
#   - wypisuje na stdout indeks tasków dla pętli implementacji:
#       workdir: <ścieżka do docs/.workflows/<data>-<slug>/>
#       root: <absolute path of the repository root the paths above are
#              relative to; outside a repository, the absolute cwd. Always in
#              the platform's native spelling (under Git-Bash "C:/...", never
#              "/c/..."), because the consumer joining it opens the result with
#              a file reader, not through a shell. The orchestrator joins it
#              with the relative paths of this index to build the absolute path
#              of every fork / agent label, so a build started from any cwd
#              hands its workers the same files. workdir: itself stays
#              repository-relative - cleanup-run.sh needs it that way>
#       status: <numer-ostatniego-taska | none>
#       base: <SHA | none>
#       plan-header: <ścieżka>
#       plan: <ścieżka>
#       spec: <ścieżka>          (tylko gdy plan ma linię "Spec:")
#       intent: <path>   (only when the plan has an Intent: line naming an existing file)
#       <ścieżka-taska><TAB><tytuł><TAB><model><TAB><effort>
#     model / effort come verbatim from the task's own "- Model:" / "- Effort:"
#     marker lines (the plan template's per-task build-strength markers); a
#     task carrying no such marker prints "-" in that column, and the
#     orchestrator then passes nothing, so the implementor agent's frontmatter
#     default applies. The script never validates the values - the plan
#     reviewer owns that (checklist class B6)
#   - commituje dekompozycję (git add -A -- <katalog roboczy> + commit)
#     komunikatem
#     "chore(<commit-prefix>): decompose plan <slug>"; w indeksie ląduje
#     WYŁĄCZNIE katalog roboczy zbudowany przez ten bieg, nigdy inne zmiany
#     z drzewa roboczego; szum gita idzie na stderr,
#     więc stdout pozostaje czystym indeksem. Outside a git repository the commit
#     is skipped (note on stderr, exit 0) - the working dir is already complete,
#     so a missing repo must never fail the decomposition
#
set -euo pipefail

plan="${1:-}"
prefix="${2:-simplebuild}"

if [[ -z "$plan" ]]; then
  echo "error: missing required parameter 'plan-file'" >&2
  echo "usage: decompose.sh <plan-file> [commit-prefix]" >&2
  exit 1
fi

if [[ ! -f "$plan" ]]; then
  echo "error: plan file not found: $plan" >&2
  exit 1
fi

# --- repository root as the working directory ---
# Every path derived below (the working dir, the index lines, the commit
# pathspec) is repository-root relative, so a run must not depend on the
# directory its caller was started in: resolve the plan to an absolute path
# first - it may well be relative to that caller's cwd - and only then move to
# the repository root. Outside a repository there is no root to move to, so the
# cwd stays put and every derived path resolves against it, exactly as before.
plan_dir="$(CDPATH= cd -- "$(dirname -- "$plan")" && pwd)"
plan="${plan_dir%/}/$(basename -- "$plan")"

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -n "$repo_root" && -d "$repo_root" ]]; then
  CDPATH= cd -- "$repo_root"
else
  # The printed "root:" is joined with this index's relative paths by consumers
  # that open files DIRECTLY - an agent's file reader - not through this shell,
  # so it must carry the platform's native spelling. Git prints one itself
  # ("C:/..." under Git-Bash); plain `pwd` there prints the shell's own form
  # ("/c/..."), which no such reader can open. `pwd -W` gives the native form
  # where the shell offers it and fails everywhere else, where `pwd` is already
  # native.
  repo_root="$(pwd -W 2>/dev/null || pwd)"
fi

# --- slug z tytułu planu ---
title_line="$(grep -m1 '^Title:' "$plan" || true)"
raw_title="${title_line#Title:}"
raw_title="$(printf '%s' "$raw_title" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//')"

# LC_ALL=C przypina semantyke bajtowa: pod locale UTF-8 GNU sed gubi sie na
# 4-bajtowych znakach (emoji) i zostawia w slugu smieciowy bajt, ktory laduje
# w nazwie katalogu builda i w linii "workdir:" parsowanej przez orkiestrator.
slug="$(printf '%s' "$raw_title" \
  | LC_ALL=C tr '[:upper:]' '[:lower:]' \
  | LC_ALL=C sed -e 's/[^a-z0-9]\{1,\}/-/g' -e 's/^-*//' -e 's/-*$//')"
[[ -z "$slug" ]] && slug="plan"

# --- ścieżka speca (linia "Spec:", szablon superplan) ---
# preambuła: Title zawsze, Spec tylko w szablonie superplan; sekcję HEADER
# (jeśli jest) dopisze awk poniżej. Trailing HTML-comment przy Spec usuwamy.
# Ekstrakcja jedzie PRZED utworzeniem katalogu roboczego (patrz run_dir_of
# niżej: dir może adoptować katalog speca) - błąd "spec nie istnieje" nie
# zostawia więc żadnego katalogu na dysku.
spec_line="$(grep -m1 '^Spec:' "$plan" || true)"
spec_line="$(printf '%s' "$spec_line" | sed -e 's/[[:space:]]*<!--.*-->[[:space:]]*$//')"

# ścieżka speca (szablon superplan): z linii "Spec: <ścieżka>", bez skrajnych
# spacji; niepusta ścieżka MUSI istnieć - ekstrakcja wycinka speca poniżej
# jest bez niej niemożliwa, więc rozjazd wybucha tu, nie w środku builda.
spec_path="$(printf '%s' "${spec_line#Spec:}" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
if [[ -n "$spec_path" && ! -f "$spec_path" ]]; then
  echo "error: spec file not found: $spec_path (from plan's 'Spec:' line)" >&2
  exit 4
fi

# --- ścieżka zapisanej syntezy intent (opcjonalna preambuła "Intent:", oba
# tory) --- w przeciwieństwie do Spec: brak pliku NIE jest błędem builda: linia
# trafia do nagłówka wyłącznie gdy plik istnieje, w przeciwnym razie ostrzeżenie
# na stderr i pomijamy zarówno linię w nagłówku, jak i wpis w indeksie stdout.
intent_line="$(grep -m1 '^Intent:' "$plan" || true)"
intent_line="$(printf '%s' "$intent_line" | sed -e 's/[[:space:]]*<!--.*-->[[:space:]]*$//')"

intent_path="$(printf '%s' "${intent_line#Intent:}" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
if [[ -n "$intent_path" && ! -f "$intent_path" ]]; then
  echo "warning: intent file not found: $intent_path (from plan's 'Intent:' line) - omitted" >&2
  intent_path=""
fi

# katalog roboczy przynależny do ścieżki $1: dirname z normalizacją "\" -> "/"
# (żeby ścieżka windowsowa też trafiła); pusty argument albo dirname bez
# segmentu docs/.workflows/ -> pusty wynik (żaden trap, nigdy exit != 0).
# Gdy segment jest obecny, adoptujemy PEŁNY katalog pliku Intent:/Spec: (tail
# po OSTATNIM "docs/.workflows/", bez ucinania) - nigdy zaś tej części ścieżki,
# która leży sprzed docs/.workflows/.
run_dir_of() {
  local p="$1"
  [[ -z "$p" ]] && return 0
  p="${p//\\//}"
  local d
  d="$(dirname -- "$p")"
  case "$d" in
    *docs/.workflows/*) ;;
    *) return 0 ;;
  esac
  local tail="${d##*docs/.workflows/}"
  printf '%s\n' "docs/.workflows/${tail}"
}

# Intent: wygrywa nad Spec: (jest zapisywany pierwszy, w tym samym katalogu
# biegu); w braku obu (albo gdy żadna nie leży pod docs/.workflows/) wracamy
# do dotychczasowej nazwy pochodnej od tytułu planu.
dir="$(run_dir_of "$intent_path")"
[[ -z "$dir" ]] && dir="$(run_dir_of "$spec_path")"
[[ -z "$dir" ]] && dir="docs/.workflows/$(date +%F)-${slug}"

# zapamiętaj, czy katalog roboczy istniał PRZED tym biegiem - trap poniżej
# wolno mu usunąć wyłącznie katalog utworzony w TYM biegu; wznowienie
# (katalog już istniejący) zostaje nietknięte nawet przy błędzie. Adoptowany
# katalog ZAWSZE istniał wcześniej (zawiera przynajmniej intent.md albo
# spec.md), więc dziedziczy tę gwarancję za darmo - błąd dekompozycji nigdy
# go nie kasuje.
dir_preexisted=0
[[ -d "$dir" ]] && dir_preexisted=1

# sprzątanie na wszelkie niezerowe wyjście przed commitem dekompozycji:
# usuwamy katalog roboczy tylko gdy ten bieg go utworzył, żeby nie zostawiać
# osieroconego drzewa po błędzie (brak sekcji TASK, brakujący spec, itp.).
# trap jest rozbrajany tuż przed sekcją commita - błąd gita po tym punkcie
# ma zostawić w pełni zbudowany katalog roboczy, nie go zniszczyć.
cleanup_on_failure() {
  local status=$?
  if [[ "$status" -ne 0 && "$dir_preexisted" -eq 0 ]]; then
    rm -rf "$dir"
  fi
  exit "$status"
}
trap cleanup_on_failure EXIT

# świeży katalog tasks (usuń pozostałości po poprzednim biegu)
rm -rf "$dir/tasks"
mkdir -p "$dir/tasks"

# katalog na raporty reviewera; zachowujemy istniejące przy wznowieniu
mkdir -p "$dir/implementation"

# źródło kryteriów dla per-taskowej sekcji "### Covered criteria": spec (tor
# superbuild) albo sam plan - jego HEADER "## Acceptance criteria" (tor
# simplebuild). Zawsze ustawione, więc kryteria dopisywane są w obu torach.
if [[ -n "$spec_path" ]]; then
  crit_source="$spec_path"
else
  crit_source="$plan"
fi

# sekcja speca (nagłówek + treść, do następnego "## " lub EOF)
spec_section() {
  awk -v h="$1" '
    index($0, h) == 1 { insec=1; print; next }
    insec && /^## /   { exit }
    insec             { print }
  ' "$spec_path"
}

# treść kryterium akceptacji nr $1 ze źródła crit_source (linia "N. ..." +
# kontynuacje, do następnego numeru, pustej linii lub końca sekcji)
criterion_of() {
  awk -v n="$1" '
    /^## Acceptance criteria/ { insec=1; next }
    insec && /^## /           { exit }
    !insec                    { next }
    $0 ~ ("^" n "\\. ")       { grab=1; print; next }
    /^[0-9][0-9]*\. /         { grab=0; next }
    /^[[:space:]]*$/          { grab=0; next }
    grab                      { print }
  ' "$crit_source"
}

# --- nagłówek planu ---
header="$dir/plan-header.md"
{
  [[ -n "$title_line" ]] && printf '%s\n' "$title_line"
  [[ -n "$spec_line" ]] && printf '%s\n' "$spec_line"
  [[ -n "$intent_path" ]] && printf '%s\n' "$intent_line"
  printf '\n'
} > "$header"

# tor superbuild: globalne sekcje speca trafiają do nagłówka planu - jedyny
# fragment speca, jaki widzą per-taskowe forki (implementor / task-reviewer).
if [[ -n "$spec_path" ]]; then
  for sec in "## Out of scope" "## Constraints / assumptions"; do
    content="$(spec_section "$sec")"
    if [[ -n "${content//[[:space:]]/}" ]]; then
      printf '%s\n\n' "$content" >> "$header"
    fi
  done
fi

# --- kopia pełnego planu ---
# pełny plan trafia obok nagłówka jako plan.md; commit dekompozycji czyni
# katalog roboczy samodzielnym, zacommitowanym zapisem builda.
plan_copy="$dir/plan.md"
cp "$plan" "$plan_copy"

# --- plik statusu: numer ostatnio przetworzonego taska (00 = brak) ---
# aktualizowany przez status-update.sh po każdym ukończonym tasku.
# istniejący status zachowujemy (wznowienie); brak pliku -> inicjujemy na 00.
status="$dir/status.md"
last="00"
if [[ -f "$status" ]]; then
  parsed="$(sed -n 's/^task:[[:space:]]*\([0-9]\{1,\}\).*$/\1/p' "$status" | head -n1)"
  [[ -n "$parsed" ]] && last="$parsed"
else
  printf 'task: %s\n' "$last" > "$status"
fi

# --- bazowy SHA builda: HEAD sprzed commita dekompozycji ---
# granica diffa dla Final Review (git diff <base>..HEAD); istniejący base.md
# zachowujemy (wznowienie nie przesuwa bazy). brak commitów w repo -> none.
basefile="$dir/base.md"
if [[ -f "$basefile" ]]; then
  base="$(sed -n 's/^base:[[:space:]]*//p' "$basefile" | head -n1)"
  if [[ -z "$base" ]]; then base="none"; fi
else
  # --verify -q: w repo bez commitów zwykłe rev-parse HEAD drukuje literalne
  # "HEAD" na stdout mimo błędu; wariant -q milczy i pozwala podstawić none.
  base="$(git rev-parse --verify -q HEAD 2>/dev/null || true)"
  if [[ -z "$base" ]]; then base="none"; fi
  printf 'base: %s\n' "$base" > "$basefile"
fi

# --- podział na pliki tasków + indeks na stdout ---
# workdir: katalog roboczy; status: numer ostatniego taska (lub none); potem nagłówek + taski.
echo "workdir: $dir"
echo "root: $repo_root"
if [[ "$((10#$last))" -gt 0 ]]; then
  echo "status: $last"
else
  echo "status: none"
fi
echo "base: $base"
echo "plan-header: $header"
echo "plan: $plan_copy"
[[ -n "$spec_path" ]] && echo "spec: $spec_path"
[[ -n "$intent_path" ]] && echo "intent: $intent_path"
awk -v dir="$dir" -v hdr="$header" '
  # a marker delimits a block only as a WHOLE line (trailing whitespace, a CR
  # included, absorbed) - a plan quoting a marker mid-line is ordinary content
  /^<!-- HEADER -->[[:space:]]*$/   { inhdr=1; next }
  /^<!-- \/HEADER -->[[:space:]]*$/ { inhdr=0; next }
  inhdr                             { print >> hdr; next }

  /^<!-- TASK -->[[:space:]]*$/     { intask=1; n++; f=sprintf("%s/tasks/task-%02d.md", dir, n); files[n]=f; next }
  /^<!-- \/TASK -->[[:space:]]*$/   { intask=0; next }
  intask {
    print > f
    if (title[n] == "" && $0 ~ /^##[[:space:]]/) { t=$0; sub(/^##[[:space:]]*/, "", t); title[n]=t }
    # per-task build-strength markers: first "- Model:" / "- Effort:" line wins;
    # value trimmed, passed through verbatim (validity belongs to the plan reviewer)
    if (model[n] == "" && $0 ~ /^-[[:space:]]*Model:/) { m=$0; sub(/^-[[:space:]]*Model:[[:space:]]*/, "", m); sub(/[[:space:]]+$/, "", m); model[n]=m }
    if (effort[n] == "" && $0 ~ /^-[[:space:]]*Effort:/) { e=$0; sub(/^-[[:space:]]*Effort:[[:space:]]*/, "", e); sub(/[[:space:]]+$/, "", e); effort[n]=e }
    next
  }

  END {
    if (n == 0) { print "error: no <!-- TASK --> blocks found in plan" > "/dev/stderr"; exit 3 }
    for (i = 1; i <= n; i++) printf "%s\t%s\t%s\t%s\n", files[i], title[i], (model[i] == "" ? "-" : model[i]), (effort[i] == "" ? "-" : effort[i])
  }
' "$plan"

# --- kryteria akceptacji do plików tasków (oba tory) ---
# każdy task dostaje verbatim treść kryteriów z jego linii "Covers:" ze źródła
# crit_source (spec w torze superbuild, HEADER planu w torze simplebuild) -
# per-taskowe forki nie muszą wtedy skanować całości. Kryterium wskazane
# w "Covers:", a nieobecne w źródle, to rozjazd -> twardy błąd.
for task_file in "$dir"/tasks/task-*.md; do
  task_title="$(sed -n 's/^##[[:space:]]*//p' "$task_file" | head -n 1)"
  covers="$(grep -m1 '^-[[:space:]]*Covers:' "$task_file" || true)"
  nums="$(printf '%s\n' "$covers" | grep -o '#[0-9][0-9]*' | tr -d '#' || true)"
  if [[ -z "$nums" ]]; then
    printf 'warning: `%s` (%s) has no '"'"'Covers:'"'"' criteria - none appended\n' "$task_title" "$(basename "$task_file")" >&2
    continue
  fi
  crit_block=""
  for n in $nums; do
    text="$(criterion_of "$n")"
    if [[ -z "${text//[[:space:]]/}" ]]; then
      printf 'error: `%s` (%s) covers criterion #%s, absent from source: %s\n' "$task_title" "$(basename "$task_file")" "$n" "$crit_source" >&2
      exit 5
    fi
    crit_block+="$text"$'\n'
  done
  printf '\n### Covered criteria\n%s' "$crit_block" >> "$task_file"
done

# katalog roboczy jest teraz w pełni zbudowany - błąd gita poniżej ma zostawić
# go na miejscu, nie zniszczyć, więc rozbrajamy trap sprzątający.
trap - EXIT

# --- commit dekompozycji ---
# The commit is best-effort. Outside a git repository there is nothing to commit
# to, and the working dir above is already complete on disk - so skip it and exit
# clean, instead of letting `set -e` turn git's exit 128 into a failed decompose
# that stops the whole build.
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "decompose: not a git repository - skipping commit" >&2
  exit 0
fi

# Only the run directory this script built enters the decomposition commit:
# whatever else sits in the working tree (a parallel edit, a stray file) is the
# user's, and staging it here would smuggle it into a commit nobody declared.
# Git noise goes to stderr, so stdout carries the index alone.
git add -A -- "$dir"
if git diff --cached --quiet; then
  echo "decompose: nothing to commit" >&2
else
  git commit -m "chore($prefix): decompose plan $slug" >&2
fi
