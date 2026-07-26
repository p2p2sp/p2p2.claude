
## Task 5 - fix(superfix): make the detective's clean-checkout recipe collision-safe
- Covers: criteria #10
- TDD: none

### Dependencies
- none

### Files
- modify - superfix/agents/detective.md (frontmatter `tools:`, `## Inputs you are given`, `## Method`, `## Hard rules`)
- modify - superfix/skills/code-auditor/references/synthesis.md (`## Clean-checkout verification (anti-self-poisoning)`)

### Test Commands
*Build*
- none - agent prompts and references ship as markdown

*Tests*
- `grep -n 'worktree' superfix/agents/detective.md superfix/skills/code-auditor/references/synthesis.md` - expect no `--force` in either recipe and the same placeholder name in both
- `grep -n 'prune\|already registered\|not a working tree' superfix/agents/detective.md` - expect recovery guidance for both stale states
- `grep -n '^tools:' superfix/agents/detective.md` - expect no `Edit`
- `sed -n '/## Hard rules/,$p' superfix/agents/detective.md | grep -n 'inside the target'` - expect the no-write rule present
- in a scratch repo, run `git worktree add /tmp/sfx-t5-a HEAD` twice - confirm the recovery line documented in the recipe clears the second failure

### Approach
1. Add an explicit entry to `## Inputs you are given`: a unique verification-worktree path supplied by the caller, and state that the detective must not invent one.
2. Rewrite the `## Method` step-3 recipe to use that supplied path, remove `--force` from the removal line, and add the two recovery cases with the command that clears each - stale registration (`missing but already registered worktree`, cleared by `git worktree prune`) and orphaned directory (`already exists` plus `not a working tree`, cleared by removing the directory).
3. Note in the recipe that the worktree contains the whole repository, so an audited subtree sits under it at the target's own relative path.
4. Replace the recipe in `references/synthesis.md` with that exact text and placeholder so the two copies cannot drift again.
5. Remove `Edit` from the frontmatter `tools:` - the detective's only legitimate write is its report, which `Write` covers - and add a hard rule forbidding any write inside the target tree, since all detectives share one working tree and one stray edit poisons every sibling's reads.

### Edge cases
- A detective that reaches a finding without needing a worktree must not be forced to create one.
- The cleanup line must be safe to run when the worktree was never created.

### Contracts
`detective.md` gains one required input: the verification-worktree path. Supplying it is `SKILL.md` Phase 4's job, covered in Task 7.

### DoD
All five Test Commands pass, and the two recipes are textually identical.


### Covered criteria
10. The clean-checkout recipe in `agents/detective.md` uses a caller-supplied unique path, carries no `--force`, includes recovery guidance for the stale-registration and orphaned-directory states, and is textually identical to the copy in `references/synthesis.md`; the detective declares no `Edit` tool and carries a hard rule against writing inside the target tree.
