# Task 1 - Add the adr skill and register it

Both files under `### Files` were touched, every Approach step delivered as written, the lint returns `FAIL=0 WARN=0` and all five test commands plus the failure-mode test pass.

UNDERSPECIFIED: offer sequencing - the task pins one plain-prose message per qualifying decision but not the order; the skill judges and offers one decision at a time and waits for the answer before the next, matching the `intent` skill's one-question-per-turn discipline.
UNDERSPECIFIED: section heading level - the task names the sections `# Input`, `# Judge`, `# Offer`, `# Block shape`, `# Output`; written literally as level-1 headings (precedent: `superdev/skills/executor/SKILL.md`, which carries five of them).
UNDERSPECIFIED: what else may appear inside the fenced ADR body - the task lists only the conditional `status: accepted` frontmatter, `## Considered Options` and `## Consequences`; added one closing bullet forbidding everything else (no date, no status line in the plain case, no link back to the interview, no rejected option the user did not ask to keep), so the mandatory shape of criterion 3 stays the heading plus 1-3 sentences.
