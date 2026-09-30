# Tool dependencies

Read before touching `triage`, `intent`, `fixer`, `prototype`'s issue calls, `e2e`'s Playwright
install, `setup`'s merge tool or `code-auditor`'s Node check.

- `triage`, `intent`, `fixer`, `prototype`: `gh`, only through the shared issue scripts in
  `scripts/`; without it each reports the script's `ERROR` line and pasted text still works,
  unpublished. A create or comment exit 1 leaves the landing unknown and is never retried. Each
  such call, plus `planner`'s ADR-task step, runs after a prose question ends the turn, so all
  four rely on the bare `Bash` allow `/viber:setup` installs.
- A multi-line issue body or comment travels only as a file under `.temp/viber/<skill>/` through
  `--body-file`. `intent`'s and `prototype`'s write access there is pre-approved as
  `Edit(./.temp/viber/<skill>/**)`, not `Write(...)`: a file write matches `Edit` rules only.
- `e2e`: `playwright-cli`, `@playwright/test` (chromium only), probed by `check-playwright.sh`;
  the skill installs only once the user agrees.
- `code-auditor`: Node >= 22.6 for its two `.ts` gates, resolved by `check_node.sh`; `NODE_MISSING`
  halts the run before any spend.
- `setup`: `node` only for a merge into an existing target; merge or reset is an
  `AskUserQuestion`: a prose question ends the turn and the pre-approval with it.
