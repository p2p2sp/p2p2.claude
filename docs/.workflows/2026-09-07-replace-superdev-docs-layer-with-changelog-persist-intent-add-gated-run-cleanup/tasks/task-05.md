
## Task 5 - Rewire both build orchestrators: two close-out waves and the cleanup step
- Covers: criteria #5
- TDD: none

### Dependencies
- Task 1 - blocks: Config paragraph names the five switches
- Task 2 - blocks: Step 5 calls cleanup-run.sh
- Task 3 - blocks: Step 4 reads `intent:` from the decompose index
- Task 4 - blocks: Step 4 invokes superdev-changelog-writer

### Files
- modify - superdev/skills/superbuild/SKILL.md (Config paragraph line 24, Step 1 index description line 42, Step 4 lines 84-94, Step 5 lines 96-100)
- modify - superdev/skills/simplebuild/SKILL.md (Config paragraph line 24, Step 1 index description line 42, Step 4 lines 80-90, Step 5 lines 92-96)

### Test Commands
#### Build
- none - the repo has no build step

#### Tests
- `node --test tests/portability.test.ts` -> `# fail 0`
- `grep -n "docs" superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md` -> only `docs/adr` and `docs/.workflows` hits, no `docs:` switch, no `superdev-docs`

### Approach
1. Config paragraph: `These gate the Close-Out delegations (Step 4: adr, rules, memory, changelog) and the run cleanup (Step 5: cleanup).`
2. Step 1 index description: add `intent:` intent path (optional) after `spec:` (superbuild) / after `plan:` (simplebuild).
3. Step 4 item 2 becomes "Wave 1 - gated by Config; run only the enabled ones, in parallel (single message, await all)": the existing `adr` / `memory` / `rules` bullets unchanged; delete the `docs` bullet. New item 3 "Wave 2 - `changelog: true` -> after wave 1 completes, invoke `superdev-changelog-writer` (Skill) with a labeled-line args block - `capture: <plan-copy path>`, `workdir: <workdir>`, `notes: <workdir>/implementation/`, plus `intent: <intent path>` only when the decompose index printed an `intent:` line, `spec: <spec path>` (superbuild only), and `adr: <path>` only when wave 1 returned `ADR: <path>` other than `none`." Nothing enabled in either wave -> skip to the commit.
4. Tagged-line list becomes `ADR:` / `NODE:` / `RULE:` / `CHANGELOG:` / `INDEX:` / `GAP:`; commit message `chore(<track>): close out adr, memory, rules and changelog`.
5. Step 5: new first item - `cleanup: true` -> run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/cleanup-run.sh" <workdir> superbuild` (resp. `simplebuild`) and keep its `CLEANUP:` line; the script verifies completion itself - never re-check, never retry. Then the summary: relayed lines now `ADR:` / `NODE:` / `RULE:` / `CHANGELOG:` / `INDEX:` / `CLEANUP:`; GAP mapping keeps only `-> run superdev-memory` and `-> run superdev-rules`.

### Edge cases
- Wave 1 disabled entirely but `changelog: true` -> wave 2 still runs, without `adr:`.
- `cleanup: true` on an aborted build never reaches Step 5 (the orchestrator only gets there after Close Out), so nothing is removed mid-build.

### Contracts
- Consumes `cleanup-run.sh` stdout `CLEANUP: ...` (Task 2), decompose `intent:` line (Task 3), writer output `CHANGELOG:` / `INDEX:` (Task 4).

### DoD
Both orchestrators describe the two waves and the cleanup step; grep check passes; portability sweep green.


### Covered criteria
5. `superbuild/SKILL.md` and `simplebuild/SKILL.md`: Config paragraph names the five switches; Step 4 runs wave 1 (`adr`, `memory`, `rules`, parallel) then wave 2 (`changelog: true` -> `superdev-changelog-writer` with `capture:`, `workdir:`, `notes:`, optional `intent:` from the decompose index, optional `spec:` on superbuild, optional `adr:` from wave 1's `ADR: <path>` line), relays `CHANGELOG:` / `INDEX:` lines, commits `chore(<track>): close out adr, memory, rules and changelog`; Step 5 runs `bash "${CLAUDE_PLUGIN_ROOT}/scripts/cleanup-run.sh" <workdir> <track>` when `cleanup: true` and relays its `CLEANUP:` line verbatim; the word `docs` no longer appears as a switch, a delegation or a GAP mapping in either file.
