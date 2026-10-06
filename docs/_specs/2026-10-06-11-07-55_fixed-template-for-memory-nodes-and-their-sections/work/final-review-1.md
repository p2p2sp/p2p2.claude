# Final review - slice 1 (T1, T2, T3, T4, T5)

## Blocking

None.

## Minor

1. `viber/agents/memory-auditor.md:14` - the auditor's scope sentence still reads "a read-only sweep otherwise: `Grep` and `Glob` over the audited area, `Read` on the node, its sections and the files they describe". T2 added a required read outside that list: `## Shape` (line 40) tells the auditor to "Read the `## Template` part of `<refs>/node-doctrine.md` before judging form", and the input now carries `refs:` (line 24). The two lines contradict each other, so the scope sentence is stale. Fix: add the doctrine to the list of allowed reads, e.g. "`Read` on the node, its sections, the files they describe and `<refs>/node-doctrine.md`".
