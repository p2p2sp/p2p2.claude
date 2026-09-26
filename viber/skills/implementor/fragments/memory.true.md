- `viber:memory-writer` with `spec: <dir>/spec.md`, `notes: <dir>/work/` and `refs: ${CLAUDE_PLUGIN_ROOT}/references`.

`memory-writer` (never `rules-writer`) returning one or more `OVER:` lines -> as soon as it returned, never waiting for the other writers of this step, one `viber:memory-auditor` per node, all in one message, these lines each and nothing else, `<key>` being the `key:` of step 1. The node of an `OVER:` path is that path when it is a `CLAUDE.md`, else the `CLAUDE.md` in its directory; two `OVER:` paths sharing a node make one target:

```
target: <the node>
scope: <the directory holding it, the repository root for the root node>
out: .temp/viber/<key>/
```

An auditor returns one `AUDIT:` line and no `VERDICT:` other than `DENIED`: never answer the `AUDIT:` line as a missing verdict. No `AUDIT:` line -> that node's `findings` is `none`.

After every auditor returned, `viber:memory-node-writer` per node in waves by depth: a node's depth is the number of path segments of the directory holding it, the root being 0. One wave per depth, the root's first, then ascending; every dispatch of a wave in one message, the next wave only after each of them returned. These lines each and nothing else:

```
mode: fix
node: <the node>
findings: <the findings file its AUDIT: line named> | none
planned: none
refs: ${CLAUDE_PLUGIN_ROOT}/references
```

Any wave after the root's own (every wave, when the root is no target) returning a `FILES:` path whose file name is `CLAUDE.md` other than its dispatched node, or a `DELETED:` line whose file name is `CLAUDE.md` -> after the last wave, when the root `CLAUDE.md` exists and no `DELETED:` line named it, one more dispatch with the same lines on `node: CLAUDE.md`, `findings: none`. A section path never triggers it.

Repeat verbatim in the final summary every `AUDIT:` line and every node writer's `DROPPED:`, `DELETED:`, `LIFT:` and `CHAIN:` line, plus every `OVER:` line whose node writer returned neither `VERDICT: UPDATED` nor `VERDICT: NONE`.
