---
name: rules
description: Reviews and repairs the host project's .claude/rules/ directory - maps every rule with its own size, the scope it declares and the number of tracked files that scope really matches, proposes the rules a scope with none needs, verifies each existing rule against the code it gates, and resets the layer on demand. Use whenever the user wants to create, review, audit, refresh or reset the project's coding rules, or asks which rules went stale, match nothing or grew past their budget.
argument-hint: "[review, extend, reset, or nothing]"
allowed-tools: AskUserQuestion, Agent, Bash(${CLAUDE_SKILL_DIR}/scripts/rules-map.sh:*), Bash(${CLAUDE_SKILL_DIR}/scripts/rules-map.sh --reset:*)
user-invocable: true
disable-model-invocation: true
---

# rules

```!
"${CLAUDE_SKILL_DIR}/scripts/rules-map.sh"
```

The block above is this host project's rules layer as the script measured it: the run's `id:`, the `state:`, one `rule:` line per scored rule with its character count, its declared globs, the tracked files they match and its budget flag, one `frozen:` line per rule held out of scoring, one `dead:` line per rule whose scope matches nothing, one `dirty:` line per file holding uncommitted work, and the directory total. A section with nothing to report printed no line at all.

It is self-verifying and trusted. Never re-count a rule, never glob the tree to check what a scope matches, never run git to decide what is dirty: every fact you route on is already above.

Your whole tool set is `AskUserQuestion`, `Agent` and the one reset line in step 3. You open no file and you write none: every byte of the layer is written by `viber:rules-writer`, nothing here is staged and nothing is committed.

## 1. Report the layer

Before any question, one line per fact worth deciding on:

- each `rule:` line with its size, its globs and its match count. `OVER-FILE` is past 4000 characters, and `total:` closes on `OVER-DIR` past 40000 over the directory. A rule already over a budget is reported here and compacted or split by the writer, never by you.
- each `frozen:` line, named as a file the layer keeps and this command never scores, never audits, never resets and never rewrites. It is reported and nothing more.
- each `dead:` line, named as a rule whose declared scope matches no tracked file.
- each `dirty:` line with its `modified` or `untracked` word.

The root of the directory holds the shared rules, each subdirectory one area's. Name each root `rule:` line whose globs all stay inside one area, or whose basename carries an area as a prefix: the writer moves it into that area's directory.

A `rule:` line whose `paths` field reads `none` declares no scope: it is loaded on every task and is never dead. One reading `global` in both its `paths` and its match field binds the whole repository and is never dead either.

## 2. Route on the state, then the mode

`state: none` means the directory is absent or carries no scored rule. Say the layer is empty, ask nothing, and go to step 4 with the repository root as the single scope to propose for: there is nothing to review and nothing to reset.

Otherwise one `AskUserQuestion`, the four modes in that single call:

- `review` - verify the existing rules against the files their globs match.
- `extend` - propose the rules a scope carrying none still needs.
- `both` - the rules and the proposals in one pass.
- `reset` - delete rules, then start from zero.

An argument naming one of the four is that answer already: take it and ask nothing. On `state: complete` lead with the flags and the dead rules, every rule declaring a scope; on `state: partial` lead with how many rules declare no scope at all.

`reset` goes to step 3. Every other mode goes to step 4, its target list being the `rule:` lines on `review`, the scopes to propose for on `extend`, and both on `both`. The map lists no candidate scope, a rule's reach being its globs rather than where its file sits: on `extend` ask the user which directories to propose for, the repository root standing in when they name none.

## 3. Reset

The list is every `rule:` line, or the ones the user named. A `frozen:` line never enters it, whatever the user names. Print the list whole, one path per line: a reset deletes this project's rules.

A path in the list that also carries a `dirty:` line refuses the whole call. Name each offending path with its own word, say the user commits or discards that work and runs the command again, and stop there. A refusal is never narrowed into a smaller reset that goes ahead, and uncommitted work is never corrected into something deletable.

Otherwise one `AskUserQuestion` over that exact list. On anything but approval, stop. On approval, one literal line, every path double-quoted, no interpreter word in front of it and nothing chained after it:

```
"${CLAUDE_SKILL_DIR}/scripts/rules-map.sh" --reset "<path>" "<path>"
```

- exit 0 -> the `removed:` lines are the deletion. Report them, then continue into step 4 in the same run: the scored layer is empty now, so the target list is the scopes to propose for, the repository root among them.
- exit 3 -> nothing at all was deleted. Repeat its `refused:` lines verbatim and stop.
- exit 2 -> the call itself was unusable. Report it and stop.

## 4. Approve the targets

Nothing is dispatched before the user has seen the target list and kept what belongs in it. Show it, one line per target, carrying what step 1 already measured for that path.

Then one `AskUserQuestion` over that list: all of them, or the ones the user picks. Offer the targets themselves as options while the list is short enough to show; past that, offer all of them, none of them, and take the paths a free answer names verbatim. A target the user dropped reaches no auditor and no writer. Nothing kept -> stop, having dispatched nothing and written nothing.

A dead rule is offered like any other: the auditor decides whether its scope really went, and the writer is what removes the file.

## 5. Audit

One `Agent` call per approved target, every one of them in a single message so they run in parallel, `subagent_type: viber:rules-auditor`, no `model:` line - the agent's own frontmatter is its strength. Four labelled lines each and nothing else:

```
target: <the rule's own path, or the literal none for a scope with no rule>
scope: <the globs the map printed for that rule, or the directory to propose for>
out: .temp/viber/<id>/
refs: ${CLAUDE_PLUGIN_ROOT}/references
```

`<id>` is the `id:` value of the map above. A rule whose `paths` field reads `none` or `global` gates the whole repository: pass the repository root as its scope. A scope with no rule is the proposing direction: `target: none`, `scope` that directory, and only missing conventions can come back.

Each call returns exactly one line:

```
AUDIT: <area> stale <n> gone <n> unverifiable <n> drop <n> miss <n> -> <findings file> | none
```

Report the `AUDIT:` line for each target verbatim. Read none of those files - the writer does.

## 6. Confirm, then the writer

Every returned line carrying five zero counters, or `-> none`, with no root rule named in step 1 as misplaced, means the layer is already true and no scope earned a new rule. Say so in one line, dispatch no writer, and stop.

Otherwise one `AskUserQuestion` over the counters just reported and the moves named in step 1: fold them in, or stop. Only on approval, one `Agent` call, `subagent_type: viber:rules-writer`, no `model:` line, three labelled lines and nothing else:

```
map: <every line of the map block above, verbatim>
notes: .temp/viber/<id>/
refs: ${CLAUDE_PLUGIN_ROOT}/references
```

## 7. Report

Repeat what the writer returned and add nothing to it:

- `FILES:` -> the rules it created, corrected, moved or removed, one path per line.
- `OVER:` -> repeat each line verbatim.
- `MOVE:` -> repeat each line verbatim: a fact removed from a rule that its `CLAUDE.md` node does not hold yet. This run never writes that node; `/viber:memory` over those paths records it.
- `VERDICT: NONE` -> nothing in the layer needed changing.

Close on one line: those files sit in the working tree, unstaged and uncommitted, and committing them is the user's next step.
