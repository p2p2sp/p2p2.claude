# Scorecard dimensions

Nine dimensions. Each gets: score 1-5, one-paragraph justification, evidence (URLs or `no data found`), confidence (high / medium / low), primary owner on the council, and any member who disagrees with the score.

Confidence rule: `high` = two or more independent sources agree; `medium` = one solid source or two weak ones; `low` = inference only or `no data found`. A council dispute of 2+ points on a dimension makes it `low`.

## Contents

- Dimensions, weights, owners
- Score anchors (1-5)
- Side-project fit protocol -> `08-side-project-fit.md`
- Autopilot fit protocol -> `09-autopilot-fit.md`
- Verdict rules (applied by the moderator in step 12)

## Dimensions, weights, owners

Format: number, dimension (weight, primary owner): question.

1. Problem strength (**2**, Target customer): Is this painful, frequent, and already costing people something?
2. Market size (1, Market analyst): Are there enough buyers for a side project to earn meaningfully?
3. Competition (1, Market analyst): How crowded, and is there whitespace?
4. Advantage / defensibility (1, Visionary): Why won't this be copied in a week?
5. Revenue model (1, Target customer): Will the intended way of charging work for this buyer?
6. Distribution (**2**, Growth): Does the user have a channel today, or start from zero?
7. Timing (1, Market analyst): Why now?
8. Side-project fit (1, Operator): Can it be built and launched within the user's constraints?
9. Autopilot fit (1, Operator): Will it run without the user after launch?

Weighted total = sum(score x weight) / sum(weight) = sum / 11, shown as `x.x / 5`.

Why Distribution and Problem strength carry double weight: with an AI agent doing the build, feasibility stops separating good ideas from bad ones. The two things a solo builder cannot generate on demand are a real problem and a way to reach the people who have it.

## Score anchors (1-5)

Use these so two runs are comparable. "Evidence" means research files 03-09.

**Problem strength**
- 1: no one describes this problem unprompted; workaround is fine
- 2: mentioned occasionally; workaround is mildly annoying
- 3: recurring complaints; workaround costs real time or money, but people tolerate it
- 4: frequent, emotional complaints; people already pay for partial fixes
- 5: people hack together solutions, pay for bad ones, and ask publicly for a better one

**Market size**
- 1: SOM too small to matter even at high share
- 2: niche; a few hundred realistic buyers
- 3: thousands of realistic buyers, modest ARPU
- 4: tens of thousands of buyers or high ARPU
- 5: large and reachable with a clear bottom-up path

**Competition** (higher = better for the idea)
- 1: dominated by a free or entrenched incumbent, no whitespace
- 2: crowded, weak differentiation
- 3: several players, visible gaps in reviews
- 4: few players, clear underserved segment
- 5: empty space AND evidence the problem is real (empty because no one wants it scores 1, not 5)

**Advantage / defensibility**
- 1: a clone is one prompt away and nothing accumulates
- 2: copyable; some execution edge
- 3: one asset compounds (data, content, integration, community)
- 4: hard-to-get integration, proprietary data or relationships
- 5: structural lock-in or a moat competitors cannot buy

**Revenue model**
- 1: buyer won't pay; the value accrues to someone else
- 2: pays only after sales effort
- 3: will pay, price point unclear
- 4: comparable products prove the price point
- 5: self-serve, impulse-purchasable, proven price band

**Distribution**
- 1: no channel, no audience, competitive SEO, paid ads unviable
- 2: one plausible channel, untested
- 3: a channel with early evidence (community access, a listing, small audience)
- 4: an owned audience or marketplace placement that already exists
- 5: built-in distribution (existing users, partner, viral loop with evidence)

**Timing**
- 1: window closed or nothing changed
- 2: no particular reason for now
- 3: a recent enabling change exists
- 4: strong tailwind (new platform, regulation, cost collapse)
- 5: urgent shift plus incumbents slow to react

**Side-project fit** and **Autopilot fit**: see the protocols below.

