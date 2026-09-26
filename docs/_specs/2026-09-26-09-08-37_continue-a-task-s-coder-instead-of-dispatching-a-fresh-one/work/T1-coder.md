Kept the existing retry/decide/reviewer-FAIL bullets untouched: they already only describe what
data goes into a re-run (reason:/report:/decision:), not the dispatch mechanism, so the new
continuation paragraph in step 4 refines "how" without contradicting them.

The continuation paragraph reuses C1's exact message form verbatim (report:/reason:/decision:
fenced block) so the file states the contract once, matching how the file already presents the
fresh-dispatch lines just above it.

DoD.5 is satisfied by one added clause on the existing no-verdict bullet rather than a new bullet,
per instruction-editing.md - it is a cross-reference to the same rule, not a new one.

No test artifacts: this is a TDD:none docs/instructions task: DoD is proven by grep verification
and a manual re-read of the edited paragraphs for internal consistency, both done.
