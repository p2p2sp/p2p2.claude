- `fragmentCallViolations(skillMdPath, skillMdContent, fragmentBasenames)` parses `switch-text.sh`
  calls with a single fixed regex (per C1's literal call shape); it strips `'`/`"` from the
  key/name tokens rather than fully shell-parsing, which is what makes planner's
  `branching.""mode` splice (T6's grep-ban workaround) resolve to `branching.mode` for free.
- DoD.1-4 share one pass: an unknown-key call (DoD.2) `continue`s before entering the
  name->call map, so a fragment file that exists only under a since-abandoned/unknown-key call
  also reads as DoD.4 (uncalled) - both fire together on that shape, which is correct, not a
  double-count bug (verified by temporarily stubbing the function to `[]` and watching all four
  DoD self-checks go red before restoring it).
- The exec-bit sweep's corpus (DoD.5) just gets `fragmentFiles` appended alongside
  `skillMdFiles`/`hooksJsonFiles`; `execBitViolations` itself needed no change since it already
  takes a generic `{file, content}[]` corpus - proven by a new self-check plus the widened real
  test, both green with today's already-100755 scripts.
- `git ls-files -s -- "*/fragments/*.md"` is the enumeration used for both the corpus widening and
  the DoD.6 real-tree grouping (by `path.dirname(path.dirname(file))`), consistent with every
  other sweep in this file reading the index rather than the filesystem.
- `viber/references/plan-rules.md` shows modified in the working tree from a parallel task
  (untouched by me, left as found, per T2/T4's own notes on the same condition).
