
## Task 2 - fix(superfix): stop the per-file signal loop from truncating or mis-scoring
- Covers: criteria #3, #4
- TDD: none

### Dependencies
- Task 1 - blocks: same file; Task 1 rewrites the loop's input pipeline, so this task builds on it

### Files
- modify - superfix/skills/code-auditor/scripts/collect_signals.sh (the per-file `while` loop: the `churn`, `fix_commits`, `last_ct` and `loc` probes, and the `--with-dependents` `stem` block)

### Test Commands
*Build*
- none - see Task 1

*Tests*
- `mkdir -p /tmp/sfx-t2 && cd /tmp/sfx-t2 && git init -q . && printf 'x\n' > a.md && printf 'y\n' > b.md && git add -A && git -c user.email=t@t -c user.name=t commit -qm init && chmod 000 b.md` followed by the sweep - expect exit 0, a stderr warning naming `b.md`, and a record for `a.md`
- `mkdir -p /tmp/sfx-t2b && cd /tmp/sfx-t2b && git init -q . && printf 'x\n' > a.md && git add -A` (staged, never committed) followed by the sweep - expect a non-zero exit, one explanatory stderr message, and empty stdout
- `mkdir -p /tmp/sfx-t2c && cd /tmp/sfx-t2c && git init -q . && printf 'ig\n' > .gitignore && for i in 1 2 3; do printf 'z\n' > "src$i"; done && git add -A && git -c user.email=t@t -c user.name=t commit -qm init` followed by the sweep with `--with-dependents` - expect `.gitignore` to report `dependents` of `-1` or `0`, never `3`

### Approach
1. Guard each per-file probe (`churn`, `fix_commits`, `last_ct`, `loc`) so a failure on one file emits a stderr warning naming that file and `continue`s to the next, instead of letting `set -euo pipefail` abort the stream mid-write.
2. Detect an unborn HEAD before the loop starts (`git rev-parse --verify -q HEAD`) and exit non-zero with one message - a repo with no commits has no churn, fix or recency data, so a sweep of it would be meaningless rather than merely incomplete.
3. In the `--with-dependents` block, compute `stem` so a leading-dot basename yields the basename itself rather than the empty string, and skip the `git grep` probe entirely when `stem` is empty, leaving `dependents` at `-1`.
4. Extend the header comment's signal descriptions to state the new per-file failure behaviour, the unborn-HEAD exit, and the dotfile rule.

### Edge cases
- A file with no trailing newline keeps its existing `loc` behaviour; the new guards must not change it.
- A tracked-but-deleted path: the existing `[ -f "$f" ] || continue` must still short-circuit before the probes.
- `git grep` returning no match must keep yielding `0`, not abort under `pipefail`.

### Contracts
Unchanged JSONL shape. New: at most one stderr warning line per skipped file, and a documented non-zero exit for the unborn-HEAD case.

### DoD
All three Test Commands behave as described, and a sweep of `/Users/dario/Projects/p2p2.claude` still emits one record per tracked source file at exit 0.


### Covered criteria
3. An unreadable tracked file makes the sweep warn on stderr and continue; an unborn HEAD makes it exit non-zero with one explanatory message and no partial output. Neither truncates the stream silently.
4. Under `--with-dependents` a dotfile such as `.gitignore` does not receive a near-maximal `dependents` count.
