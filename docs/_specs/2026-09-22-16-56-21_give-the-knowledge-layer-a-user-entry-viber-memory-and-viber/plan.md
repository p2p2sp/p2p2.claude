---
source: C:/Users/dario/.claude-dario/plans/merry-coalescing-pearl.md
---

# Give the knowledge layer a user entry: /viber:memory and /viber:rules

Build: skill `implementor`

## Goal

viber writes the host project's knowledge layer only at the close of a build. This change gives
each half of that layer its own user command: one for the `CLAUDE.md` cascade, one for
`.claude/rules/`. Each one maps the layer deterministically, routes on what it finds, verifies
truth against the code through a dispatched auditor, and hands the result to the writer that
already owns that layer.

## Problem

`memory-writer` and `rules-writer` are dispatched by `implementor` alone, with the specification
and the notes of a finished build. A user therefore cannot create the cascade on an existing project, cannot
reset one that went stale, and cannot have the existing nodes reviewed and corrected. Nothing
measures the budgets those writers are held to (12000 characters per node, 32000 over a chain,
4000 per rule file, 40000 over the directory), nothing finds a node whose directory is gone, and
nothing finds a rule whose `paths:` globs match no file. The build close is also the looser of the
two write paths: it admits a new rule on a count cap alone (at most two per build), with no
quality gate, and that cap means nothing outside a build.

## Current behaviour

`implementor` step 6 dispatches `viber:memory-writer` and `viber:rules-writer` with the run's
specification and its notes directory, gated by the `memory:` and `rules:` switches, and commits
what they return. Both writers read that specification plus the conclusions every coder of the
build left behind, measure what they are about to write, and report which files they touched and
any file they left over budget. `/init` is the only thing a user can reach today, and
it writes one root file with no cascade, no budget and no audit. viber ships seven skills, nine
agents, seven plugin-level scripts and two skill-level scripts.

### Must not change

- The build close keeps working unchanged: `implementor` still dispatches both writers with
  `spec:` and `notes:`, and both still accept that shape.
- The eleven existing suites under `tests/viber/` stay green.
- No plugin-named dot-directory in a host repo, and no host-repo location written outside
  `CLAUDE.md`, `.claude/rules/` and `.temp/viber/`.

## Behaviour

### S1 - Start the memory layer from zero [NEW]

The command maps the layer, proposes candidate directories with their size and their toolchain
signal, and lets the user approve or narrow that list before anything is dispatched. One auditor
per approved area reads the code and returns candidate facts; the writer turns what the user kept
into the cascade.

Given a project that carries no memory node at all
When the user runs `/viber:memory`
Then the command reports the layer empty, lists every directory it proposes as a place a node
could go with that directory's size and whether it carries its own build manifest, takes the list
the user narrows it to, has one auditor read each approved area for the facts a reader needs, and
reports which node files the writer created

### S2 - Review and fix the memory layer [NEW]

Given a project whose root and child nodes exist, one of them left alone in a directory whose
other files are gone
When the user runs `/viber:memory` and asks for a review
Then the command reports every node with its own size, the size of the whole chain a reader loads
with it, and whether either is past its budget, names the node left without an area and every node
holding uncommitted work, has one auditor verify each selected node against the code of its area
in parallel, reports per node how many statements came back false, gone, unverifiable or missing,
and after one confirmation reports which nodes the writer corrected

### S3 - Review the rules layer [NEW]

Given a rules directory holding one frozen file, one rule whose scope matches no file in the tree,
and one rule past its own budget
When the user runs `/viber:rules` and asks for a review
Then the command reports the frozen file without scoring it, names the second rule as matching
nothing, reports the third as past its budget, and proposes a new rule only where all three
criteria of the admission gate hold, no proposal at all being an ordinary outcome

### S4 - Reset a layer [NEW]

Given a project whose knowledge files are all committed and unmodified
When the user runs one of the two commands, asks for a reset, and confirms the list shown
Then exactly those files are deleted, the whole reset is refused when any file in the list carries
uncommitted work or is untracked, a frozen rule file is never deleted, and the command continues
straight into the start-from-zero route of S1 in the same run

