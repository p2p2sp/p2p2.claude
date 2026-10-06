# superbiz

Answers one question about an idea: is it worth turning into a side project?

## Why superbiz

### Judged as a side project
The bar is a product that keeps earning on a few hours a week, never a startup. An AI builds it
cheaply, so the verdict rests on the problem, how you reach people, and what it demands from you
in month three.

### Every number has a source
A figure carries its source or is marked as missing. Nothing is filled in with a plausible guess.

### It argues with itself
Seven advisors argue both sides by name, and the verdict comes with a dissenting opinion next to
it.

### It ends with a test plan
Six to eight experiments, each with its pass threshold written down before you have any results.

### Honest about its limits
Only the experiments can tell you people will pay. Read a Go as "worth testing", never as "worth
building".

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

Pass the idea as text or as a file path. `--quick` makes the run shorter, and the report says so.
Write the idea in the language you want the report in.

It first asks one batch of questions: who it is for, where, how it makes money, how many hours a
week you have, and what audience you already have. "Don't know" is a valid answer. Then it
researches, scores and debates, which takes a while.

## What you get

```
docs/business/<slug>/report.html
```

One self-contained HTML file that opens anywhere: a nine-dimension scorecard with its sources, the
advisors' debate, a Go / Pivot / No-Go verdict with the arithmetic shown, and the experiments.
