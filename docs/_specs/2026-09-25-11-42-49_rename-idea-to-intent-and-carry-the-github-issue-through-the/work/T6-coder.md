# T6 coder notes

- Text-only edit to `viber/skills/planner/SKILL.md`: renamed both `viber:idea` mentions (description
  + input line) to `viber:intent`, added the C6 `Issue:` line to the input contract paragraph, and
  extended the "Write the plan" step to fill/drop the frontmatter `issue:` key exactly like the
  existing `source:`/`into:` sentences do.
- The draft-continuation sentence now says the `issue:` line travels with the rest of the carried
  specification unless a remark changes it, mirroring how `into:` and the spec body are already
  described there - no new paragraph needed.
- `templates/spec-full.md` and `spec-lite.md` already carry the `issue:` frontmatter key from T5;
  this task only had to make the skill body reference it, per its own Files list (SKILL.md only).
- Actual renaming of the `idea` skill directory and building the save/comment issue flow is T7's
  job (`Uses: C1-C4, C6`); out of scope here on purpose.
- `TDD: none`, no test framework touched: DoD proven by the grep verification command only.
