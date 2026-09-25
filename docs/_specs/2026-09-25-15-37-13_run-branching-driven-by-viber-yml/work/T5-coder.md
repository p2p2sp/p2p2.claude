- The branch question had to be written twice in SKILL.md step 2 (once in the draft-stop
  sentence, once after `plan-index.sh`'s run) because a draft literally exits step 2 before the
  ADR/plan-index/show-path paragraphs run - there is no single point both flows pass through
  after the "after plan-index.sh passes, for a plan with tasks" requirement. Both copies say
  "already carries that draft's `branch:` key over (above)" to skip the question on a continuing
  round without duplicating the carry-over rule itself (that lives once, in the existing
  "round continuing a draft" paragraph next to the `issue:` line).
- "a review fix repeats the question only when it changes the branch" is implemented as: re-run
  the C3 report on a fix touching title/issue/`Repro:` lines, and only re-ask if `new:` or the
  offered answers actually changed - anything else leaves the recorded `branch:` key alone.
- Step 4's "forbids running git directly rather than any git at all" is worded as "Never run git
  directly yourself: `plan-path.sh` alone moves HEAD..." - the script's own internal git calls are
  fine, only a direct git call from the skill body is banned.
- No production script changes were needed: `--branch`, `branching.*` config lines and the C4
  exit 6 / `branch:` stdout were already shipped by T3/T4. This task only wrote the calling
  prose and the two templates' frontmatter key.
