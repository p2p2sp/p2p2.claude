# supercc

Writes and fixes Claude Code skills and agents, yours or a plugin's.

## Why supercc

- **It finds the failures that never error.** A skill that never triggers is invisible. One with
  three jobs drifts. A 900-line body stops being read halfway through. None of them throws an
  error, and supercc catches all three.
- **It gets your skill triggered.** The triggering description is written first, because a skill
  nobody invokes does nothing.
- **One skill, one job.** Each skill holds exactly one responsibility. One that does too much gets
  split.
- **Lean by design.** Rarely needed material moves to a reference file read only when needed. The
  model reads less, and your usage limits last longer.
- **Linted before you see it.** Every result passes a lint run against the platform's limits and
  the style rules before it comes back to you.
- **Tuned for each model.** It knows how Fable, Opus, Sonnet and Haiku read instructions and where
  each one slips.

## Install

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install supercc@p2p2 --scope user
```

No dependencies.

## How to use it

Say what you want. It fires on the intent:

```
make me a skill that converts our CSV exports to JSON
this agent does too much, split it
my SKILL.md is 700 lines and it drifts halfway through
audit the skills in .claude/skills
```

`/supercc:skill-designer` works too when you want it explicitly.

You get the changed files, a clean lint run, and three lines: what the skill is responsible for,
what makes it trigger, and what was deliberately left out.

## Writing for a specific model

The `model-prompting` skill fires when you pick or change the model an agent runs on:

```
which model should this reviewer agent run on
this agent runs on haiku, tune it
it works on opus but stops early on fable, why
```
