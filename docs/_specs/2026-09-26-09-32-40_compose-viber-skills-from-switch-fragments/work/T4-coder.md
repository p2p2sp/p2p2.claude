- Step 4's heading and its "(a GitHub issue only)" qualifier stay static in SKILL.md: only the
  four bullets below it (write/close-question/publish/exit-code handling) moved into
  `issues-publish.true.md`. No `.false.md` sibling exists by design (step 4 is unreachable under
  `issues: false` since step 1 stops a GH-shaped argument first) - matches the task's own Files list.
- `issues-next.true.md` keeps both the `#<N>` and one-line-summary next-step forms (both argument
  shapes reach step 3 when issues are on); `issues-next.false.md` keeps the summary form only,
  since a GH argument never reaches report under `issues: false`.
- Verified all three fragment expansions by hand in a scratch git repo with `issues: true` in
  `.claude/viber.yml`, confirming `${CLAUDE_PLUGIN_ROOT}` resolves to the real script paths inside
  the spliced-in text (not the literal token), which is what makes the printed
  `issue-facts.sh`/`post-comment.sh` calls match the pre-approved `allowed-tools` pattern.
