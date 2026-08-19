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

Exactly the seven files the spec's constraints permit. `superbiz/.claude-plugin/plugin.json` untouched (correct - no skill added, removed, or renamed), no version bump (tag-driven), no test tree touched. All 28 grep checks declared across the five plan tasks were re-run independently: all pass.

Third code-review round. The change set was read in full before `review-01-code.md`, `review-02-code.md`, `fix-01-notes.md` and `fix-02-notes.md`. Both prior Important findings are genuinely closed and verified below; the findings here are new.

### Strengths

- Both prior Important issues are closed in substance, not by re-wording. The competing "MVP core" definitions now resolve to one authoritative criterion in all three carriers: `business-idea-validator-researcher/SKILL.md:38` ("at most one differentiator - a ceiling, not a target, and one that defers to the first-paying-customer test"), `references/frameworks.md:82` ("the at-most-one differentiator that survives the first-paying-customer test"), `references/report-template.md:109-110`. And the DROP contradiction is gone: `SKILL.md:115` now carries an explicit "Regardless of the verdict, DROP included" lead-in for the three items, matching `report-template.md:31` and `:163-165`.
- Cross-file contract discipline on the six dimensions holds exactly. Same names, same order, PCV first, in all three carriers - `business-idea-validator-researcher/SKILL.md:92-97` (definitions), `references/frameworks.md:78-83` (per-band anchors), `references/report-template.md:14-18` (report table). No label drift, no residue of the old five-dimension 1-5 rubric.
- The gate semantics are now numerically closed end to end: `SKILL.md:94` and `frameworks.md:80` both say "scores 3 or below", and `frameworks.md:85` consumes exactly that number with "forces PIVOT or DROP regardless of total". Before fix-02 the gate depended on an undefined "bottom band" and a weaker "leads to".
- The producer/consumer seam for the two new capture inputs is closed at every point: written at `business-idea-validator/SKILL.md:53-56`, guaranteed non-empty at `:21` ("unstated", never invented, never blocking), consumed at `business-idea-validator-researcher/SKILL.md:17,:19,:44,:47,:86,:94-95`, surfaced in the report at `report-template.md:80-84,:119-123,:136-139`. Both inputs drive scores, not only narrative.
- Downstream consumers were verified decoupled, not merely left alone. `product-phase-roadmap/SKILL.md:21` resolves the report by glob on `walidacja.md` / `validation.md` (paths unchanged); `product-phase-roadmap-writer` and `council-this-chairman` reference no report section number and no verdict label. The renumbering (new section 3 shifting 3-11 to 4-12 and 5a/5b/9a/9b/9c to 6a/6b/10a/10b/10c) and the BUILD/PIVOT/DROP switch are both fully contained inside the researcher's own three files. A repo-wide sweep for stale section references returns only the two legitimate self-references at `report-template.md:137` and `:180`.
- Old vocabulary is gone repo-wide, not just where the grep checks look: a sweep for `NO-GO`, `GO / PIVOT`, `GO/PIVOT`, `investor`, `acquirer`, `exit readiness`, `1-5 scale` across `superbiz/`, `CLAUDE.md` and `README.md` returns nothing.
- Repo formatting rules hold across every touched file: no em/en dashes, no Markdown tables in any skill source (a `^|` sweep under `superbiz/skills/` is empty), no italics, no emoji, and `report-template.md:3` keeps the generated-report table carve-out.
- Documentation sync is accurate rather than reworded: the two `opus` claims dropped from root `CLAUDE.md:78,:83` were false (neither fork declares `model:`), the retained `sonnet` claim is true, and the README row fix removes a pre-existing inaccuracy (the roadmap offer was never conditional on a verdict).

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

- `business-idea-validator/SKILL.md:21,:55-56` (producer) vs `business-idea-validator-researcher/SKILL.md:85,:95` and `references/report-template.md:119-123` (consumers) - `# Income target` now feeds shown arithmetic against researched incumbent pricing, but nothing in the chain fixes its unit. The capture placeholder is `<target supplementary income per month, or "unstated">`, and the analysis instruction is "show the arithmetic (price anchor times the paying customers needed)" where the price anchor comes from fetched competitor pricing pages. Those two numbers routinely originate in different currencies - the user states the target in their own words in the capture language (a Polish-language run will say a PLN figure), while incumbent SaaS pricing is overwhelmingly researched in USD - and no rule anywhere instructs normalizing them or recording the currency. Why it matters: this is not a narrative field. Criterion 9 deliberately promoted it to a scored input, so a silent currency mix produces a wrong customer count, a wrong "monetization vs CAC" score, and a wrong verdict, presented to the user with visible arithmetic that looks checkable. It is also the one cross-task seam this change created, and the only numeric contract in the chain with no guard on it. Note the mitigating context: `# Resources` has the same free-text looseness today and already fed a "cost-to-launch vs. budget" comparison, so the shape is the file's established convention - but that field never drove a score. Fix is one clause in two places: make the capture placeholder require the currency (`<target supplementary income per month with currency, or "unstated">`, with step 2 instructed to record the currency the user used), and add "state both figures in the same currency, converting the researched price anchor if needed and naming the rate used" to `SKILL.md:85` / `report-template.md:119-123`.

