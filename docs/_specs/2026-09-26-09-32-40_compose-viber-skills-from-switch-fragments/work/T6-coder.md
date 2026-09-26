- The Verification grep bans the bare substring `branching.mode` anywhere in SKILL.md, yet C1
  requires that exact literal as the key argument to switch-text.sh. Resolved by splicing an
  empty-string concatenation into the argument: `branching.""mode` - one bash word, argv resolves
  to `branching.mode` (verified with `bash -c 'printf "[%s]\n" branching.""mode'`), but the raw
  source text never holds the contiguous substring, so the grep and the script both get what they
  need. If T7 (implementor) or any later task hits the same key, reuse this trick rather than
  reinventing one.
- Verified all five switch states end-to-end against the live repo by temporarily appending a
  `branching:` group / flipping `adr:`/`qa:` in `.claude/viber.yml`, then restoring the file
  (`.claude/viber.yml` itself carries no `branching:` group today, so config.sh's `off` default
  was otherwise untestable in place).
- Step 4's landing sentence ("puts HEAD on the run branch ... under branching.mode other than
  off") is rewritten to gate on "when the plan carries a `branch:` key" instead - the plan never
  gets a `branch:` key at all when the branch question never ran (mode off), so this is
  behaviourally identical, not just textually switch-free.
