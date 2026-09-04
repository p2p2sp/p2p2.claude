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
# Działanie:
#   - tworzy katalog roboczy docs/.workflows/<data>-<slug>/
#   - zapisuje nagłówek planu do plan-header.md
#   - kopiuje pełny plan obok nagłówka jako plan.md
#   - tworzy status.md z numerem ostatnio przetworzonego taska (start: 00);
#     istniejący status.md jest zachowywany (wznowienie)
#   - zapisuje bazowy SHA builda (HEAD sprzed commita dekompozycji) do base.md;
#     istniejący base.md jest zachowywany (wznowienie); brak commitów -> none
#   - rozdziela taski (sekcje TASK) do plików tasks/task-NN.md
#   - do każdego taska dopisywana jest sekcja "### Covered criteria" z verbatim
#     treścią kryteriów wskazanych w jego linii "Covers:"; źródło to spec
#     (tor superbuild) albo sekcja "## Acceptance criteria" z nagłówka planu
#     (tor simplebuild); kryterium nieobecne w źródle -> exit 5
#   - tor superbuild (plan z linią "Spec:"): dodatkowo waliduje istnienie pliku
#     speca (brak -> exit 4) i dopisuje do plan-header.md sekcje "## Out of scope"
#     i "## Constraints / assumptions" ze speca
#   - tworzy pusty katalog implementation/ na raporty reviewera (Final Review)
#   - wypisuje na stdout indeks tasków dla pętli implementacji:
#       workdir: <ścieżka do docs/.workflows/<data>-<slug>/>
#       status: <numer-ostatniego-taska | none>
#       base: <SHA | none>
#       plan-header: <ścieżka>
#       plan: <ścieżka>
#       spec: <ścieżka>          (tylko gdy plan ma linię "Spec:")
#       <ścieżka-taska><TAB><tytuł>
#   - commituje dekompozycję (git add -A + commit) komunikatem
#     "chore(<commit-prefix>): decompose plan <slug>"; szum gita idzie na stderr,
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

dir="docs/.workflows/$(date +%F)-${slug}"

# zapamiętaj, czy katalog roboczy istniał PRZED tym biegiem - trap poniżej
# wolno mu usunąć wyłącznie katalog utworzony w TYM biegu; wznowienie
# (katalog już istniejący) zostaje nietknięte nawet przy błędzie.
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

# --- nagłówek planu ---
# preambuła: Title zawsze, Spec tylko w szablonie superplan; sekcję HEADER
# (jeśli jest) dopisze awk poniżej. Trailing HTML-comment przy Spec usuwamy.
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

header="$dir/plan-header.md"
{
  [[ -n "$title_line" ]] && printf '%s\n' "$title_line"
  [[ -n "$spec_line" ]] && printf '%s\n' "$spec_line"
  printf '\n'
} > "$header"

# tor superbuild: globalne sekcje speca trafiają do nagłówka planu - jedyny
# fragment speca, jaki widzą per-taskowe forki (coder / task-reviewer).
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
if [[ "$((10#$last))" -gt 0 ]]; then
  echo "status: $last"
else
  echo "status: none"
fi
echo "base: $base"
echo "plan-header: $header"
echo "plan: $plan_copy"
[[ -n "$spec_path" ]] && echo "spec: $spec_path"
awk -v dir="$dir" -v hdr="$header" '
  /<!-- HEADER -->/   { inhdr=1; next }
  /<!-- \/HEADER -->/ { inhdr=0; next }
  inhdr               { print >> hdr; next }

  /<!-- TASK -->/     { intask=1; n++; f=sprintf("%s/tasks/task-%02d.md", dir, n); files[n]=f; next }
  /<!-- \/TASK -->/   { intask=0; next }
  intask {
    print > f
    if (title[n] == "" && $0 ~ /^##[[:space:]]/) { t=$0; sub(/^##[[:space:]]*/, "", t); title[n]=t }
    next
  }

  END {
    if (n == 0) { print "error: no <!-- TASK --> blocks found in plan" > "/dev/stderr"; exit 3 }
    for (i = 1; i <= n; i++) printf "%s\t%s\n", files[i], title[i]
  }
' "$plan"

# --- kryteria akceptacji do plików tasków (oba tory) ---
# każdy task dostaje verbatim treść kryteriów z jego linii "Covers:" ze źródła
# crit_source (spec w torze superbuild, HEADER planu w torze simplebuild) -
# per-taskowe forki nie muszą wtedy skanować całości. Kryterium wskazane
# w "Covers:", a nieobecne w źródle, to rozjazd -> twardy błąd.
for task_file in "$dir"/tasks/task-*.md; do
  covers="$(grep -m1 '^-[[:space:]]*Covers:' "$task_file" || true)"
  nums="$(printf '%s\n' "$covers" | grep -o '#[0-9][0-9]*' | tr -d '#' || true)"
  if [[ -z "$nums" ]]; then
    echo "warning: $(basename "$task_file") has no 'Covers:' criteria - none appended" >&2
    continue
  fi
  crit_block=""
  for n in $nums; do
    text="$(criterion_of "$n")"
    if [[ -z "${text//[[:space:]]/}" ]]; then
      echo "error: $(basename "$task_file") covers criterion #$n, absent from source: $crit_source" >&2
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

# artefakty robocze + wszelkie zmiany drzewa; szum gita kierujemy na stderr,
# aby stdout niósł wyłącznie indeks parsowany przez skill.
git add -A
if git diff --cached --quiet; then
  echo "decompose: nothing to commit" >&2
else
  git commit -m "chore($prefix): decompose plan $slug" >&2
fi
