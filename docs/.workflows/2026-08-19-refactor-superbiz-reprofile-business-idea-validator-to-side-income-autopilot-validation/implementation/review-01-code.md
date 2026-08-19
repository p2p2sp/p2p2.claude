## Output Format

Base SHA: `f4d70ff211aa793daed61491eda445146d6f1a52`. Change set (`git diff --name-status <base>..HEAD`), scaffolding elided:

```
M	CLAUDE.md
M	README.md
M	superbiz/CLAUDE.md
M	superbiz/skills/business-idea-validator-researcher/SKILL.md
M	superbiz/skills/business-idea-validator-researcher/references/frameworks.md
M	superbiz/skills/business-idea-validator-researcher/references/report-template.md
M	superbiz/skills/business-idea-validator/SKILL.md
```

Exactly the seven files the spec's constraints allow, plus the build's own `docs/.workflows/` scaffolding. `superbiz/.claude-plugin/plugin.json` is untouched (correct: no skill added, removed, or renamed), and no version was bumped. All 27 grep checks declared across the five tasks were re-run and pass.

### Strengths

- Cross-file contract discipline is the strongest part of this delivery. The six scoring dimensions are named identically, in the same order, in all three places that carry them: `superbiz/skills/business-idea-validator-researcher/SKILL.md:92-97` (definitions), `references/frameworks.md:78-83` (per-band anchors), and `references/report-template.md:13-17` (report table). PCV is first everywhere, and the label set is BUILD / PIVOT / DROP with no drift. A repo-wide sweep for the old vocabulary (`investor`, `acquirer`, `NO-GO`, `GO/PIVOT`, `exit readiness`, the old `1-5` scale) returns nothing anywhere under `superbiz/`, `CLAUDE.md`, or `README.md` - the reprofile is complete, not partial.
- The producer/consumer seam between the entry skill and the fork is correctly closed on both sides: `superbiz/skills/business-idea-validator/SKILL.md:53-56` adds `# Maintenance budget` and `# Income target` to the capture format, `SKILL.md:21` guarantees they are always written (declined -> "unstated", never invented, never blocking), and the researcher consumes them at `business-idea-validator-researcher/SKILL.md:17` (input contract), `:44,:47` (autopilot lens), `:86` (feasibility check), `:94-95` (scoring), and `report-template.md:80-82,:117-119,:130-132` (report sections). Both inputs genuinely feed the scoring rather than only narrative, which is what acceptance criterion 9 asked for and the easiest thing to fake.
- `references/report-template.md` renumbering is airtight. Inserting the new section 3 shifted every subsequent section by one (old 3-11 plus 5a/5b/9a/9b/9c -> new 4-12 plus 6a/6b/10a/10b/10c) and every heading was updated consistently; no cross-reference in the skeleton or in the researcher SKILL.md points at a stale number.
- Verdict-gating of sections was reasoned about rather than mechanically renamed: `report-template.md:86,:96,:111,:130` correctly became "only for BUILD/PIVOT", while the two new sections that must survive a DROP verdict carry explicit "Present for every verdict, DROP included" instructions (`:30` and `:156-158`) - exactly the plan's edge case, and stated where the writing model will actually read it.
- The graceful-degradation path for missing capture inputs is handled in two places rather than one (`business-idea-validator-researcher/SKILL.md:19` in the input contract and `:99` at the scoring step, where the decision is actually made), plus `report-template.md:81-82`. The existing `ERROR: capture unreadable` short-circuit and the entry skill's `ERROR:`-line handling at step 7 were left intact.
- Documentation sync is accurate, not just re-worded. The `opus` claims dropped from root `CLAUDE.md:78,:83` are genuinely false (neither fork declares a `model:` key), while the retained `sonnet` claim for `product-phase-roadmap-writer` was verified true (`product-phase-roadmap-writer/SKILL.md:6`). Task 5 also fixed the stale README claim that the roadmap offer is conditional on a GO/PIVOT verdict, which was a pre-existing inaccuracy the plan asked to correct in passing.
- Repo formatting rules hold across every touched file: no em/en dashes anywhere in the change set, no Markdown tables in any skill source (the only `|` occurrences are inside inline-code tagged-line contracts), no italics, no emoji, and `report-template.md:3` keeps its generated-report table carve-out intact.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

