# T4 - coder notes

- The tag sits right after the enforced clause, before any rationale that follows it, so the "because ..." tail reads as untagged explanation.
- The `Files` bullet was split: "complete file map" stays untagged (plan-index.sh checks disjoint, never complete); only the format sentence carries `(script)`.
- Left the contract `File:`-opens-the-block rule untagged on purpose: plan-index.sh skips the missing-`File:` check when no block in the appendix carries one (legacy plans), so not every violation is rejected.
- `Exclusive`, heading format and `C<n>`/`T<n>` id order stay untagged: the script checks only the value or the id charset, not the rule as written.
- `Depends-on` "lower-numbered" is tagged per DoD.3, though the script really checks plan position; the two agree only while ids run `T1..Tn` in order, which nothing enforces.
