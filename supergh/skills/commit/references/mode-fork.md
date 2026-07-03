The user asked to commit in the staging mode named on the **staging mode** line injected directly above — no per-file analysis, no branch question. Just do the instructions below.

1. **Delegate to `supergh:agent-committer`** via the `Skill` tool with a fully-specified handoff:
- **staging mode** — pass the mode from the injected line verbatim: `all` or `index`. The committer hands it to `commit.sh`, which does the staging (`git add -A` for `all`, nothing for `index`).
- optional **one-line intent hint** — what this change does, carrying any `#N` / close-intent ("closes #42", "fixes #17") you can read from this session. It is a hint, not a subject — the committer authors the subject itself from the diff.

2. **Verify the commit landed — do NOT trust the committer's line.** Run:
   `sh "${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/verify-landed.sh" "<head-before>" "<mode>"`
- `<head-before>` = the value in the `<head-before>` block injected in the skill body (verbatim; do NOT re-run `git rev-parse`).
- `<mode>` = the injected staging mode (`all` or `index`).
- The script derives the result from git (HEAD before vs after) and IGNORES whatever the committer reported.

3. **Act on the script's line:**
- `✓ … (N files)` or `nothing to commit` → relay that line to the user verbatim. Done.
- `not-landed` → the committer never committed (fabricated its line, or a real git-level failure occurred — `verify-landed.sh` cannot tell the two apart by design, see its own header). Re-delegate to `agent-committer` ONCE more with the same handoff, then re-run `verify-landed.sh` with the SAME `<head-before>`. If it still returns `not-landed`: **STOP — do not call the `Skill` tool for `agent-committer` again for this commit, under any circumstance.** Reply `error: commit did not land after retry`; if the second `agent-committer` call's relayed line was non-empty, append it verbatim as a non-authoritative diagnostic hint: `error: commit did not land after retry (last attempt reported: <relayed line>)`. This one-retry cap is enforced by this instruction alone, not by a script — nothing stops a third `Skill` call except following "STOP" above exactly; treat it as absolute.

4. Do not summarize or analyze on your own.
- NEVER explain, question, analyze or user intent to commit in mode `all` or `staged` files. If user want it then do it in silence.
- Never propose or start a new branch.
