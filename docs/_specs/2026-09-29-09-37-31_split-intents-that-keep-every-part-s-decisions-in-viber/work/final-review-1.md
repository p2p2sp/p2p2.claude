# Final review - slice 1 (T1-T8)

## Blocking

None.

## Minor

1. `viber/skills/setup/assets/help.html:955` (EN) and `viber/skills/setup/assets/help.html:958` (PL) - the "Large requests" bullet still gives the old reason for a split: "A request made of several independent parts gets a proposed split into subprojects" / "Prośba złożona z kilku niezależnych części najpierw dostaje propozycję podziału na podprojekty". S2 of spec.md (marked CHANGED, was "split justified by independent subsystems") and criterion 2 replace that reason. The consumer that proves it is `viber/skills/intent/SKILL.md:38`, which now says "A scope too large for one plan ... Split it as a mechanical cut of that one specification - a part is never a release". The help page now describes a trigger that intent no longer uses. Fix: in both languages, change the opening clause to say that a request too large for one plan is split into parts as a mechanical cut, and that a part is never released on its own. For example, EN "A request too large for one plan gets a proposed split into ordered parts first, a mechanical cut, never a release of its own.", and PL to match. Keep the rest of the bullet (every part interviewed, `roadmap.md`, next part), and keep `tests/viber/help.test.ts` green.
