---
name: business-idea-validator
description: Validate whether a business idea is feasible and can win against competitors, using deep web research for a real comparative baseline; the idea is judged as a side, autopilot-run income product, not a venture-scale startup. Use whenever the user describes a business/startup/product/SaaS idea and wants to know if it is viable, worth building, who the competitors are, or how to differentiate - even without the word "validate", and even when the market is occupied (whether their app can beat an existing product, which features win, what incumbent pain points to exploit, what's missing in the market). Also use for side-income framings: a side project, passive income, a product built alongside a day job. Trigger on "is my idea good", "who would I compete with", "market research for my idea". Do NOT use for analyzing a running company's performance, pure marketing copywriting, or casual business talk with no concrete idea of the user's own on the table.
user-invocable: true
allowed-tools: Read, Write, Glob, AskUserQuestion, Skill, Bash(date:*)
---

# Business Idea Validator

Interactive front: resolve the idea and every missing decision with the user, then dispatch the research and the council round to forks - this skill never researches, never writes the report, never writes the verdict.

## Run ID

!`date +%Y%m%d%H%M%S`

The line above is `<RUN_ID>` - use it verbatim.

## Workflow

1. Intake. Extract from the user's description: the problem being solved, target customer, proposed solution, monetization model, target geography, the user's resources (budget, team, skills, timeline), the maintenance hours per month the user accepts after launch, and the target supplementary income per month.
2. Ask only what desk research cannot answer. If target geography or B2B/B2C is missing, ask those first via AskUserQuestion - they change every downstream framework input. Ask the acceptable maintenance hours per month and the target supplementary income per month the same way whenever they are missing - only the user knows their time budget and income goal, and both drive the scoring. Record the income target with the currency the user stated it in (ask which currency when the user gave a bare number) - the figure is compared against researched incumbent pricing downstream, so an unlabeled amount produces a wrong score. Ask about any other materially-missing input the same way. Never ask what research can find on its own (market size, competitors, pricing). A user who declines to give the hours budget or the income target is recorded as "unstated" - never block the interview and never invent a number.
3. Restate and confirm assumptions. Restate the idea in one paragraph. State the premise explicitly: the verdict judges the idea as a supplementary-income product running on autopilot, not as a venture-scale startup, so the user can stop or reframe here. List the 3-5 riskiest "leap of faith" assumptions - the ones that, if false, kill the idea. Confirm the restated idea and the assumption list with the user. Never compliment or endorse the idea at any point in the interview - restate neutrally and let the research decide.
4. Slug and language. Derive `<idea-slug>` (kebab-case) from the idea and confirm it with the user. Detect the report language from the language the user used to describe the idea.
5. Capture. Write `.temp/superbiz/validator/capture-<RUN_ID>.md` in the format below.
6. Dispatch. Invoke `business-idea-validator-researcher` (Skill) with a labeled-line args block:
   capture: .temp/superbiz/validator/capture-<RUN_ID>.md
7. Council capture. The researcher fork returns exactly one line: `REPORT: <path> | VERDICT: <BUILD|PIVOT|DROP> | <one-sentence reason>`. If it is instead an `ERROR:` line, relay the error to the user and stop here - no council capture, no dispatch. Otherwise write `.temp/superbiz/council/capture-<RUN_ID>.md` (same `<RUN_ID>`) in the council capture format below. Frame `# Question` neutrally from the restated idea - "should the user build this idea as a side, autopilot-run income product, and if so in what shape" - and never state the researcher's verdict there; the report is passed as context and already carries it, and the council must not be steered.
8. Council dispatch. Invoke `council-this-chairman` (Skill) with a labeled-line args block:
   capture: .temp/superbiz/council/capture-<RUN_ID>.md
   The fork returns exactly one line: `COUNCIL: <path> | RECOMMENDATION: <one sentence> | FIRST-STEP: <one concrete action>`, or `ERROR: capture unreadable at <path>` if it could not read the capture.
9. Relay. Summarize BOTH tagged lines - the researcher's `REPORT:` line and the chairman's `COUNCIL:` line - in one 4-6 sentence answer: the researcher's verdict with its reason, then the council's recommendation and first step. The user should not have to open either file. When the two disagree, name the clash explicitly - never smooth it into a false consensus. If the chairman returned an `ERROR:` line instead, state that the council round failed, still relay the researcher's result in full, and never fabricate a council verdict. Do not re-verify or rewrite either artifact yourself.
10. Offer the roadmap chain. AskUserQuestion whether to turn the report into a phased execution plan. On yes, invoke `product-phase-roadmap` (Skill) with a labeled-line args block:
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
# Maintenance budget
<acceptable maintenance hours per month after launch, or "unstated">
# Income target
<target supplementary income per month with its currency, or "unstated">
# Assumptions
- <leap-of-faith assumption>
- <leap-of-faith assumption>
# Extra context
<anything else the user settled that doesn't fit above>
```

## Council capture file format

```
# Question
<neutral framing derived from the restated idea: should the user build this idea as a side, autopilot-run income product, and if so in what shape>
# Slug
<idea-slug>
# Language
<language the report and conversation are in>
# Context files
- <REPORT path> - the researched validation report
# Constraints
<the resources from intake>
# Extra context
<anything else the user settled that doesn't fit above, or "none">
```

The report the fork writes lands at `docs/business/<idea-slug>/walidacja.md` (`validation.md` when the report language is English), and the council verdict lands at `docs/business/<idea-slug>/rada.md` (`council.md` when the language is English) - both written by the forks, never by this skill.
