# Switches

- A switch is read only inside its group (`planning.`, `build.`, `github.`) and always named by
  its dotted key: a flat column-0 key resolves off in `config.sh`, and `switch-text.sh` rejects it.
  `github.issue-title` and `github.pr-title` are title patterns, not switches: `issue-templates.sh`
  prints the first as `TITLE_PATTERN=`, `pr-facts.sh` the second, and the skills fill the
  placeholders.
- A new switch: `skills/setup/templates/viber.yml` (`bootstrap.sh` restores a child an existing
  config lacks and appends a missing group whole), `config.sh`'s key list and order,
  `switch-text.sh`'s key allowlist, `README.md`, `help.html`, and the consuming skill's `fragments/<name>.<value>.md` (implementor's step 3
  `TaskCreate`s one entry per close part; step 4 preloads `baseline-run`, step 5 preloads
  `baseline-close` and `final-review`, step 6 preloads
  `memory`, `rules`, `qa`, step 7 `cleanup`); no skill body branches on a switch,
  `tests/portability.unit.test.ts` sweeps every call.
  `<name>` is per call site (`issues-read`, `qa-e2e`), not the key; only a state that does
  something gets a file. `switch-text.sh` prints nothing for an absent file or unknown key,
  always exits 0, and expands `${CLAUDE_SKILL_DIR}`/`${CLAUDE_PLUGIN_ROOT}` in a fragment
  itself: Claude Code never substitutes preload output.
- `schema:` is the layout number of `viber.yml`. Any change to the template's key list raises it
  in the template, and `tests/viber/bootstrap.test.ts`'s `SCHEMA_KEYS` binding fails until the
  recorded list moves with it: `session-start.sh` compares the file's number with the template's
  (lower -> run `/viber:setup`, higher -> update the plugin), so an unraised number leaves that
  note silent. `bootstrap.sh` moves each legacy flat switch into its group with its value,
  drops the flat line and raises `schema:`, never lowers it.
- Duplicated on purpose, changed together: `viber.yml` key grammar (blanks allowed before the
  colon) in `config.sh` and `bootstrap.sh`'s merge, where a key one reads and the other misses is
  appended again, overriding the user's value; `directories.*` parsing in `config.sh`,
  `plan-path.sh`, `archive-run.sh`.
- Switches reaching planning: `build.memory` (`plan-rules.md`'s Memory-owned rule, the `memory:`
  line to `planner-review`); `planning.adr` (`planner` follows `skills/planner/references/adr-tasks.md` once the plan is written and `plan-index.sh` exits 0, dispatching `adr-screener`);
  `build.qa` (`planner`'s e2e hand-off line); `branching.mode` (`CLAUDE.run-branch.md`).
- `build.baseline-tests` is `off`, `fast` or `full` (`config.sh`: `full`/`true` in any letter case
  -> `full`, `fast` -> `fast`, else `off`) and reaches `implementor` only: `baseline-run.<value>.md`
  (step 4; `test-runner` in `mode: baseline` with `suite: fast` or `suite: full` before the first
  task when no task is `done` and the index has no `dirty:` line, then the `baseline:` line on
  every coder and reviewer dispatch) and `baseline-close.<value>.md` (the `baseline:` line on the
  final `test-runner`, the `KNOWN:`/`BASELINE: none` summary lines); each pair differs only in the
  `suite:` line, `off` has no file. `bootstrap.sh` rewrites a `true`/`false` to `full`/`off` only
  in a file below the template's schema, or one it moves out of column 0.
  The report is `<dir>/work/tests-baseline.md`; `test-runner`'s `mode:`/`baseline:`/`suite:`
  input lines, `BUILD: failed`, `KNOWN:` and `BASELINE: none` returns are one loop with those
  fragments. A `fast` baseline holds no integration failure, so a changed adapter's integration
  test failing before the build shows as new in the final run.
  `task-coder` and `task-reviewer` read `baseline:` as their own input line. The repair coder and
  `final-review.true.md` get no `baseline:` line.
- `.claude/viber.local.yml` is a personal, git-ignored overlay that only `config.sh` reads. It
  replaces exactly `tiers.min`, `tiers.max`, `build.baseline-tests` and `github.issues` in the
  block, in `viber.yml`'s group layout; an invalid value leaves the shared one and the
  min-above-max reset runs on the merged range. `--branching`, `session-start.sh`, `plan-path.sh`
  and `archive-run.sh` never read it, `/viber:setup` never creates it (no `schema:`) and
  `bootstrap.sh`'s merge never touches it: `bootstrap.sh` only appends its `.gitignore` entry, on
  its own report line. With the file present the block's second line is
  `# local: <overridden> | ignored: <ignored>`; `<overridden>` names a key that held a valid local
  value even when the reset then printed the defaults. A local group child counts only at the
  indentation of its group's first key line. Making another key overridable changes `config.sh`'s
  `local_prog` and merge, the template's local-file paragraph, `README.md` and `help.html`.
- `planning.fast-path` reaches `intent`, not planning: `skills/intent/fragments/fast-path.true.md`, preloaded
  at the sizing step, is the whole third branch (design in chat, the session builds after an
  explicit yes, `test-runner` proves it, `/viber:commit` suggested, no plan file, no run
  directory). Its 2 tasks with code / 5 in total limits are fixed there. Change together: the
  fragment's branch conditions, `intent`'s no-code line, `hooks/content/manifest.md`'s plan-rule
  exception, the `test-runner` description naming `intent` as a caller, and both flow SVGs.
