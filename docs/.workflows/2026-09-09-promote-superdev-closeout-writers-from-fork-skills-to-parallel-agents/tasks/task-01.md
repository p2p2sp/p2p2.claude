
## Task 1 - feat(superdev): add closeout writer agents
- Covers: criteria #1, #2, #3, #8
- TDD: none

### Dependencies
- none

### Files
- add - superdev/agents/ (new plugin-root directory)
- add - superdev/agents/adr-writer.md (from skills/superbuild-adr/SKILL.md)
- add - superdev/agents/memory-writer.md (from skills/superdev-memory-writer/SKILL.md)
- add - superdev/agents/rules-writer.md (from skills/superdev-rules-writer/SKILL.md)
- add - superdev/agents/changelog-writer.md (from skills/superdev-changelog-writer/SKILL.md)
- add - superdev/references/memory-templates.md (copy of skills/superdev-memory-writer/references/templates.md)
- add - superdev/references/rule-format.md (copy of skills/superdev-rules-writer/references/rule-format.md)
- add - superdev/references/changelog-entry-format.md (copy of skills/superdev-changelog-writer/references/entry-format.md)

### Test Commands
#### Build
- none - this repo has no build step and no lint (markdown + JSON only, per root `CLAUDE.md`)

#### Tests
- `ls superdev/agents/adr-writer.md superdev/agents/memory-writer.md superdev/agents/rules-writer.md superdev/agents/changelog-writer.md` - all four listed, exit 0
- `ls superdev/references/memory-templates.md superdev/references/rule-format.md superdev/references/changelog-entry-format.md` - all three listed, exit 0
- `grep -L "^tools:" superdev/agents/*.md` - prints nothing
- ``grep -n '!`\|CLAUDE_PLUGIN_ROOT\|^context:\|^background:\|^user-invocable:' superdev/agents/*.md`` - no output, exit 1
- `grep -c "^## Output format" superdev/agents/*.md` - `1` for each of the four
- `grep -n "refs" superdev/agents/memory-writer.md superdev/agents/rules-writer.md superdev/agents/changelog-writer.md` - each file shows the repointed reference path
- `node --test "tests/**/*.test.ts"` - suite green

### Approach
1. `mkdir superdev/agents`. Copy the three reference files to their new plugin-root names listed in
   `### Files`. Leave the originals in place - Task 4 removes them with their skill directories, so
   no intermediate commit leaves a still-registered skill pointing at a missing reference.
2. For each writer, create the agent file as its `SKILL.md` with only these edits - the frontmatter
   (step 3), the `## Input` section (steps 4-5), the single reference mention where the writer has
   one (step 6, so not for `adr-writer`), and the one back-reference step 5 names. Every other line
   is copied byte-for-byte, `## Output format` included.
3. Frontmatter of each agent: `name:` the short form (`adr-writer`, `memory-writer`, `rules-writer`,
   `changelog-writer`); `description:` `Invoked only by superbuild, simplebuild, superdev-memory or
   superdev-rules, never directly.` (for `adr-writer`: `Invoked only by superbuild or simplebuild,
   never directly.`); `tools:` as a bare-name allowlist - `Read, Write, Bash` for `adr-writer`,
   `Read, Write, Edit, Grep, Glob, Bash` for the other three; `model:` and `effort:` carried over
   unchanged (`sonnet`/`medium` for memory + rules, `sonnet`/`low` for adr + changelog). Drop
   `context:`, `background:`, `user-invocable:` and `allowed-tools:` entirely.
4. Replace every `!`-preload in `## Input` with this prose, which preserves the `## <label>` framing
   the untouched body sections already use: the prompt carries one `label: value` line per input;
   Read each file-valued label now and treat its content as the `## <label>` block referenced below;
   a required label absent or its file unreadable -> return `VERDICT: FAIL` with
   `REASON: missing input <label>` and write nothing; non-path labels (`adr:` target dir, `notes:`,
   `workdir:`, `refs:`) are used as literal values read straight off the prompt. Required vs optional
   labels stay exactly as `resolve-input.sh` was called with them today: `adr-writer` - `plan`
   required, `spec` optional; `memory-writer` - `capture` required, `spec` optional;
   `rules-writer` - `capture` required; `changelog-writer` - `capture` required, `intent` / `spec` /
   `adr` optional.
5. Replace the two date preloads with Bash steps in the same place: `adr-writer` runs
   `date +%Y%m%d%H%M%S` for `ADR id` and `date +%F` for `Date`; `changelog-writer` runs `date +%F`
   for `Date`. Keep the rule that `ADR id` is used verbatim, never invented, shortened or
   renumbered. Then sweep each agent body for every back-reference to a deleted preload line and
   repoint it at the value itself: `superbuild-adr/SKILL.md:36` ("verbatim from the preload above")
   and `superdev-changelog-writer/SKILL.md:23` + `:50` (both naming "the `ADR path:` value
   below/above") are the three that exist today - after the sweep no agent body may say "preload",
   "above" or "below" about an input value.
6. Repoint the three reference mentions at the `refs:` value: `references/templates.md` ->
   `<refs>/memory-templates.md` (memory-writer, `## Write rules`), `references/rule-format.md` ->
   `<refs>/rule-format.md` (rules-writer, `## Write rules`), `references/entry-format.md` ->
   `<refs>/changelog-entry-format.md` (changelog-writer, `## Write`).

### Edge cases
- Required label missing or its file unreadable -> `VERDICT: FAIL` + `REASON:`, nothing written -
  the fail-loud behaviour `resolve-input.sh` provided.
- `adr-writer` finding no significant decision still writes no file and returns `ADR: none`.
- `memory-writer` / `rules-writer` with nothing qualifying still return `NODES: none` / `RULES: none`.
- `changelog-writer` still fails on an existing entry file (`entries are append-only`).

### Contracts
- Input: labeled lines in the agent prompt, one `label: value` per line - the same label names the
  fork `args` blocks use today, plus `refs: <dir>` for the three agents that read a reference file.
- Output: unchanged per agent - `VERDICT:` on line 1, then `ADR:` / `NODE:`+`GAP:` / `RULE:` /
  `CHANGELOG:`+`INDEX:`, or `REASON:` on FAIL.

### DoD
Four agent files and three plugin-root reference files exist; every test command above passes; the
four writer skills still exist and still work untouched.


### Covered criteria
1. `superdev/agents/` holds exactly four agent files - `adr-writer.md`, `memory-writer.md`,
   `rules-writer.md`, `changelog-writer.md` - each carrying a `tools:` frontmatter field and none of
   `context:`, `background:`, `user-invocable:`.
2. No file under `superdev/agents/` contains a `!`-preload or the token `CLAUDE_PLUGIN_ROOT`.
3. `superdev/references/` holds `memory-templates.md`, `rule-format.md` and
   `changelog-entry-format.md`, and each agent that needs one resolves it from the `refs:` value its
   caller passes.
8. Each worker's `## Output format` section is byte-identical to today's - same `VERDICT:`, `NODE:`,
   `NODES:`, `GAP:`, `RULE:`, `RULES:`, `ADR:`, `CHANGELOG:`, `INDEX:`, `REASON:` lines.
