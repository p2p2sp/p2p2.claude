---
name: skill-chaining
description: Skill chaining architecture. Use when creating or refactoring a skill and an architectural choice is in play - skill is slow, bloats context at scale, or behaviour should become an agent. NOT field names or allowed values (authoring-reference), NOT the authoring method or description quality (skill-creator).
---

# Skill chaining - architecture guideline

A skill that works on one item can choke when run fifty times. The cause is **context residue**: every tool
response a skill receives piles up in the conversation and stays there. It is not the length of `SKILL.md` that
costs you - a 500-line body is nothing - it is what the skill **invokes** (MCP responses, scrapes, fetches) that
accumulates. The fix is three stacked patterns; apply them by the rules below. Full mechanism, worked example,
and gotchas live in [references/skill-chaining.md](references/skill-chaining.md).

> **Isolate. Compress. Preload.** - `context: fork` · file handoff · `!command`.

## Decision rules (start here)

| Situation | Move |
| :-- | :-- |
| Skill is a **single task** with bloaty tool calls | `context: fork` alone is usually enough |
| Skill is a **chain of stages** | fork **+** file handoff **+** `!command` preload |
| Skill needs **user input mid-run** | **Do NOT fork** - `AskUserQuestion` does not work inside a fork |
| Output **belongs in the main chat** (you keep reasoning about it) | **Do NOT fork** - the fork discards everything but its final return |
| **Reference / doctrine** skill (no task to run) | **Do NOT fork** - and omit `allowed-tools` |
| Scheduled skill that often has nothing to do | Early-bail first, fork second - never fork an empty pipeline |
| **3+ skills** would copy the same system prompt / behaviour | Promote it to a custom agent (`agents/<name>.md`); for one skill keep it inline in `references/` |
| Reasoning- or voice-heavy work in the fork | Inherit the session model or pin `model:`; avoid a downgraded read-only profile |
| Read-only exploration in the fork | A lighter/read-only profile is fine (cheaper, faster) |

**This repo already lives these rules.** `superbuild` dispatches `superbuild-task-coder` /
`superbuild-task-reviewer` through the `Skill` tool with labeled-line `args` - `context: fork` executors that
take file PATHS in, write their output to a `report:` path, and return only a short verdict line
(`VERDICT: PASS`, or `VERDICT: FAIL` + `REVIEW: <path>`). `supergh`'s `cli-executor` / `commit` have the same
shape, and `commit` preloads its input with `!command`. When designing a new chained skill, mirror that shape.

## Sub-skills vs a monolith

You do **not** need sub-skills to use the file-handoff pattern - one skill whose body runs N stages, each
writing a file the next reads, works too. Split into sub-skills when:

- stages are genuinely independent (each plausibly runs standalone), **or**
- stages get reused across multiple orchestrators, **or**
- per-stage tool-response bloat is large, **or**
- you want to debug one stage without re-running the pipeline.

Keep it monolithic when stages are tightly coupled, the data between them is small, and repo simplicity beats
per-stage isolation.

## A note on `agent:` / `model:` in this repo

The pattern of "which subagent identity runs the fork" is real, but **field validity is owned by
`authoring-reference`, not this skill.** In this repo, skills use `context: fork` plus an optional `model:`
(short form: `opus` / `sonnet` / `haiku`) - the `agent:` field belongs to a *subagent definition*
(`agents/<name>.md`), not a `SKILL.md`. Decide the architecture here; confirm the exact frontmatter there.

## See also

- **Field schemas** (frontmatter fields, allowed values, paths, `!`-block + `$ARGUMENTS` safety) →
  `authoring-reference`.
- **General skill-writing method / description quality / splitting & trimming** → `skill-creator`.
