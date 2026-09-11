#!/usr/bin/env bash
#
# cleanup-run.sh - usuwa pliki robocze ukończonego builda (workdir + spec +
# intent) i commituje usunięcie.
#
# Użycie:
#   cleanup-run.sh <workdir> [commit-prefix]
#
# workdir        (wymagany) - ścieżka do katalogu roboczego builda, TAK JAK
#                wypisuje ją decompose.sh w linii "workdir: ..." (relatywna do
#                docs/.workflows/). Orkiestrator zawsze przekazuje tę wartość
#                wprost - dlatego bramka bezpieczeństwa poniżej odrzuca
#                KAŻDĄ ścieżkę spoza docs/.workflows/, w tym ścieżkę
#                bezwzględną: to nie jest literówka do naprawienia, tylko
#                sygnał, że ktoś woła skrypt spoza jego kontraktu.
# commit-prefix  (opcjonalny, domyślnie "simplebuild") - prefiks komunikatu
#                commita sprzątania, np. "superbuild".
#
# Działanie:
#   - normalizuje workdir (usuwa wiodące "./" i końcowy "/") PRZED bramką
#     bezpieczeństwa i przed każdym wypisaniem na stdout
#   - brak parametru workdir lub nieistniejący katalog -> usage na stderr,
#     exit 1
#   - bramka bezpieczeństwa: znormalizowana ścieżka musi zaczynać się od
#     "docs/.workflows/" i zawierać status.md; w przeciwnym razie
#     "CLEANUP: <workdir> (skipped - not a superdev run dir)", exit 0,
#     katalog nietknięty
#   - sprawdzenie kompletności: `last` z linii "task: NN" w status.md
#     (nieparsowalne -> "00"), `highest` = najwyższy NN spośród
#     tasks/task-NN.md (brak takich plików -> "00"); gdy last != highest lub
#     highest == "00" -> nic nie usuwamy, "CLEANUP: <workdir> (skipped -
#     build not complete: task <last> of <highest>)", exit 0
#   - z plan-header.md odczytuje pierwszą linię "Spec:" i pierwszą linię
#     "Intent:" (przycięte spacje, bez końcowego komentarza HTML); plik
#     brany pod uwagę tylko gdy wartość niepusta I plik istnieje
#   - poza repo gita (git rev-parse --git-dir zawodzi): rm -rf workdir,
#     rm -f rozwiązanych plików, "CLEANUP: <workdir> (removed - no git
#     repository)", exit 0
#   - w repo gita: dla workdir + spec + intent -> `git rm -r -f -q
#     --ignore-unmatch -- <target>` (usuwa z indeksu i drzewa roboczego,
#     nawet gdy target ma lokalne modyfikacje - i tak jest usuwany, treść
#     jest odtwarzalna z HEAD) po
#     czym `rm -rf <target>` (sprząta nieśledzone resztki); brak zmian w
#     staged -> "CLEANUP: <workdir> (removed - nothing to commit)"; inaczej
#     `git commit -q -m "chore(<prefix>): clean up run <slug>"` (slug = nazwa
#     katalogu workdir bez wiodącego "YYYY-MM-DD-") i "CLEANUP: <workdir>
#     (removed)". Szum gita idzie na stderr, stdout niesie wyłącznie jedną
#     linię CLEANUP.
#   - faza roadmapu (workdir, którego katalog nadrzędny nazywa się "phases"):
#     usuwany jest wyłącznie katalog tej fazy, a slug commita to
#     "<nazwa katalogu runu bez wiodącego YYYY-MM-DD->-<nazwa katalogu fazy>"
#     (np. "roadmap-skill-01-layout"); gdy po usunięciu fazy w "phases/" nie
#     został już ŻADEN podkatalog (luźne pliki się nie liczą), w tym samym
#     commicie usuwany jest także korzeń runu (katalog z intent.md i
#     roadmap.md) razem z "phases/", a linia CLEANUP przyjmuje wariant
#     "CLEANUP: <workdir> (removed - last phase, run root removed)" -
#     odpowiednio "(removed - last phase, run root removed - nothing to
#     commit)" i "(removed - last phase, run root removed - no git
#     repository)" w dwóch pozostałych gałęziach. Płaski run (rodzic inny niż
#     "phases") zachowuje slug i komunikaty opisane wyżej.
#
set -euo pipefail

raw_workdir="${1:-}"
prefix="${2:-simplebuild}"

if [[ -z "$raw_workdir" ]]; then
  echo "error: missing required parameter 'workdir'" >&2
  echo "usage: cleanup-run.sh <workdir> [commit-prefix]" >&2
  exit 1
