# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "Promote superdev closeout writers from fork skills to parallel agents"
Plan: C:\Users\dario\.claude\plans\idempotent-brewing-stonebraker.md

---
<!-- HEADER -->

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

<!-- /HEADER -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - chore(superdev): retire the four closeout writer skills
- Covers: criteria #7, #9, #10
- TDD: none

### Dependencies
- Task 2 - blocks: orchestrators must be rewired before the skills disappear
- Task 3 - blocks: fronts must be rewired before the skills disappear

### Files
- delete - superdev/skills/superbuild-adr/ (SKILL.md)
- delete - superdev/skills/superdev-memory-writer/ (SKILL.md, references/templates.md)
- delete - superdev/skills/superdev-rules-writer/ (SKILL.md, references/rule-format.md)
- delete - superdev/skills/superdev-changelog-writer/ (SKILL.md, references/entry-format.md)
- modify - superdev/.claude-plugin/plugin.json (`skills[]`, new `agents[]`)
- modify - superdev/README.md (`### Knowledge layers` table rows)
- modify - CLAUDE.md (superdev bullet L50, host-repo-`docs/` invariant L207 + L210, layout tree L143, plugin-internals paragraph L179-182, self-documentation invariant L287-289; line numbers are hints, they drift as the file is edited)
- modify - docs/assets/superdev-flow.svg (the four Close Out `<text class="desc">` labels, L422-425)

### Test Commands
#### Build
- none - this repo has no build step and no lint (markdown + JSON only, per root `CLAUDE.md`)

#### Tests
- `grep -rn "superbuild-adr\|superdev-memory-writer\|superdev-rules-writer\|superdev-changelog-writer" superdev/ CLAUDE.md docs/assets/superdev-flow.svg` - no output, exit 1
- `node -e "const p=JSON.parse(require('fs').readFileSync('superdev/.claude-plugin/plugin.json','utf8')); const a=p.agents||[]; if(a.length!==4) throw new Error('agents '+a.length); for(const n of ['adr-writer','memory-writer','rules-writer','changelog-writer']) if(!a.some(x=>x.includes(n))) throw new Error('missing '+n); if(p.skills.some(s=>/writer|superbuild-adr/.test(s))) throw new Error('writer left in skills'); console.log('ok')"` - prints `ok`
- `git status --porcelain superdev/hooks/content/manifest.md` - no output (manifest untouched)
- `node --test "tests/**/*.test.ts"` - suite green

### Approach
1. Delete the four skill directories in full, including their `references/` subdirs (the copies made
   in Task 1 are now the live ones).
2. In `superdev/.claude-plugin/plugin.json` remove `./skills/superbuild-adr/`,
   `./skills/superdev-memory-writer/`, `./skills/superdev-rules-writer/` and
   `./skills/superdev-changelog-writer/` from `skills[]`, and add an `agents[]` array with
   `./agents/adr-writer.md`, `./agents/memory-writer.md`, `./agents/rules-writer.md`,
   `./agents/changelog-writer.md` - matching how `superui`/`superfix` declare theirs.
3. In `superdev/README.md`, under `### Knowledge layers (also runnable on their own)`, change the
   table header cell from `Skill` to `Worker` and rewrite the three worker rows to name
   `superdev:changelog-writer`, `superdev:memory-writer` / `superdev:rules-writer` and
   `superdev:adr-writer` as agents, adding that the Close Out wave runs them in parallel.
4. In the root `CLAUDE.md` update all five spots: the superdev bullet's `superdev-changelog-writer
   (a fork writer only, ...)` phrasing (L50); the host-repo-`docs/` invariant's two worker names -
   `superdev's superbuild-adr` (L207) and `superdev-changelog-writer` (L210); the layout tree's
   `superdev/` line (L143) and the plugin-internals paragraph (L179-182), which must now list
   `superdev` alongside `superui`/`superfix` as carrying `agents/`; and the self-documentation
   invariant (L287-289), whose claim that "superdev and superbiz ship no agents at all - superdev's
   workers are skills" is now false for superdev - replace it with superdev's four closeout agents
   and which skills dispatch them, leaving superbiz's clause intact.
5. In `docs/assets/superdev-flow.svg` rewrite only the four Close Out label strings (L422-425) to
   the new agent names; change no geometry, no styles and no other text - L426 already states
   "wave 1 in parallel, changelog after it" and stays as is.
6. Touch nothing in `superdev/hooks/content/manifest.md` - it lists groups and chains, not individual
   workers, and no group or chain changes.

### Edge cases
- `superdev/references/` now holds four files including the pre-existing `plan-review-checklist.md` -
  the three new names must not collide with it.
- No worker may appear in both `skills[]` and `agents[]`; the node assertion above enforces it.
- `.github/scripts/release.sh` writes only `version` into each `plugin.json`, so a new `agents[]` key
  does not affect the release flow.

### DoD
The four writer skills are gone, `plugin.json` declares them as agents, README, root `CLAUDE.md` and
the flow diagram match the new shape, the manifest is unmodified, and every test command above
passes.

<!-- /TASK -->
