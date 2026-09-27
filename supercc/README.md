# supercc

Writes and fixes Claude Code skills and agents, yours or a plugin's.

Skill files fail quietly. One that never triggers is not broken, it is invisible. One that carries
three jobs does not crash, it drifts. A 900-line body does not error, it just stops being read
halfway through.

## Install

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install supercc@p2p2 --scope user
```

No dependencies.

## How to use it

Say what you want. It fires on the intent, not on a command:

```
make me a skill that converts our CSV exports to JSON
this agent does too much, split it
my SKILL.md is 700 lines and it drifts halfway through
audit the skills in .claude/skills
```

`/supercc:skill-designer` works too when you want it explicitly.

It reads an existing file whole before touching it, checks that the skill has exactly one job,
writes the triggering description first, puts rarely-needed material in a separate reference file
rather than the body, and lints the result before reporting back.

You get the changed files, a clean lint run, and three lines: what the skill is responsible for,
what makes it trigger, and what was deliberately left out.

## Writing for a specific model

A second skill, `models`, knows how each current Claude model reads instructions and where
it slips. It fires when you pick or change the model an agent runs on:

```
which model should this reviewer agent run on
this agent runs on haiku, tune it
it works on opus but stops early on fable, why
```
