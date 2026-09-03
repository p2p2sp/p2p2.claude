---
name: idea-validator
description: Validates a business idea as a side-project candidate. Runs web research (problem, market, competition), scores it on 9 dimensions including Distribution, Side-project fit and Autopilot fit, convenes a 7-member council of independent perspectives, and produces a single self-contained HTML report with scorecard, dissent, experiment plan and pre-committed decision thresholds. User-invoked only.
argument-hint: "[idea text | path/to/idea.md] [--quick]"
disable-model-invocation: true
allowed-tools: WebSearch, WebFetch, Read, Write, Glob, Agent, AskUserQuestion, Bash(python3 ${CLAUDE_SKILL_DIR}/scripts/build_report.py:*), Bash(mkdir:*), Bash(ls:*), Bash(date:*)
---

# Idea Validator

Answer one question: **is this idea worth turning into a side project?** Not "is this a good startup". The user builds with an AI coding agent, so the build itself is cheap and non-differentiating; what differentiates is the problem, distribution, and whether the thing runs without the user after launch.

The output is one standalone HTML file. Everything before that is working material.

## Arguments

`$ARGUMENTS`

- Everything except flags is the idea: free text, or a path to a file (`.md`, `.txt`). If it looks like a path, read it.
- `--quick`: skip council round 2 (responses). Use only when the user explicitly passes it; note in the report that round 2 was skipped.
- No idea given → ask for it before doing anything else.

## Ground rules (apply throughout the whole run)

1. **Evidence or "no data".** Every number in the report has a source URL or is marked `no data found`. Never estimate silently; an estimate is allowed only when labelled as an estimate with its method shown.
2. **Ask, don't guess.** Missing input that changes the answer (segment, geography, pricing model, the user's weekly hours, channels they already have) → ask once with `AskUserQuestion`, offer a "don't know" option, then proceed. Don't re-ask later.
3. **Facts / conclusions / recommendations stay separated** in every file and every report section.
4. **Disagreement is preserved, not averaged.** Between sources and between council members.
5. **Deterministic structure.** Same steps, same council, same report layout every run, so two ideas can be compared side by side.
6. **Report language = language of the idea description.** All skill instructions are English; the user-facing report is written in whatever language the idea was written in. Council members also write in that language.
7. **Cheap build is a trap.** If the analysis drifts toward "just build it and see", stop: a cheap build changes *which* experiment is cheapest, it does not remove the need to validate demand and distribution first.

## Working directory

Create `.temp/superbiz/<slug>-<YYYY-MM-DD>/` (slug = 2–4 words from the idea, kebab-case) for every working file. Subagents get file paths, not pasted content, so the main context stays small. The deliverable (`report.html`) is the one exception - it does not go here, see step 15.

```
00-input.md            raw idea + answers to clarifying questions
01-normalized.md       Lean Canvas + hidden assumptions
02-hypotheses.md       risk hypotheses, riskiest first
03-research-problem.md
04-research-market.md
05-research-competition.md
06-business-model.md
07-distribution.md
08-side-project-fit.md
09-autopilot-fit.md
10-council-r1/<member>.md
11-council-r2/<member>.md   (absent with --quick)
12-synthesis.md
13-experiments.md
report-data.json
```

## Process

Read `${CLAUDE_SKILL_DIR}/references/process.md` before step 1 and `${CLAUDE_SKILL_DIR}/references/dimensions.md` before step 6; they hold the detailed protocols. All `references/…` and `assets/…` paths below are relative to `${CLAUDE_SKILL_DIR}`. What follows is the sequence and the hand-offs.

### Step 0 — Intake
Write `00-input.md`. If any of these are missing and matter, ask in one batch: target segment, geography, intended revenue model, weekly hours the user can commit, channels/audience the user already has, stage (idea / prototype / has users). Record "unknown" answers verbatim.

### Step 1 — Normalize
Lean Canvas (9 boxes) + a numbered list of **hidden assumptions** the idea only works if true. Include every "it will sell itself" style claim as an assumption. → `01-normalized.md`

### Step 2 — Risk hypotheses
For each assumption: category (desirability / feasibility / viability), what evidence would confirm or kill it, current evidence level. Sort riskiest-first. → `02-hypotheses.md`

