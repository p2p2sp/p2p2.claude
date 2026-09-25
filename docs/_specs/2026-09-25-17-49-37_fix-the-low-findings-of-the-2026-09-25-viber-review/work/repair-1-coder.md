Root cause: an unrelated prior commit (440052d7, "consolidate destructive rm patterns to deny
list") dropped `Bash(rm -rf:*)` from the shipped `settings.json` template's `ask` list while
folding other rm variants into `deny`, breaking the pre-existing assertion in
`merge-settings.test.ts` that `ask` still carries it.

Fix: restored `"Bash(rm -rf:*)"` to the `ask` array in
`viber/skills/setup/templates/settings.json`. Left the rest of that commit's consolidation
(the new `Bash(rm -rf ~)` / `Bash(rm -rf /)` deny entries, removal of the other redundant rm
variants) untouched - the report named only this one assertion, and no ordering or overlap
assertion in the test file objects to the current shape.

Verified: `tests/viber/merge-settings.test.ts` (20/20 green) and the full
`tests/viber/*.test.ts` suite (608 tests, 607 pass, 1 pre-existing skip, 0 fail).
