# Spec: superbiz business-idea-validator - side-income autopilot validation profile

## Problem / context (Why)

The `business-idea-validator` chain currently judges every idea as a full-scale venture: the researcher applies an investor/acquirer lens (investor relationships, exit readiness, MRR health), weighs market attractiveness like a startup bet, and can issue GO for an idea that would consume the founder full-time after launch. A user who wants a supplementary-income product - built alongside a day job, running on autopilot once launched - gets verdicts calibrated to the wrong ambition: a solid small side product can score poorly on startup metrics, and an operations-heavy idea can still pass. The report also stops at a list of validation experiments instead of isolating the single assumption whose failure kills the idea and a cheap way to test it, and nothing in the chain guards against the model's tendency to praise the user's idea.

## Goal (What)

- The validator chain (entry skill + researcher fork) assesses a business idea as a supplementary-income product that runs on autopilot after launch: no founder action required in the customer-service path, easy maintenance, income that supplements rather than replaces the user's main income.
- The verdict is BUILD, PIVOT, or DROP, backed by a six-dimension 1-10 scoring rubric with PCV (Perceived Created Value) as the headline metric, and hard gates: a low score on autopilot operability, PCV, or problem evidence breaks the verdict regardless of the total.
- Cloning an existing successful product is a first-class winning strategy (better-executed with narrower scope, prettier, local-market/niche, fairer pricing), and evidence that something similar already earns counts in the idea's favor.
- The report names exactly one riskiest assumption, maps the remaining assumptions by risk, and hands the user a 48-hour no-code experiment with Mom Test-compliant interview questions, so the idea can be tested before anything is built.
- The chain is anti-sycophantic: neither the entry interview nor the report praises the idea except where a research finding backs the praise.
- The entry skill's intake, capture format, council framing, and CSO trigger description all reflect the side-income premise; the repo's documentation of the validator (plugin CLAUDE.md, root CLAUDE.md, README) is synced to the new profile.

## Out of scope

- `product-phase-roadmap` and `product-phase-roadmap-writer` - they consume the report generically and are not touched.
- `council-this`, `council-this-chairman`, and the five council persona agents - the mandatory council round stays exactly as is; only the council capture content written by the validator changes.
- Tests, hooks, manifests, `plugin.json` (no skill is added, removed, or renamed), and version bumps (tag-driven).
- Fixing stale documentation unrelated to the validator paragraphs being edited.

## User scenarios

- As a developer with a day job describing a side-product idea, I want the verdict to judge it as an autopilot income supplement so that I do not receive advice calibrated to building a venture-scale startup.
- As a user whose idea requires ongoing manual founder work to serve customers, I want the validator to break the verdict on autopilot operability so that I am not told to build something that will consume my evenings indefinitely.
- As a user who wants to clone an existing successful product (better, narrower, prettier, or local), I want the clone path treated as a legitimate strategy with a named recommendation so that "the market is occupied" reads as demand evidence, not as a disqualifier.
- As a user reading the finished report, I want one clearly named riskiest assumption and a ready 48-hour no-code experiment so that I can invalidate the idea cheaply before writing any code.
- As the plugin maintainer, I want the validator's frontmatter description and the repo documentation to describe the side-income profile so that routing and orientation stay truthful after the change.

## Acceptance criteria

