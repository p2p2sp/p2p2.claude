# Tool dependencies

Read before touching `triage`, `intent`, `fixer`, `prototype`'s issue calls, `create-issue`,
`create-pr`, `implementor`'s QA comment, `e2e`'s Playwright
install, `setup`'s merge tool or `code-auditor`'s Node check.

- `triage`, `intent`, `fixer`, `prototype`: `gh`, only through the shared issue scripts in
  `scripts/`; without it each reports the script's `ERROR` line and pasted text still works,
  unpublished. A create or comment exit 1 leaves the landing unknown and is never retried.
  `allowed-tools` pre-approves one turn only, so a call made in a later user turn relies on the
  bare `Bash` allow `/viber:setup` installs: `intent`'s (after its interview), `prototype`'s
  (after its UI rounds), `fixer`'s issue save (after `issue-save.md` asks a required field) and
  `create-issue`'s (after it asks what the issue is about or `issue-save.md` asks a required field).
- `create-issue` and `create-pr`: `gh` as well (`create-pr` also `git push`, in `pr-create.sh`);
  the `STATUS=skip` / `STATUS=stop` reason is stated in one line and nothing is created.
- `implementor`'s build close posts `qa.md` through `qa-comment.sh` (`gh`) with no question: no open
  pull request says nothing, a missing `gh` or repository one summary line, a `gh` failure (exit
  1) its `ERROR` once, never retried.
- A multi-line issue or pull request body or comment travels only as a file under
  `.temp/viber/<skill>/` through `--body-file`. `intent`'s, `prototype`'s, `create-issue`'s and
  `create-pr`'s write access there is pre-approved as
  `Edit(./.temp/viber/<skill>/**)`, not `Write(...)`: a file write matches `Edit` rules only.
- `e2e`: `playwright-cli`, `@playwright/test` (chromium only), probed by `check-playwright.sh`;
  the skill installs only once the user agrees.
- `code-auditor`: Node >= 22.6 for its two `.ts` gates, resolved by `check_node.sh`; `NODE_MISSING`
  halts the run before any spend.
- `setup`: `node` only for a merge into an existing target; merge or reset is an
  `AskUserQuestion`: a prose question ends the turn and the pre-approval with it.
