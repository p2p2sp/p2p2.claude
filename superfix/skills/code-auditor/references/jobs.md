# Jobs catalog - what you can point it at

Every job is the same formula: **Impact × Opportunity**, where each side is a
concrete, cheaply-measurable signal. Pick the job that matches the user's goal,
then tell every scout to score `impact` against the Impact signal and
`opportunity` against the Opportunity signal listed here. Write the chosen pair
into `.temp/code-reviewer/<run-id>/job.md` so the whole swarm scores consistently.

> Impact = "how much pain it touches if we fix it."
> Opportunity = "how bad / hard it is right now, and how fixable today."

## Code

### Tech debt
- **Impact** - git churn (commits touching the file in the window) × number of
  dependents/importers. Code that changes a lot and is depended on a lot hurts most.
- **Opportunity** - complexity / size and how tangled it is. High complexity =
  lots to win by untangling.

### Dead code
- **Impact** - size of the file/module (how much it weighs the codebase down).
- **Opportunity** - confidence that it is actually unused (no callers, no
  imports, no route, no test references). High confidence-unused = safe, real win.

## Reliability  *(default for "find bugs / audit")*

### Bugs
- **Impact** - change frequency × blast radius (how reachable from entry points,
  how many callers downstream).
- **Opportunity** - hotfix / revert "blame": how often this file appears in
  commits messaged fix/hotfix/revert. A file that keeps getting emergency-patched
  is where the next bug lives.

### Coverage
- **Impact** - blast radius (how much breaks if this is wrong).
- **Opportunity** - coverage gap (untested branches, no tests touching it).

### Consistency
- **Impact** - usage (how widely this helper/pattern is relied on).
- **Opportunity** - rubric drift (divergence from the project's stated
  conventions / the pattern used elsewhere).

## Cost

### Spend
- **Impact** - dollar spend attributable to the component (infra, API calls).
- **Opportunity** - how optimizable it looks (obvious waste, N+1, no caching).

### Performance
- **Impact** - run frequency (hot path, called per request / per row).
- **Opportunity** - slowness (algorithmic cliffs, sync I/O in a loop, big-O smell).

## Growth

### Conversion
- **Impact** - traffic reaching the surface (paywall viewed, button clicked).
- **Opportunity** - drop-off at that step (the gap between reach and conversion).

### SEO
- **Impact** - organic traffic / potential traffic to the page.
- **Opportunity** - ranking gap (how far from where it could rank).

---

## Choosing & combining jobs
- For a security/bug audit of a large codebase, run **Reliability → Bugs** as the
  primary job and **Code → Tech debt** as a secondary lens; a file that is both a
  bug magnet and high-churn debt is the strongest hotspot.
- Growth/Cost jobs need telemetry the repo alone does not contain (traffic,
  spend). If those signals are not available, say so and fall back to a Code or
  Reliability job rather than inventing numbers.
- You can run two jobs in one sweep by having scouts emit two impact/opportunity
  pairs; rank each job separately, then union the hotlists.
