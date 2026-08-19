## Output Format

Base SHA: `f4d70ff211aa793daed61491eda445146d6f1a52`. Change set (`git diff --name-status <base>..HEAD`, build scaffolding elided):

```
M	CLAUDE.md
M	README.md
M	superbiz/CLAUDE.md
M	superbiz/skills/business-idea-validator-researcher/SKILL.md
M	superbiz/skills/business-idea-validator-researcher/references/frameworks.md
M	superbiz/skills/business-idea-validator-researcher/references/report-template.md
M	superbiz/skills/business-idea-validator/SKILL.md
```

Exactly the seven files the spec's constraints permit. `superbiz/.claude-plugin/plugin.json` untouched (correct - no skill added, removed, or renamed), no version bump (tag-driven), no test tree touched (`tests/` carries no `superbiz` suite, consistent with the spec). All 28 grep checks declared across the five plan tasks were re-run independently: all pass.

This is the second code-review round; `review-01-code.md` and `fix-01-notes.md` were read after forming an independent read of the change set. The one Important issue from round 1 (competing "MVP core" definitions) is genuinely closed - `business-idea-validator-researcher/SKILL.md:38` now phrases the differentiator allowance as "at most one ... a ceiling, not a target, and one that defers to the first-paying-customer test", `frameworks.md:82` was aligned to the same wording, and `report-template.md:105-108` reads consistently with both. The findings below are new.

### Strengths

