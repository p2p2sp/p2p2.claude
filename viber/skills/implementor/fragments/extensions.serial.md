Run the project's own extensions, once every writer above has returned and the commits of its returns have landed. Skip this step, completing its `Run extensions` entry, when the build ended on `abort`.

The extensions are the config block's `build.extensions:` names the index's `closed:` line does not name as `extension:<name>`. The `Run extensions` entry's `TaskUpdate` -> completed lands once every extension has returned and its commit, if any, has run, or at once when there is none.

Dispatch each extension by its bare agent name (Agent tool, no `model`) carrying these labelled lines and nothing else:

```
run: <dir>
spec: <dir>/spec.md
notes: <dir>/work/
out: .temp/viber/extension-<name>/
```

Dispatch the extensions one at a time, in listed order, each only once the previous one has returned and its commit, if any, has run.

- `VERDICT: WRITTEN` -> `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" --extension "<plan>" "<name>" "<file>" ["<file>"...]` with its `FILES:` paths, one call per message, never beside another `commit-task.sh` call.
- `VERDICT: NONE` -> no commit, nothing recorded.
- `VERDICT: FAIL` -> its `REASON:` goes to the final summary with that extension's name, no retry, no arbiter, no question.
- An agent type the harness reports as not found -> that name goes to the final summary with the hint to reload the session so the harness loads the new agent file, no retry, no arbiter, no question.
- `VERDICT: DENIED` -> `AskUserQuestion` naming that extension: retry / accept / abort.
- A reply with no `VERDICT:` line gets the one reminder above, then counts as `VERDICT: FAIL`.
- An `--extension` call exiting non-zero -> its paths named uncommitted in the final summary, no retry, no arbiter, no question.

A `FAIL`, a not-found agent type and a refused commit never stop the archive. Every `build.extensions-missing:` name other than `none` goes to the final summary as a listed extension with no agent file, also when no extension is dispatched. Every outcome above reaches the final summary.
