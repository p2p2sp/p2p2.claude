
## Task 3 - feat(superdev): interactive memory and rules fronts dispatch writer agents
- Covers: criterion #6, #5
- TDD: none

### Dependencies
- Task 1 - blocks: the agents must exist before the fronts name them

### Files
- modify - superdev/skills/superdev-memory/SKILL.md (frontmatter `allowed-tools`, step 5 handoff)
- modify - superdev/skills/superdev-rules/SKILL.md (frontmatter `allowed-tools`, step 5 handoff)

### Test Commands
#### Build
- none - this repo has no build step and no lint (markdown + JSON only, per root `CLAUDE.md`)

#### Tests
- `grep -c "^allowed-tools:.*Agent" superdev/skills/superdev-memory/SKILL.md superdev/skills/superdev-rules/SKILL.md` - `1` for each
- `grep -n "subagent_type: superdev:memory-writer" superdev/skills/superdev-memory/SKILL.md` - one hit
- `grep -n "subagent_type: superdev:rules-writer" superdev/skills/superdev-rules/SKILL.md` - one hit
- `grep -n "superdev-memory-writer" superdev/skills/superdev-memory/SKILL.md` - no output, exit 1
- `grep -n "superdev-rules-writer" superdev/skills/superdev-rules/SKILL.md` - no output, exit 1
- `node --test "tests/**/*.test.ts"` - suite green

### Approach
1. Add `Agent` to `allowed-tools` in both frontmatters.
2. In `superdev-memory` step 5 (`Capture + hand off`) replace the `Invoke superdev-memory-writer
   (Skill)` handoff with an `Agent` dispatch, `subagent_type: superdev:memory-writer`, carrying
   `capture: .temp/superdev/memory/capture-<RUN_ID>.md` and `refs: <refs>`, where `<refs>` comes from
   `printf '%s\n' "${CLAUDE_PLUGIN_ROOT}/references"` run in the same step. Keep the "Relay its
   VERDICT/NODE lines verbatim - do NOT re-verify" instruction untouched.
3. Do the same in `superdev-rules` step 5 with `subagent_type: superdev:rules-writer`,
   `capture: .temp/superdev/rules/capture-<RUN_ID>.md`, `refs: <refs>`, keeping the VERDICT/RULE
   relay instruction untouched.
4. Update the intro sentence of each skill body (`superdev-memory/SKILL.md` and
   `superdev-rules/SKILL.md`, both around line 10) that names the worker as the
   `superdev-memory-writer` / `superdev-rules-writer` "fork" - it must name the
   `superdev:memory-writer` / `superdev:rules-writer` agent instead.

### Edge cases
- Both fronts are interactive and ask the user BEFORE the handoff; the agent itself never asks, and
  no `AskUserQuestion` moves inside it.
- The single-writer handoff gains no speed - the change exists so one worker definition serves both
  callers.

### Contracts
- Same labeled-line input contract as Task 2, minus the build-only labels (`notes:`, `spec:`).

### DoD
Both fronts dispatch their writer as a `superdev:` agent and still relay its verdict lines verbatim;
every test command above passes.


### Covered criteria
6. `superdev-memory` and `superdev-rules` hand their capture file to `superdev:memory-writer` /
   `superdev:rules-writer` through the `Agent` tool.
5. `Agent` is listed in `allowed-tools` of `superbuild`, `simplebuild`, `superdev-memory` and
   `superdev-rules`.
