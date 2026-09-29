# T4 coder notes

- `arbiter.md` lists the C4 input lines as bullets and adds a one-line meaning per case (accept = commit unreviewed, skip = drop with dependents, etc.): T5-T7 must dispatch with exactly those option words.
- On DENIED the agent replaces every line with `VERDICT: DENIED` + `REASON:`, the same shape as `prover` and `plain-plan-review`.
- `WHY`/`COST` are told to avoid double quotes, dollar signs, backticks and backslashes; the recording step still has to rewrite them (spec edge case), the agent line only lowers the rate.
- `plugin.json` places `arbiter.md` after `final-reviewer.md`; the help line sits last in the Build list. T9 still owes the walkthrough prose around it.
