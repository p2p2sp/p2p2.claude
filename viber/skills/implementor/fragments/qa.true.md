- `viber:qa-writer` with `spec: <dir>/spec.md`, `notes: <dir>/work/`, `refs: ${CLAUDE_PLUGIN_ROOT}/references` and `out: <dir>`.

QA paths, the `FILES:` of `VERDICT: WRITTEN` or `VERDICT: KEPT`, commit through `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" --qa "<plan>" "<file>" ["<file>"...]`. No `FILES:` line, or only `VERDICT: NONE` -> no call.

A `qa.e2e.md` among the QA paths earns one more line in the final summary: `/viber:e2e` turns it into Playwright tests.
