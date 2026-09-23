---
name: memory
description: Reviews and repairs the host project's CLAUDE.md cascade - maps every node with its own size and the size of the chain a reader loads with it, creates the nodes a project with none needs, verifies each existing node against the code of the area it describes, and resets the layer on demand. Use whenever the user wants to create, bootstrap, initialize, refresh, audit or reset project memory, or asks which nodes went stale, lost their area or grew past their budget.
argument-hint: "[review, extend, reset, or nothing]"
allowed-tools: AskUserQuestion, Agent, Bash(${CLAUDE_SKILL_DIR}/scripts/memory-map.sh:*), Bash(${CLAUDE_SKILL_DIR}/scripts/memory-map.sh --reset:*)
disallowed-tools: Read, Write, Edit, NotebookEdit
user-invocable: true
disable-model-invocation: true
---

# memory

```!
"${CLAUDE_SKILL_DIR}/scripts/memory-map.sh"
```

The block above is this host project's memory layer as the script measured it: the run's `id:`, the `state:`, one `node:` line per tracked `CLAUDE.md` with its own character count, the count of the chain a reader loads with it and its budget flag, one `orphan:` line per node whose area is gone, one `cand:` line per directory that carries no node, one `dirty:` line per node holding uncommitted work, and the total. A section with nothing to report printed no line at all.

It is self-verifying and trusted. Never re-measure a node, never walk the tree for a candidate of your own, never run git to decide what is dirty: every fact you route on is already above.

Your whole tool set is `AskUserQuestion`, `Agent` and the one reset line in step 3. You open no file and you write none: every byte of the cascade is written by `viber:memory-writer`, nothing here is staged and nothing is committed.

## 1. Report the layer

Before any question, one line per fact worth deciding on:

- each `node:` line with its two sizes and its flag. `OVER-NODE` is past 12000 characters, `OVER-CHAIN` past 32000 over the chain. A node already over a budget is reported here and split by the writer, never by you.
- each `orphan:` line, named as a node left alone in a directory whose other files are gone.
- each `dirty:` line with its `modified` or `untracked` word.
- each `cand:` line with its file count, its byte count and its `toolchain` or `plain` signal. A directory carrying its own build manifest earns a look, never an automatic node.

## 2. Route on the state, then the mode

`state: none` means no node is tracked anywhere. Say the layer is empty, ask nothing, and go to step 4 with the `cand:` lines as the target list plus the repository root: there is nothing to review and nothing to reset.

Otherwise one `AskUserQuestion`, the four modes in that single call:

- `review` - verify the existing nodes against the code of their areas.
- `extend` - give the candidate directories the nodes they lack.
- `both` - the nodes and the candidates in one pass.
- `reset` - delete nodes, then start from zero.

An argument naming one of the four is that answer already: take it and ask nothing. On `state: complete` lead with the flags and the orphans; on `state: partial` lead with how many candidates carry no node.

`reset` goes to step 3. Every other mode goes to step 4, its target list being the `node:` lines on `review`, the `cand:` lines on `extend`, and both on `both`.

## 3. Reset

The list is every `node:` line, or the ones the user named. Print it whole, one path per line: a reset deletes this project's memory.

A path in the list that also carries a `dirty:` line refuses the whole call. Name each offending path with its own word, say the user commits or discards that work and runs the command again, and stop there. A refusal is never narrowed into a smaller reset that goes ahead, and uncommitted work is never corrected into something deletable.

Otherwise one `AskUserQuestion` over that exact list. On anything but approval, stop. On approval, one literal line, every path double-quoted, no interpreter word in front of it and nothing chained after it:

```
"${CLAUDE_SKILL_DIR}/scripts/memory-map.sh" --reset "<path>" "<path>"
```

- exit 0 -> the `removed:` lines are the deletion. Report them, then continue into step 4 in the same run: the layer is empty now, so the target list is the `cand:` lines plus every directory just emptied of its node, the repository root among them.
- exit 3 -> nothing at all was deleted. Repeat its `refused:` lines verbatim and stop.
- exit 2 -> the call itself was unusable. Report it and stop.

## 4. Approve the targets

Nothing is dispatched before the user has seen the target list and kept what belongs in it. Show it, one line per target, carrying what step 1 already measured for that path.

Then one `AskUserQuestion` over that list: all of them, or the ones the user picks. Offer the targets themselves as options while the list is short enough to show; past that, offer all of them, none of them, and take the paths a free answer names verbatim. A target the user dropped reaches no auditor and no writer. Nothing kept -> stop, having dispatched nothing and written nothing.

An orphan is offered like any other node: the auditor decides whether its area really went, and the writer is what removes the file.

## 5. Audit

One `Agent` call per approved target, every one of them in a single message so they run in parallel, `subagent_type: viber:memory-auditor`, no `model:` line - the agent's own frontmatter is its strength. Three labelled lines each and nothing else:

```
target: <the node's own path, or the literal none for a candidate directory>
scope: <the directory the target describes>
out: .temp/viber/<id>/
```

`<id>` is the `id:` value of the map above. A node's scope is the directory holding it, the root node's being the repository root. A candidate is the discovery direction: `target: none`, `scope` that directory, and only missing facts can come back.

Each call returns exactly one line:

```
AUDIT: <area> stale <n> gone <n> unverifiable <n> miss <n> -> <findings file> | none
```

Report the `AUDIT:` line for each target verbatim. Read none of those files - the writer does.

## 6. Confirm, then the writer

Every returned line carrying four zero counters, or `-> none`, means the layer is already true. Say so in one line, dispatch no writer, and stop.

Otherwise one `AskUserQuestion` over the counters just reported: fold them in, or stop. Only on approval, one `Agent` call, `subagent_type: viber:memory-writer`, no `model:` line, two labelled lines and nothing else:

```
map: <every line of the map block above, verbatim>
notes: .temp/viber/<id>/
```

## 7. Report

Repeat what the writer returned and add nothing to it:

- `FILES:` -> the nodes it created or corrected, one path per line.
- `OVER:` -> repeat each line verbatim.
- `VERDICT: NONE` -> nothing in the layer needed changing.

Close on one line: those files sit in the working tree, unstaged and uncommitted, and committing them is the user's next step.
