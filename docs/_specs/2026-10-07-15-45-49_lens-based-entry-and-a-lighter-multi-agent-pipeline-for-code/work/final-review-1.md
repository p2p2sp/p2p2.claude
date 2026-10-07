# Final review - slice 1 (T1 to T8)

## Blocking

### 1. The security lens's diff-scope signal reads only unstaged edits

- Location: `viber/skills/code-auditor/references/lenses/security.md:60`
- What is wrong: the block labelled "Diff scope only, lines removing a check" is `git diff -- <scope> | grep -E '^-.*(auth|permission|valid|saniti|escape|verify)' | head -30`. A bare `git diff` compares the working tree with the index, so it never shows staged changes or any commit since the diff base. On the diff scope (S3: the files changed since the merge base, plus staged, unstaged and untracked), a removed auth or validation check that was committed on the branch, or only staged, never reaches this signal. A removed check is exactly what the block is there to catch, and it misses most of the diff it is labelled for.
- Consumer proving it: `viber/agents/mapper.md` step 3 runs every bash block of `## Map signals` and only replaces `<scope>`, so it cannot pass the run file's `Base:` to this command. The mapper also has no instruction to skip a "Diff scope only" block, so on the directory and repository scopes the same block reports whatever unstaged edits the user happens to have.
- Fix: make the command cover the whole diff scope. One way is to give the mapper a second placeholder for the base: allow `<base>` in C1 and `lenses.unit.test.ts`, have `mapper.md` step 3 substitute the run file's `Base:` value (`HEAD` when `Base: none` or the scope is not `diff`), and write the block as `git diff <base> -- <scope> | grep ...` (this covers staged and unstaged changes plus commits since the base). Then extend `lens-map-signals.test.ts` to substitute `<base>` too. If a second placeholder is not wanted, at least use `git diff HEAD -- <scope>` (staged plus unstaged) and say in the block's prose that branch commits since the base are not covered. In both cases, also tell the mapper to run this block only when the run file reads `Scope: diff`.
