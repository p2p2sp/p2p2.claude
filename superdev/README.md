# superdev

**This plugin is obsolete - use `viber` instead**

Building software with Claude Code without the guessing. Every feature starts with an interview,
nothing gets written until you approve a reviewed plan, and the build commits one task at a time.

## Install

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install superdev@p2p2 --scope user
```

No dependencies. Do not install it alongside `viber`: both gate plan approval and each recognizes
only its own plan format, so one blocks the other. Run one track at a time.

## Quick start

1. **Run `/superdev:setup` once in the project.** It creates the config file, seeds `.gitignore`, and
   lets you pick the switches below. It never overwrites what you already have.
2. **Say what you want to build.** The interview starts by itself: it reads your codebase first, then
   asks one question at a time, each with options and a recommendation, until nothing is left open.
3. **Confirm the summary and pick a track.** *Simple* for a small, contained change. *Super* for
   something cross-cutting or hard to reverse, which gets a short spec first. *Phases* when the work
   is too big for one plan. Stopping here is also an option: the model never picks for you.
4. **Approve the plan.** You cannot leave plan mode until a reviewer has passed the plan, and then you
   approve it yourself.
5. **Watch it build.** One task at a time, one commit per task, reviews along the way. Whenever a
   decision is genuinely yours, you are asked rather than guessed at.

Reporting a bug instead? Just describe it. The flow gets traced step by step, the diagnosis proven
with a failing test, and the fix goes through the same plan gate.

![How superdev works](../docs/assets/superdev-flow.svg)

## Commands

| Say this | What happens |
| --- | --- |
| `/superdev:setup` | One-time project setup. Run it again whenever you want to change a switch. |
| `/superdev:e2e handoff: <path>` | Turns one build's QA scenarios into Playwright tests, against the running app. |
| "intent `<path>`" | Resumes a saved interview, showing you what changed in the repo since. |
| "phases `<path>`" | Resumes a phased run at the next phase. |
| "refresh the project memory" / "the rules" | Rebuilds your `CLAUDE.md` files or `.claude/rules/` on their own. |

Everything else happens on what you say: the interview, the plan and the build all fire on intent,
not on a command.

## Optional switches

`/superdev:setup` writes `.claude/superdev.yml`. All of them are off by default.

| Switch | When on |
| --- | --- |
| `adr` | A decision worth keeping becomes an architecture decision record in `docs/adr/`. |
| `memory` | The build closes by refreshing your `CLAUDE.md` files. |
| `rules` | The build closes by refreshing `.claude/rules/`. |
| `changelog` | Each build appends what it did to `docs/changelog/`. |
| `qa` | Each build leaves a plain-language acceptance document in `docs/qa/` for whoever tests it by hand. |
| `e2e-ui` / `e2e-api` | The same scenarios are also written in a form `/superdev:e2e` can turn into tests later. |
| `stats` | Each run gets an execution report: models, tokens, durations. |
| `cleanup` | The run's working directory is removed once the build is done. |
