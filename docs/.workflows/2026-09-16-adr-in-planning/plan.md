# SuperPlan
To build this plan use the `superbuild` skill.

Title: "ADR judged in the intent synthesis and written by the plan's first task"
Spec: docs/.workflows/2026-09-16-adr-in-planning/spec.md <!-- `What & Why` specification -->
Intent: docs/.workflows/2026-09-16-adr-in-planning/intent.md
Plan: C:\Users\dario\.claude-p2p2\plans\crispy-exploring-sparrow.md

---

<!-- TASK -->

## Task 1 - Add the adr skill and register it
- TDD: none
- Model: opus
- Effort: high
- Covers: `Trzy kryteria` (#1), `Kształt szkicu` (#3), `Skill zarejestrowany` (#10)

### Dependencies
- none

### Files
- add - superdev/skills/adr/SKILL.md (the whole skill: frontmatter, `# Input`, `# Judge`, `# Offer`, `# Block shape`, `# Output`)
- modify - superdev/.claude-plugin/plugin.json (`skills[]` gains `"./skills/adr/"` right after `"./skills/intent/"`)

### Test Commands
#### Build
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/adr` - exit 0, last line `FAIL=0 WARN=<n>`

#### Tests
- `grep -c '"./skills/adr/"' superdev/.claude-plugin/plugin.json` - prints `1`
- `grep -c '^user-invocable: false' superdev/skills/adr/SKILL.md` - prints `1`
- `! grep -q 'context: fork' superdev/skills/adr/SKILL.md` - exit 0 (the skill runs in the main context)
- `grep -c 'decision: <n>' superdev/skills/adr/SKILL.md` - prints at least `1`
- `! LC_ALL=C grep -q $'\xe2\x80[\x93\x94]' superdev/skills/adr/SKILL.md` - exit 0 (no em dash, no en dash)

### Approach
1. Load the `supercc:skill-designer` Skill and author `superdev/skills/adr/SKILL.md` through it (new skill, English, bullets over prose). Frontmatter: `name: adr`, `user-invocable: false`, `allowed-tools: Read, Glob`, no `context:`, no `model:`. The `description:` states the work (judges the confirmed decisions of an intent interview against three ADR criteria, offers and drafts one-paragraph ADRs for the ones that pass) and carries the routing guard: invoked by the `intent` skill only, right after the user confirms the synthesis, never directly and never by the user.
2. `# Input`: `$ARGUMENTS` is empty (judge every confirmed decision) or one line `decision: <n>` (judge that decision alone). The decisions, the alternatives weighed and the user's reasons are in the conversation; the skill reads no file except `Glob docs/adr/*.md` to find an earlier ADR the decision replaces.
3. `# Judge`: the three criteria, all three required for an offer: hard to reverse (the cost of changing the decision later is meaningful), surprising without context (a future reader would ask why it was done this way), the result of a real trade-off (genuine alternatives existed and one was chosen for specific reasons). One criterion missing -> skip the decision silently. State the calibration: most runs end with zero ADRs.
4. `# Offer`: one plain-prose message per qualifying decision (never `AskUserQuestion`): the filled block from `# Block shape` and a numbered choice `1` accept, `2` rephrase (the user dictates wording, then the block is shown again), `3` skip. A skipped or declined decision leaves no trace.
5. `# Block shape`: the `## ADR` section contract, one `### <slug>` block per accepted ADR:
   ```
   ## ADR
   ### <slug>
   Decision: `<question>` (decision <n>)
   Supersedes: <repo-relative path of the earlier ADR under docs/adr/, line present only when one is replaced>
   ```markdown
   # <Short title of the decision>

   <1-3 sentences: the context, what was decided, why.>
   ```
   ```
   Inside the fence, `## Considered Options` only when the interview weighed more than one option the user wants remembered, `## Consequences` only when the user pointed at a downstream effect to remember; the fenced body opens with the YAML frontmatter `status: accepted` only when a `Supersedes:` line is present, never otherwise (the plain case carries no frontmatter at all). `<slug>`: the title lowercased, ASCII letters and digits, other characters collapsed to `-`, at most 6 words. `Decision:` uses the reference form of `superdev/references/review-contract.md` `## Naming` (the question copied from the intent's `### <n>.` heading).
6. `# Output`: the last line is `ADR: <k> accepted` or `ADR: none`; the accepted blocks are the `## ADR` section the caller writes into `intent.md`.

### Failure modes
- when `Glob docs/adr/*.md` finds no file -> response: skip the supersede check and write no `Supersedes:` line, log: nothing, test: `grep -c 'Supersedes' superdev/skills/adr/SKILL.md` prints at least `2` (the line and its absence rule)

### Contracts
- `## ADR` section shape (step 5: `### <slug>`, `Decision:`, optional `Supersedes:`, one fenced markdown file body) - consumed by `Wire the adr skill into the intent synthesis` (Task 2), `Carry the ADR section into phase 01 only` (Task 3), `Plan the ADR write as the first task` (Task 4)
- `$ARGUMENTS` line `decision: <n>` - consumed by `Wire the adr skill into the intent synthesis` (Task 2)
- output line `ADR: <k> accepted` | `ADR: none` - consumed by `Wire the adr skill into the intent synthesis` (Task 2)

### DoD
`superdev/skills/adr/SKILL.md` exists, lints with zero FAIL, is registered in `plugin.json` `skills[]`, and the test commands above pass.

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - Wire the adr skill into the intent synthesis
- TDD: none
- Model: opus
- Effort: high
- Covers: `Trzy kryteria` (#1), `Bramka konfiguracji` (#2), `Resume` (#12)

### Dependencies
- `Add the adr skill and register it` (Task 1) - blocks: the `## ADR` block shape, the `decision: <n>` argument and the `ADR:` output line this task wires

### Files
- modify - superdev/skills/intent/SKILL.md (frontmatter `allowed-tools`; new `## Config` after `## Run`; `## Resume from a file` reopened branch; `## Synthesis`)
- modify - superdev/skills/intent/references/intent-template.md (`## Content rules` and `## Template`)

### Test Commands
#### Build
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/intent` - exit 0, last line `FAIL=0 WARN=<n>`

#### Tests
- `grep -c 'Bash(${CLAUDE_PLUGIN_ROOT}/scripts/read-config.sh:\*)' superdev/skills/intent/SKILL.md` - prints `1`
- `grep -c 'read-config.sh' superdev/skills/intent/SKILL.md` - prints at least `2` (the pattern entry and the preload)
- `grep -c 'decision: <n>' superdev/skills/intent/SKILL.md` - prints at least `1`
- `grep -c '^## ADR' superdev/skills/intent/references/intent-template.md` - prints `1`
- `! LC_ALL=C grep -q $'\xe2\x80[\x93\x94]' superdev/skills/intent/SKILL.md superdev/skills/intent/references/intent-template.md` - exit 0

### Approach
1. Frontmatter `allowed-tools`: append `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/read-config.sh:*)` (pattern entry, the preload rule of the root `CLAUDE.md`).
2. New section `## Config` directly after `## Run`: the preload `` !`"${CLAUDE_PLUGIN_ROOT}/scripts/read-config.sh"` `` (invoked directly, never through an interpreter) and one sentence: the ADR step below runs ONLY when the `adr:` line reads exactly `true`; anything else (`false`, absent, an unresolved block, a missing config file) means skip and nothing below breaks on it.
3. `## Synthesis`, on a fresh run only - scope its existing `Resume:` overwrite bullet to say the ADR step below does not fire there, so the fresh-run gate cannot be read as covering the resume path too, and step 4 below stays the single owner of the ADR call on a resume - after the user confirms and before the `intent-template.md` Read: `adr: true` -> invoke the `adr` Skill with no arguments; `ADR: <k> accepted` -> the returned blocks are the `## ADR` section of the file about to be written; `ADR: none` -> the file has no `## ADR` section. `adr:` not `true` -> the skill is not invoked and the file has no `## ADR` section.
4. `## Resume from a file`, reopened-decision branch: after the branch re-interview and before the overwrite, `adr: true` -> invoke the `adr` Skill with `decision: <n>`; remove every existing `## ADR` block whose `Decision:` line names decision `<n>` and insert the returned blocks in their place (an empty section is dropped); `adr:` not `true`, or no decision reopened -> the existing `## ADR` section is carried into the overwrite verbatim.
5. `intent-template.md`: add the optional section `## ADR` between `## Out of scope` and `## History` with a placeholder pointing at the `adr` skill's block shape; add one content rule: `## ADR` is present only when the `adr` skill returned at least one accepted block, copied verbatim from that output; it is the single exception to the no-rationale rule above and covers the ADR text alone; on an overwrite it is carried over unchanged unless the `adr` skill re-judged its decision.

### Failure modes
- when the `read-config.sh` preload block is unresolved or `.claude/superdev.yml` is missing -> response: the `adr:` line is not `true`, the `adr` skill is not invoked and the file has no `## ADR` section, log: nothing, test: `grep -c 'exactly `true`' superdev/skills/intent/SKILL.md` prints at least `1`

### Contracts
- none

### DoD
`intent/SKILL.md` preloads the config, gates the `adr` Skill call on `adr: true` in `## Synthesis` and on the reopened branch of `## Resume from a file`, the template carries the optional `## ADR` section, the lint returns zero FAIL and the test commands pass.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - Carry the ADR section into phase 01 only
- TDD: none
- Model: sonnet
- Effort: low
- Covers: `Fazy` (#13)

### Dependencies
- `Add the adr skill and register it` (Task 1) - blocks: the `## ADR` section name copied here

### Files
- modify - superdev/skills/phases/SKILL.md (`## Phase intents` bullet list)

### Test Commands
#### Build
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/phases` - exit 0, last line `FAIL=0 WARN=<n>`

#### Tests
- `grep -c '`## ADR`' superdev/skills/phases/SKILL.md` - prints at least `1`
- `! LC_ALL=C grep -q $'\xe2\x80[\x93\x94]' superdev/skills/phases/SKILL.md` - exit 0

### Approach
1. In `## Phase intents`, add one bullet after the `## Out of scope` bullet: `## ADR` - phase `01` only: the master's `## ADR` section copied verbatim when the master has one; every other phase intent has no `## ADR` section, whatever its `Covers:` names.

### Failure modes
- none - markdown

### Contracts
- none

### DoD
The `## Phase intents` list carries the `## ADR` rule, the lint returns zero FAIL and the test commands pass.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - Plan the ADR write as the first task
- TDD: none
- Model: opus
- Effort: high
- Covers: `Zadanie ADR w planie` (#4), `Brak ADR, brak zadania` (#5), `Reviewerzy planu` (#6), `Plik ADR` (#7)

### Dependencies
- `Add the adr skill and register it` (Task 1) - blocks: the `## ADR` block shape (`### <slug>`, `Supersedes:`, fenced body) this task turns into a plan task

### Files
- add - superdev/references/adr-task.md (the filled `Write ADR` task block both planners copy)
- modify - superdev/skills/simpleplan/SKILL.md (`### Rules`, `### Initial Understanding` refreshed-intent gate)
- modify - superdev/skills/superplan/SKILL.md (`### Rules`)
- modify - superdev/references/plan-review-checklist.md (`## Never flag`)

### Test Commands
#### Build
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simpleplan && bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superplan` - exit 0, each last line `FAIL=0 WARN=<n>`

#### Tests
- `grep -c 'references/adr-task.md' superdev/skills/simpleplan/SKILL.md superdev/skills/superplan/SKILL.md` - prints `1` for each file
- `grep -c 'date +%Y-%m-%d-%H%M%S' superdev/references/adr-task.md` - prints at least `1`
- `grep -c 'add - docs/adr/' superdev/references/adr-task.md` - prints `1`
- `grep -c 'docs/adr/<YYYY-MM-DD-HHMMSS>-<slug>.md' superdev/references/adr-task.md` - prints at least `1` (the name pattern is stated literally)
- `grep -c 'Write ADR' superdev/references/plan-review-checklist.md` - prints at least `1`
- `! LC_ALL=C grep -q $'\xe2\x80[\x93\x94]' superdev/references/adr-task.md superdev/skills/simpleplan/SKILL.md superdev/skills/superplan/SKILL.md superdev/references/plan-review-checklist.md` - exit 0

### Approach
1. `superdev/references/adr-task.md`: one section `## Fill rules` (title `Write ADR `<title>`` for one ADR, `Write ADRs` for several; the fenced body of every `## ADR` block copied verbatim; `<slug>` and `Supersedes:` taken from the block; the task is always Task 1 and every other task is renumbered after it and never depends on it) and one section `## Task block` in the plan template's exact task shape: `- TDD: none`, `- Model: sonnet`, `- Effort: low`, `- Covers: `ADR` (intent `## ADR`)`; `### Dependencies` `none`; `### Files` `add - docs/adr/ (<slug>.md per ADR, name stamped at write time)` plus one `modify - <Supersedes path>` per `Supersedes:` line; `### Test Commands` with `#### Build` `none - documentation only` and `#### Tests` `ls docs/adr/ | grep -c -- '-<slug>.md$'` prints `1` per slug; `### Approach`: run `date +%Y-%m-%d-%H%M%S` once for `<stamp>`, `Write` `docs/adr/<stamp>-<slug>.md` (the name pattern written out as `docs/adr/<YYYY-MM-DD-HHMMSS>-<slug>.md`) with the fenced content verbatim (the `Write` creates `docs/adr/`), for each `Supersedes:` path set or add the YAML frontmatter `status: superseded by docs/adr/<stamp>-<slug>.md` at the top of that file; `### Failure modes` `none - single write` (one stamp with seconds, one task, so no collision within a run); `### Contracts` `none`; a note that `decompose.sh` prints `warning: ... has no 'Covers:' criteria - none appended` for this task on every build and continues, which is expected and not a problem; `### DoD` every listed file exists with the given content.
2. `simpleplan/SKILL.md` `### Rules`: the `intent:` file carries a `## ADR` section -> Task 1 is `${CLAUDE_PLUGIN_ROOT}/references/adr-task.md` filled by its `## Fill rules`; no `## ADR` section, or no `intent:` -> no such task. Scope the refreshed-intent gate's "the file's content is never read" sentence to that gate alone, so the skill does not carry two opposite instructions about the same file.
3. `superplan/SKILL.md` `### Rules`: the same rule, the intent reached through the spec's `Intent:` line (Read that file for its `## ADR` section only); a spec with no `Intent:` line, or one whose path no longer resolves, is treated exactly like an intent with no `## ADR` section -> no such task.
4. `plan-review-checklist.md` `## Never flag`: the `Write ADR` task built from `superdev/references/adr-task.md` - its `### Approach` carrying the ADR text verbatim, its `Covers:` naming the intent's `## ADR` instead of a criterion (exempt from the numeric-criterion reference form as well, not only from the coverage class), and its `### Files` declaring `docs/adr/` by directory. Add the same exemption as a clause on each planner's own `### Rules` bullet beginning "`### Approach` carries symbol, signature and algorithm only", so a planner does not shrink the ADR text before review.

### Failure modes
- when the spec carries no `Intent:` line, or its `Intent:` path does not resolve -> response: `superplan` plans no `Write ADR` task, log: nothing, test: `grep -c 'no longer resolves' superdev/skills/superplan/SKILL.md` prints at least `1`

### Contracts
- `adr-task.md` `## Task block` (markers, `docs/adr/` directory declaration, the `<stamp>` step, the `Supersedes:` frontmatter step) - consumed by `Remove adr-writer from the build close-out and link ADRs from git` (Task 5), which relies on the written files sitting under `docs/adr/` in the build's commits

### DoD
Both planners point at `adr-task.md`, the reference carries the filled task block, the checklist's `## Never flag` covers that task, both lints return zero FAIL and the test commands pass.

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 - Remove adr-writer from the build close-out and link ADRs from git
- TDD: none
- Model: opus
- Effort: medium
- Covers: `Link w changelogu` (#8), `Agent usunięty` (#9), `Konfiguracja nietknięta` (#11)

### Dependencies
- `Plan the ADR write as the first task` (Task 4) - blocks: the ADR files land under `docs/adr/` inside the build's own commits, which is what the `git diff` below finds

### Files
- delete - superdev/agents/adr-writer.md
- modify - superdev/.claude-plugin/plugin.json (`agents[]` loses `"./agents/adr-writer.md"`)
- modify - superdev/skills/superbuild/SKILL.md (`## Config`, `## Step 4 - Close Out`, `## Step 5 - Done`)
- modify - superdev/skills/simplebuild/SKILL.md (`## Config`, `## Step 4 - Close Out`, `## Step 5 - Done`)
- modify - superdev/agents/changelog-writer.md (`## Input`, `## Write`)
- modify - superdev/references/changelog-entry-format.md (`## Template` header line `- ADR:`)

### Test Commands
#### Build
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superbuild && bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simplebuild && bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/changelog-writer.md` - exit 0, each last line `FAIL=0 WARN=<n>`

#### Tests
- `test ! -e superdev/agents/adr-writer.md` - exit 0
- `! grep -rq --exclude=README.md 'adr-writer' superdev/` - exit 0 (the README is Task 6's)
- `grep -c -- '--diff-filter=A <base>..HEAD -- <root>/docs/adr/' superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md` - prints `1` for each file
- `grep -c 'close out memory, rules and changelog' superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md` - prints `1` for each file
- `grep -c 'one line per ADR' superdev/references/changelog-entry-format.md` - prints `1`
- `grep -c 'docs/adr/20260907140501' superdev/references/changelog-entry-format.md` - prints `2` (the worked example is left untouched)
- `node --test tests/superdev/read-config.test.ts tests/superdev/bootstrap.test.ts` - all pass, test files unchanged (`git diff --quiet -- tests/` exits 0)
- `node --test "tests/**/*.test.ts"` - all pass
- `! LC_ALL=C grep -q $'\xe2\x80[\x93\x94]' superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md superdev/agents/changelog-writer.md superdev/references/changelog-entry-format.md` - exit 0

### Approach
1. Both orchestrators, `## Config`: the gated close-out delegations are `rules`, `memory`, `changelog` (the `adr` switch is read but gates nothing here; it gates the `intent` skill).
2. Both orchestrators, Step 4 wave 1: delete the `adr: true` bullet, so wave 1 dispatches `memory-writer` and `rules-writer` only. Wave 2, before the `changelog-writer` dispatch: when the index's `base:` is not `none`, run `git diff --name-only --diff-filter=A <base>..HEAD -- <root>/docs/adr/` with the Bash tool (the pathspec joined with the index's `root:`, because the orchestrator never `cd`s and a session may start in a subdirectory; `--diff-filter=A` keeps an older ADR the build only marked superseded out of the list) and append one `adr: <root>/<printed path>` line per printed path to the labeled prompt (`--name-only` prints repository-root-relative paths, so they join with `root:` like every other path); no printed path -> no `adr:` line. State the `base:` branch explicitly in both files: when the index's `base:` is `none`, run no `git diff` and pass no `adr:` line. Drop `ADR:` from the relayed-lines list of `## Step 4 - Close Out` item 4, from its `--path` enumeration in item 5 and from the `## Step 5 - Done` summary list; the close-out commit message becomes `chore(superbuild): close out memory, rules and changelog` and `chore(simplebuild): close out memory, rules and changelog`, with `--path` entries unchanged otherwise.
3. `changelog-writer.md` `## Input`: `adr` is optional and repeatable, one line per ADR file written by this build, each read as one `## adr` block; extend the `## intent` sentence so the no-rejected-alternatives rule names its one exception, the intent's own `## ADR` section. `## Write`: one header bullet `- ADR: <path>` per `adr:` value in the given order, omitted entirely when none; a `## Decisions` line may cite the ADR that records it.
4. `changelog-entry-format.md` template header line: `- ADR: <path>            (one line per ADR written for this run; omit when none)`; the `## Decisions` example line keeps its `(ADR: <path>)` form. Touch nothing else in that file: the worked example's own stamp shape stays as it is, because the spec puts the changelog format out of scope beyond this one bullet.
5. Delete `superdev/agents/adr-writer.md` and remove its `agents[]` entry from `plugin.json`. Leave `superdev/hooks/content/manifest.md` alone: it names neither `adr` nor the Close Out waves, so this change owes it nothing.

### Failure modes
- when the index's `base:` is `none` -> response: run no `git diff`, pass no `adr:` line, log: nothing, test: `grep -c '`base:` is `none`' superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md` prints at least `1` for each file
- when `git diff` exits non-zero -> response: pass no `adr:` line and note the failure in the Step 5 summary, log: the Step 5 summary line, test: `grep -c 'exits non-zero' superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md` prints at least `1` for each file

### Contracts
- `adr:` labeled line, repeatable, one absolute path per line, orchestrator -> `changelog-writer` (steps 2 and 3, same task) - consumed by no other task

### DoD
No `adr-writer` reference survives under `superdev/` outside `README.md` (Task 6 clears that one), wave 1 dispatches two writers, wave 2 derives `adr:` lines from `git diff`, `changelog-writer` accepts repeated `adr:`, the full test suite passes with `tests/` untouched, and the test commands above pass.

<!-- /TASK -->

---

<!-- TASK -->

## Task 6 - Document the ADR move in the superdev README and root CLAUDE.md
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: `Agent usunięty` (#9), `Skill zarejestrowany` (#10)

### Dependencies
- `Wire the adr skill into the intent synthesis` (Task 2) - blocks: the documented `intent` behaviour
- `Plan the ADR write as the first task` (Task 4) - blocks: the documented plan task
- `Remove adr-writer from the build close-out and link ADRs from git` (Task 5) - blocks: the documented close-out waves

### Files
- modify - superdev/README.md (`## Quick start` steps 3 and 7, `## Config switches` `adr` row, `### Entry and environment` table, `### Knowledge layers (also runnable on their own)` table)
- modify - CLAUDE.md (the `superdev` bullet under `## What this repo is`, the `superdev/` line of the `## Repository layout (top level)` tree, the `docs/adr/` item under `## Cross-plugin architecture invariants`, the closeout-writers sentence under `Self-documentation`)

### Test Commands
#### Build
- none - markdown only

#### Tests
- `! grep -q 'adr-writer' superdev/README.md CLAUDE.md` - exit 0
- `grep -c '| `adr` |' superdev/README.md` - prints `2` (the config-switch row and the skill row)
- `grep -c 'skills/adr' CLAUDE.md` - prints at least `1`
- `! LC_ALL=C grep -q $'\xe2\x80[\x93\x94]' superdev/README.md CLAUDE.md` - exit 0

### Approach
1. `superdev/README.md`: Quick start step 3 gains one sentence (with `adr: true`, after the confirmation the `adr` skill judges each decision against the three criteria and offers a one-paragraph ADR only for the ones that pass; accepted drafts land in `intent.md` `## ADR` and become the plan's first task, written to `docs/adr/<YYYY-MM-DD-HHMMSS>-<slug>.md` during the build); step 7 lists wave 1 as `memory` and `rules` and says `changelog` links every ADR the build wrote; the `## Config switches` table header widens from "When `true`, Close Out also…" to "When `true`…", because the `adr` row no longer describes a Close Out action; the `adr` config row reads "offers an ADR in the intent synthesis for a decision that is hard to reverse, surprising without context and a real trade-off; the plan's first task writes it to `docs/adr/<YYYY-MM-DD-HHMMSS>-<slug>.md`"; the Entry table gains a row whose first cell is exactly `` `adr` `` (bare, like the other skill rows, never `superdev:adr`) and whose text opens with "invoked by `intent` at the synthesis, never by you", so a non-invocable skill in that table reads true; the `memory-writer / rules-writer` row drops "alongside `superdev:adr-writer`"; the `superdev:adr-writer` row is removed.
2. `CLAUDE.md`: the `superdev` bullet describes the `adr` skill and names its path `superdev/skills/adr/` (main-context, invoked by `intent` at synthesis when `adr: true`, three criteria, `## ADR` in `intent.md`, the plan's first task from `superdev/references/adr-task.md`, `changelog-writer` fed by `git diff` over `docs/adr/`); the `## Repository layout (top level)` tree's `superdev/` line counts three closeout writers instead of four; the `docs/adr/` invariant item names the `adr` skill plus the plan's first task instead of the agent; the closeout sentence names three closeout writers (`memory-writer`, `rules-writer`, `changelog-writer`) and a two-agent wave 1.

### Failure modes
- none - markdown

### Contracts
- none

### DoD
Both files describe the new flow, neither mentions `adr-writer`, and the test commands pass.

<!-- /TASK -->

---

<!-- repeat Task <N> per unit of work; leave intact all comment markers; keep tasks small, independently testable, and builder-executable unattended (no interactive human step) -->
