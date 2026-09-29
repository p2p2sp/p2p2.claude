# Switches

- A new switch: `skills/setup/templates/viber.yml` (`bootstrap.sh` appends a key an existing
  config lacks), `config.sh`'s key list and order, `switch-text.sh`'s key allowlist, `README.md`,
  `help.html`, and the consuming skill's `fragments/<name>.<value>.md` (implementor's step 3
  `TaskCreate`s one entry per close part; step 5 preloads `final-review`, step 6 preloads
  `memory`, `rules`, `qa`, step 7 `cleanup`); no skill body branches on a switch,
  `tests/portability.test.ts` sweeps every call.
  `<name>` is per call site (`issues-read`, `qa-e2e`), not the key; only a state that does
  something gets a file. `switch-text.sh` prints nothing for an absent file or unknown key,
  always exits 0, and expands `${CLAUDE_SKILL_DIR}`/`${CLAUDE_PLUGIN_ROOT}` in a fragment
  itself: Claude Code never substitutes preload output.
- Switches reaching planning: `memory` (`plan-rules.md`'s Memory-owned rule, the `memory:` line
  to `planner-review`); `adr: true` (`planner` follows `skills/planner/references/adr-tasks.md`);
  `qa` (`planner`'s e2e hand-off line); `branching.mode` (`CLAUDE.run-branch.md`).
- `fast-path` reaches `intent`, not planning: `skills/intent/fragments/fast-path.true.md`, preloaded
  at the sizing step, is the whole third branch (design in chat, the session builds after an
  explicit yes, `test-runner` proves it, `/viber:commit` suggested, no plan file, no run
  directory). Its 2 tasks with code / 5 in total limits are fixed there. Change together: the
  fragment's branch conditions, `intent`'s no-code line, `hooks/content/manifest.md`'s plan-rule
  exception, the `test-runner` description naming `intent` as a caller, and both flow SVGs.
