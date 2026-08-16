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

Conclusion to draw: if 4-5 forces are High, even a well-executed product fights for thin margins - this should weigh heavily toward PIVOT/NO-GO regardless of how nice the idea sounds.

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

Score 1-5 each; report the number with a one-line justification:

- Problem evidence: 1 means no trace of anyone complaining; 5 means abundant, recent, high-intensity complaints.
- Market attractiveness: 1 means small and shrinking; 5 means large or fast-growing, sourced.
- Competitive intensity (inverted): 1 means incumbents are beloved (high ratings, few complaints), price wars, prohibitive switching costs; 5 means incumbents exist but are complacent, with documented dissatisfaction and a low execution bar.
- Differentiation potential: 1 means the idea is a feature clone with no execution or feature edge; 5 means a clear gap mapped to documented complaints - an execution gap (speed, UI, UX, onboarding, simplicity) and/or a requested-but-absent feature that is a documented switching trigger.
- Feasibility with stated resources: 1 means it needs capital/skills the founder lacks by an order of magnitude, or is blocked by non-compressible constraints (distribution, compliance, data); 5 means it's achievable with the stated budget/timeline on the experienced-engineer plus Claude Code baseline - score the build optimistically (including technically ambitious scope), the go-to-market realistically.

Guideline, not formula: total of 18 or more with no dimension at 1 leads to GO; a single 1 on problem evidence or feasibility leads to NO-GO or PIVOT regardless of total; otherwise PIVOT territory - the analysis, not the arithmetic, makes the call, and the report must explain it.
