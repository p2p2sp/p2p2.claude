Merged the "unit test keeps real collaborators" rule into the existing heavy-collaborator
stubbing bullet in test-strategy.md rather than adding a new bullet, per the repo's
instruction-editing.md convention (extend an existing rule in place when the new
requirement is a variant, not a brand-new rule).

test-strategy.md now states up front which C2 layers it writes ("unit" and "component")
and points to integration-tests.md for "integration", since the file no longer covers
all layers implicitly.

Byte budgets were tight only for test-strategy.md (3009/3300); trimmed wording rather
than dropping content when a draft ran over.

Other coders working in parallel on this same run touched viber/PRODUCT.md,
agents/planner-review.md, task-coder.md, task-reviewer.md and skills/planner/SKILL.md
during this session (T4/T5 files) - untouched by this task, left as-is.
