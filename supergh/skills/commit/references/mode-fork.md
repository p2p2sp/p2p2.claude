The user asked to commit in the staging mode named on the **staging mode** line injected directly above — no per-file analysis, no branch question. Just do the instructions below.

1. **Delegate to `supergh:agent-committer`** via the **Skill** tool with a fully-specified handoff:
- **staging mode** — pass the mode from the injected line verbatim: `all` or `index`. The committer hands it to `commit.sh`, which does the staging (`git add -A` for `all`, nothing for `index`).
- optional **one-line intent hint** — what this change does, carrying any `#N` / close-intent ("closes #42", "fixes #17") you can read from this session. It is a hint, not a subject — the committer authors the subject itself from the diff.
2. **Verify the commit landed — do NOT trust the committer's line.** Run:
   `sh "${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/verify-landed.sh" "<head-before>" "<mode>"`
- `<head-before>` = the value in the `<head-before>` block injected in the skill body (verbatim; do NOT re-run `git rev-parse`).
- `<mode>` = the injected staging mode (`all` or `index`).
- The script derives the result from git (HEAD before vs after) and IGNORES whatever the committer reported.
3. **Act on the script's line:**
- `✓ … (N files)` or `nothing to commit` → relay that line to the user verbatim. Done.
- `not-landed` → the committer never committed (fabricated its line). Re-delegate to `agent-committer` ONCE more with the same handoff, then re-run `verify-landed.sh` with the SAME `<head-before>`. If it still returns `not-landed`, reply exactly `error: commit did not land after retry`. Do not retry a second time.
4. Do not summarize or analyze on your own.
- NEVER question, analyze or explain user intent to commit `all` or `staged` files. If the user wants it then do it without doubts.
- Never propose or start a new branch.