### S5 - The admission gate binds the build close as well [CHANGED - was: the close admitted a new rule on the count cap alone]

Given a build closing with the rules switch on
When the orchestrator hands the close over to the rule writer
Then that writer reads the admission gate before proposing any new rule file, and a candidate
failing one of the three criteria is dropped with no trace

### Edge cases

- No git repository at all -> the working directory stands in for the root, every knowledge file
  reads as untracked, and a reset refuses the whole list.
- No rules directory, or one holding only frozen files -> the layer reports itself empty and lists
  no rule.
- A rule whose scope is the whole repository -> it is never reported as matching nothing.
- A rule file whose basename starts with an underscore -> reported, never scored, never reset,
  never rewritten.
- An auditor that finds nothing -> it writes no findings file and that target reaches no writer.
- Every auditor finds nothing -> the command says so and dispatches no writer at all.
- A node already past its budget -> the command reports it and leaves the split to the writer,
  whose own report it repeats.
- A directory that already carries its own node -> never proposed as a candidate.
- A repository with no tracked file -> the layer reports itself empty and proposes nothing.

## Glossary

- node - one `CLAUDE.md` file of the host project's cascade, not the whole cascade.
- chain - a node plus every ancestor node up to the root, which is what a reader loads together.
- orphan node - a node left alone in a directory that holds no other tracked file, the area it
  described having been removed from under it.
- candidate - a directory the map offers as a place a node could go; a proposal, never a decision.
- toolchain signal - the fact that a directory carries its own build or dependency manifest, which
  is a reason to look at it, never a reason to give it a node.
- dead rule - a non-frozen rule file whose declared scope matches no tracked file.
- frozen rule - a rule file whose basename starts with `_`, which no writer reads, scores or
  rewrites.
- finding - one line an auditor writes under one of its five labels.
- admission gate - the three criteria a new rule file has to pass before anyone is asked about it.

## Acceptance criteria

1. On a project with no memory node, `/viber:memory` reports the layer empty, offers the candidate
   directories with their size and their build-manifest signal, takes the user's narrowed list,
   has one auditor read each approved area, and reports which files the writer created.
2. On a project with memory nodes, `/viber:memory` reports each node's size, the size of the chain
   a reader loads with it, and whether either is past the 12000 or the 32000 character budget,
   plus every node left without an area and every one holding uncommitted work; one auditor goes
   out per selected node in parallel, and each returns one line saying how many of that node's
   statements are false, gone or unverifiable, how many facts are missing, and where it put its
   findings.
3. `/viber:rules` reports each rule's size against its 4000 character budget, the directory total
   against 40000, each rule's declared scope with the number of tracked files it really matches,
   every rule matching nothing and every frozen file; a new rule reaches the user only when all
   three criteria of the admission gate hold.
4. A reset prints the exact file list, takes one confirmation, refuses the whole call when any
   file in it carries uncommitted work or is untracked, never deletes a frozen rule file, and
   continues into the start-from-zero route in the same run.
5. Neither command commits and neither writes into the knowledge layer itself: each repeats what
   its writer reported, including any file left over budget, and leaves the commit to the user.
6. `tests/viber/memory-map.test.ts` and `tests/viber/rules-map.test.ts` pass under Git-Bash;
   `viber/.claude-plugin/plugin.json` carries nine skill entries and eleven agent entries, all
   resolving to files that exist; `viber/CLAUDE.md`, `viber/README.md`,
   `viber/skills/setup/assets/usage.md` and `docs/migracja-superdev-viber.md` name both commands.
7. The build close hands the rule writer the reference directory, and that writer reads the
   admission gate before proposing any new rule file.

## Scope

### File map

- add - `viber/skills/memory/scripts/memory-map.sh` - the cascade's deterministic facts and the
  gated delete of its files.
- add - `tests/viber/memory-map.test.ts` - that script's regression suite.
- add - `viber/skills/memory/SKILL.md` - the `/viber:memory` command: preload, state route, four
  modes, the dispatch gate, the writer handoff.
