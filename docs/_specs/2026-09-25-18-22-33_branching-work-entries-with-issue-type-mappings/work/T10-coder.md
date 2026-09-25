- BRANCHING.md documents only what T3 already ships (config.sh --branching, run-branch.sh
  branch_expand): mode/work/issue-type-mappings and {type}/{issue-number}/{slug}. It never
  mentions the C4 `work:` frontmatter key or `target:` line - those belong to T4/T5/T8, not yet
  in the tree, and DoD.2 restricts documented keys/placeholders to what the scripts already
  resolve/expand.
- `branching.base`, `branching.name` and `{issue}` appear once each, inside the verbatim
  "Refusal messages" list, quoted as config.sh's own deprecation error text - framed as no
  longer read, never as current. DoD.6 reads as "not as current", not "never the string".
  Verified with grep after writing.
- usage.html got a new `.snippet`/`h4` CSS pair (mirroring `.commit`) since the page had no
  existing block style for a bare, uncaptioned YAML example; reused across all 7 strategy
  examples, English and Polish captions beside each.
- While working, tests/viber/config.test.ts, plan-path.test.ts and viber/scripts/config.sh were
  mid-edit in the working tree from a concurrent task (T4, judging by the diff) - not mine to
  touch or fix. `node --test` on plan-path.test.ts currently shows one red case tied to that
  in-flight work entry/base-missing logic; T10's own Verification is grep-only and passes clean.
