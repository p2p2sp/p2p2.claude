Title: "ADR judged in the intent synthesis and written by the plan's first task"
Spec: docs/.workflows/2026-09-16-adr-in-planning/spec.md
Intent: docs/.workflows/2026-09-16-adr-in-planning/intent.md

## Out of scope
- `docs/assets/superdev-flow.svg` (ręczny diagram, nie odświeżany w tej zmianie).
- Agent historii w `intent` (dalej czyta `docs/adr/` i linki `ADR:` changelogu, bez zmian).
- `superspec` i `superspec-refine`.
- Format wpisu changelogu (`changelog-entry-format.md`) poza jednym punktem: bullet `ADR:` może wystąpić raz na każdy plik ADR zapisany w buildzie.
- Migracja istniejących ADR nazwanych stemplem `YYYYMMDDHHMMSS`.
- Usunięcie klucza `adr` z konfiguracji, `read-config.sh`, `config.yml`, `bootstrap.sh` i ich testów: klucz zostaje.

## Constraints / assumptions
- Skill `adr` działa w głównym kontekście sesji (musi rozmawiać z użytkownikiem), jest wywoływany tylko przez `intent` i nie jest wywoływalny przez użytkownika. Przy `adr: false` `intent` w ogóle go nie ładuje.
- `superplan` dostaje spec, nie intent; do sekcji `## ADR` dociera przez linię `Intent:` speca, która wskazuje plik intentu.
- `changelog-writer` przyjmuje etykietę `adr:` powtórzoną raz na każdy plik ADR; poza tym jego kontrakt nie zmienia się.
- Treść plików skilli, agentów i CLAUDE.md po angielsku; `intent.md` i ADR w języku wywiadu.
- Bez em dash i en dash w żadnym pliku.
- Plugin pozostaje stack-agnostic: żadnych założeń o ekosystemie hosta w treści skilla.
- Pliki skilli tworzone i refaktorowane przez `supercc:skill-designer`.
- Sekcja `## ADR` w `intent.md` jest jedynym wyjątkiem od reguły szablonu „bez uzasadnień i alternatyw” i obejmuje wyłącznie treść ADR.

