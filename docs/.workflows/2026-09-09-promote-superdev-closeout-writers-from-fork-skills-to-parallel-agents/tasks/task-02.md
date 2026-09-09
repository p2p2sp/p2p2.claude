
## Task 2 - feat(superdev): dispatch closeout writers in parallel from both orchestrators
- Covers: criteria #4, #5
- TDD: none

### Dependencies
- Task 1 - blocks: the agents must exist before the orchestrators name them

### Files
- modify - superdev/skills/superbuild/SKILL.md (frontmatter `allowed-tools`, `## Step 4 - Close Out`)
- modify - superdev/skills/simplebuild/SKILL.md (frontmatter `allowed-tools`, `## Step 4 - Close Out`)

### Test Commands
#### Build
- none - this repo has no build step and no lint (markdown + JSON only, per root `CLAUDE.md`)

#### Tests
- `grep -c "^allowed-tools:.*Agent" superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md` - `1` for each
- `grep -c "subagent_type: superdev:" superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md` - `4` for each
- `grep -n "superbuild-adr\|superdev-memory-writer\|superdev-rules-writer\|superdev-changelog-writer" superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md` - no output, exit 1
- `grep -n "single message" superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md` - one hit per file, inside Step 4
- `node --test "tests/**/*.test.ts"` - suite green

### Approach
1. In both frontmatters add `Agent` to `allowed-tools` (an unlisted tool is not blocked but prompts
   the user and stalls the run - root `CLAUDE.md` `allowed-tools` invariant).
2. Insert a new Step 4 item directly after `TaskUpdate -> start`: run
   `printf '%s\n' "${CLAUDE_PLUGIN_ROOT}/references"` and keep its output as `<refs>` - the absolute
   dir every writer agent needing a reference file receives. Renumber the following items.
3. Rewrite the wave-1 item to: gated by Config, dispatch only the enabled ones with the `Agent`
   tool - all of them as multiple tool uses in ONE single message so they run concurrently - and
   await all before moving on. Keep the literal phrase `single message` in that line. Per bullet,
   `subagent_type` plus the same labeled lines the `args` block carries today:
   - `adr: true` -> `superdev:adr-writer` with `plan: <plan-copy path>`, `adr: docs/adr`, and
     `spec: <spec path>` in superbuild only. Its `ADR:` line still carries the written path or `none`.
   - `memory: true` -> `superdev:memory-writer` with `capture: <plan-copy path>`,
     `notes: <workdir>/implementation/`, `refs: <refs>`, and `spec: <spec path>` in superbuild only.
   - `rules: true` -> `superdev:rules-writer` with `capture: <plan-copy path>`,
     `notes: <workdir>/implementation/`, `refs: <refs>`.
4. Rewrite the wave-2 item the same way: after wave 1 completes, `Agent` ->
   `superdev:changelog-writer` with `capture: <plan-copy path>`, `workdir: <workdir>`,
   `notes: <workdir>/implementation/`, `refs: <refs>`, plus `intent:` / `spec:` (superbuild only) /
   `adr:` under exactly today's conditions.
5. Leave items 4, 5 and 6 of Step 4 (relay lines verbatim, non-fatal failures, `commit-task.sh`,
   `TaskStop`) and all of Step 5 unchanged - the dispatch blocks until every agent returns, so the
   commit still runs after the last write.

### Edge cases
- No switch enabled in either wave -> skip straight to the commit, as today.
- A single agent failing stays non-fatal: note it in the Step 5 summary, do not block the others or
  the commit.
- Only one switch enabled -> a one-element batch, identical behaviour to today.

### Contracts
- Consumes the agent input contract from Task 1; relays `ADR:` / `NODE:` / `RULE:` / `CHANGELOG:` /
  `INDEX:` / `GAP:` lines verbatim into Step 5, unchanged.

### DoD
Both orchestrators dispatch all four writers via `Agent` with `superdev:` subagent types, wave 1 in
one message; every test command above passes.


### Covered criteria
4. Step 4 of `superbuild` and `simplebuild` dispatches wave 1 with the `Agent` tool as multiple tool
   uses in ONE message and awaits all, then dispatches `superdev:changelog-writer` the same way as
   wave 2; no `Skill` invocation of a writer survives in either file.
5. `Agent` is listed in `allowed-tools` of `superbuild`, `simplebuild`, `superdev-memory` and
   `superdev-rules`.