1. The researcher's rubric (SKILL.md plus `references/frameworks.md`) scores exactly six dimensions on a uniform 1-10 scale: PCV (painkiller vs vitamin), problem evidence (real past behavior and spending, never declared intent), autopilot operability, monetization vs CAC with a sub-60-day payback stress-test, MVP feasibility within a hard 2-4 week calendar cap, and solo-founder distribution access - each with per-band scoring anchors.
2. The verdict guideline appears in the rubric verbatim or equivalently: a total of 36 or more with no dimension at 2 or below leads to BUILD; a score of 3 or less on PCV, problem evidence, or autopilot operability forces PIVOT or DROP regardless of the total; everything else is PIVOT territory, with the written analysis - not the arithmetic - making the final call (that softness is the deliverable, mirroring the current rubric's "guideline, not formula" stance).
3. The researcher returns `REPORT: <path> | VERDICT: <BUILD|PIVOT|DROP> | <one-sentence reason>`, the entry skill's parsing and relay steps reference the same three labels, and the report's verdict headline uses the report-language translation (BUDUJ / PIVOT / ODPUSC in Polish, BUILD / PIVOT / DROP in English).
4. The report template's verdict section is self-sufficient (verdict, top reasons, and the six-dimension 1-10 scoring table with PCV first), and the template contains: a section naming exactly one riskiest assumption, an assumption-risk map ordering the remaining assumptions by what to test first, and a 48-hour no-code experiment scenario that includes Mom Test-compliant interview questions (asking about past behavior and past spending, never "would you buy this").
5. The report template's investor and exit readiness section is replaced by an autopilot economics section covering estimated maintenance hours per month, the self-serve customer path (onboarding, payments, refunds, FAQ-first support), churn resilience without active selling, and a micro-exit optionality paragraph (marketplace sale at roughly 3-4x annual profit, clean records raising the price).
6. The report template's recommended feature set is split into an MVP core buildable within the 2-4 week cap and a post-launch backlog, and the MVP core is aggressively minimal: anything not required for the first paying customer moves to the backlog.
7. The researcher's context sections contain no investor/acquirer lens; instead they carry the autopilot-economics lens, an occupied-markets context extended with the four-entry clone-strategy catalog (the "how to win" section must name the recommended clone strategy when one applies), retained habits rephrased for side income (monetization from day one, one distribution channel, sub-60-day CAC payback), and an AI-assisted-development context stating that AI assistance grows what fits inside the 2-4 week cap but never lifts the cap.
8. Both skills carry an explicit anti-sycophancy rule: the researcher ties every concern and every positive claim to a cited research finding, and the entry skill never compliments or endorses the idea during the interview.
9. The entry skill's intake asks for acceptable maintenance hours per month and the target supplementary income, and the validator capture format carries both as headings; both inputs feed the scoring, not just narrative: autopilot operability is scored against the user's stated acceptable hours (an estimated maintenance load clearly above that budget yields a gate-breaking score), and the monetization vs CAC dimension assesses whether the researched niche can plausibly deliver the stated income target on autopilot.
10. The entry skill's restate-and-confirm step states the side-income autopilot premise before dispatch, so a user whose ambition is venture-scale learns what lens the verdict uses and can stop or reframe there; the council capture's `# Question` frames the decision around the same premise while still never stating the researcher's verdict.
11. The validator's frontmatter `description:` keeps the existing broad idea-validation triggers and do-not-use exclusions (it remains the plugin's only validator), adds side-income phrasing triggers (side project, passive income, product alongside a day job, "dodatkowe źródło dochodu"), and states the side-income autopilot profile so routing conveys what the verdict means; the validator paragraphs in `superbiz/CLAUDE.md`, root `CLAUDE.md`, and `README.md` describe the same profile - with the edited sentences no longer claiming the researcher or chairman is "an opus fork".
12. The chain mechanics are unchanged: same capture paths and `capture:` labeled-line dispatch, mandatory council round after a successful report, roadmap offer as the final step, and artifacts still at `docs/business/<idea-slug>/`.

## Constraints / assumptions

- All skill-source edits obey `.claude/rules/_skills.md`: bullets over prose, document only the delta from defaults, routing guard stays in frontmatter `description:` only, no caller narration in bodies, no italics/tables/emoji in skill sources - the existing carve-out letting `report-template.md` mandate tables in the generated report remains.
- Skill and reference content stays in English; the generated report's language rules (translate headings and tier labels to the capture language) are unchanged.
- The change is markdown-only across exactly seven files: `superbiz/skills/business-idea-validator/SKILL.md`, `superbiz/skills/business-idea-validator-researcher/SKILL.md`, `superbiz/skills/business-idea-validator-researcher/references/frameworks.md`, `superbiz/skills/business-idea-validator-researcher/references/report-template.md`, `superbiz/CLAUDE.md`, root `CLAUDE.md`, and `README.md`; no scripts, no build step, and dev-time regression tests are not required for this plugin.
- No `model:` frontmatter changes anywhere in the chain: the researcher and chairman carry no `model:` key today and keep it that way; the docs edit only stops orientation files from hardcoding a model the source does not declare.
- Editing these source files does not alter the currently installed superbiz plugin; behavior changes ship only after publish and `/plugin update`.
