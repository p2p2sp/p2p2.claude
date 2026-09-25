Merged the planner's two identical branch-question paragraphs (draft-path copy before "Go to
step 3", full-plan copy after `plan-index.sh`) into one, kept in the full-plan's position (after
the ADR/`plan-index.sh`/show-path text, before "## 3. Review gate"). The draft-stop sentence now
reads "the branch question below still applies" instead of repeating the question inline, and the
merged paragraph's gating clause reads "once `plan-index.sh` has passed, immediately for a draft
since it never runs one" so both paths satisfy the same condition. Its closing sentence branches
explicitly: "A plan stopping at a draft goes to step 3 next; every other plan dispatches the
review below." Every AskUserQuestion condition and the frontmatter-write sentence from both
originals survived verbatim except "this draft's frontmatter" -> "the plan's frontmatter" (a
draft is also a plan file, so this is not a behavior change).
