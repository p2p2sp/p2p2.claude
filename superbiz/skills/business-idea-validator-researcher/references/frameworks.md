# Analysis frameworks - how to apply each one correctly

Read this during the Analysis step. Each section explains the framework, the common mistakes to avoid, and what "good" looks like in the report.

## TAM / SAM / SOM

- TAM (Total Addressable Market): total revenue if the product captured 100% of everyone who could conceivably use it.
- SAM (Serviceable Addressable Market): the portion reachable given the product's segment, geography, and language.
- SOM (Serviceable Obtainable Market): realistic capture in 2-3 years given competition and the available resources.

Prefer bottom-up over top-down. Top-down ("the market is $50B, we take 1%") is the classic vanity calculation - avoid presenting it as the primary number. Bottom-up: (number of target customers in geography, from a sourced statistic) multiplied by (realistic price the product proposes or competitors charge) multiplied by (plausible penetration). Show the arithmetic in the report so the reader can challenge each input.

If no market-size report exists for the niche, build a proxy: for example for "SaaS for Polish dental clinics", the number of registered dental practices in Poland (government registry) multiplied by plausible ARPU. Label it clearly as an estimate.

## Porter's Five Forces

Rates industry attractiveness - whether the structure of the industry allows above-normal profit at all. Rate each Low/Medium/High with a researched justification, not from intuition:

1. Competitive rivalry - how many players, how similar, how fast is the market growing (slow growth leads to fights over share), how easy is switching? Note: many players does not automatically mean hostile rivalry for a new entrant - if the market is growing and incumbents compete on features/enterprise sales while neglecting product quality, a better-executed product can grow without triggering a direct fight. Rate rivalry as it applies to the intended segment, not the market average.
2. Threat of new entrants - how cheap/fast is it for the next founder (or an incumbent from an adjacent market) to copy this? Low barriers cut both ways: easy to enter, easy for others to follow. Say this explicitly when true. In the AI-assisted development era assume the code itself is cheap to replicate for everyone, so rate this force by the non-code barriers (distribution, data, compliance, integrations, segment relationships), and if none exist, rate it High and say the defensibility must come from speed of iteration plus segment ownership, not from the build. One nuance: where the wedge depends on sustained technical excellence (performance-critical paths, hard integrations, reliability at scale), deep engineering experience raises the bar for AI-only followers - treat that as a partial mitigant, not a full barrier.
3. Bargaining power of buyers - concentrated big customers or many small ones? Can they easily compare and switch?
4. Bargaining power of suppliers - includes platform dependency: if the idea lives on top of an API, app store, or marketplace, that platform is a high-power supplier. Flag existential platform risk (the platform could build the feature natively).
5. Threat of substitutes - different-shaped solutions to the same job, including manual processes, spreadsheets, and "do nothing". For most B2B SaaS ideas the real competitor is a spreadsheet.

Conclusion to draw: if 4-5 forces are High, even a well-executed product fights for thin margins - this should weigh heavily toward PIVOT/DROP regardless of how nice the idea sounds.

## Competitor comparison table

Columns: competitor, target segment, pricing, key capabilities, strengths, documented weaknesses, traction signals.

The "documented weaknesses" column is the most valuable in the whole report - populate it from actual user complaints found during research (review sites, forums), quoting the pattern of complaints in your own words (for example "recurring complaints about slow support and per-seat pricing"). Include an "indirect / substitute" row group. Add the idea as the final row so the gap it fills (or fails to fill) is visible at a glance.

Execution-gap sub-table (for app ideas in occupied markets): below the main table, add a second table rating each major incumbent Low/Med/High (from review evidence, not intuition) on: performance and reliability, UI quality, UX flows, onboarding ease, everyday simplicity, pricing fairness. This makes the "where is the bar low" question answerable at a glance and directly feeds the wedge recommendation. If every incumbent rates High across the board, say so - it means the better-execution thesis is weak and the idea needs a different angle (segment focus, business-model change, distribution).

## Feature comparison matrix

