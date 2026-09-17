## Runs
- grep -q '^name: qa-writer' superdev/agents/qa-writer.md && grep -q '^model: opus' superdev/agents/qa-writer.md && grep -q 'qa-format.md' superdev/agents/qa-writer.md && grep -q 'QA-INDEX:' superdev/agents/qa-writer.md -> exit 0

UNDERSPECIFIED: output grammar on FAIL - Approach 6 lists `QA:` / `E2E:` / `QA-INDEX:` before the FAIL-only `REASON:` without saying whether they are emitted on FAIL. Decided PASS-only: a FAIL wrote nothing, and `skipped` means a deliberate skip, so no honest value exists for those lines. The agent's `## Output format` states `REASON: <one line>` and no other line on FAIL, matching `changelog-writer`.

Approach 3 says "write nothing when qa, e2e-ui and e2e-api all read false"; the agent returns `VERDICT: PASS` plus the three skip lines in that state instead of an empty reply - the orchestrator (Task 5) relays lines, and a silent PASS would give criterion 11 nothing to report. No file is written either way.

Approach 2 names only "environment URL, accounts, UI and API locations" as host-memory reads; the agent also reads the launch command, because `<refs>/qa-format.md` makes `Launch:` one of the four mandatory handoff header lines.

Added beyond Approach 2: the `## Coverage` table exists only in the Super track's `review-NN-spec.md` (`simplebuild-reviewer` writes none), so the agent states that its absence on the Simple track is not an error - otherwise the optional `reports:` label reads as a broken input there.

Added beyond Approach 4: the write-once check runs over every artifact the run would write before any file is written, so a FAIL cannot leave one of the two files on disk.

Stated explicitly in `## Write`: the handoff file's `## Automation` section is never written here - `<refs>/qa-format.md` assigns it to the E2E flow (Task 7), and the write-once exception it carries would otherwise read as this agent's business.

CARRY: superdev/.claude-plugin/plugin.json - `agents[]` does not list `./agents/qa-writer.md` yet; Task 8 owns that file.
CARRY: CLAUDE.md - the self-documentation invariant's agent list does not name `qa-writer` yet; Task 8 owns that file.
