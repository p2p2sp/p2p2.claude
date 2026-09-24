## T3 - coder notes

- Replaced all 5 heredocs (`<<EOT`/`<<EOF`) with `done < <(printf '%s\n' "$var")`.
  Process substitution, unlike a piped `while read`, does not fork a subshell for
  the loop body in bash, so counters set inside (`nodes`, `removed`, `total`,
  `rules_seen`, `undeclared`, `node_out`, `orphan_out`, `dirty_out`) still hold
  after the loop exits - exactly what the heredoc form already gave, just
  without the forbidden syntax.
- Header wording: changed the two "characters" mentions in each script's prose
  to "bytes" (memory-map.sh lines documenting the 12000/32000 budgets and the
  `chars_of` comment; rules-map.sh's 4000/40000 budget lines). Left the
  abbreviated `<chars>` placeholders in rules-map.sh's stdout-format block
  alone - the grep only forbids the literal word "characters", and the test's
  `missingFrom` header check asserts on `<chars>`, not on the word.
- `git status` showed `viber/scripts/plan-path.sh` already modified in the
  working tree (another in-flight task, not T3's) before I started; its test
  file has one pre-existing red case unrelated to heredocs/bytes. Out of scope
  for T3 (not in Files, no Depends-on) - left untouched.
- Both target test files ran unchanged and green: 46/46 across
  memory-map.test.ts and rules-map.test.ts.
