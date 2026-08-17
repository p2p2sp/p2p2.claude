
## Task 2 - docs(superbiz): document the validator-to-chairman council chain
- Covers: criteria #5, #6
- TDD: none

### Dependencies
- Task 1 - blocks: this task (docs describe the changed behavior)

### Files
- modify - superbiz/CLAUDE.md (layout comment, validator bullet, chairman bullet, closing chain paragraph)
- modify - CLAUDE.md (superbiz bullet in "What this repo is")

### Test Commands
#### Build
- none

#### Tests
- `grep -l 'dispatched only by .council-this. and .business-idea-validator.' superbiz/CLAUDE.md` - expected output: the file path
- `grep -c 'council round' superbiz/CLAUDE.md` - expected: >= 1
- `grep -c 'council round' CLAUDE.md` - expected: >= 1
- `grep -RE '—|–|✅|⚠️|❌' superbiz/CLAUDE.md CLAUDE.md; test $? -eq 1` - expected: exit 0

### Approach
1. In `superbiz/CLAUDE.md`: update the layout comment for `business-idea-validator/` to "Entry - interactive intake, dispatches the researcher then the chairman fork"; extend the `business-idea-validator` skill bullet - after the researcher returns the report, the entry writes a council capture to `.temp/superbiz/council/capture-<RUN_ID>.md` and dispatches `council-this-chairman` on the finished report (a mandatory council round), then relays both tagged lines, surfacing any researcher-vs-council clash, before offering the roadmap chain.
2. In the same file: change the `council-this-chairman` bullet's parenthetical to "dispatched only by `council-this` and `business-idea-validator`, never directly".
3. In the same file: rewrite the closing paragraph - superbiz still declares no cross-plugin chains; in-plugin, the validator chains into `product-phase-roadmap` (offered) and into `council-this-chairman` (mandatory council round on the finished report); the `council-this` entry itself is not chained from either.
3a. In the same file: adjust the paragraph after the skills list ("All three entries ... all three forks carry ... a 'invoked only by the entry skill, never directly' description guard") so the guard clause covers the chairman's two callers - e.g. "a description guard naming its allowed caller(s), never directly".
4. In root `CLAUDE.md`, superbiz bullet: extend the `business-idea-validator` sentence with one clause - after the report is written, it mandatorily convenes the council on it via `council-this-chairman` (a mandatory council round writing `rada.md` next to the report). Touch nothing else in the root file; `superbiz/.claude-plugin/plugin.json` stays untouched.

### Edge cases
none

### Contracts
none

### DoD
Both CLAUDE.md files describe the mandatory council round and the widened chairman guard, all test commands pass, and `git status` shows no change to `superbiz/.claude-plugin/plugin.json`.


### Covered criteria
5. `superbiz/CLAUDE.md` documents the chain: the validator bullet describes the mandatory council round (second capture + chairman dispatch on the finished report, combined relay), the chairman bullet says dispatched only by `council-this` and `business-idea-validator`, and the closing chain paragraph states the validator chains in-plugin into `council-this-chairman` while the `council-this` entry itself is not chained from either.
6. Root `CLAUDE.md` superbiz bullet mentions the validator's mandatory council round via `council-this-chairman`; `superbiz/.claude-plugin/plugin.json` is byte-identical to before the change.
