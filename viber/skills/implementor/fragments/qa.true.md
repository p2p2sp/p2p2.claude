- `viber:qa-writer` with `spec: <dir>/spec.md`, `notes: <dir>/work/`, `refs: ${CLAUDE_PLUGIN_ROOT}/references` and `out: <dir>`.

QA paths, the `FILES:` of `VERDICT: WRITTEN` or `VERDICT: KEPT`, commit through `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" --qa "<plan>" "<file>" ["<file>"...]`. No `FILES:` line, or only `VERDICT: NONE` -> no call.

A `qa.md` among the QA paths, once its `--qa` commit exited 0, is posted to the branch's pull request through `"${CLAUDE_PLUGIN_ROOT}/scripts/qa-comment.sh" "<the qa.md path>"`, with no `--pr` and no question, one call, never retried. Its stdout and exit carry to the final summary:

- `STATUS=posted` -> its `COMMENT_URL=` value.
- `STATUS=skip` with `REASON=no-gh` or `REASON=no-repo` -> one line naming that reason.
- `STATUS=skip` with `REASON=no-pr` or `REASON=exists` -> nothing.
- Exit 1 or 2 -> one line with its `ERROR` text.

No `qa.md` among the QA paths, or its `--qa` commit left uncommitted -> no call. A `qa.e2e.md` is never posted.

A `qa.e2e.md` among the QA paths earns one more line in the final summary: `/viber:e2e` turns it into Playwright tests.