- Cross-file contract discipline on the six dimensions is genuinely tight. The names appear in the same order in all three carriers - `business-idea-validator-researcher/SKILL.md:92-97` (definitions), `references/frameworks.md:78-83` (per-band anchors), `references/report-template.md:13-18` (report table) - PCV first everywhere, no label drift, and no residue of the old five-dimension 1-5 rubric anywhere.
- The producer/consumer seam for the two new capture inputs is closed on both ends and at every consumption point: written at `business-idea-validator/SKILL.md:53-56` and guaranteed non-empty at `:21` ("unstated", never invented, never blocking); consumed at `business-idea-validator-researcher/SKILL.md:17` (input contract), `:19` (degraded path), `:44,:47` (autopilot lens), `:86` (feasibility), `:94-95` (scoring); and surfaced in the report at `report-template.md:80-83,:116-119,:131-134`. Both inputs drive scores, not just narrative - the part of acceptance criterion 9 that is easiest to fake.
- The `report-template.md` renumbering is airtight. The inserted section 3 shifted 3-11 plus 5a/5b/9a/9b/9c to 4-12 plus 6a/6b/10a/10b/10c, and a repo-wide sweep for stale section references (`grep -rE 'section (9|10|11)[abc]?' superbiz/skills/`) returns nothing.
- Old vocabulary is gone everywhere, not just where the grep checks look. A repo-wide sweep for `NO-GO`, `GO/PIVOT`, `investor`, `acquirer`, `exit readiness` across all tracked `*.md` returns hits only in `.temp/superdev/` scratch planning files, which ship with nothing.
- Downstream consumers were correctly left alone and genuinely do not break: `product-phase-roadmap/SKILL.md:21` resolves the report by glob on `walidacja.md` / `validation.md` (paths unchanged), and `council-this-chairman` takes the report as an opaque context file. Neither parses a verdict label, so the BUILD/PIVOT/DROP switch is contained.
- Documentation sync is accurate rather than merely reworded: the two `opus` claims dropped from root `CLAUDE.md:76,:83` were false (neither fork declares `model:`), the retained `sonnet` claim for the roadmap writer is true, and the README row fix removes a pre-existing inaccuracy (the roadmap offer was never conditional on a verdict).
- Repo formatting rules hold across every touched file: no em/en dashes in any added line (including README.md and root CLAUDE.md, which the plan's checks did not cover), no Markdown tables in skill sources (the only `|` characters are inside inline-code tagged-line contracts), no italics, no emoji, and `report-template.md:3` keeps the generated-report table carve-out.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

- `superbiz/skills/business-idea-validator-researcher/SKILL.md:105` vs `references/report-template.md:31,:157-158` - the DROP path is now contradicted across the two files. `SKILL.md:105` opens the bullet list with "For BUILD or PIVOT, the 'how to win' section must be concrete", and Task 1 appended three new items to that list: The Riskiest Assumption (`:115`), the assumption-risk map (`:116`), and the 48-hour no-code experiment (`:117`). The template places two of those in sections that are explicitly ungated - `:31` "Present for every verdict, DROP included" for section 3, `:157-158` the same for section 11 - which is exactly the plan's Task 3 edge case ("a DROP reader still learns which assumption broke and how to re-test"). On a DROP verdict the two files give opposite instructions, and the resolution is left to whichever the writing model weights higher. Note this is not the pre-existing shape: the old file's last gated bullet was "Next validation steps" against a template section that merely omitted a gate marker, so the change converted a silent omission into an explicit contradiction. Two further mismatches ride along: the three items are not how-to-win content at all in the template's section map (they land in sections 3 and 11, not 10), and the assumption-risk map is the one deliverable most useful precisely when the verdict is DROP. Fix: lift the three items out from under the BUILD/PIVOT lead-in - either a short ungated paragraph after the bullet list ("Regardless of verdict, DROP included, the report must also carry: ...") or a separate `##` subsection - so the gate covers only the how-to-win bullets it was written for.

#### Minor (Nice to Have)

- `references/frameworks.md:80` and `business-idea-validator-researcher/SKILL.md:94` express the autopilot hard gate as "scores in the bottom band", but "bottom band" is never defined numerically, while the gate that consumes it (`frameworks.md:85`) fires at "3 or less". The mapping is inferable (the PCV anchor at `:78` establishes 4-6 as mid-band), but the one score in the change set that is meant to bind unconditionally relies on that inference. Naming the number ("scores 3 or below") in both places closes it at a word's cost.
- `references/frameworks.md:85` - the two clauses of the verdict guideline overlap at exactly score 3: clause 1 admits BUILD when the total is 36+ "with no dimension at 2 or below" (a PCV of 3 passes), clause 2 sends PCV of "3 or less" to PIVOT/DROP "regardless of total". The trailing "regardless of total" signals which clause wins, but the spec's own wording used the stronger "forces PIVOT or DROP" while the implementation says "leads to", flattening the precedence. The "guideline, not formula" framing is deliberate and should stay, so this is a wording nit rather than a design flaw - restoring "forces" would make the override unambiguous without hardening the rubric.
- `references/report-template.md:83` says "the input absent - say so" for `# Maintenance budget`, and `:116-119` gives `# Income target` no degraded branch at all. The entry skill produces the heading present with the literal value `unstated` (`business-idea-validator/SKILL.md:21,:54,:56`), which is the case `SKILL.md:19` was widened to name during fix-01. The same widening was not propagated to the template, so the file the writer actually follows still describes only the absent-heading case.
- `references/report-template.md:88-94` (section 10, Wedge) enumerates wedge content in detail - execution wedge, feature wedge, segment, which users incumbents keep - but never mentions the clone strategy, while `business-idea-validator-researcher/SKILL.md:34` makes it mandatory ("the how-to-win section must name the recommended clone strategy") and `:107` repeats it. The two files are not in conflict (both gate on BUILD/PIVOT), but the clone catalog is the change's most novel content and the template is the structure the writer follows - one clause in section 10 would make it hard to drop.
- `references/report-template.md:80-83` and `:131-134` both instruct the report to state the estimated maintenance hours per month against `# Maintenance budget`, once in Feasibility and once in Autopilot economics. Both were plan-mandated, so this is not a deviation, but the generated report will carry the same comparison twice; having section 8 give the number and section 10c reference it ("itemized in 10c") would avoid a self-contradicting pair of estimates in a long report.
- `business-idea-validator-researcher/SKILL.md` grew to 135 lines and repeats several rules across sections: micro-exit optionality at `:50` and `:114`, the sub-60-day payback at `:49`, `:95` and `:112`, anti-sycophancy at `:56` and `:103`. Round 1 raised this and fix-01 deferred it with a defensible rationale (multi-section rewrite of passing content). Re-recorded here only so it does not disappear from the record - the how-to-win bullet list at `:107-117` is now largely an output-spec restatement of the autopilot-economics lens at `:42-50` sitting directly above it.
- `superbiz/CLAUDE.md:85` still claims the five council agents "All five run `model: opus`", which is false - no `superbiz/agents/*.md` declares a `model:` key. Correctly left alone (the plan scoped it out), but it is the same class of stale model claim Task 5 existed to purge from root `CLAUDE.md`, so the plugin's own orientation file now contradicts the repo root's newly corrected one.

### Recommendations

- When one task adds items to a list and a sibling task changes the gating of the sections those items feed, treat the lead-in sentence of the list as a contract to re-check. The single Important issue here is entirely a lead-in that was correct before three items were appended under it.
- The researcher SKILL.md is at the point where the lens (`:42-50`) and the output spec (`:107-117`) are two renderings of the same material in one file. `references/` already holds the frameworks and the rubric and the writer is already sent there twice - moving the lens half across is the natural next consolidation, and would take this file back under 100 lines.

### Assessment

**Ready to merge?** With fixes

**Reasoning:** The reprofile is complete and the cross-file contracts (dimension names, verdict labels, capture headings, section numbering) all line up with no residue of the old lens, but the skill body and the report template now give opposite instructions for a DROP verdict on the two sections the plan explicitly required to survive it, and the fix is one relocated lead-in sentence.