- add - `viber/skills/rules/scripts/rules-map.sh` - the rules directory's deterministic facts and
  the gated delete of its files.
- add - `tests/viber/rules-map.test.ts` - that script's regression suite.
- add - `viber/skills/rules/SKILL.md` - the `/viber:rules` command, same shape over the other
  layer.
- add - `viber/agents/memory-auditor.md` - verifies one node against its area, or proposes facts
  for an area with no node.
- add - `viber/agents/rules-auditor.md` - verifies one rule against the files its globs match, or
  proposes a new rule through the admission gate.
- add - `viber/references/rule-admission.md` - the three criteria, the calibration line and the
  exclusion list; read by `rules-auditor` and by `rules-writer`.
- modify - `viber/agents/memory-writer.md` - a second input shape, `map:` plus `notes:`.
- modify - `viber/agents/rules-writer.md` - the same second input shape, plus reading the
  admission gate through `refs:`.
- modify - `viber/skills/implementor/SKILL.md` - step 6's `rules-writer` dispatch gains `refs:`,
  which is what makes the gate bind the build close.
- modify - `viber/.claude-plugin/plugin.json` - two `skills[]` entries and two `agents[]` entries.
- modify - `viber/CLAUDE.md` - the counters, the two entry points, the invariant that the
  knowledge layer has two entries and one writer per layer.
- modify - `viber/README.md` - the quick-start rows and where the commands write.
- modify - `viber/skills/setup/assets/usage.md` - the onboarding text `setup` prints verbatim.
- modify - `docs/migracja-superdev-viber.md` - the row claiming the superdev memory and rules
  commands have no user-facing equivalent.

### Out of scope

- `viber/skills/setup/templates/viber.yml` and every switch in it: `memory:` and `rules:` gate the
  build close, not a user command, and no new switch is added.
- Any other change to the build close: `implementor`'s `memory-writer`, `qa-writer` and `closeup`
  dispatches stay exactly as they are.
- Committing what the commands produce, and any `git add` or `git commit` inside them.
- `superdev`, its `superdev-memory` and `superdev-rules` skills, and the root
  `.claude-plugin/marketplace.json`, which lists plugins and no skills.
- Automating the review on a schedule, a hook, or a session-start injection.
- `tests/portability.test.ts` and `tests/orphan-tags.test.ts`: both derive their corpus from
  `git ls-files` and cover the new files without an edit.

## Constraints

- `supercc:skill-designer` doctrine binds every new skill and agent file. Its linter
  (`supercc/skills/skill-designer/scripts/lint_skill.sh`, run through `bash`) is the verification
  for those files: it FAILs on a missing or unclosed frontmatter, a name past 64 characters, a
  description past 1024, a body past 500 lines, an em or en dash, and a markdown table.
- Text is the product in this repository, so no task editing markdown or `plugin.json` skips its
  review, however mechanical it looks.
- Both scripts are preloaded, so each runs under `set -u`, resolves the repository root itself,
  and ALWAYS exits 0 in its map mode: a non-zero exit in a `!` preload aborts the whole skill
  load. Only the `--reset` mode, a runtime call, exits non-zero, and only to refuse.
- Each script keeps mode `100755` and its `#!/usr/bin/env bash` shebang, is invoked directly by
  its quoted path with no interpreter word, and gets its own `allowed-tools` pattern spelled
  through `${CLAUDE_SKILL_DIR}` exactly as the preload spells it.
- Each script opens with the header shape `.claude/rules/shell-script-header.md` describes: what it
  does, why it exists, then a `Contract:` block covering argv, cwd, env, files read, stdout and
  exit. Its stdout IS its interface, so the header prints the exact lines.
- `tests/portability.test.ts` sweeps every tracked script: LF endings only, no bashism outside a
  bash shebang, no GNU-only construct, exec bit where a call site invokes the script bare.
