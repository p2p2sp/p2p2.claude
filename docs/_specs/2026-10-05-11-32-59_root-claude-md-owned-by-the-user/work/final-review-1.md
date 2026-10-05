# Final review - slice 1 (T1-T8)

## Blocking

1. viber/agents/memory-node-writer.md:63-66 - an existing root's suggestions always name `CLAUDE.md`, even when the finding sits in a section beside the root.
   - What is wrong: under `## Root`, every bullet for an existing root hard-codes the path as `SUGGEST: CLAUDE.md: ...` (STALE, GONE, MISS, excluded block). The same file says a finding's quoted sentence may sit in the node or in one of its sections (Fix mode, line 47: "A finding's quoted sentence may sit in either"). `memory-auditor` audits the root's area with its sections, so a STALE or GONE sentence found in `CLAUDE.<topic>.md` at the repository root comes back pointing at `CLAUDE.md`. The user then goes looking for it in the wrong file.
   - Proof: the Output block of the same agent (line 96-97) and contract C3 both allow `<CLAUDE.md | CLAUDE.<topic>.md>` as the path. AC2 says changes to an existing root "and its sections" come back as `SUGGEST:` lines. `memory/SKILL.md` step 9 repeats these lines verbatim, so nothing downstream fixes the path.
   - Fix: in each existing-root bullet, use the path of the file that holds the sentence: `SUGGEST: <CLAUDE.md | CLAUDE.<topic>.md>: ...`. Keep `CLAUDE.md` only for the MISS, excluded-block and trim suggestions, which target the root itself.

## Minor

2. viber/skills/memory/SKILL.md:139 (step 9, the line "every call returned `VERDICT: NONE` -> nothing in the layer needed changing") - this line still says "nothing in the layer needed changing" whenever every call returned `VERDICT: NONE`.
   - What is wrong: an existing root now always returns `VERDICT: NONE` (memory-node-writer.md:101, "an existing root always returns it, its changes on `SUGGEST:` lines"). Take a `review` whose only kept target is a stale or oversized root. Its report repeats the `SUGGEST:` lines and then says nothing needed changing. The close line also speaks of files left in the working tree when none were written.
   - Proof: memory-node-writer.md:62 and :101 against SKILL.md step 9's NONE bullet and its closing line. S4 expects the report to carry the suggestions as changes the user should make.
   - Fix: limit that bullet to the case where every call returned `VERDICT: NONE` with no `SUGGEST:` line. When `SUGGEST:` lines exist, say the layer was left as it is and the listed suggestions are the user's to apply. Say the files sit unstaged in the working tree only when some `FILES:` line came back.