Rows are capabilities, grouped into three bands; columns are each major incumbent plus the planned product; cells use the textual markers [ok] (has it well) / [słabo - cytuj skargę] (has it but poorly, cite the complaint) / [brak] (absent) - translate the bracket labels to the report language.

- Table stakes - every serious incumbent has it. The planned product's column must show [ok] or a stated, defensible reason for deferral in the wedge segment. [brak] here without justification is a credibility gap in the plan, and the report must flag it.
- Differentiators - present in only some incumbents. For each, say whether reviews show it actually drives purchase/switching decisions or is marketing shelf-ware.
- Requested-but-absent - demanded on feature boards/forums, delivered well by nobody. This band is where the market can be beaten on functionality; every row cites where the demand was observed (board, votes, thread).

Common mistakes: listing features from marketing pages without checking reviews on whether they work well (a badly executed feature belongs in the [słabo - cytuj skargę] cell, and is itself a gap); and padding the matrix with trivial capabilities to make the planned product's column look strong. Keep it to the 10-20 capabilities that plausibly influence a buying decision.

## Pain-point priority map

A ranked table converting the research's complaint mining into an action plan. Columns: pain, evidence (sources, recurrence), frequency (how many independent sources), intensity (language severity, 1-star concentration), switching trigger (did anyone report leaving over it), which incumbents suffer from it, and the feature/execution choice that resolves it.

Sort by switching-trigger status first, then frequency times intensity. The top 3-5 rows are, literally, the answer to "where do I press to pull customers away" - the how-to-win section and the recommended feature set must visibly draw from them. A pain nobody churns over can still support marketing copy, but must not be presented as the core wedge. If the map comes out empty (incumbents genuinely loved), that is decisive evidence against the better-execution thesis and must be said plainly in the verdict.

## SWOT (of the idea, not of a company)

- Strengths/Weaknesses are internal: the founder's resources, skills, unfair advantages, gaps.
- Opportunities/Threats are external: must cite research findings - a named competitor's gap, a growth statistic, a pending regulation.

Ban generic filler ("threat: competition may increase"). Every cell should be falsifiable and specific. No discernible unfair advantage should be listed as a weakness honestly - it's one of the strongest predictors of losing to a faster incumbent. Deep software-engineering experience combined with AI-assisted development is a real Strength - list it explicitly when the wedge involves product quality, technical depth, or iteration speed. Never list ordinary technical complexity of the build as a Weakness; the genuine weakness candidates are on the non-technical side (distribution reach, sales experience, domain relationships, capital).

## Porter's generic strategies (for "how to win")

Pick one primary strategy; straddling all three is the classic "stuck in the middle" failure:

- Cost leadership - win on price sustainably. Rarely available to a new entrant without a structural cost advantage; recommend only if research found one (for example automation of what incumbents do manually).
- Differentiation - win by being meaningfully better on a dimension buyers pay for. Must map to a documented incumbent weakness. Two legitimate forms for app ideas, often combined. Feature differentiation: shipping a requested-but-absent capability from the feature matrix, strongest when it resolves a documented switching-trigger pain and when incumbents structurally can't follow fast (legacy codebase, enterprise roadmap, conflicting business model). Execution differentiation: a faster/more reliable product, cleaner UI, shorter UX flows, self-serve onboarding where incumbents require training or a sales call, radical simplicity vs. incumbent bloat. Historical pattern worth citing when relevant: many winning products entered crowded categories on execution alone (for example simpler onboarding or a friendlier free tier against enterprise-feeling incumbents). Two honesty checks before recommending it: (1) the target dimension must show up in real complaints - "nicer UI" that nobody asked for is not a strategy; (2) name why users will actually switch (pain exceeds switching cost) or why the segment consists of new adopters with nothing to switch from.
- Focus (niche) - dominate a narrow segment incumbents underserve. Combines naturally with execution differentiation: "the simplest/fastest X for segment Y" is often the strongest resource-constrained play, not because the niche is empty, but because incumbents serve it with a bloated general-purpose product. Specify the exact niche and why incumbents structurally won't chase it (too small for them, requires local presence/language/compliance they lack, or polishing UX for that segment conflicts with their enterprise roadmap).