- The two suites use `tests/harness/` and nothing private: `withGitRepo`, `withTempDir`
  (`tests/harness/tmp.ts`), `runScript` (`tests/harness/run.ts`) and `slash`
  (`tests/harness/paths.ts`) for every path comparison. Fixtures stay file-local.
- The fixed list of manifest names behind the toolchain signal lives in `memory-map.sh` and is
  argued in its header. It never reaches a skill or agent prompt, which is where this repository's
  stack-agnostic rule binds; `test-runner` already reads whichever manifest is present the same
  way.
- A sentence naming a `CLAUDE.md` read is qualified as the host project's, so the linter's
  own-project warning stays off.
- No em dash and no en dash in any file this plan touches.

## Tasks

<!-- TASK -->
### T1 - Map the CLAUDE.md cascade and gate its reset
- TDD: required
- Covers: #2, #4, #6
- Uses: C1
- Depends-on: none
- Files: viber/skills/memory/scripts/memory-map.sh, tests/viber/memory-map.test.ts
- Delivers: the script of C1 in both modes plus its regression suite, built on `withGitRepo`, `withTempDir`, `runScript` and `slash` from `tests/harness/`; cases for a repository with no node, a node over each cap, an orphan node, a modified target, an untracked target, a candidate with and without a toolchain manifest, a candidate that already carries a node, a repository with no tracked file, a reset that deletes, and a reset refused by one dirty target among several
- Verification: `node --test tests/viber/memory-map.test.ts` -> every test passes, none failing
- DoD: both modes behave exactly as C1 states; the map mode exits 0 on every input including a directory that is no repository; `--reset` deletes nothing at all when any target is modified or untracked and exits non-zero naming it; the file is mode 100755 with a `#!/usr/bin/env bash` shebang, LF endings and a `Contract:` block printing the exact stdout lines; the suite covers every case named in Delivers
<!-- /TASK -->

<!-- TASK -->
### T2 - Map the rules directory and gate its reset
- TDD: required
- Covers: #3, #4, #6
- Uses: C2
- Depends-on: none
- Files: viber/skills/rules/scripts/rules-map.sh, tests/viber/rules-map.test.ts
- Delivers: the script of C2 in both modes plus its regression suite on the same harness helpers; cases for a missing rules directory, a rules directory holding only a frozen file, a rule with no `paths:` key, a rule whose globs match nothing, a rule declaring `paths: global`, a file over its cap, a directory over its total, a modified target, a reset that deletes, and a reset refused because a target is frozen
- Verification: `node --test tests/viber/rules-map.test.ts` -> every test passes, none failing
- DoD: both modes behave exactly as C2 states; a frozen file is reported and never scored, never dead and never deleted; the map mode exits 0 on every input; `--reset` refuses the whole call on a frozen, modified or untracked target and exits non-zero naming it; the file is mode 100755 with a `#!/usr/bin/env bash` shebang, LF endings and a `Contract:` block printing the exact stdout lines
<!-- /TASK -->

<!-- TASK -->
### T3 - Put the rule admission gate in front of both rule writers
- TDD: none
- Covers: #3, #7
- Uses: C6, C7
- Depends-on: none
- Files: viber/references/rule-admission.md, viber/agents/rules-writer.md, viber/skills/implementor/SKILL.md
- Delivers: the reference of C7; `rules-writer` reading it through `refs:` before it proposes any new rule file, carrying the second input shape of C6, and carrying a `description:` whose closing sentence names both of its callers; `implementor` step 6 passing `refs: ${CLAUDE_PLUGIN_ROOT}/references` on its `rules-writer` dispatch, its `memory-writer` and `qa-writer` dispatches untouched
- Verification: `bash supercc/skills/skill-designer/scripts/lint_skill.sh viber/agents/rules-writer.md && grep -q 'rule-admission' viber/agents/rules-writer.md && grep -q 'dominant' viber/references/rule-admission.md && grep 'viber:rules-writer' viber/skills/implementor/SKILL.md | grep -q 'refs:'` -> exit 0 with `FAIL=0` on the lint line
- DoD: the reference carries the three criteria, the calibration line and the exclusion list of C7 and nothing about the memory layer; `rules-writer` reads it before proposing a new file and still accepts the build-close input shape; the `description:` names both callers and still ends on the invoked-only sentence; the `rules-writer` line of `implementor` step 6 itself carries the reference directory and its two neighbouring dispatches are byte-identical to before; no markdown table and no em dash in any of the three files
<!-- /TASK -->

