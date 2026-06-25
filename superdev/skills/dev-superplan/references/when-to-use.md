# When to use SuperPlan

SuperPlan is the always-on planning discipline — when a plan is drafted, it **is** the plan (there is no plain-plan alternative). These lists decide only one thing: whether the work needs a plan at all, or is trivial enough to skip planning entirely. This file is the single source of truth — `SKILL.md` §1 points here. Edit the lists here, never duplicate them.

Write a plan (SuperPlan) when **any** of the following is true:

- The change touches 3+ files
- Schema, migration, or API contract change
- Auth, payments, PII, or anything security-adjacent
- The code area is unfamiliar to either the user or to you
- More than one defensible approach exists
- The wrong answer would cost more than ~30 min to undo
- The task involves concurrency, caching, or data-loss risk

**Skip planning entirely** (no plan at all — not a looser plan) when:

- The diff can be described in one sentence
- Single-file typo, log line, rename, or formatter fix
- Pure read-only research / Q&A
- A spike where being wrong is the goal
