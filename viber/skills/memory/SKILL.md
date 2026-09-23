---
name: memory
description: Reviews and repairs the host project's CLAUDE.md cascade - maps every node with its own size and the size of the chain a reader loads with it, creates the nodes a project with none needs, verifies each existing node against the code of the area it describes, brings every node within budget, and resets the layer on demand. Use whenever the user wants to create, bootstrap, initialize, refresh, audit or reset project memory, or asks which nodes went stale, lost their area or grew past their budget.
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

The block above is this host project's memory layer as the script measured it: the run's `id:`, the `state:`, one `node:` line per `CLAUDE.md` with its own character count, the count of the chain a reader loads with it and its budget flag, one `orphan:` line per node whose area is gone, one `cand:` line per directory that carries no node, one `dirty:` line per node holding uncommitted work, and the total. A section with nothing to report printed no line at all.

It is self-verifying and trusted. Never re-measure a node, never walk the tree for a candidate of your own, never run git to decide what is dirty: every fact you route on is already above.

Your whole tool set is `AskUserQuestion`, `Agent` and the two map lines of step 3. You open no file and you write none: every byte of the cascade is written by `viber:memory-node-writer`, nothing here is staged and nothing is committed.

## 1. Report the layer

Before any question, one line per fact worth deciding on:

- each `node:` line with its two sizes and its flag. `OVER-NODE` is past 12000 characters, `OVER-CHAIN` past 32000 over the chain. A node already over a budget is reported here and brought within it by its writer, never by you.
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

- exit 0 -> the `removed:` lines are the deletion. Report them, then map the layer again with the one literal line `"${CLAUDE_SKILL_DIR}/scripts/memory-map.sh"`. That fresh map replaces the one above for the rest of the run: the preloaded one still lists the deleted nodes. Continue into step 4 with its `cand:` lines plus every directory a `removed:` line emptied, the repository root among them.
- exit 3 -> nothing at all was deleted. Repeat its `refused:` lines verbatim and stop.
- exit 2 -> the call itself was unusable. Report it and stop.

## 4. Approve the targets

Nothing is dispatched before the user has seen the target list and kept what belongs in it. Show it, one line per target, carrying what the map already measured for that path.

Then one `AskUserQuestion` over that list: all of them, or the ones the user picks. Offer the targets themselves as options while the list is short enough to show; past that, offer all of them, none of them, and take the paths a free answer names verbatim. A target the user dropped reaches no auditor and no writer. Nothing kept -> stop, having dispatched nothing and written nothing.

A `node:` target is a fix target. Every other target - a candidate, an emptied directory, the root of an empty layer - is a create target, its node being `CLAUDE.md` inside that directory. An orphan is offered like any other node: the auditor decides whether its area really went, and the writer is what removes the file.

The planned set is every `node:` line of the map in use plus the node of every kept create target, root first, then by depth.

`review` and `both` go to step 5. `reset`, `extend` and an empty layer have no fix target and go straight to step 7.

## 5. Audit

One `Agent` call per fix target, every one of them in a single message so they run in parallel, `subagent_type: viber:memory-auditor`, no `model:` line - the agent's own frontmatter is its strength. Three labelled lines each and nothing else:

```
target: <the node's own path>
scope: <the directory holding it, the repository root for the root node>
out: .temp/viber/<id>/
```

`<id>` is the `id:` value of the map above. Create targets are never audited: their writer reads the area itself.

Each call returns exactly one line:

```
AUDIT: <node> stale <n> gone <n> unverifiable <n> miss <n> -> <findings file>
```

Report the `AUDIT:` line for each target verbatim. Read none of those files - the writer does.

## 6. Confirm

A fix target with four zero counters and an `ok` flag leaves the set. One still carrying `OVER-NODE` or `OVER-CHAIN` stays, zero counters or not. Nothing left in the set -> say the layer is already true in one line and stop.

Otherwise one `AskUserQuestion` over the counters, the over-budget flags and the create targets: write them, or stop. Only on approval go on.

## 7. Write in waves

A target's depth is the number of path segments of the directory holding its node, the root being 0. One wave per depth, the root's first, then ascending. Every target of a wave goes out in a single message, one `Agent` call each, `subagent_type: viber:memory-node-writer`, no `model:` line; the next wave only after every call of the previous one returned. Five labelled lines each and nothing else:

```
mode: fix | create
node: <the target's node path>
findings: <its findings file> | none
planned: <the planned set, comma-separated, root first>
refs: ${CLAUDE_PLUGIN_ROOT}/references
```

`findings` is the path its audit returned on a fix target and `none` on a create target.

Keep account while the waves return:

- a node was created when its dispatch ran in create mode and returned `VERDICT: UPDATED`, or when a `FILES:` path lies outside the planned set.
- a node was deleted for each `DELETED:` line.
- the nodes that now exist are the planned set, minus every create target that did not return `UPDATED`, minus every deleted node, plus every created node outside the planned set.

## 8. Reconcile the root

After the last wave, when the root exists and either it was a target and the nodes that now exist differ from the `planned:` it was written with, or it was not a target and any dispatch created or deleted a node, dispatch one more `viber:memory-node-writer` on it: `mode: fix`, `node: CLAUDE.md`, `findings: none`, `planned:` the nodes that now exist, `refs:` as above. Otherwise dispatch nothing here.

## 9. Report

Repeat what the writers returned and add nothing to it:

- each `FILES:`, `DELETED:`, `DROPPED:`, `LIFT:` and `CHAIN:` line, verbatim.
- each `NO-NODE` target, named as an area that needs no node.
- every call returned `VERDICT: NONE` -> nothing in the layer needed changing.

Close on one line: those files sit in the working tree, unstaged and uncommitted, and committing them is the user's next step.