<!-- TASK -->
### T4 - Teach memory-writer its second input shape
- TDD: none
- Covers: #1, #2
- Uses: C5
- Depends-on: none
- Files: viber/agents/memory-writer.md
- Delivers: the `## Input` section of C5 - either `spec` plus `notes` from a build close, or `map` plus `notes` from a user run, the notes directory read by `*-coder.md` in the first case and `*-audit.md` in the second - with the write rules, the budget section and the output channel left as they are
- Verification: `bash supercc/skills/skill-designer/scripts/lint_skill.sh viber/agents/memory-writer.md && grep -q 'map:' viber/agents/memory-writer.md && grep -q '\*-audit.md' viber/agents/memory-writer.md` -> exit 0 with `FAIL=0`
- DoD: both input shapes are stated in `## Input` and nowhere else; the `## Write`, `## Budget` and `## Output` sections are unchanged; the description still ends with the invoked-only sentence and now names both callers; the file carries no markdown table and no em dash
<!-- /TASK -->

<!-- TASK -->
### T5 - Add the memory auditor
- TDD: none
- Covers: #1, #2
- Uses: C3
- Depends-on: none
- Files: viber/agents/memory-auditor.md
- Delivers: the agent of C3 - read-only over the host project's source, writing nothing but its own findings file under the `out` path, verifying one node against the area it describes when `target` names a path and proposing candidate facts for that area when `target` reads `none`, with the five labels, the one-line `AUDIT:` return and the frontmatter `tools: Read, Write, Grep, Glob`, `model: opus`, `effort: high` plus a `color:`
- Verification: `bash supercc/skills/skill-designer/scripts/lint_skill.sh viber/agents/memory-auditor.md && grep -qE 'STALE|GONE|UNVERIFIABLE|MISS' viber/agents/memory-auditor.md` -> exit 0 with `FAIL=0`
- DoD: the frontmatter carries name, description, tools, model, effort and color, and the description ends with the invoked-only sentence naming the memory skill; the body states that the only file it writes is its findings file and that it never touches the knowledge layer, `.temp/` aside; both directions of `target` are specified; the `AUDIT:` line is exactly the shape of C3; the file carries no markdown table and no em dash
<!-- /TASK -->

<!-- TASK -->
### T6 - Add the rules auditor
- TDD: none
- Covers: #3
- Uses: C4, C7
- Depends-on: T3
- Files: viber/agents/rules-auditor.md
- Delivers: the agent of C4 - verifying one rule file against the tracked files its `paths:` globs match, or proposing a new rule for a scope with none, every proposal passed through the admission gate it reads at `<refs>/rule-admission.md`, with the same five labels, the same one-line return and the same frontmatter shape as its memory counterpart
- Verification: `bash supercc/skills/skill-designer/scripts/lint_skill.sh viber/agents/rules-auditor.md && grep -q 'rule-admission.md' viber/agents/rules-auditor.md && test -f viber/references/rule-admission.md` -> exit 0 with `FAIL=0`
- DoD: the gate is read before any `MISS` is emitted and a candidate failing one criterion is dropped with no line at all; a frozen rule file is never read, scored or proposed; the `AUDIT:` line is exactly the shape of C4; the frontmatter matches C4; the file carries no markdown table and no em dash
<!-- /TASK -->