#### Minor (Nice to Have)

- `business-idea-validator-researcher/SKILL.md:114-115` - the fix-02 ungating paragraph is missing the blank line that would make it a paragraph. `:114` is the last bullet of the "For BUILD or PIVOT" list (`:105`) and `:115` starts at column 0 immediately after it, so in Markdown it is a lazy continuation of that bullet, and the three items at `:117-119` then parse as further items of the same list. The prose is categorical enough ("Regardless of the verdict, DROP included") that a reader gets the intent, and `report-template.md:31,:163-165` gate the sections independently, so the contradiction is genuinely resolved - but the structure still nests the exemption inside the thing it exempts. One blank line before `:115` makes the parse match the sentence.
- `business-idea-validator-researcher/SKILL.md:99` - "When `# Maintenance budget` or `# Income target` is **missing** from the capture, score dimensions 3 and 4 on category evidence alone". `:19` states the same rule and was widened during fix-01 to cover both cases ("absent ... or present with the value `unstated`"), and fix-02 propagated that widening to `report-template.md:83` and `:123`. `:99` is the one restatement the sweep missed, and it is also redundant with `:19` under `.claude/rules/_skills.md` ("repeated information across multiple files - remove mercilessly"). Deleting `:99` closes both at once, since the input contract already owns the rule.
- `business-idea-validator/SKILL.md:21` vs `:22` - the premise disclosure lands one step after the two questions that only make sense under that premise. Step 2 asks the user for their acceptable maintenance hours and target supplementary income; step 3 then explains that the verdict judges the idea as a supplementary-income product running on autopilot. A venture-scale user answers two confusing questions before learning why they were asked. The plan placed the disclosure in step 3 and the stop-or-reframe affordance does work where it is, so this is ordering polish, not a defect - but moving the one premise sentence to the head of step 2 would make the intake self-explanatory.
- `CLAUDE.md:78-81` - dangling participles in the rewritten superbiz bullet: "...to write a sourced report to `docs/business/<idea-slug>/walidacja.md` judging the idea as a side-income product ... and returning a BUILD / PIVOT / DROP verdict". Grammatically the report judges and returns; the fork does. Re-attaching the clause ("...to write a sourced report ...; the fork judges the idea as a side-income product ... and returns a BUILD / PIVOT / DROP verdict") reads correctly at no length cost.
- `report-template.md:21-24` and `:25-31` - sections 2 and 3 both enumerate the capture's assumptions: section 2 by research status (confirmed / broken / still open), section 3 by test priority. `frameworks.md:91` already rules that settled assumptions drop out of the map, so the two lists are not identical, but a generated report will restate the open assumptions twice within four sections. Having section 3 open with "from the assumptions still open in section 2" would make the relationship explicit and stop the writer re-arguing status there.
- `business-idea-validator-researcher/SKILL.md` is 137 lines with continued internal repetition (micro-exit at `:50` and `:114`, sub-60-day payback at `:49`, `:95` and `:112`, anti-sycophancy at `:56` and `:103`, and the 400-word single paragraph at `:38`). Raised in round 1, re-recorded in round 2, deferred both times with a defensible rationale (multi-section consolidation of passing content). Re-recorded once more only so it stays on the record; not a fix for this round.
- `superbiz/CLAUDE.md:85` still claims the five council agents "All five run `model: opus`", which is false - no `superbiz/agents/*.md` declares `model:`. Explicitly scoped out by the plan and correctly left alone, but the plugin's own orientation file now contradicts the repo root's newly corrected one, which is the same class of stale claim Task 5 existed to purge.

### Recommendations

- Every numeric field a capture carries should declare its unit at the point it is written, not at the point it is read. The one Important issue here is a field that was safe while it was narrative and became load-bearing the moment it started feeding a score - a good default going forward is that promoting a capture field into the scoring rubric requires re-reading its producer-side placeholder in the same task.
- When a review fix relocates content out of a gated list, check the resulting Markdown block structure, not just the sentence. Two of the three findings this round (`:114-115` blank line, `:99` missed restatement) are residue of otherwise-correct fix rounds, both from sweeping the prose without re-parsing the file.
- The researcher SKILL.md consolidation deferred twice (lens at `:42-50` vs. output spec at `:107-119`) is now the largest remaining quality debt in this skill and the natural next move is still to push the lens half into `references/`, where the frameworks and the rubric already live and where the reader is already sent twice.

### Assessment

**Ready to merge?** With fixes

**Reasoning:** The reprofile is complete and both prior Important findings are genuinely closed - dimension names, gate numerics, verdict labels, capture headings and section numbering all line up across the seven files with downstream consumers verified decoupled - but the `# Income target` seam this change created feeds visible arithmetic against researched foreign-currency pricing with no unit contract anywhere, which can produce a wrong score on a dimension the spec deliberately made load-bearing.
