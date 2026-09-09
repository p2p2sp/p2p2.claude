Title: "Promote superdev closeout writers from fork skills to parallel agents"


## Goal
Wave 1 of `Step 4 - Close Out` in both build orchestrators dispatches its enabled knowledge-layer
writers with the `Agent` tool in a single message, so `adr` / `memory` / `rules` run concurrently
instead of one blocking fork after another. Wave 2 (`changelog`) follows the same way once wave 1
returns. Every writer keeps its current output contract verbatim.

## Context
`superbuild/SKILL.md:87` and `simplebuild/SKILL.md:83` both instruct "run only the enabled ones, in
parallel (single message, await all)", but they dispatch through the `Skill` tool and the four
writers are `context: fork` + `background: false`. Fork skill invocations are serialized, so the
instruction is dead and closeout costs the sum of three sonnet forks. The only in-skill parallelism
mechanism, `background: true`, returns just an agent name and delivers the result later as a task
notification - which would let `commit-task.sh` (Step 4 item 5) run while a writer is still writing.
The `Agent` tool is the real parallelism primitive and this repo already proves it:
`superui/skills/design-extractor-builder/SKILL.md:53` fans out `superui:foundation-analyst` x4.
The three wave-1 writers touch disjoint targets (`docs/adr/`, the `CLAUDE.md` cascade,
`.claude/rules/`), so concurrency needs no locking.

## Acceptance criteria
1. `superdev/agents/` holds exactly four agent files - `adr-writer.md`, `memory-writer.md`,
   `rules-writer.md`, `changelog-writer.md` - each carrying a `tools:` frontmatter field and none of
   `context:`, `background:`, `user-invocable:`.
2. No file under `superdev/agents/` contains a `!`-preload or the token `CLAUDE_PLUGIN_ROOT`.
3. `superdev/references/` holds `memory-templates.md`, `rule-format.md` and
   `changelog-entry-format.md`, and each agent that needs one resolves it from the `refs:` value its
   caller passes.
4. Step 4 of `superbuild` and `simplebuild` dispatches wave 1 with the `Agent` tool as multiple tool
   uses in ONE message and awaits all, then dispatches `superdev:changelog-writer` the same way as
   wave 2; no `Skill` invocation of a writer survives in either file.
5. `Agent` is listed in `allowed-tools` of `superbuild`, `simplebuild`, `superdev-memory` and
   `superdev-rules`.
6. `superdev-memory` and `superdev-rules` hand their capture file to `superdev:memory-writer` /
   `superdev:rules-writer` through the `Agent` tool.
7. The four writer skill directories are gone; `superdev/.claude-plugin/plugin.json` lists the four
   workers in `agents[]` and none of them in `skills[]`.
8. Each worker's `## Output format` section is byte-identical to today's - same `VERDICT:`, `NODE:`,
   `NODES:`, `GAP:`, `RULE:`, `RULES:`, `ADR:`, `CHANGELOG:`, `INDEX:`, `REASON:` lines.
9. `superdev/README.md`, the root `CLAUDE.md` and `docs/assets/superdev-flow.svg` name the four
   workers as superdev agents, and no old worker name survives under `superdev/` or in those three
   files; `superdev/hooks/content/manifest.md` is untouched, and the historical run dirs under
   `docs/.workflows/` are left exactly as they are - they are the record of past builds.
10. `node --test "tests/**/*.test.ts"` passes from the repo root.

