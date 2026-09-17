## Runs
- grep -q '^name: e2e-writer' superdev/agents/e2e-writer.md && grep -q 'playwright-cli' superdev/agents/e2e-writer.md && grep -q 'VERDICT: BLOCKED' superdev/agents/e2e-writer.md -> exit 0

Failure mode 2 (`npx playwright test` cannot start) says nothing about the generated file; the agent
deletes it there too, so all three red exits leave no unverified spec in the host tree - criterion 13
allows only a locally green file to survive into the commit.

Added beyond Approach 3: the reachability probe runs for `api` entries as well, before the test run, not
only before the first snapshot. Without it an unreachable application reads as "every step executed and
the assertion is false" and produces a false `blocked` line in the handoff.

Added beyond Approach 3: `playwright-cli --help` is called once before the first open, because no file in
this repo pins that CLI's subcommand set; `open` / `snapshot` / `click` / `fill` are given as the
reference set, not as flags to assume.

Added beyond Approach 3: the spec file is the agent's only write into the host tree - no shared helper, no
edit to an existing one, no config or `package.json`. Criterion 14 fixes the E2E commit's declared set to
generated specs plus the handoff, and Task 7 builds that set from `FILE:` lines alone, so any second file
the agent wrote would be committed by nobody.

Approach 3 says "following the host conventions found in `memory` and `rules`"; the agent scopes those to
the file's contents and keeps `<qa-id>-<slug>.spec.ts` as the name whatever the host's naming rule is -
the ID has to stay readable in the path the status line records.

UNDERSPECIFIED: slug rule for `<spec-dir>/<qa-id>-<slug>.spec.ts`. `qa-format.md`'s worked example
(`qa-02-odrzucenie-bez-powodu.spec.ts`) truncates without stating a rule. Decided: ID lowercased,
title lowercased, diacritics folded to ASCII, other character runs collapsed to one hyphen, trimmed on a
word boundary to roughly forty characters.

UNDERSPECIFIED: error shape for a field the entry leaves `unknown` that no source resolves. Not in
`### Failure modes`, and the two alternatives are guessing a locator or looping. Decided
`VERDICT: FAIL`, `REASON: unresolved <field> for <id>`, nothing written - the ID stays pending, so the
next run retries it after the operator fills the gap.

UNDERSPECIFIED: what a `npx playwright test` call cut off at its own tool timeout means. Approach 4 asks
only for "an explicit generous timeout". Decided the implementor-agent rule: re-run once with a larger
timeout, a second cut-off is `VERDICT: FAIL` with the file deleted - never classified as red.

UNDERSPECIFIED: the mechanics of appending one status line. `qa-format.md` fixes the text but not the
edit. Decided three `Edit` cases (rewrite the ID's existing line / extend the section's last line /
extend the file's last non-empty line with the whole section), never a full-file rewrite, plus a read-back
check that exactly one line names `id` and every other line is unchanged.

---

# Fix round 1 (task-06-review-1.md)

## Runs
- grep -q '^name: e2e-writer' superdev/agents/e2e-writer.md && grep -q 'playwright-cli' superdev/agents/e2e-writer.md && grep -q 'VERDICT: BLOCKED' superdev/agents/e2e-writer.md -> exit 0

C1: fixed - no test: the change is prose in an agent prompt; `tests/` runs `node --test` over bundled scripts only and has no harness that executes an agent's branches
C2: fixed - no test: same - no executable surface for an agent prompt branch
I1: fixed - no test: same - no executable surface for an agent prompt branch

touched: superdev/agents/e2e-writer.md