<!-- TASK -->
### T7 - Add the /viber:memory command
- TDD: none
- Covers: #1, #2, #4, #5
- Uses: C1, C3, C5
- Depends-on: T1, T4, T5
- Files: viber/skills/memory/SKILL.md
- Delivers: the skill body - the `!` preload of `memory-map.sh` through `${CLAUDE_SKILL_DIR}` with its own `allowed-tools` pattern, the runtime `--reset` call with a pattern of its own, `user-invocable: true` with `disable-model-invocation: true`, the route off `state:`, the four modes on one `AskUserQuestion`, the target list shown and narrowable before any dispatch, one `memory-auditor` per target in a single message, one confirmation before the writer, the `memory-writer` dispatch carrying `map:` and `notes:`, and a closing report of the writer's `FILES:` and `OVER:` lines
- Verification: `bash supercc/skills/skill-designer/scripts/lint_skill.sh viber/skills/memory && grep -q 'memory-map.sh' viber/skills/memory/SKILL.md` -> exit 0 with `FAIL=0`
- DoD: the preload and the reset call are each one literal line with a matching `allowed-tools` pattern, neither prefixed by an interpreter word; the map's lines are trusted and never re-derived; every auditor dispatch goes out in one message with `target:`, `scope:`, `out:` and, on the rules side only, `refs:`; nothing is dispatched before the user has approved the target list, and the writer is not dispatched at all when every auditor returned zero counters; the skill writes no file into the knowledge layer, runs no git command and commits nothing; reset is refused, not corrected, when the map marks a target modified or untracked; the body carries no markdown table and no em dash
<!-- /TASK -->

<!-- TASK -->
### T8 - Add the /viber:rules command
- TDD: none
- Covers: #3, #4, #5
- Uses: C2, C4, C6
- Depends-on: T2, T3, T6
- Files: viber/skills/rules/SKILL.md
- Delivers: the same skill shape over the rules layer - the `!` preload of `rules-map.sh`, the runtime `--reset` call, the state route, the four modes, the narrowable target list, one `rules-auditor` per target carrying `refs:`, one confirmation, the `rules-writer` dispatch carrying `map:`, `notes:` and `refs:`, and the closing report
- Verification: `bash supercc/skills/skill-designer/scripts/lint_skill.sh viber/skills/rules && grep -q 'rules-map.sh' viber/skills/rules/SKILL.md` -> exit 0 with `FAIL=0`
- DoD: the preload and the reset call are each one literal line with a matching `allowed-tools` pattern; a frozen rule file is never offered as a target, for the review or for a reset; zero new rules is reported as an ordinary outcome and never as a failure; the skill writes no rule file itself, runs no git command and commits nothing; the body carries no markdown table and no em dash
<!-- /TASK -->

<!-- TASK -->
### T9 - Register both commands and both agents, and correct the documents
- TDD: none
- Covers: #6
- Uses: none
- Depends-on: T7, T8
- Files: viber/.claude-plugin/plugin.json, viber/CLAUDE.md, viber/README.md, viber/skills/setup/assets/usage.md, docs/migracja-superdev-viber.md
- Delivers: the manifest carrying `./skills/memory/` and `./skills/rules/` in pipeline order after `./skills/e2e/`, each a directory with its leading `./` and trailing slash, plus `./agents/memory-auditor.md` and `./agents/rules-auditor.md` as files; `viber/CLAUDE.md` with its counters corrected to nine skills, eleven agents, four skill-level scripts and three plugin-level references, both commands in `## Entry points`, the `references/` invariant carrying the new file and its two readers, and one invariant saying the knowledge layer has two entries - the build close and the user command - with one writer per layer and the auditors read-only beside them; the quick-start and write-location text in `viber/README.md`; the onboarding text in `usage.md`; the corrected row in the migration document
- Verification: `node -e "const m=require('./viber/.claude-plugin/plugin.json'),fs=require('fs');if(m.skills.length!==9||m.agents.length!==11)throw new Error('counts');for(const p of m.skills.concat(m.agents))fs.accessSync('viber/'+p)" && for f in viber/CLAUDE.md viber/README.md viber/skills/setup/assets/usage.md docs/migracja-superdev-viber.md; do grep -q 'viber:memory' "$f" && grep -q 'viber:rules' "$f" || exit 1; done` -> exit 0
- DoD: the manifest is valid JSON, carries nine skills and eleven agents, and every path in it resolves to a file or directory that exists; no worker appears in both arrays; each of the four documents names both commands; `viber/CLAUDE.md` states the two-entry invariant without restating either skill's own steps, and no counter or reader list in it is left describing the plugin as it was before this change; no file carries a markdown table where its neighbours use prose, no em dash anywhere
<!-- /TASK -->

