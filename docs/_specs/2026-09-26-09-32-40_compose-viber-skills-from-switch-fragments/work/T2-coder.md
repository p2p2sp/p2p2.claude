- Two fragment families only (per Files/Delivers): `issues-input` folds the file-writing scope,
  the script-line rule and the whole former "## Issues switch" section; `issues-done` folds the
  confirmation branches, the what-next question and the `Issue:` hand-off sentence. The heading
  "## Issues switch" itself was dropped (a heading, not a value) - the fragment prose now follows
  the intro paragraph directly.
- `grep -c 'scripts/switch-text.sh'` counts 3 not because of 2 preload calls plus a bonus line:
  the third hit is the `allowed-tools` frontmatter pattern itself.
- Ran with `issues: false` in this repo's own `.claude/viber.yml`, so I could exercise the real
  script against both fragments only by cat-testing the `.true.md` file directly (T1's own suite
  already proves the true/false selection logic; I did not re-derive it).
- Other skills (`planner`, `prototype`, `triage`) show as modified/untracked in the working tree
  from parallel tasks (T4/T5/T6) - untouched by me, left as found.
