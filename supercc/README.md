# supercc

The plugin that builds the plugins. `supercc` is about the Claude Code extension surface itself - skills and
agents: their frontmatter, their bodies, their bundled scripts and references.

It exists because skill files fail in ways ordinary code does not. A skill that never triggers is not broken,
it is invisible. A skill that carries three responsibilities does not crash, it drifts. A 900-line body does
not error, it just stops being read past the middle. `skill-designer` writes against those failure modes.

Ships no hooks and no manifest; the model routes to it from its description alone.

## Install

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install supercc@p2p2 --scope user
```

No runtime dependencies - the linter is plain bash.

## Quick start

Just say what you want. The skill is model-invocable, so it fires on the intent, not on a command:

```
make me a skill that converts our CSV exports to JSON
this agent does too much, split it
my SKILL.md is 700 lines and it drifts halfway through
audit the skills in .claude/skills
```

`/supercc:skill-designer` works too when you want it explicitly.

## What it does

1. **Classifies** the request - new, refactor, split or audit - and reads an existing file whole before
   touching it.
2. **Runs the responsibility check.** One skill, one concern. A body spelling out modes with disjoint
   instructions, or one that both asks the user and does heavy work, fails the check and gets split instead
   of extended.
3. **Decides where the work runs** before writing it: main context or `context: fork`, file handoff between
   stages, `!` preloads - and whether the behaviour should be an agent rather than a skill.
4. **Writes frontmatter first.** The `description:` is the whole triggering mechanism, so it gets written
   pushy and explicit, with the contexts and phrasings that should fire it - and none of that leaks into the
   body.
5. **Places content by how often it is needed**, not by length: body for every invocation, `references/` for
   what some invocations need, a router script when a parsable argument selects the mode.
6. **Lints.** `scripts/lint_skill.sh` checks what is mechanically decidable - frontmatter caps, name charset,
   reserved words, body length, orphaned bundled files - and every FAIL gets fixed before the skill reports
   back.

It returns the changed files, a clean lint run, and three lines: the responsibility, the trigger, and what was
deliberately left out.

## Skills

| Skill | Role |
| --- | --- |
| `skill-designer` | Create, refactor, split, shrink or audit skills and agents, their scripts and their references. Model-invocable. |
