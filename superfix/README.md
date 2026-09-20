# superfix

Point it at a codebase and it comes back with the handful of things actually worth fixing, each
with a reproduction and a fix sketch.

Cheap agents sweep the whole repository first and rank what they found. The expensive ones go only
where both the impact of a fix and what there is to win are high, so a run over a large repository
costs a fraction of what reading it all would.

## Install

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install superfix@p2p2 --scope user
```

Requires Node.js 22.6 or newer. A run stops immediately if it is missing, before anything is spent.

## Quick start

```
/superfix:code-auditor [<repo-path>] [<area-dir>]
```

1. **Confirm the target and the job.** "find bugs", "review this repo" or "audit" defaults to
   reliability and tech debt. Other jobs: dead code, coverage, consistency, spend, performance,
   conversion, SEO. The optional second argument limits the whole run to one subtree.
2. **Read the two tables it prints** before it starts investigating. This is the moment to narrow
   the run, and the last cheap one.
3. **Read `findings.md`.** At most ten findings, worst first, each one reproduced and then
   independently verified by a second agent that never saw the first one's reasoning. Everything
   that survived but did not make the cut is listed in one line each below them.

It looks for two different kinds of problem at once: files that are worth fixing, and mismatches
between two files that are each individually correct - a contract defect no per-file review sees.

Everything a run produces lives under `.temp/superfix/<run-id>/`, so nothing pollutes the repo. Runs
are cheap to repeat: do it weekly and compare.

Nothing routes to it automatically - the command is the only way in. The deep investigation runs on
your session model, so a weaker model means weaker verification, not just a weaker sweep.
