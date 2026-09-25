# T1 coder notes

- Used `git mv` to relocate the script so history follows it (`git log --follow` still resolves
  the old path); the header edit landed as a separate Edit after the mv, so the working tree
  shows `RM` in `git status` until committed - expected, not a defect.
- Code below the header (`set -u` onward) is untouched byte-for-byte; only the purpose line and
  a new "Callers:" line changed, per DoD.2/3.
- `viber/.claude-plugin/plugin.json` and `viber/agents/prototype-writer.md` already carried
  uncommitted changes from another in-flight task (T2-T6) before I started; I left them alone -
  not in T1's Files list and not touched by this diff.
- Rule files (`shell-preload-contract.md`, `shell-script-header.md`) still name the old
  `skills/setup/scripts/open-page.sh` path; per `Out of scope` these are updated by the build's
  rules close, not T1.
