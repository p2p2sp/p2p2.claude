
## Task 1 - fix(superfix): anchor the clean-checkout recipe to the audited repo
- Covers: criteria #1
- TDD: none

### Dependencies
- none

### Files
- modify - superfix/agents/detective.md (`## Inputs you are given`, `## Method` step 3)
- modify - superfix/agents/critic.md (`## Inputs you are given`, `## Method` step 2)
- modify - superfix/skills/code-auditor/references/synthesis.md (`## Clean-checkout verification (anti-self-poisoning)`)
- modify - superfix/skills/code-auditor/SKILL.md (Phase 4 dispatch bullet, Phase 5 step 1)

### Test Commands
*Build*
- none - markdown-only change; this repo has no build step.

*Tests*
- `rm -rf .temp/superfix-fix/t1 && mkdir -p .temp/superfix-fix/t1/host .temp/superfix-fix/t1/target/src && git init -q .temp/superfix-fix/t1/host && printf 'host\n' > .temp/superfix-fix/t1/host/host.txt && git -C .temp/superfix-fix/t1/host add -A && git -C .temp/superfix-fix/t1/host -c user.email=t@t -c user.name=t commit -qm init && git init -q .temp/superfix-fix/t1/target && printf 'x\n' > .temp/superfix-fix/t1/target/src/app.py && git -C .temp/superfix-fix/t1/target add -A && git -C .temp/superfix-fix/t1/target -c user.email=t@t -c user.name=t commit -qm init && git -C "$PWD/.temp/superfix-fix/t1/target" worktree add --detach "$PWD/.temp/superfix-fix/t1/wt" HEAD >/dev/null && test -f .temp/superfix-fix/t1/wt/src/app.py && echo ANCHORED-OK` - expect ANCHORED-OK (the anchored form checks out the target repo, not the host repo the cwd sits in).
- `git -C "$PWD/.temp/superfix-fix/t1/target" worktree remove --force "$PWD/.temp/superfix-fix/t1/wt" && rm -rf .temp/superfix-fix/t1 && echo CLEANUP-OK` - expect CLEANUP-OK.
- `grep -c 'git -C <target-root> worktree add --detach' superfix/agents/detective.md superfix/agents/critic.md superfix/skills/code-auditor/references/synthesis.md` - expect 1 for each of the three files.
- `grep -c 'git -C <target-root> worktree remove --force' superfix/agents/detective.md superfix/agents/critic.md superfix/skills/code-auditor/references/synthesis.md` - expect a non-zero count for each file.
- `grep -c 'git -C <target-root> worktree prune' superfix/agents/detective.md superfix/agents/critic.md superfix/skills/code-auditor/references/synthesis.md` - expect a non-zero count for each file (the recovery blocks are anchored too).

### Approach
1. In `superfix/agents/detective.md`, extend the `job.md` input bullet to state that `job.md` carries `Target root:` - the repo every worktree command must be anchored to - and change the worktree-path bullet to say the supplied path is absolute.
2. In the same file's `## Method` step 3, rewrite the fenced recipe as `git -C <target-root> worktree add --detach <verify-worktree-path> HEAD` / `git -C <target-root> worktree remove --force <verify-worktree-path>`, and prefix `git -C <target-root>` onto every git command inside the two recovery blocks (`prune`, `remove --force`, `add`). The recovery retries keep their existing wording - a bare `git -C <target-root> worktree add` with no `--detach` - so `--detach` appears exactly once per file, on the recipe line.
3. Add one sentence under the recipe: `<target-root>` is the `Target root:` from `job.md`; substitute both placeholders literally in every command (shell variables do not persist between tool calls), because without `-C` git operates on whatever repo the session cwd sits in and silently checks out the wrong tree.
4. Leave untouched the prose sentence explaining that a bare `git worktree remove` refuses to delete untracked artifacts - it describes why `--force` is needed and is not a command to run.
5. Apply steps 1-4 to `superfix/agents/critic.md` (`## Inputs you are given`, `## Method` step 2) and to the `## Clean-checkout verification (anti-self-poisoning)` section of `superfix/skills/code-auditor/references/synthesis.md`, keeping the git command lines identical across all three copies so future drift is diffable. Do NOT homogenise the surrounding comment: `critic.md` replays "the claimed reproduction" while `detective.md` and `synthesis.md` replay "your PoC", and each is correct for its reader.
6. In `superfix/skills/code-auditor/SKILL.md`, change the Phase 4 dispatch bullet and the Phase 5 step 1 sentence to hand each detective and critic an absolute verification-worktree path.

### Edge cases
- Audited root is a subdirectory of a larger repo (this repo's own case): `git -C <subdir>` still resolves the enclosing repo - the recipe must not assume the target root is a repo root.
- A relative worktree path passed with `-C` would resolve INSIDE the audited tree; the absolute-path requirement in step 6 is what prevents that.
- The recovery blocks are part of the same defect: an unanchored prune or remove in recovery re-introduces the bug on the retry path.
- `rm -rf <verify-worktree-path>` in the recovery blocks is a filesystem call, not a git call - it stays unanchored and unchanged.

### Contracts
`job.md` already carries `Target root: <path>` (written by SKILL.md Phase 0 step 5); this task consumes it, it does not change it. The caller-to-agent handoff gains no new field - only the requirement that the worktree path is absolute.

### DoD
All three recipe copies are anchored with identical git command lines, every git command in the recipes and their recovery blocks carries `git -C <target-root>`, and the cross-repo test prints ANCHORED-OK.


### Covered criteria
1. Every verification-worktree command in `detective.md`, `critic.md` and `synthesis.md` is anchored with `git -C <target-root>`; running the recipe from a directory whose repo is NOT the audited repo yields a worktree of the audited repo, with the audited file present.
