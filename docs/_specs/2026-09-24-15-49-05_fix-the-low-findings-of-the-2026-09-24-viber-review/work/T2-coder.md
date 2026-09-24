# T2 - coder notes

- The heredoc `read -r ... <<PAIR ... PAIR` fed `read` the awk pipeline's stdout; a
  broken/absent `awk` produced empty stdin, and `${var:-0}` silently collapsed that
  into the same "0 0 0" triple a legitimate "no dispatch found" case prints - so a
  script-dependency failure read as a normal deny instead of failing open.
- Fix: capture the awk output raw (`pair_raw="$(...)"`), validate it with
  `grep -qE '^[0-9]+ [0-9]+ [0-9]+$'` before trusting it, `emit_allow` on any
  mismatch (empty, partial, non-numeric), then split the validated triple with
  `set -- $pair_raw` (word-splitting on known-safe digit/space content) - no
  heredoc, no here-string. A here-string (`<<<`) was also ruled out: the task's own
  `grep -nE '<<[^<]'` check flags it too (`<<<"x"` contains a `<<` immediately
  followed by a non-`<` char), so word-splitting via `set --` was the only
  heredoc-free way to populate three separate variables in the current shell
  (a `printf | read` pipeline would lose the assignment in a subshell).
- New test uses `withStub("awk", "exit 1", ...)` + `runScript(..., { stubDirs })`
  to put a failing awk first on PATH, confirmed RED (deny) before the fix, GREEN
  (allow) after.
- Scope check: `merge-settings.sh`'s heredoc lives in T4's Files, not this task's;
  left untouched.