### Step 3–5 — Research (run as three parallel subagents)
Launch three `general-purpose` Agent subagents at once, each with: the path to `01-normalized.md`, the path to `02-hypotheses.md`, its research brief from `references/process.md` (sections *Problem research*, *Market research*, *Competition research*), the output path, and the quality rules below. Wait for all three.

Quality rules to paste into each research prompt:
- Minimum 2 independent sources for any key number; report both when they disagree.
- Sources older than ~2 years are flagged `possibly outdated`.
- Prefer primary sources (company pages, pricing pages, official reports, app-store listings, reviews) over aggregator blog posts.
- `no data found` is a valid and expected result. Never fill a gap with a plausible-sounding number.
- Output format: Facts (with URL per fact) → Conclusions → Open questions.

### Step 6–9 — Model, Distribution, Side-project fit, Autopilot fit
Done in the main context from the research files, following `references/dimensions.md`. Distribution asks *does the user have a channel today or start from zero*. Autopilot fit is scored as **hours per week after launch** per layer (acquire / deliver / maintain) plus a list of "autopilot killers" with a proposed fix (remove / automate / redesign). → files 06–09

### Step 10 — Council round 1 (7 parallel subagents, isolated)
Read `references/council.md`. Launch 7 `general-purpose` subagents **in the same turn**, one per member, each with only:
- its member prompt from `references/council/<nn>-<member>.md`
- paths to files 01–09
- the report language
- output path `10-council-r1/<member>.md`

Members must not see each other's output in round 1. Do not summarise the files for them; let them read.

### Step 11 — Council round 2 (skipped only with `--quick`)
Launch the same 7 subagents again; each receives its own round-1 file plus all six others, and the round-2 instructions from `references/council.md`. Output → `11-council-r2/<member>.md`. Round 2 is what turns the council from a survey into a debate; that is why it is on by default.

### Step 12 — Synthesis and scorecard (main context, moderator role)
Follow the *Moderator* section of `references/council.md` and the scoring rules in `references/dimensions.md`. The moderator quotes members and attributes every argument; it adds no arguments of its own. Mandatory outputs: agreed points, disputed points (kept as disputes), scorecard with confidence per dimension, verdict **Go / Pivot / No-Go**, biggest single risk, **dissenting opinion** section written from the losing side's strongest arguments. If all seven members agree without reservation, flag it prominently as a probable council failure (diversity did not work), not as strong evidence. → `12-synthesis.md`

### Step 13 — Experiment plan
From `references/experiments.md`: for each of the top hypotheses (riskiest first, plus every "what would change my mind" from the council): hypothesis → test → metric → pass threshold → cost/time. Prefer the cheapest test that can kill the hypothesis. → `13-experiments.md`

### Step 14 — Decision thresholds
Before the user sees any experiment results, write the thresholds that mean Go / Pivot / No-Go for the experiment set as a whole. This goes in the report as its own section. Skipping this step is not allowed; it is the guard against reading results optimistically.

### Step 15 — Build the report
1. Assemble `report-data.json` (in the working directory) following `references/report-schema.md` exactly (the renderer depends on the field names).
2. Create `docs/business/<slug>/` (same slug as the working directory) at the host repo root.
3. Run: `python3 ${CLAUDE_SKILL_DIR}/scripts/build_report.py <dir>/report-data.json docs/business/<slug>/report.html`
   The script validates required fields and prints what is missing; fix the JSON and rerun rather than editing the HTML by hand.
4. Tell the user the path to `report.html` and give a 3-line summary: verdict, biggest risk, first experiment to run.

## What the report does not claim

It does not answer "will they pay". Only the experiments in step 13 can. Say this in the closing summary so the verdict is read as "worth testing" rather than "worth building".

## Reference files (all under `${CLAUDE_SKILL_DIR}/`)

- `references/process.md` — intake questions, Lean Canvas fields, hypothesis format, the three research briefs, source-quality rules
- `references/dimensions.md` — 9 scorecard dimensions, 1–5 anchors, weights, Side-project fit and Autopilot fit protocols, verdict rules
- `references/council.md` — round 1 / round 2 output formats, moderator protocol, diversity safeguards
- `references/council/*.md` — the 7 member prompts
- `references/experiments.md` — experiment catalogue and threshold-setting guidance
- `references/report-schema.md` — JSON structure consumed by `scripts/build_report.py`
- `references/frameworks.md` — the frameworks used, with links verified at authoring time
- `assets/report-template.html` — HTML/CSS/JS shell the script fills