## Contracts

### C1 - memory-map.sh

File: viber/skills/memory/scripts/memory-map.sh

Map mode, no argument, stdout, always exit 0:

```
# viber memory map
id: <yyyy-mm-dd-HH-mm-ss>
state: none | partial | complete
node: <repo-relative path> <chars> chain <chars> ok | OVER-NODE | OVER-CHAIN
orphan: <repo-relative path>
cand: <repo-relative dir> files <n> bytes <n> toolchain | plain
dirty: <repo-relative path> modified | untracked
total: nodes <n>
```

- `id` is this run's stamp, which the caller spends as `.temp/viber/<id>/`.
- `state`: `none` when no `CLAUDE.md` is tracked anywhere; `complete` when a root node exists and
  every candidate directory carries its own node; `partial` otherwise.
- `node`: one line per tracked `CLAUDE.md`, root first then depth order. `chars` is `wc -c` on the
  file, `chain` is that plus every ancestor node up to the root. `OVER-NODE` past 12000,
  `OVER-CHAIN` past 32000 on the chain, `OVER-NODE` winning when both hold.
- `orphan`: a node whose own directory holds no other tracked file.
- `cand`: a tracked directory at depth 1 or 2, no path segment starting with `.`, holding at least
  three tracked files beneath it and no `CLAUDE.md` of its own. `toolchain` when it holds one of
  `package.json`, `pyproject.toml`, `setup.py`, `requirements.txt`, `go.mod`, `Cargo.toml`,
  `pom.xml`, `build.gradle`, `build.gradle.kts`, `Gemfile`, `composer.json`, `mix.exs`,
  `pubspec.yaml`, `CMakeLists.txt`, `Makefile`, or any `*.csproj` or `*.sln`; `plain` otherwise.
- `dirty`: one line per node the git index reports modified, or present in the tree and untracked.
- A section with nothing to report emits no line at all; `total:` always prints.

Reset mode, `--reset <repo-relative path> [...]`:

- Refuses the WHOLE call, deleting nothing, when any given path is not a tracked `CLAUDE.md`, is
  modified, or is untracked. One `refused: <path> <reason>` line per offending path, exit 3.
- Otherwise deletes each path and prints `removed: <path>` per file, then `removed: <n>`, exit 0.

### C2 - rules-map.sh

File: viber/skills/rules/scripts/rules-map.sh

Map mode, no argument, stdout, always exit 0:

```
# viber rules map
id: <yyyy-mm-dd-HH-mm-ss>
state: none | partial | complete
rule: <repo-relative path> <chars> paths <glob>[,<glob>] matches <n> | global ok | OVER-FILE
frozen: <repo-relative path> <chars>
dead: <repo-relative path>
dirty: <repo-relative path> modified | untracked
total: <chars> ok | OVER-DIR
```

- `id` as in C1.
- `state`: `none` when `.claude/rules/` is absent or holds no non-frozen `.md`; `complete` when
  every non-frozen rule declares a frontmatter `paths:` key; `partial` otherwise.
- `rule`: one line per non-frozen `.md`, alphabetical. `paths` lists the frontmatter globs
  comma-separated, or `none` when the key is absent. `matches` is the number of tracked files the
  globs match, or the word `global` for `paths: global`. `OVER-FILE` past 4000 characters.
- `frozen`: one line per `_*.md`, reported and never scored.
- `dead`: a non-frozen rule whose globs match zero tracked files; never a `global` one and never a
  frozen one.
- `total`: the sum over every `.md` in the directory, frozen included, `OVER-DIR` past 40000.

Reset mode, `--reset <repo-relative path> [...]`:

- Refuses the WHOLE call, deleting nothing, when any given path is not a tracked `.md` under
  `.claude/rules/`, is frozen, is modified, or is untracked. One `refused: <path> <reason>` line
  per offending path, exit 3.
