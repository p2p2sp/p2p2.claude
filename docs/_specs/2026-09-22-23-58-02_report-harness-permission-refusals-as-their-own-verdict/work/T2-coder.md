# T2 notes

- Placed each new DENIED branch as a continuation/sibling of the matching FAIL branch (item 1, item 2's sub-bullet, and step 5's bullets) rather than renumbering, so DoD.9 (FAIL paths unchanged) holds by construction.
- The repair-coder DENIED paragraph forward-references the test-run DENIED bullet's accept behavior ("below"); the test-run DENIED bullet backward-references the FAIL branch's accept ("above") - both point at real text, no new accept behavior was invented.
- Retry for coder/reviewer/test-runner/repair-coder never raises tier or round: worded as "the tier unchanged" / "the same report: round" / "the same report round" to make DoD.2/4/6/8 checkable by grep.
- CLAUDE.md invariant bullet placed as the last bullet before `## Anti-patterns`, naming all three emitters, the no-workaround rule and the same-tier retry, matching the file's existing bullet voice.
