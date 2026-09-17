# superbiz

## Purpose

The business-analysis plugin. ONE user-only skill, `idea-validator`
(`disable-model-invocation: true`), argument `[idea text | path/to/idea.md] [--quick]`. Answers
one question: is this idea worth turning into a side project - judged as a side-income product
that runs on autopilot after launch, not a venture-scale startup, treating the build as cheap
and therefore non-differentiating. Ships NO hooks, NO manifest, NO agents - it does not route at
all, and fans out with the `Agent` tool using `general-purpose` subagents rather than declared
agents or `Skill` forks.

## Entry points

- `skills/idea-validator/SKILL.md` - fifteen fixed steps, always in the same order so two ideas
  stay comparable. Verify the exact step list from the skill body rather than a remembered
  count; roughly: intake (batched `AskUserQuestion`) -> Lean Canvas + hidden assumptions -> risk
  hypotheses -> three parallel research subagents (problem/market/competition) -> business
  model/distribution/side-project-fit/autopilot-fit analyses -> a seven-member council over two
  rounds (round 2 skipped only with `--quick`) -> moderator synthesis (Go/Pivot/No-Go +
  mandatory dissent) -> experiment plan + pre-committed thresholds -> `scripts/build_report.py`
  renders `report.html`.
- `skills/idea-validator/references/council/` - the 7 member prompts (customer, skeptic,
  analyst, growth, operator, risk, visionary) - prompted subagents, not declared agents.
- `skills/idea-validator/scripts/build_report.py` - the repo's only Python script (stdlib
  only); validates the assembled JSON and exits 1 listing what is missing rather than rendering
  a bad report.

## Contracts & invariants

- Subagents, not sibling skills: heavy work stays out of main context via the `Agent` tool (3
  research + 7 council x 2 rounds); each receives file paths, never pasted content, and writes
  its own numbered file into the run dir.
- Council isolation is the product: round-1 members never see each other's output or the
  expected verdict; unanimity without reservations is a FAILURE signal, not confidence.
  Disagreement is preserved, never averaged - a 2+ point council dispute forces that dimension's
  confidence to `low` and shows the range.
- The script owns the deliverable: the HTML is never hand-written or hand-edited. A failed
  validation is fixed in the JSON, not by patching the renderer's output.
- Evidence or "no data found": every report number carries a source URL or is marked missing;
  an estimate is allowed only when labelled as one with its method shown.
- Deliverable split: numbered working files (00-13, `report-data.json`) live under
  `.temp/superbiz/<slug>-<YYYY-MM-DD>/`; the rendered `report.html` lands under
  `docs/business/<idea-slug>/` in the host repo - never the reverse.

## Anti-patterns

- Letting the moderator add arguments of its own or attribute an unsourced sentence to a member.
- Averaging a council disagreement into a single confident number instead of showing the range.
- Hand-editing `report.html` instead of fixing the source JSON and re-running the renderer.

## Related context

- Root cross-plugin invariants: `../CLAUDE.md`
- superbiz declares no cross-plugin chains; its single skill has nothing to chain to in-plugin.