## Side-project fit protocol -> `08-side-project-fit.md`

Question: can the user build and launch this within their stated weekly hours and constraints?

Sub-factors, as name (weight inside this dimension): notes.

- Time to MVP, code (low, informational): the agent writes it. Report an estimate but never let it drive the score.
- Time to MVP, non-code (high): product decisions, third-party integrations and API approvals, legal (privacy policy, terms, payments, invoicing, VAT), content, onboarding copy, marketing assets. This is where side projects die.
- Maintenance hours / month (high): from Autopilot fit, layer 3.
- Channel access (highest): mirror of the Distribution score; a side project without a channel has no launch.
- "Why not cloned in a week" (medium): mirror of Advantage.
- Abandonability (medium): can it be shut down without harming users or leaving obligations (subscriptions, data custody)?
- Value even at zero revenue (low): portfolio, learning, network; counts, but cannot rescue a bad score.

Scoring: 5 if non-code MVP ≤ 2 weeks of the user's stated hours, channel ≥ 3, abandonable; 3 if non-code MVP ≤ 2 months and at least one of channel/abandonability is weak; 1 if non-code MVP exceeds 3 months of stated hours or the project cannot be abandoned cleanly. Interpolate and justify.

## Autopilot fit protocol -> `09-autopilot-fit.md`

Question: after launch, how many hours per week does this need from the user?

Estimate hours/week per layer, then the total as a range (e.g. "2-4 h/week").

**Layer 1 - Acquiring customers without a human**
- Self-serve channels: SEO, marketplaces (App Store, Chrome Web Store, Shopify apps, Product Hunt), integrations inside other ecosystems, paid ads with a stable CAC
- Disqualifiers: demos, sales calls, negotiation, contracts (B2B enterprise is a hard no)
- Price allows impulse purchase (card, no invoices-on-request, no procurement)

**Layer 2 - Delivering without a human**
- Digital / SaaS / API vs a service with a human inside
- Self-serve onboarding
- No content that ages, no moderation, no manual QA
- Two-sided marketplaces are out (supply/demand balancing is a full-time job)

**Layer 3 - Maintaining without a human**
- Support load: simple product + FAQ + an AI first line; count what still escalates
- Dependency stability: number of external APIs; any single decision by a third party that kills the product
- Recurring legal/admin: GDPR requests, multi-country tax, licences, renewals
- Abuse surface: spam, fraud, chargebacks, credential stuffing

**Autopilot killers**: list each detected killer with a proposed fix: `remove` (drop the feature), `automate` (name how), or `redesign` (change the model). If a killer has no fix, say so; that is a finding.

Map the total hours/week after launch to the score:
- ≤ 1: 5
- over 1 to 3: 4
- over 3 to 6: 3
- over 6 to 10: 2
- over 10: 1

Principle: 100% autopilot does not exist; a few hours a month is the realistic ceiling. Every "it sells itself" in the idea is a hypothesis for the experiment plan, not a fact.

## Verdict rules (applied by the moderator in step 12)

1. Compute the weighted total.
2. **The verdict is never more confident than the weakest key dimension.** Key dimensions = Problem strength, Distribution, Autopilot fit. If any key dimension scores ≤ 2, the verdict cannot be Go regardless of the total; it is Pivot (if the weak dimension is fixable by changing the idea) or No-Go (if it is structural).
3. Go: total ≥ 3.5 and no key dimension ≤ 2. With a `low`-confidence key dimension, Go is allowed only as "Go, conditional on experiment X" (`verdict.conditional_on`), and X is first in the experiment plan.
4. Pivot: total from 2.5 to below 3.5, or a fixable key weakness. The synthesis names what to change.
5. No-Go: total below 2.5, or a structural key weakness, or a council-identified killer with no fix.
6. Council dispute on a dimension: the scorecard shows the range (`2-4`) and the total uses the primary owner's score; never average. Confidence follows the confidence rule at the top.