- `superbiz/skills/business-idea-validator-researcher/SKILL.md:38` vs `:108` (and `references/report-template.md:105-108`) - two competing definitions of "MVP core" now live in the same skill. The AI-assisted-development context states consequence (1) as "match the category's table stakes plus **exactly one** differentiator inside the 2-4 week cap", while the how-to-win section defines the MVP core as "aggressively minimal, where anything not required to close the first paying customer moves out", and `frameworks.md:82` adds a third phrasing ("room for the one differentiator"). These pull in different directions: table stakes are by definition what a credible product needs, but most of them are not required to close a *first* paying customer, so a model splitting section 10a gets no rule of precedence. Note the plan's Approach only said "match table stakes plus one differentiator"; the word "exactly" is an implementation-added tightening, and it is what collides with `report-template.md:97-98`, which still asks for a plural list of differentiators before the split. Fix: pick one criterion as authoritative (the "first paying customer" test reads as the intended one, since it is stated at both the skill and the template) and phrase the context line as a ceiling that defers to it - e.g. "at most one differentiator, and only if it survives the first-paying-customer test".

#### Minor (Nice to Have)

- `superbiz/skills/business-idea-validator-researcher/references/report-template.md:14-15` hard-codes a Polish gloss inside the English skeleton: "PCV (Perceived Created Value - postrzegana wartość dla klienta)". Every other acronym expansion in this file is introduced with an explicit language qualifier ("e.g. in Polish:", `:38-41`), so this one reads as a literal string to copy and can leak Polish into an English-language report. Fix: mirror the section 5 pattern, or drop the gloss and let the file's own first-use expansion rule (`:169`) handle it.
- `superbiz/skills/business-idea-validator-researcher/SKILL.md:90` points at `references/frameworks.md` for "per-band anchors" only, but that file (`:85`) is also the sole home of the verdict guideline - the 36 threshold and the PCV / problem-evidence / autopilot-operability hard gates. The SKILL.md's own verdict step mentions only the autopilot gate (`:94`). The Analysis step does instruct reading the reference first, so nothing is unreachable, but widening the pointer to "per-band anchors and the verdict guideline" would remove the chance of the gate rule being skipped at the moment it applies.
- Redundancy has grown in `business-idea-validator-researcher/SKILL.md`, against `.claude/rules/_skills.md` ("repeated information across multiple files - remove mercilessly"). Micro-exit optionality is now stated three times (`:50`, `:114`, plus `report-template.md:141-146`); the sub-60-day payback rule four times (`:49`, `:95`, `:112`, plus `frameworks.md:81`); and the anti-sycophancy rule twice within the same file (`:56` and `:103`). Some of this is deliberate reinforcement at the point of use and was inherited from the pre-change file, but the file grew from 104 to 135 lines and the how-to-win bullet list now restates much of the autopilot-economics context it sits below. Worth a consolidation pass before the next feature lands on this skill.
- `business-idea-validator-researcher/SKILL.md:19` phrases the degraded-input rule as "`# Maintenance budget` or `# Income target` **absent** (older capture format)", but the case the current entry skill actually produces is the heading present with the literal value "unstated" (`business-idea-validator/SKILL.md:21,:54,:56`). The concept name and the literal value happen to be the same word, so the mapping is nearly automatic, but naming both cases ("absent, or set to `unstated`") would make the seam explicit rather than lucky.
- `README.md:100` says the entry "always offers" the roadmap chain, while `business-idea-validator/SKILL.md:27` stops the run entirely on a researcher `ERROR:` line. "Always" is true for every completed run but not literally always; "on a completed report" would be exact. Small overcorrection of the stale "on a GO/PIVOT verdict" claim it replaced.
- `superbiz/CLAUDE.md:85` still asserts the five council agents "All five run `model: opus`", which is false - none of `superbiz/agents/*.md` declares a `model:` key. This was explicitly placed out of scope by the plan and correctly left alone, but it is the same class of stale model claim Task 5 was created to purge from root `CLAUDE.md`, so it is worth a one-line follow-up rather than leaving the plugin's own orientation file contradicting the source it describes.

### Recommendations

- The researcher SKILL.md is approaching the size where its own instructions start competing for attention (135 lines, with several 400-word paragraphs at `:38` and `:65-67`). The autopilot-economics principles (`:42-50`) and the how-to-win bullets (`:107-117`) are now largely the same material addressed twice - once as a lens, once as an output spec. Consider moving the lens half into `references/` next time this file is touched, which is where the frameworks and the rubric already live and where the reader is already sent.
- When a plan's Approach quotes target wording, resist tightening it during implementation ("one differentiator" -> "exactly one differentiator"). The single Important issue in this delivery is entirely the product of that one added word interacting with a sibling task's file.

### Assessment

**Ready to merge?** With fixes

**Reasoning:** The reprofile is complete and internally consistent across all seven files - dimension names, verdict labels, capture headings, and section numbering all line up, with no residue of the old investor lens anywhere - but the skill now carries two competing definitions of what belongs in the MVP core, in the same file that must produce that split, and the ambiguity is a one-clause fix.
