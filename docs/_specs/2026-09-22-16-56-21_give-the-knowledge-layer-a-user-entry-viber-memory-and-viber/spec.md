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
