
## Task 4 - Route the vibe track in the manifest and the neighbouring skill descriptions
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: `Wejście komendą lub sygnałem` (#1), `Sąsiednie skille ustępują` (#16), `Manifest zna trzeci tor` (#17)

### Dependencies
- `Add the vibe skill with its brief template` (Task 3) - blocks: the skill name the descriptions and the manifest point at

### Files
- modify - superdev/hooks/content/manifest.md (`## Four rules that always override convenience`)
- modify - superdev/skills/intent/SKILL.md (`description`)
- modify - superdev/skills/simpledebug/SKILL.md (`description`)
- modify - superdev/skills/tdd/SKILL.md (`description`)

### Task Checks
- grep -n "vibe" superdev/hooks/content/manifest.md
- grep -n "vibe" superdev/skills/intent/SKILL.md superdev/skills/simpledebug/SKILL.md superdev/skills/tdd/SKILL.md
- node --test tests/superdev/session-start.test.ts

### Approach
1. In `superdev/hooks/content/manifest.md`, rewrite the bullet `No code before an approved plan - write it, get approval, THEN implement.` to `No code before an approved plan - write it, get approval, THEN implement. The one exception is the vibe track: an explicit request to skip planning for a one-sentence change runs the vibe skill, which needs no plan.` and add to `## Build chain` one bullet: `Vibe track: an explicit "vibe" / "just do it" request for a one-sentence change runs the vibe skill - one implementor agent, host-declared checks, an advisory scope guard (5 files / 1 new file / 200 lines / host-declared sensitive paths) and one commit; no interview, no plan, no reviewer, no knowledge writer. Every stop of that guard is a recommendation the user may override.`
2. In `superdev/skills/intent/SKILL.md`, replace the description's last sentence `Do not trigger when user want to implement something here and now or fast.` with `Do not trigger when the user explicitly asks for a vibe change (skip planning, do it right away) - that request belongs to the vibe skill.`
3. In `superdev/skills/simpledebug/SKILL.md`, append to the description: `Do not trigger when the user explicitly asks for the fix as a vibe change ("vibe: fix ...") - the vibe skill owns that request and the user has chosen to skip tracing.`
4. In `superdev/skills/tdd/SKILL.md`, replace the description's closing `or as a default gate on every code change.` with `or as a default gate on every code change, or for a change the user explicitly asked for as a vibe change.`

### Failure modes
- none - documentation

### Contracts
- none

### DoD
The three descriptions and the manifest carry the new sentences verbatim, `tests/superdev/session-start.test.ts` is green (the manifest still injects), and no other line of those files changed.


### Covered criteria
1. Wejście komendą lub sygnałem - Prośba `/superdev:vibe <opis>` albo prośba o zmianę, która jawnie żąda natychmiastowego wykonania bez planowania (sygnały takie jak "vibe", "od ręki", "just do it", "bez planu"; lista jest przykładowa, decyduje jawne żądanie pominięcia ceremonii, nie samo słowo "teraz" czy "szybko" w zwykłej prośbie: "vibe: zmień etykietę przycisku na Zapisz" wchodzi na tor, "dodaj teraz eksport do CSV" idzie do `intent`), uruchamia tor `vibe`, a nie `intent`, `simpledebug` ani `tdd`.
16. Sąsiednie skille ustępują - Opisy `intent`, `simpledebug` i `tdd` nie przechwytują prośby z jawnym sygnałem `vibe`, także gdy prośba dotyczy poprawki błędu ("vibe: napraw NPE w X" trafia do `vibe`, nie do `simpledebug`).
17. Manifest zna trzeci tor - Manifest wstrzykiwany na starcie sesji nazywa tor `vibe` jako trzeci tor obok Simple i Super i stwierdza, że zasada "No code before an approved plan" go nie obejmuje.
