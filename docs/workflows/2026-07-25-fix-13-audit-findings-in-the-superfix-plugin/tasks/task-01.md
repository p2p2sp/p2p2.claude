
## Task 1 - fix(superfix): make candidate discovery portable and quote-safe in collect_signals.sh
- Covers: criteria #1, #2, #5
- TDD: none

### Dependencies
- none

### Files
- modify - superfix/skills/code-auditor/scripts/collect_signals.sh (header usage comment, the `for arg in "$@"` flag scan, the `kept_exts` pass-1 pipeline, the pass-2 `awk` candidate filter)

### Test Commands
*Build*
- none - the repo ships source with no build step (root `CLAUDE.md`: "there is no build / test / lint at any level")

*Tests*
- `mkdir -p /tmp/sfx-t1 && cd /tmp/sfx-t1 && git init -q . && printf 'a\n' > readme.md && printf 'b\n' > café.py && printf 'c\n' > 日本語.md && git add -A && git -c user.email=t@t -c user.name=t commit -qm init` followed by `bash /Users/dario/Projects/p2p2.claude/superfix/skills/code-auditor/scripts/collect_signals.sh 30 /tmp/sfx-t1` - expect exit 0, stderr `sweep extensions: md py`, and 3 JSON lines including `café.py` and `日本語.md`
- `bash /Users/dario/Projects/p2p2.claude/superfix/skills/code-auditor/scripts/collect_signals.sh --with-dependents` run with `/tmp/sfx-t1` as the working directory - expect exit 0 and a `dependents` value other than `-1` on every line
- `bash /Users/dario/Projects/p2p2.claude/superfix/skills/code-auditor/scripts/collect_signals.sh 90 /Users/dario/Projects/p2p2.claude` - expect exit 0 and a non-empty JSONL stream

### Approach
1. Replace the `awk -v exts="$kept_exts"` assignment with an environment hand-off: export the list as an environment variable on the `awk` invocation and read it inside `BEGIN` via `ENVIRON`, keeping the existing `split`/`keep[]` membership logic unchanged. The value must never reach a `-v` assignment - macOS system awk aborts on a newline inside one.
2. Add `-c core.quotePath=false` to both `git ls-files` invocations - the pass-1 extension harvest and the pass-2 candidate list - so quoted, C-escaped paths never enter either pipeline. Both call sites must carry it, or the stderr coverage line and the swept set disagree.
3. Rewrite the `for arg in "$@"` flag scan into a loop that removes `--with-dependents` from the positional stream before `WINDOW_DAYS` and `ROOT` are bound, making the header's `[window_days] [repo_root] [--with-dependents]` contract true.
4. Update the header comment block to describe the environment hand-off and the quote-safe listing, so the script's stated I/O contract still matches its behaviour.

### Edge cases
- A repo whose every file of one extension has a non-ASCII name: that extension must still appear in `kept_exts` and in the stderr coverage line.
- Paths containing spaces, and extensionless files (scripts, `Makefile`): both must survive the pipeline unchanged.
- An empty `kept_exts` (a repo of only extensionless files) must not turn the `awk` filter into a match-nothing or match-everything pass.
- Out of scope, and to be stated as such in the header: a path containing a literal newline still breaks the line-based pipeline. `core.quotePath=false` does not address it, and no observed repo has one.

### Contracts
Consumes: the tracked file list from `git ls-files`. Produces: unchanged JSONL shape `{"path","churn","fix_commits","recency_days","loc","dependents"}` on stdout, plus one `sweep extensions: …` line on stderr.

### DoD
All three Test Commands behave as described on macOS with system awk.


### Covered criteria
1. `collect_signals.sh` runs to completion against a multi-extension git repo on macOS/BSD awk: exit 0 and one JSON line per swept file.
2. Files whose paths git quotes under default `core.quotePath=true` (non-ASCII bytes) appear in the sweep output, and their extensions appear in the `sweep extensions:` stderr line.
5. `collect_signals.sh --with-dependents` works with either positional argument omitted, exactly as the script header documents.