fi

# normalizacja: usuń końcowy "/" i wiodące "./"
dir="${raw_workdir%/}"
[[ "$dir" == ./* ]] && dir="${dir#./}"

if [[ ! -d "$dir" ]]; then
  echo "error: workdir not found: $dir" >&2
  echo "usage: cleanup-run.sh <workdir> [commit-prefix]" >&2
  exit 1
fi

# --- bramka bezpieczeństwa: tylko prawdziwy katalog roboczy superdev ---
if [[ "$dir" != docs/.workflows/* || ! -f "$dir/status.md" ]]; then
  echo "CLEANUP: $dir (skipped - not a superdev run dir)"
  exit 0
fi

# --- sprawdzenie kompletności ---
last="00"
parsed="$(sed -n 's/^task:[[:space:]]*\([0-9]\{1,\}\).*$/\1/p' "$dir/status.md" | head -n1)"
[[ -n "$parsed" ]] && last="$parsed"

highest="00"
for f in "$dir"/tasks/task-*.md; do
  [[ -e "$f" ]] || continue
  n="$(basename "$f" | sed -n 's/^task-\([0-9]\{1,\}\)\.md$/\1/p')"
  [[ -z "$n" ]] && continue
  if (( 10#$n > 10#$highest )); then
    highest="$n"
  fi
done

if [[ "$highest" == "00" || "$((10#$last))" -ne "$((10#$highest))" ]]; then
  echo "CLEANUP: $dir (skipped - build not complete: task $last of $highest)"
  exit 0
fi

# --- pliki dodatkowe z plan-header.md (Spec: / Intent:) ---
plan_header="$dir/plan-header.md"
spec=""
intent=""
if [[ -f "$plan_header" ]]; then
  spec_line="$(grep -m1 '^Spec:' "$plan_header" || true)"
  spec="$(printf '%s' "${spec_line#Spec:}" | sed -e 's/[[:space:]]*<!--.*-->[[:space:]]*$//' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"

  intent_line="$(grep -m1 '^Intent:' "$plan_header" || true)"
  intent="$(printf '%s' "${intent_line#Intent:}" | sed -e 's/[[:space:]]*<!--.*-->[[:space:]]*$//' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
fi
[[ -n "$spec" && -f "$spec" ]] || spec=""
[[ -n "$intent" && -f "$intent" ]] || intent=""

# --- wykrycie fazy roadmapu (katalog nadrzędny nazywa się "phases") ---
parent="$(dirname -- "$dir")"
is_phase=0
root=""
if [[ "$(basename -- "$parent")" == "phases" ]]; then
  is_phase=1
  root="$(dirname -- "$parent")"
  slug="$(basename -- "$root" | sed -e 's/^[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}-//')-$(basename -- "$dir")"
else
  slug="$(basename -- "$dir" | sed -e 's/^[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}-//')"
fi

# zwraca 0, gdy w podanym katalogu "phases/" nie ma już żadnego podkatalogu
# (luźne pliki nie blokują usunięcia korzenia runu)
phases_empty() {
  local p
  for p in "$1"/*/; do
    [[ -d "$p" ]] && return 1
  done
  return 0
}

root_removed=0

# --- usuwanie ---
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  rm -rf "$dir"
  [[ -n "$spec" ]] && rm -f "$spec"
  [[ -n "$intent" ]] && rm -f "$intent"
  if (( is_phase )) && phases_empty "$parent"; then
    rm -rf "$root"
    root_removed=1
  fi
  if (( root_removed )); then
    echo "CLEANUP: $dir (removed - last phase, run root removed - no git repository)"
  else
    echo "CLEANUP: $dir (removed - no git repository)"
  fi
  exit 0
fi

targets=("$dir")
[[ -n "$spec" ]] && targets+=("$spec")
[[ -n "$intent" ]] && targets+=("$intent")

for t in "${targets[@]}"; do
  git rm -r -f -q --ignore-unmatch -- "$t" >&2
  rm -rf "$t"
done

if (( is_phase )) && phases_empty "$parent"; then
  git rm -r -f -q --ignore-unmatch -- "$root" >&2
  rm -rf "$root"
  root_removed=1
fi

suffix=""
(( root_removed )) && suffix=" - last phase, run root removed"

if git diff --cached --quiet; then
  echo "CLEANUP: $dir (removed$suffix - nothing to commit)"
else
  git commit -q -m "chore($prefix): clean up run $slug" >&2
  echo "CLEANUP: $dir (removed$suffix)"
fi
