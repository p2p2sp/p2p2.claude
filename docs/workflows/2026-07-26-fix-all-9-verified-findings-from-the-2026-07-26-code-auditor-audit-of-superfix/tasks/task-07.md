
## Task 7 - fix(superfix): make the clean-checkout recipe survive its own verification
- Covers: criteria #9
- TDD: none

### Dependencies
- none

### Files
- modify - superfix/agents/detective.md (the `## Method` step 3 worktree block and its recovery list)
- modify - superfix/agents/critic.md (the same block under `## Method`)
- modify - superfix/skills/code-auditor/references/synthesis.md (`## Clean-checkout verification (anti-self-poisoning)` block)

### Test Commands
*Build*
- `cd /Users/dario/Projects/p2p2.claude && grep -c 'git worktree remove --force' superfix/agents/detective.md superfix/agents/critic.md superfix/skills/code-auditor/references/synthesis.md` - each at least `1`

*Tests*
- `cd /Users/dario/Projects/p2p2.claude && grep -c 'contains modified or untracked files' superfix/agents/detective.md superfix/agents/critic.md superfix/skills/code-auditor/references/synthesis.md` - each at least `1`
- `cd /Users/dario/Projects/p2p2.claude && grep -n 'git worktree remove' superfix/agents/detective.md superfix/agents/critic.md superfix/skills/code-auditor/references/synthesis.md | grep -v -- '--force' | wc -l` - prints `0`
- `cd /Users/dario/Projects/p2p2.claude && rm -rf .temp/superfix-fix/t7 && mkdir -p .temp/superfix-fix/t7 && cd .temp/superfix-fix/t7 && git init -q . && git config user.email t@t.t && git config user.name t && printf 'x\n' > f.md && git add -A && git commit -qm init && git worktree add wt HEAD >/dev/null 2>&1 && printf 'poc\n' > wt/poc.txt && git worktree remove --force wt; echo exit=$?` - `exit=0`, proving the documented command works with replay artifacts present

### Approach
1. In all three files, change the cleanup line of the recipe to `git worktree remove --force <verify-worktree-path>` and add one sentence: the replay leaves untracked artifacts, which a bare `remove` refuses.
2. Add a recovery rung: `fatal: ... contains modified or untracked files` -> re-run with `--force`; if that still fails, `rm -rf <verify-worktree-path>` then `git worktree prune`, then retry `git worktree add`.
3. Reorder the existing `already exists` rung so it points at the `--force` removal, keeping the orphaned-directory (`is not a working tree`) rung intact.
4. Keep the three copies semantically identical, table-free, and in each file's existing indentation.

### Edge cases
- Artifacts that are gitignored: bare `remove` would have succeeded; `--force` is still correct and idempotent.
- A worktree already gone from disk but still registered: the `prune` rung still applies.

### Contracts
- none

### DoD
All three files carry `--force` on every `git worktree remove`, both new ladder rungs are present, and the
scratch-repo command exits 0 with a PoC artifact in the worktree.


### Covered criteria
9. The clean-checkout recipe in `detective.md`, `critic.md` and `synthesis.md` uses
   `git worktree remove --force`, and its recovery ladder carries a rung for
   `contains modified or untracked files`.
