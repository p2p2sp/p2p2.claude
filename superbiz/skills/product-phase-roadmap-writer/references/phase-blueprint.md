# Phase blueprint - default skeleton, section template, and benchmark starting points

Read during the structure step. Adapt everything to the product and the validation report; this file is the default shape, not a straitjacket. Benchmark numbers below were sourced in August 2026 - they are STARTING POINTS for your runtime research, and every number you actually put in the output must be re-verified or re-sourced at generation time.

## Per-phase section template

Every phase file uses these sections, in this order (headings translated to the output language):

```
# Faza N - [nazwa]
Jedno zdanie: co ta faza ma udowodnić lub dostarczyć.

## Cel
2-4 zdania. What exists at the end that didn't at the start, and what
question about the business this phase answers.

## Kryteria wyjścia (bramka)
2-4 measurable criteria with numbers + explicit "co jeśli nie":
iterate (what to change), pivot (to what), or stop. One criterion should
be the cheapest possible kill-switch for the phase's core assumption.

## Zakres produktowy
What gets built/changed in the product this phase. Reference the
validation report's feature lists (table stakes / differentiators /
deferred). Explicit NON-goals - what is deliberately not built yet and why.

## Kroki krok po kroku
- [ ] Ordered checkbox steps, each with a rough time estimate
      (solo + Claude Code baseline) and, where relevant, a one-clause
      trace to the report finding or best practice that justifies it.
Group with sub-headings if >15 steps.

## Działania marketingowe i dystrybucyjne
Same checkbox rigor as build steps: channel - concrete action -
time estimate - expected signal (e.g. "50 zapisów", "10 rozmów").
Never "do marketing" - always a specific act in a specific channel.

## Metryki i benchmarki
Table: metric - your target - published benchmark (with attribution) -
how measured (tool/event). Only metrics that gate decisions this phase.

## Narzędzia
Minimal stack for this phase with one-line rationale each. Prefer
free/cheap tiers pre-revenue; note vendor availability for the user's
country (billing, invoicing).

## Ryzyka i plan B
2-4 phase-specific risks tied to findings (not generic filler), each
with a mitigation or fallback.

## Czas i koszt
Duration estimate (calendar), founder-hours split build vs. marketing,
cash cost.
```

## Default phase skeletons

### Faza 0 - Fundament (typically 1 week, runs partly in parallel with Faza 1)