- Otherwise deletes each path and prints `removed: <path>` per file, then `removed: <n>`, exit 0.

### C3 - memory-auditor dispatch and return

File: viber/agents/memory-auditor.md

Input, one labelled line each:

```
target: <repo-relative path of one CLAUDE.md> | none
scope: <repo-relative directory the target describes>
out: .temp/viber/<id>/
```

Return, exactly one line:

```
AUDIT: <target|scope> stale <n> gone <n> unverifiable <n> miss <n> -> <path of the findings file> | none
```

Findings file, `<out><slug>-audit.md`, `<slug>` being the scope path with every separator replaced
by `-`. One finding per line, in this vocabulary and no other:

```
STALE: <quoted sentence from the node> -> <what holds now>
GONE: <the node describes an area with no file left>
UNVERIFIABLE: <quoted sentence the code neither confirms nor contradicts>
MISS: <a fact about this area a reader needs and the node does not carry>
OK
```

`target: none` is the discovery direction: only `MISS` lines can appear, and `-> none` with all
counters zero means the area needs no node.

### C4 - rules-auditor dispatch and return

File: viber/agents/rules-auditor.md

Input, one labelled line each:

```
target: <repo-relative path of one rule file> | none
scope: <glob list the target gates> | <repo-relative directory to propose for>
out: .temp/viber/<id>/
refs: <the plugin reference directory>
```

Return, exactly one line:

```
AUDIT: <target|scope> stale <n> gone <n> unverifiable <n> miss <n> -> <path of the findings file> | none
```

Findings file, `<out><slug>-audit.md`, `<slug>` being the target's basename without its extension,
or the scope path with every separator replaced by `-` when `target` reads `none`. One finding per
line, in this vocabulary and no other:

```
STALE: <quoted line of the rule> -> <what the matched files do instead>
GONE: <the rule's globs match no tracked file>
UNVERIFIABLE: <quoted line the matched files neither follow nor break>
MISS: <a convention worth a rule, carrying the example from the code that proves it>
OK
```

`target: none` is the proposing direction: only `MISS` lines can appear, every one of them having
passed all three criteria of C7, and `-> none` with all counters zero means the scope earns no
rule.

### C5 - memory-writer input

File: viber/agents/memory-writer.md

Two input shapes, one of them present:

```
spec: <the run's specification>
notes: <the run's report directory>
```

```
map: <the map block the command preloaded, verbatim>
notes: <.temp/viber/<id>/>
```

The first is a build close and the notes directory is read by `*-coder.md`; the second is a user
run and it is read by `*-audit.md`. Everything else about the agent is unchanged, the output
channel included.

### C6 - rules-writer input

File: viber/agents/rules-writer.md

Two input shapes, one of them present, and a third line carried in both:

```
spec: <the run's specification>
notes: <the run's report directory>
refs: <the plugin reference directory>
```

```
map: <the map block the command preloaded, verbatim>
notes: <.temp/viber/<id>/>
refs: <the plugin reference directory>
```

The first is a build close and the notes directory is read by `*-coder.md`; the second is a user
run and it is read by `*-audit.md`. `<refs>/rule-admission.md` is read before any new rule file is
proposed, in either shape. Everything else about the agent is unchanged, the output channel
included.

### C7 - rule-admission.md

File: viber/references/rule-admission.md

- Three numbered criteria, all of which have to hold: a dominant pattern carrying a real example
  from the code; a delta from what a competent developer would do anyway; nothing else already
  enforcing it, no formatter, linter, type, schema or test.
- One calibration line: zero or one new rule is the ordinary outcome of a run, and several
  candidates at once means the bar slipped.
- One exclusion list: formatting a formatter owns, naming a type enforces, anything visible from
  one look at the directory, a convention that binds everywhere anyway.
- One line on the silent drop: a candidate failing one criterion leaves no trace, no message to
  the user and no line in a findings file.
- Nothing about the memory layer, no budget numbers, no instruction on how to write a rule file.
