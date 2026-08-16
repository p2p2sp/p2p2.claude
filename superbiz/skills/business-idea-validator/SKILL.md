---
name: business-idea-validator
description: Validate whether a business idea is feasible and can win against competitors, using deep web research for a real comparative baseline. Use whenever the user describes a business/startup/product/SaaS idea and wants to know if it's viable, worth building, who the competitors are, how big the market is, or how to differentiate - even without the word "validate". Also use when they ask whether their app can beat an existing product (better UX, UI, onboarding, performance) - occupied markets are the default case, not a reason to skip. Also use when they ask which features their product needs to win, what pain points of existing tools to exploit, or what's missing in the market ("jakie funkcje powinna mieć moja apka", "czego brakuje w istniejących rozwiązaniach"). Trigger on "is my idea good", "czy mój pomysł ma sens", "sprawdź mój pomysł na biznes", "who would I compete with", "market research for my idea". Do NOT use for analyzing a running company's quarterly performance, for pure marketing copywriting, or for casual conversation about business topics with no concrete idea of the user's own on the table.
user-invocable: true
allowed-tools: Read, Write, Glob, AskUserQuestion, Skill, Bash(date:*)
---

# Business Idea Validator

Assesses whether a business idea is feasible to execute and able to win against existing competition, grounded in real market research rather than general knowledge. This skill is the interactive front: it resolves the idea and every missing decision with the user, then hands one capture file to the `business-idea-validator-researcher` fork, which does the research and writes the report.

## Run ID

!`date +%Y%m%d%H%M%S`

The line above is `<RUN_ID>` - use it verbatim.

## Workflow

1. Intake. Extract from the user's description: the problem being solved, target customer, proposed solution, monetization model, target geography, and the user's resources (budget, team, skills, timeline).
2. Ask only what desk research cannot answer. If target geography or B2B/B2C is missing, ask those first via AskUserQuestion - they change every downstream framework input. Ask about any other materially-missing input the same way. Never ask what research can find on its own (market size, competitors, pricing).
3. Restate and confirm assumptions. Restate the idea in one paragraph. List the 3-5 riskiest "leap of faith" assumptions - the ones that, if false, kill the idea. Confirm the restated idea and the assumption list with the user.
4. Slug and language. Derive `<idea-slug>` (kebab-case) from the idea and confirm it with the user. Detect the report language from the language the user used to describe the idea.
5. Capture. Write `.temp/superbiz/validator/capture-<RUN_ID>.md` in the format below.
6. Dispatch. Invoke `business-idea-validator-researcher` (Skill) with a labeled-line args block:
   capture: .temp/superbiz/validator/capture-<RUN_ID>.md
7. Relay. The fork returns exactly one line: `REPORT: <path> | VERDICT: <GO|PIVOT|NO-GO> | <one-sentence reason>`. Relay it to the user as a 3-4 sentence summary - the user should not have to open the file to learn the verdict. Do not re-verify or rewrite the report yourself.
8. Offer the roadmap chain. AskUserQuestion whether to turn the report into a phased execution plan. On yes, invoke `product-phase-roadmap` (Skill) with a labeled-line args block:
   report: <the REPORT path returned in step 7>
   On no, end here - no further action.

## Capture file format

```
# Idea
<restated paragraph>
# Slug
<idea-slug>
# Language
<language the report and conversation are in>
# Geography
<target geography>
# Customer
<target customer, B2B or B2C>
# Monetization
<monetization model>
# Resources
<budget, team, skills, timeline>
# Assumptions
- <leap-of-faith assumption>
- <leap-of-faith assumption>
# Extra context
<anything else the user settled that doesn't fit above>
```

The report the fork writes lands at `docs/business/<idea-slug>/walidacja.md` (`validation.md` when the report language is English) - written by the fork, never by this skill.