Core content: final positioning statement (for whom, unlike whom, one-line promise, lifted from the validation report's wedge); ICP (Ideal Customer Profile) narrowed to one sentence - published checklists warn that vague "SMB" targeting slows validation, so narrow to something like "1-15-person SaaS teams sensitive to per-user pricing" (LaunchList SaaS Launch Checklist, 2026); name + domain + basic brand tokens (logo can be minimal); analytics decision (pick one product-analytics tool and one simple web-analytics tool; instrument from day one - only ~17% of companies track time-to-value, which is a competitive gap to exploit, GTM8020 PLG statistics, 2026); legal groundwork for the target geography (privacy policy, ToS, and for EU customers a DPA/GDPR story - skipping basic compliance measurably hurts early trust in B2B, DesignRevision launch checklist, 2026); budget envelope (indie launch budgets commonly land in the low hundreds of USD pre-revenue, LaunchList, 2026).

Exit criteria pattern: positioning survives 5 ICP conversations without rewording; domain live; analytics events defined on paper.

### Faza 1 - Landing page + waitlista (typically 2-4 weeks, keep running until launch)

Build: single-purpose page - one outcome-driven headline (problem-first, not feature-first), one CTA above the fold, email-only form, social proof placeholder, mobile-tested, fast (LaunchList waitlist examples, 2026; TwoCents, 2025). CTA copy should say "waitlist"/"early access" honestly (Moosend, 2026). Referral mechanic optional but cheap to add early (Waitlister, 2025).

Traffic sequence from published pre-launch playbooks (LaunchList 90-day playbook, 2026): week 1 ship page; week 2 warm network (personal DMs convert ~30-60% vs ~5-10% for mass email); week 3 soft-posts in 2 communities the founder already belongs to; week 4 conversion audit - iterate the headline first, it is the highest-leverage element.

Benchmarks to re-verify at runtime: well-optimized waitlist pages convert ~15-40% on warm traffic, ~2-5% on B2B cold traffic (GetWaitlist benchmarks via SwipePages, 2025/2026); generic SaaS landing median ~3.8% (Apexure via SwipePages, 2026). Waitlists older than ~90 days decay hard - one documented case saw ~0% conversion for 6-month-old signups (Waitlister, 2025) - so don't let the waitlist phase drag long past MVP readiness.

Exit criteria pattern: N signups (rule of thumb from published checklists: ~10x the target number of launch-day customers, LaunchList, 2026) AND conversion at or above threshold on warm traffic AND X or more discovery conversations booked from the list. Kill-switch: if warm-traffic conversion stays very low after two headline iterations, revisit positioning before writing product code.

### Faza 2 - MVP + zamknięta beta (typically 4-10 weeks on the solo + Claude Code baseline)

Build scope = the validation report's MVP table stakes, nothing more; explicit non-goals = the report's justified deferrals. The single gate from published MVP checklists: a brand-new user must reach core value end-to-end without the founder in the room (SpeedMVPs MVP checklist, 2026). Include: error tracking + basic funnel events live before beta; terms/privacy published; billing wired even if unused (a pricing dry-run with pilot customers beats guessing - research-backed pricing correlates with hitting revenue goals, DesignRevision, 2026).

Beta: 20-50 users from the waitlist + any committed first customer as a PAID pilot (payment is the only honest validation signal); watch sessions, fix the obvious breakage, run weekly feedback loop. If the product itself is a feedback tool, dogfood it for its own beta feedback.

Exit criteria pattern: N or more active pilot teams using the core flow weekly; first payments collected; activation of new beta users above a floor; the committed first customer renews/expands. Kill-switch: pilots that stop logging in within 2 weeks signal a value problem no launch will fix.

### Faza 3 - Launch publiczny (1-2 weeks of events after 2-3 weeks of prep)

Soft launch first (limited group, infrastructure + funnel shakedown), then hard launch (DesignRevision, 2026). Channel set chosen by runtime research for the specific audience - typical for dev/founder-audience SaaS: Product Hunt (verify current relevance; skip if audience is strictly enterprise - LaunchList, 2026), niche communities, directories/comparison listings, and for products displacing an incumbent: migration/import guides and honest "vs X" comparison pages. Launch-day operations from published guides: go live early in the platform's day, respond to every comment fast, publish the "why we built this" story across channels (DesignRevision, 2026; Techhubme PH guide, 2026).

Prep checklist: assets (screenshots, 60-90s demo), hunter/supporter outreach done weeks earlier, waitlist warmed with a launch-date email sequence, status page live if that's part of the product promise.

Exit criteria pattern: signups target (indie SaaS launch-day norms are commonly cited in the low hundreds - re-verify at runtime, DesignRevision, 2026), first non-network paying customers, at least one repeatable acquisition channel identified (not just launch spike).

### Faza 4 - Wzrost do pełnego zakresu (rolling; plan the first 2 quarters)

Two parallel tracks:

Product track - trigger-shipped deferrals. Each deferred module from the validation report gets a shipping trigger, e.g. "AI-deduplication when median board exceeds N posts", "knowledge base when X or more pilot customers ask", "integration Y when N or more paying customers name it as blocker". No calendar-date feature promises.

Growth track - activation, retention, engine. Structure by the product-led AARRR adaptation: Acquisition, Activation, Revenue, Retention/Expansion - each stage feeds the next, so fix activation before scaling acquisition (Appcues PLG metrics guide, 2026). Benchmarks to re-verify at runtime: free-to-paid conversion averages ~3-5% (top performers 8-12%); time-to-first-value under 24h is top-tier (Arcade SaaS marketing playbook, 2026); month-1 retention averages ~47% in PLG products (GTM8020, 2026); first-week retention target 60%+ for business apps (Lendman PLG benchmarks). Retention cohort curves are the primary product-market-fit signal - flat curves before scaling spend (xGenious PMF guide, 2026). Content/SEO engine: comparison and alternative pages, plus local-language content where competition is thin (a validated tactic when incumbents ignore a language market). Pricing iteration checkpoint each quarter against the report's pricing assumptions.

Exit criteria pattern (per quarter): retention curve flattening at or above X%, one channel delivering Y or more signups/month repeatably, MRR milestone; explicit review: does the wedge still hold against incumbent moves observed since launch?

## Research query suggestions for runtime refresh

Adapt to the product; run during the web refresh step:
- "waitlist landing page best practices {current year} conversion benchmarks"
- "SaaS launch checklist {current year}"
- "Product Hunt launch guide {current year}" (or the channel research indicates)
- "product led growth activation retention benchmarks {current year}"
- "{product category} marketing channels" and "{competitor} migration guide" when displacing incumbents
- local-market queries when GTM includes non-English geographies (e.g. billing/invoicing providers, communities)

## Source starting points (gathered Aug 2026, re-verify before citing)

- LaunchList - SaaS Launch Checklist & Pre-Launch Playbook & waitlist examples - getlaunchlist.com
- SwipePages - waitlist conversion benchmarks (citing GetWaitlist, Apexure) - swipepages.com
- Waitlister - waitlist strategy, list-decay data - waitlister.me
- Moosend - waitlist landing page practices - moosend.com
- SpeedMVPs - MVP launch checklist - speedmvps.com
- DesignRevision - SaaS launch checklist - designrevision.com
- Techhubme - Product Hunt launch strategies - techhubme.com
- Appcues - PLG metrics (AARRR adaptation) - appcues.com
- Arcade - SaaS marketing playbook benchmarks - arcade.software
- GTM8020 - PLG statistics - gtm8020.com
- xGenious - PMF signals / retention cohorts - xgenious.com
