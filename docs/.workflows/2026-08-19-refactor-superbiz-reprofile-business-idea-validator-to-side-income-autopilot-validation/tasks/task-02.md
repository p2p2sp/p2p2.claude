
## Task 2 - refactor(superbiz): rewrite scoring rubric and verdict guideline in frameworks reference
- TDD: none
- Covers: criteria #1, #2

### Dependencies
- Task 1 - blocks: dimension names and gate semantics must match the researcher SKILL.md

### Files
- modify - superbiz/skills/business-idea-validator-researcher/references/frameworks.md (`## Porter's Five Forces` conclusion line; `## Scoring rubric for the verdict` -> full rewrite; two new sections `## Assumption risk map` and `## Mom Test rules for experiment questions`)

### Test Commands
#### Build
- none

#### Tests
- `grep -c '1-10' superbiz/skills/business-idea-validator-researcher/references/frameworks.md` - expected: >= 1
- `grep -c 'PCV' superbiz/skills/business-idea-validator-researcher/references/frameworks.md` - expected: >= 1
- `grep -E 'NO-GO|GO;| GO ' superbiz/skills/business-idea-validator-researcher/references/frameworks.md; test $? -eq 1` - expected: exit 0 (old verdict labels gone)
- `grep -c 'Mom Test' superbiz/skills/business-idea-validator-researcher/references/frameworks.md` - expected: >= 1
- `grep -RE '—|–' superbiz/skills/business-idea-validator-researcher/references/frameworks.md; test $? -eq 1` - expected: exit 0

### Approach
- In `## Porter's Five Forces`, change the conclusion "weigh heavily toward PIVOT/NO-GO" to "weigh heavily toward PIVOT/DROP".
- Rewrite `## Scoring rubric for the verdict` to six dimensions on 1-10 with low/high anchors: PCV (Perceived Created Value; 1 = vitamin nobody would miss, 10 = painkiller with researched evidence of people already paying to kill the pain); problem evidence (anchored on behavioral Mom Test evidence - past spending, churn stories, active workarounds; declared intent scores nothing); autopilot operability (1 = founder in the loop of every sale/support case, 10 = fully self-serve path with maintenance clearly inside the capture's `# Maintenance budget`); monetization vs CAC (1 = no plausible channel pays back inside 60 days or the `# Income target` is out of reach for the niche, 10 = researched channel with near-7-day payback and target plausibly covered); MVP feasibility in 2-4 weeks (1 = core value undeliverable inside the cap even AI-assisted, 10 = comfortably inside the cap); solo-founder distribution access (1 = enterprise sales or gatekept channels, 10 = self-serve channel the founder can operate alone).
- Replace the closing guideline with: total of 36 or more with no dimension at 2 or below leads to BUILD; a score of 3 or less on PCV, problem evidence, or autopilot operability leads to PIVOT or DROP regardless of total; otherwise PIVOT territory - the analysis, not the arithmetic, makes the call, and the report must explain it. Keep the "guideline, not formula" framing.
- Add `## Assumption risk map`: order the capture's remaining assumptions by impact-if-false times current uncertainty; the top row after The Riskiest Assumption defines what to test next; assumptions research confirmed or broke drop out of the map (they are settled, not risks).
- Add `## Mom Test rules for experiment questions`: questions for the 48h experiment ask about the past and the concrete (what did you do last time the problem hit, what did it cost you, what have you already paid for), never hypotheticals ("would you use/pay for X" is banned); compliments and generic enthusiasm are recorded as zero evidence.

### Edge cases
- Fewer than two assumptions survive as open: the risk map may collapse to a single row - state that explicitly rather than padding.

### Contracts
- Six dimension names and the gate rule identical to Task 1's `## Verdict and how-to-win strategy`.
- Verdict labels BUILD / PIVOT / DROP only.

### DoD
frameworks.md carries the 1-10 six-dimension rubric with the 36-threshold guideline and gate rule, the two new sections, and no GO/NO-GO label anywhere; all listed grep checks pass.


### Covered criteria
1. The researcher's rubric (SKILL.md plus `references/frameworks.md`) scores exactly six dimensions on a uniform 1-10 scale: PCV (painkiller vs vitamin), problem evidence (real past behavior and spending, never declared intent), autopilot operability, monetization vs CAC with a sub-60-day payback stress-test, MVP feasibility within a hard 2-4 week calendar cap, and solo-founder distribution access - each with per-band scoring anchors.
2. The verdict guideline appears in the rubric verbatim or equivalently: a total of 36 or more with no dimension at 2 or below leads to BUILD; a score of 3 or less on PCV, problem evidence, or autopilot operability forces PIVOT or DROP regardless of the total; everything else is PIVOT territory, with the written analysis - not the arithmetic - making the final call (that softness is the deliverable, mirroring the current rubric's "guideline, not formula" stance).
