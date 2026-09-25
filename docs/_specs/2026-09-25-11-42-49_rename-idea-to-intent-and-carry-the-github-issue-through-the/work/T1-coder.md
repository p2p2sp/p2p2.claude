# T1 coder notes

- Used `git mv` for both scripts so history and the 100755 exec bit carried over untouched (no
  `chmod`/`update-index --chmod` needed - that trick only matters for brand-new files).
- Header wording changed from "for the triage skill" to a generic "for the viber skills that read
  a GitHub issue" / "a viber skill publishes through" - T1 alone does not add intent/fixer as
  callers (that's T7/T8), so the header names the class, not specific skills that don't call it
  yet.
- Left an empty `viber/skills/triage/scripts/` directory on disk; git does not track empty dirs so
  it leaves no diff and nothing needed cleanup.
- Working tree carried unrelated pre-existing modifications (config.sh, plan-index.sh, spec-lite.md,
  viber.yml, their tests) from other parallel tasks in this run - untouched, not part of this diff.
