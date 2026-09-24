### T16 coder notes

- Handoff's new `## Out of scope` entry mirrors `qa.md`'s criterion-citation style
  (`#<n> <criterion text>`) since the handoff is machine-facing and criteria are cited that way
  everywhere else in the template (`Covers:`), rather than `qa.md`'s free-text bullet.
- Placed the new section after `## Not automatable`, before the separately-documented
  `## Automation` section (which is appended post-build by `e2e-writer`, not part of the written
  template block) - keeps the fixed-order list in the prose sentence right below the template
  accurate without touching that sentence's wording beyond what DoD required.
- Opening line now reads "the build's own run directory" with no path, matching the wording
  `qa-writer.md` already uses for the same concept ("the run directory both documents land in").
- `e2e-writer.md` routes only on `## UI scenarios` / `## API scenarios` / `## Not automatable` /
  `## Automation`; it never reads `## Out of scope`, so it needed no edit and stayed out of Files.
