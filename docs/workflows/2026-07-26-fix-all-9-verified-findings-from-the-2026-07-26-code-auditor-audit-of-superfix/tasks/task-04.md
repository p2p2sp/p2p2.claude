
## Task 4 - fix(superfix): warn on C-quoted tracked paths and stop over-counting dependents
- Covers: criteria #5, #6
- TDD: none

### Dependencies
- Task 3 - blocks: shares `collect_edges.sh`

### Files
- modify - superfix/skills/code-auditor/scripts/collect_signals.sh (the pass-2 `KEPT_EXTS` `awk` filter, the `dependents` `git grep -lI`, header comment)
- modify - superfix/skills/code-auditor/scripts/collect_edges.sh (the pass-2 `KEPT_EXTS` `awk` filter inside `raw_pairs`, header comment)

### Test Commands
*Build*
- `cd /Users/dario/Projects/p2p2.claude && bash -n superfix/skills/code-auditor/scripts/collect_signals.sh && bash -n superfix/skills/code-auditor/scripts/collect_edges.sh; echo exit=$?` - `exit=0`

*Tests*
- `cd /Users/dario/Projects/p2p2.claude && rm -rf .temp/superfix-fix/t4 && mkdir -p .temp/superfix-fix/t4 && cd .temp/superfix-fix/t4 && git init -q . && git config user.email t@t.t && git config user.name t && printf 'hello\n' > 'plain.md' && printf 'hello\n' > 'quote".md' && printf 'hello\n' > 'back\slash.md' && git add -A && git commit -qm init && bash ../../../superfix/skills/code-auditor/scripts/collect_signals.sh 30 . 2>&1 >/dev/null | grep -c 'quoted path'` - prints `2`
- `cd /Users/dario/Projects/p2p2.claude/.temp/superfix-fix/t4 && bash ../../../superfix/skills/code-auditor/scripts/collect_edges.sh . 2>&1 >/dev/null | grep -c 'quoted path'` - prints `2`
- `cd /Users/dario/Projects/p2p2.claude && rm -rf .temp/superfix-fix/t4b && mkdir -p .temp/superfix-fix/t4b && cd .temp/superfix-fix/t4b && git init -q . && git config user.email t@t.t && git config user.name t && printf 'café is here\n' > 'café.md' && printf 'plain is here\n' > 'plain.md' && git add -A && git commit -qm init && bash ../../../superfix/skills/code-auditor/scripts/collect_signals.sh 30 . --with-dependents | grep 'café'` - the record shows `"dependents":0` (the file body must carry the accented stem, or the probe matches nothing and the assertion passes vacuously)
- `cd /Users/dario/Projects/p2p2.claude && bash superfix/skills/code-auditor/scripts/collect_signals.sh 90 superfix --with-dependents 2>/dev/null | wc -l` - prints `15`, the file count this sweep has always returned for `superfix/` (no-regression baseline)

### Approach
1. Add a first rule to both pass-2 `awk` filters: a line whose first character is `"` is a C-quoted path (git quotes for `"`/`\` regardless of `core.quotePath=false`), whose parsed extension becomes `md"` and fails the kept-extension test - which is exactly where it disappears today. Print one warning naming the raw line to `/dev/stderr` (the `> "/dev/stderr"` form already used in `collect_edges.sh`'s pairing `awk`), wording containing `quoted path`, then `next`. The guard must sit before the extension test so extensionless quoted paths warn too.
2. Leave the loops' `[ -f "$f" ]` guards untouched - no quoted line reaches them any more.
3. Add `-c core.quotePath=false` to the `git grep -lI` call that computes `dependents`, so its output is comparable with the raw `$f` the `grep -vxF` self-exclusion filters on.
4. Update both header comments: name the quoted-path case in the edge-case list as a warn-and-skip at the awk stage, and note that `esc()` therefore never sees a quote or backslash today.

### Edge cases
- A non-ASCII path stays swept (already handled by `core.quotePath=false`) and must not trigger the new warning.
- A repo with zero quoted paths and no non-ASCII basenames produces byte-identical output to before this task. A non-ASCII basename is the one intended difference: step 3 flips its `dependents` from the inflated value to the correct one.

### Contracts
- Emitted JSONL schema unchanged; one new stderr warning class shared by both sweeps.

### DoD
Both sweeps warn twice on the quoted-path fixture, the non-ASCII fixture reports `dependents:0`, and the
`superfix/` sweep still emits its 15 records.


### Covered criteria
5. A tracked path that git C-quotes (`"` or `\` in the name) produces one stderr warning naming it, in both
   `collect_signals.sh` and `collect_edges.sh`, instead of vanishing silently at exit 0.
6. `dependents` for a non-ASCII filename that only mentions its own stem is 0, not 1.
