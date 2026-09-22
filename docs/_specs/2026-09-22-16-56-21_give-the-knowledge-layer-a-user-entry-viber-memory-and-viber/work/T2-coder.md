# T2 - rules-map.sh

- C2 spells the `paths` field and the `matches` field separately, so a `paths: global` rule prints the word in both: `rule: <path> <chars> paths global global ok`. `/viber:rules` (T8) reads field 6 to tell the two shapes apart.
- A rule with no usable `paths:` key reads `paths none matches 0` and makes the state `partial`, but is NEVER `dead`: with no declared scope it is still loaded everywhere, and offering its delete would be wrong.
- No `dead:` line is printed at all when the index tracks nothing (no repository, or nothing committed). Every rule would read dead there, which says nothing about any rule and would invite a reset of the whole layer.
- `dirty:` covers frozen files too. Uncommitted work is a fact about the file, not a score, and "never scored" only binds the budget.
- Reset refusal vocabulary is five words: `not-a-rule`, `frozen`, `missing`, `untracked`, `modified`. `missing` is the split of C2's "not a tracked `.md`" for a path that is simply not there.
- Globs are translated to an ERE (`*` stops at `/`, `**/` is optional directories, `[` `]` are literal) rather than handed to `case`: a shell pattern lets `*` cross a `/` and would hide a dead rule behind a file it never applies to.
- The exec-bit assertion cannot read `git ls-files -s` for a script its own build is creating. `indexMode()` in the suite falls back to what git will record on `add`: the `#!` line on Windows, where `core.fileMode` is false, and the mode bits elsewhere.