## Moat checklist

Assess which compounding advantages are realistically buildable in 2-3 years:

network effects, switching costs (data lock-in, workflow integration), economies of scale, brand in a niche, proprietary data, regulatory license or compliance certification others lack, exclusive distribution/partnerships.

"None obvious" is an acceptable and important answer - it means the idea can be a business but is vulnerable to fast followers, and the report should say so.

## Scoring rubric for the verdict

Score exactly six dimensions, each on a uniform 1-10 scale; report the number with a one-line justification anchored on a research finding:

- PCV (Perceived Created Value) - painkiller vs vitamin. 1 means a vitamin nobody would miss if it vanished tomorrow; 10 means a painkiller with researched evidence of people already paying to kill that exact pain. Mid-band: 4-6 is a real but tolerated annoyance, 7-9 is a pain with churn stories behind it. Reported first - it is the headline metric.
- Problem evidence - strength of behavioral Mom Test evidence only: past spending, churn stories, active workarounds (spreadsheets, hired help, glued-together tools). 1 means no trace anyone has this problem; 10 means abundant, recent, high-intensity evidence of money and effort already spent on it. Declared intent scores nothing - survey interest, upvotes, and "would you buy this" answers move this dimension by zero regardless of volume.
- Autopilot operability - the estimated post-launch maintenance load against the capture's `# Maintenance budget`. 1 means the founder sits in the loop of every sale and every support case; 10 means a fully self-serve path (signup, payment, refund, docs-first support) with the estimated maintenance clearly inside the budget. A load clearly above the budget scores 3 or below.
- Monetization vs CAC - researched willingness to pay against researched acquisition cost. 1 means no plausible channel pays back inside 60 days, or the capture's `# Income target` is out of reach for the niche at any defensible price; 10 means a researched channel with payback near the 7-day gold standard and the target plausibly covered by a reachable customer count.
- MVP feasibility within the cap - the hard 2-4 calendar-week cap on solo work. 1 means the core value cannot be delivered inside the cap even AI-assisted; 10 means it fits comfortably inside the cap with room for the at-most-one differentiator that survives the first-paying-customer test. Score the build on the experienced-engineer plus Claude Code baseline; scope that overflows the cap belongs in the backlog, not in a lower score, unless what remains no longer closes a first paying customer.
- Solo-founder distribution access - 1 means enterprise sales, gatekept channels, partnership dependency, or a brand budget the founder does not have; 10 means a self-serve channel one person can operate alone (SEO, app-store search, a community the founder already belongs to, marketplace listing).

Guideline, not formula: total of 36 or more with no dimension at 2 or below leads to BUILD; a score of 3 or less on PCV, problem evidence, or autopilot operability forces PIVOT or DROP regardless of total; otherwise PIVOT territory - the analysis, not the arithmetic, makes the call, and the report must explain it.

## Assumption risk map

Order the capture's remaining assumptions by impact-if-false times current uncertainty, highest first. The top row after The Riskiest Assumption defines what to test next - that is the map's only job, so each row carries the concrete signal that would falsify the assumption.

Assumptions the research confirmed or broke drop out of the map entirely: they are settled findings, and belong in the analysis, not in a list of open risks. If fewer than two assumptions survive as open, the map may collapse to a single row - state that explicitly ("research settled the rest") rather than padding it back to length with restated findings.

## Mom Test rules for experiment questions

Questions for the 48-hour experiment ask about the past and the concrete:

- What did you do the last time this problem hit?
- What did it cost you (time, money, a lost customer)?
- What have you already paid for to solve it, and what happened to that tool?
- How did you find that tool?

Hypotheticals are banned - "would you use it", "would you pay for X", "how much would you pay" produce answers that predict nothing. Compliments and generic enthusiasm ("great idea", "I'd definitely use this") are recorded as zero evidence; only a past action, a past payment, or a commitment of time, money, or reputation counts.
