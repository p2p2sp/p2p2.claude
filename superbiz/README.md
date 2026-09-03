# superbiz

Idea validation for Claude Code. One skill, one question: **is this idea worth turning into a side project?**

The framing is deliberate and non-negotiable. Your idea is judged as a **side-income product that runs on
autopilot** - something that keeps earning with a few hours of your time a week after launch - not as a
venture-scale startup. And because an AI coding agent does the building, the build is assumed cheap and
therefore non-differentiating: what decides the verdict is the problem, the distribution, and what the thing
demands from you in month three.

The output is one self-contained HTML file you can open, keep and compare against the next idea.

## Install

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install superbiz@p2p2 --scope user
```

Needs web access for the research, and Python 3 to render the report. No packages to install.

## Quick start

```
/superbiz:idea-validator "A Chrome extension that turns any recipe page into a grocery list. $3/month. I have no audience."
/superbiz:idea-validator ./my-idea.md
/superbiz:idea-validator ./my-idea.md --quick
```

Pass the idea as text or as a path to a file. The skill is user-invoked only - it never fires by itself.
`--quick` skips the council's second round; the report says so when it was used.

Write the idea in the language you want the report in. The instructions are English, the report is not: it
comes back in whatever language you described the idea in.

## What it does

1. **Intake.** Asks once, in one batch, for what actually changes the answer: target segment, geography,
   revenue model, hours per week you can commit, channels or audience you already have, and stage. "Don't
   know" is a valid answer and is recorded as such.
2. **Normalize.** Lean Canvas plus a numbered list of the hidden assumptions the idea only works if true -
   every "it will sell itself" included.
3. **Research.** Three agents in parallel dig into the problem, the market and the competition. Two
   independent sources minimum for any key number, primary sources preferred, disagreements reported rather
   than averaged. `no data found` is an expected answer - nothing is filled in with a plausible-sounding
   figure.
4. **Score.** Nine dimensions, 1-5, with fixed anchors so two runs are comparable: problem strength, market
   size, competition, defensibility, revenue model, distribution, timing, side-project fit, autopilot fit.
   Problem strength and distribution carry double weight. Autopilot fit is measured in hours per week after
   launch across three layers - acquiring, delivering, maintaining - and every autopilot killer gets a
   proposed fix or is recorded as unfixable.
5. **Council.** Seven independent advisors, each a separate agent with its own guiding question, working in
   isolation: the target customer, the skeptic, the market analyst, the growth person, the operator, risk and
   legal, and the visionary. Then a second round where they read each other and argue by name.
6. **Verdict.** Go / Pivot / No-Go, with the arithmetic shown. The verdict is never more confident than the
   weakest of the three key dimensions - problem, distribution, autopilot - so a weak one caps it regardless
   of the total. Disputes stay disputes, and a mandatory dissenting section makes the losing side's best case.
   If all seven advisors agree without reservation, the report flags it as a probable council failure rather
   than as strong evidence.
7. **Experiments and thresholds.** Six to eight experiments, riskiest hypothesis first, each with a metric,
   a pass threshold and a cost - and the Go / Pivot / No-Go thresholds are written down *before* you have any
   results, so you cannot read them optimistically later.

## What you get

A run directory `./idea-validation/<slug>-<date>/` with the numbered working files (intake, canvas,
hypotheses, the three research files, the fit analyses, every council member's answer per round, the
synthesis and the experiment plan), and the deliverable:

```
report.html
```

Scorecard, evidence with links, council positions, the dissenting opinion, the experiment plan and the
pre-committed thresholds - one file, no assets, opens anywhere.

## What the report does not claim

It does not tell you that people will pay. Nothing short of the experiments in step 7 can. Read a Go as
"worth testing", not as "worth building".

## Skills

| Skill | Role |
| --- | --- |
| `idea-validator` | The whole pipeline: intake, research, nine-dimension scorecard, seven-member council over two rounds, verdict with dissent, experiment plan with pre-committed thresholds, and the HTML report. User-invoked only. |
