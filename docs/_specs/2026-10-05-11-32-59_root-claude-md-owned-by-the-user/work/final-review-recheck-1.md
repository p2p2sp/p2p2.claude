# Final review recheck 1

## Blocking

1. viber/agents/memory-node-writer.md:62 - finding 1 of final-review-1.md is only partly fixed.
   - What is wrong: the `STALE` and `GONE` bullets (lines 63-64) now ask for "the path being the file that holds the sentence". But the instruction that leads into them (line 62) still reads "Read `node` and `findings` when it names a path". It never tells the writer to read the sections beside the root. The writer is never pointed at `CLAUDE.<topic>.md`, so it cannot tell that a sentence sits there. It will fall back to `CLAUDE.md`, which is exactly the defect finding 1 reported.
   - Proof: Fix mode (line 40) says "Read `node` and its sections, then `findings`... A finding's quoted sentence may sit in either". The root branch at line 62 has no such step. memory-auditor.md:42 quotes a `STALE` sentence "from the node or a section" without naming which file it came from, so the finding itself does not carry the path either.
   - Fix: on line 62, change "Read `node` and `findings` when it names a path" to "Read `node`, its sections and `findings` when it names a path".
