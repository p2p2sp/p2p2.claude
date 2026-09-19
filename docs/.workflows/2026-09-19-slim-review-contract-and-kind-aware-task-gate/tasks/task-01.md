
## Task 1 - Inventory every rule the review contract carries today
- TDD: none
- Kind: text
- Model: opus
- Covers: `Każda reguła rozliczona` (#9)

### Dependencies
none - this task reads the pre-change contract, which every later task then rewrites

### Files
- add - docs/misc/review-contract-rule-inventory.md

### Task Checks
- grep -n 'kept' docs/misc/review-contract-rule-inventory.md
- grep -n 'dropped' docs/misc/review-contract-rule-inventory.md

### Approach
1. `Model: opus` because this task decides, rule by rule, what the compression may drop from the single owner of the build review loop's vocabulary, and `Compress the review contract to its rules alone` (Task 2) executes that classification without re-deciding it.
2. Read `superdev/references/review-contract.md` end to end and enumerate every rule it carries, walking its twelve `## ` sections in file order. A rule is one obligation a consumer must apply; the prose around it is not a rule.
3. Write `docs/misc/review-contract-rule-inventory.md` with a `## <section>` heading per contract section and one bullet per rule under it, each bullet in the row shape of `### Contracts`. Classify each rule `kept`, `moved -> superdev/CLAUDE.md` or `dropped`, and give every `dropped` and every `moved` row its one-sentence reason.
4. Classify as `dropped` the three content classes the spec names: a mechanism rationale that states why a rule was adopted, a dead or retired rule, and a repetition of a rule the same file already states elsewhere. Name the retired `base:` and `runner:` label paragraph and the pre-contract report handling of `## Finding IDs` as `dropped` rows. Classify the `## Naming` legacy fallback as `kept` - `plan-review-checklist.md` B15 and both planning skills cite it.
5. Classify a row `moved` only when it carries rationale worth keeping for a human editor and no obligation at all. An obligation a consumer applies at runtime is always `kept` or `dropped`, never `moved`: the root `CLAUDE.md` states this repo's `CLAUDE.md` files are never plugin inputs and never read at runtime.
6. Open the file with one sentence placing it beside the repo's other working notes in `docs/misc/` as a record of this compression, read by a human editor and by no dispatch.

### Failure modes
- when a rule cannot be classified because two sections state it in conflicting terms -> response record both as one row classified `kept` with the conflict named in the reason, log that row in `docs/misc/review-contract-rule-inventory.md`, test none - dev-time record

### Contracts
- inventory row shape - `- <rule, one clause> - kept | moved -> <destination> | dropped - <reason>`, one bullet per rule under a `## <section>` heading naming its contract section - consumed by `Compress the review contract to its rules alone` (Task 2)
- allowed `moved` destination - `superdev/CLAUDE.md` alone, and only for rationale carrying no obligation; no rule moves to a script header, to another reference or to any agent body under this plan - consumed by `Compress the review contract to its rules alone` (Task 2)

### DoD
`docs/misc/review-contract-rule-inventory.md` carries one row per rule of today's `review-contract.md`, grouped by its twelve sections, each row classified `kept`, `moved -> superdev/CLAUDE.md` or `dropped`, and every `dropped` and `moved` row carrying its reason.


### Covered criteria
9. Każda reguła rozliczona - Każda reguła, którą kontrakt niósł przed zmianą, jest odnotowana jako zachowana, przeniesiona albo świadomie porzucona z podanym powodem.
