# Jobs catalog - what to point the sweep at

Every job is the same formula, Impact x Opportunity, over two cheaply-measurable signals. Pick the job that matches the user's goal, then write its signal pair into `.temp/viber/code-auditor/<run-id>/job.md` so the whole swarm scores against the same definition.

Impact = how much pain it touches if we fix it. Opportunity = how bad it is right now, and how fixable today.

## Code
- Tech debt - Impact: churn x dependents. Opportunity: complexity, size, how tangled it is.
- Dead code - Impact: size of the file or module. Opportunity: confidence it is truly unused - no callers, no imports, no route, no test references.

## Reliability (default for "find bugs / review / audit")
- Bugs - Impact: change frequency x blast radius. Opportunity: hotfix blame - how often the file appears in commits messaged fix/hotfix/revert. A file that keeps getting emergency-patched is where the next bug lives.
- Coverage - Impact: blast radius. Opportunity: coverage gap - untested branches, no tests touching it.
- Consistency - Impact: how widely the helper or pattern is relied on. Opportunity: drift from the project's stated conventions.

## Cost
- Spend - Impact: dollar spend attributable to the component (infra, API calls). Opportunity: visible waste, N+1, no caching.
- Performance - Impact: run frequency (per request, per row). Opportunity: algorithmic cliffs, sync I/O in a loop.

## Growth
- Conversion - Impact: traffic reaching the surface. Opportunity: drop-off at that step.
- SEO - Impact: organic or potential traffic to the page. Opportunity: ranking gap.

## Choosing and combining
- Security or bug audit of a large codebase: run Reliability/Bugs as the primary job and Code/Tech debt as a secondary lens. A file that is both a bug magnet and high-churn debt is the strongest hotspot.
- Growth and Cost jobs need telemetry the repo alone does not contain. Without those signals, say so and fall back to a Code or Reliability job - never invent numbers.
- Two jobs in one sweep: scouts emit two impact/opportunity pairs, each job ranks separately, then union the hotlists.
- Whichever job you pick, the run's repo profile narrows its Opportunity signal: `job.md`'s `## Repo profile` section lists under `## Bug classes from history` the classes this repo actually keeps re-fixing, so score Opportunity against those recurring classes rather than against generic badness.
