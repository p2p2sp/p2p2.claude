# superbiz

Answers one question about an idea: is it worth turning into a side project?

It is judged as a side-income product that keeps earning on a few hours a week after launch, not as
a startup. The building is assumed cheap, because an AI does it, so what decides the verdict is the
problem, how you would reach people, and what the thing will demand from you in month three.

## Install

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install superbiz@p2p2 --scope user
```

Needs web access for the research and Python 3 to render the report. No packages to install.

## Quick start

```
/superbiz:idea-validator "A Chrome extension that turns any recipe page into a grocery list. $3/month. I have no audience."
/superbiz:idea-validator ./my-idea.md
/superbiz:idea-validator ./my-idea.md --quick
```

Pass the idea as text or as a path to a file. `--quick` makes the run shorter, and the report says
when it was used. Write the idea in the language you want the report in.

It asks you one batch of questions first: who it is for, where, how it makes money, how many hours
a week you have, and what audience you already have. "Don't know" is a valid answer and is recorded
as one. Then it researches, scores and argues with itself, and takes a while.

## What you get

```
docs/business/<slug>/report.html
```

One self-contained HTML file that opens anywhere: a nine-dimension scorecard with its sources, seven
advisors arguing both sides by name, a Go / Pivot / No-Go verdict with the arithmetic shown and a
dissenting opinion next to it, and six to eight experiments whose pass thresholds are written down
before you have any results.

Every number carries a source or is marked as missing. Nothing is filled in with a plausible figure.

## What it does not claim

It does not tell you that people will pay. Nothing but the experiments can. Read a Go as "worth
testing", not as "worth building".
