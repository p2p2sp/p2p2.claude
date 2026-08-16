---
name: product-phase-roadmap
description: Turn a validated business/product idea (especially a validation report produced by the business-idea-validator skill) into phased product documentation - a folder of Markdown files, one per phase, from landing page + waitlist, through MVP and public launch, to full-scope growth - with step-by-step actions including marketing, distribution, and metrics for every phase. Use whenever the user asks to "rozpisz na fazy", "rozpisz raport jako dokumentację", "plan wytwarzania produktu", "roadmapa wdrożenia", "plan od landing page do MVP", "co robić krok po kroku żeby wystartować", "launch plan", "go-to-market plan", or wants execution documentation for a SaaS/app idea - even if they don't say "roadmap" or "phases". Also use when a validation report exists in the conversation and the user asks "what next" or "jak to teraz zrealizować". Do NOT use to run the validation itself (use business-idea-validator first), for a running company's operational planning unrelated to a new product launch, or for pure marketing copywriting with no phased execution ask.
user-invocable: true
argument-hint: "[<validation-report path>]"
allowed-tools: Read, Write, Glob, AskUserQuestion, Skill, Bash(date:*)
---

# Product Phase Roadmap

Converts a validated idea into execution documentation: a folder of Markdown files where each file is one delivery phase (pre-launch landing page + waitlist to MVP + closed beta to public launch to growth to full scope). This skill is the interactive front: it resolves the report, every open decision, and the slug with the user, then hands one capture file to the `product-phase-roadmap-writer` fork, which does the web refresh and writes the phase files.

## Run ID

!`date +%Y%m%d%H%M%S`

The line above is `<RUN_ID>` - use it verbatim.

## Workflow

1. Resolve the validation report. In priority order: a `report:` labeled arg or a bare path argument wins; else Glob `docs/business/*/walidacja.md` and `docs/business/*/validation.md`; else check the conversation for a report already discussed; else there is no report.
2. Report found. Read it. Extract: wedge and positioning, MVP table stakes vs. deferred features, differentiators, proposed pricing, target geography/language, first-customer commitments, and any validation experiments it recommends. This report is the single source of truth for WHAT to build and WHY; this skill decides WHEN and HOW.
3. No report found. Gather from the user: the product in one paragraph, target customer, competitive wedge, planned feature set, pricing idea, target market/language. Tell the user no validation report was found and offer running `business-idea-validator` (Skill) first - building a phased plan on an unvalidated idea propagates false confidence. If the user declines, continue with what they gave.
4. Mandatory interview - resolve every open question before writing, never skipped even when the user says "just run it". Collect ALL open decisions in one AskUserQuestion pass (batch up to the tool's limit per turn): items the report marked "do decyzji" / "założenie do zweryfikowania", scope ambiguities (which optional MVP modules are in/out), naming/domain if undecided, revenue/MRR targets, budget and weekly-hours envelope, and anything else the plan would otherwise hedge on. Do not ask about things the report or the user already settled. Where a decision genuinely cannot be made yet because it depends on data a later phase will produce, do not leave it open - capture it as a decision rule: a numeric threshold plus the phase at which it resolves (e.g. "keep module X only if interviews confirm demand by end of Phase 1").
5. Slug and language. When chained from a report, derive `<idea-slug>` from the report's directory (`docs/business/<idea-slug>/...`). Otherwise derive it (kebab-case) from the product and confirm with the user. Detect the output language from the report's language when present, else from the language the user used.
6. Capture. Write `.temp/superbiz/roadmap/capture-<RUN_ID>.md` in the format below.
7. Dispatch. Invoke `product-phase-roadmap-writer` (Skill) with a labeled-line args block:
   capture: .temp/superbiz/roadmap/capture-<RUN_ID>.md
8. Relay. The fork returns exactly one line: `PLAN: <dir> | PHASES: <n> | TIMELINE: <total estimate> | PHASE1-EXIT: <criterion>`. Relay it to the user as a short summary covering: number of phases, total estimated timeline, the single most important Phase 1 exit criterion (the cheapest kill-switch), and which open decisions the user still owes - which must be none, since the interview in step 4 resolved every one of them. Do not re-verify or rewrite the plan yourself.

## Capture file format

```
# Product
<one-paragraph description>
# Slug
<idea-slug>
# Language
<language the plan is written in>
# Report
<path to the validation report, or "none">
# Decisions
- <interview question>: <user's answer>
- <interview question>: <user's answer>
# Decision rules
- <decision>: threshold <numeric threshold>, resolves in <phase>
# Extra context
<anything else the user settled that doesn't fit above>
```

The plan folder the fork writes lands at `docs/business/<idea-slug>/plan/` - written by the fork, never by this skill.
