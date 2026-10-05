# Final review - slice 1 (T1 to T8)

## Blocking

None.

## Minor

1. `.claude/rules/viber/switch-count-prose.md:10-11` - out of date. This rule quotes the README's "Optional switches" sentence as it currently reads: "seven of the ten on and `build.qa`, `github.issues` and `build.baseline-tests` off". T1 changed that sentence in `viber/README.md:90-91` (and the summary paragraph in `viber/skills/setup/assets/help.html:3040-3042`) to "seven of the eleven on and `build.qa`, `github.issues`, `build.baseline-tests` and `build.extensions-parallel` off". T1's notes (`work/T1-coder.md`) say this file was left stale because it was outside the task's files. Fix: change the quoted sentence to the README's current text.

2. `.claude/rules/plugin-manifests.md:11` - out of date. The rule gives viber's `skills[]` pipeline order as "... memory, rules, code-auditor, help, handoff, commit". T8 added `./skills/extension/` right after `./skills/rules/` in `viber/.claude-plugin/plugin.json:23`, so the rule no longer matches the manifest. T8's notes (`work/T8-coder.md`) say this was left as it is because it was outside the task's files. Fix: insert `extension` after `rules` in that order list.
