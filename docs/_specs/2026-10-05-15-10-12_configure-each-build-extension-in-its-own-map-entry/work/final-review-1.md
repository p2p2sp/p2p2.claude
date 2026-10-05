# Final review - slice 1 (T1, T2, T3, T4, T5)

## Blocking

None.

## Minor

1. `.claude/rules/viber/switch-count-prose.md:10-11` - stale quote of the switch-count sentence.
   - What is wrong: the rule says README's "Optional switches" sentence "now" reads "seven of the eleven on and `build.qa`, `github.issues`, `build.baseline-tests` and `build.extensions-parallel` off". T5 changed that sentence, so the quote no longer matches, and it names the removed `build.extensions-parallel` key.
   - Proof: `viber/README.md:90-91` now reads "seven of the ten on and `build.qa`, `github.issues` and `build.baseline-tests` off", and `help.html:3042-3043` / `3050-3052` say the same in both languages. T5's coder notes (`work/T5-coder.md`) record this file as left stale ("still quotes 'seven of the eleven ... build.extensions-parallel'").
   - Fix: change the quote to "seven of the ten on and `build.qa`, `github.issues` and `build.baseline-tests` off". The rest of the rule stays as it is. The spec gives this file to the build's rules close (`build.rules: true` in this repo), so that close or the fix round can make this one-line edit.
