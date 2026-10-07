To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Lens-based entry and a lighter multi-agent pipeline for code-auditor

## Goal

`/viber:code-auditor` starts from an explicit audit lens (bugs, security, web performance, runtime performance, tests, design) and an explicit scope (the current diff, one directory, the whole repository), and runs one shared multi-agent pipeline driven by the selected lens's own reference file. The heavy, lens-agnostic script sweep and its Node.js dependency go away, so a run is faster and cheaper while staying multi-agent with independent verification.

## Problem

Today the entry point is a set of abstract "jobs" (Code, Reliability, Cost, Growth) scored by `Impact x Opportunity`, so a user cannot simply say "audit security of my branch". Every run first sweeps the whole repository file by file with five scripts (git churn, fix commits, dependents, a five-minute pair sweep), has Haiku scouts score every file, gates them through two Node.js ranking scripts and dispatches up to 42 frontier detectives. Those signals only fit bugs: they say nothing about security, performance, tests or design. A run is slow and expensive, needs Node.js 22.6 or newer, and has no diff scope, which is the scope most review tools use and the main lever for speed.

## Current behaviour

`/viber:code-auditor [<repo-path>] [<area-dir>]` asks for the repo path and the job, checks Node.js, writes `job.md`, dispatches `profiler` while `collect_signals.sh` and `collect_edges.sh` sweep the repository, fans out `scout` (per file batch) and `edge-scout` (per file pair) on Haiku, ranks them with `rank.ts` and `rank_edges.ts`, shows the hotlists, dispatches one `detective` per gate-clearing entry, one `critic` per filed finding in a clean worktree, writes `findings.md` per `references/synthesis.md`, then opens new waves automatically.

### Must not change

- `viber/skills/code-auditor/scripts/worktree.sh` keeps its `add|remove <target-root> <worktree-path>` interface and its `WORKTREE_READY` / `WORKTREE_REMOVED` / `WORKTREE_FAILED` lines.
- The critic is handed only the claim sidecar, never the hunter's report or reasoning.
- `findings.md` stays at `.temp/viber/code-auditor/<run-id>/findings.md` with at most ten full entries, the `## Further findings (N)` list and `## Coverage notes`; a `REFUTED` finding never appears in it.
- No auditor agent writes inside the target tree outside the run workspace `.temp/viber/code-auditor/<run-id>/` (its own output files and its own reserved worktree there).
- `superui/skills/pro-designer/scripts/check_node.sh` and its behaviour are untouched.
- A critic returning no `VERDICT:` line is dispatched once more; after a second miss the finding is filed `INCONCLUSIVE` with `critic returned no verdict`.

## Behaviour

### S1 - Choosing lens and scope by questions [CHANGED - was: asked for a repo path in prose and a job from a catalogue]

Given the user types `/viber:code-auditor` with no arguments
When the skill starts
Then the user is shown two questions at once, what to audit (Bugs, Security, Performance, Quality) and how much (Changes, Directory, Whole repository); only an answer of Performance or Quality is followed by one more question (Web or Runtime, Design or Tests); choosing Directory is followed by a request to type its path. Nothing is analysed before both answers are in.

### S2 - Lens and scope from arguments [CHANGED - was: `[<repo-path>] [<area-dir>]`, the job always asked]

Given the user types `/viber:code-auditor security src/api`
When the skill starts
Then the user is asked nothing and gets a security audit of `src/api` in the current repository, for which only the security lens's instructions are loaded, never the other five. A lens name picks that lens, `performance` or `quality` picks the group and shows only its follow-up question, `diff` and `repo` pick the scope, anything else is read as a directory; `diff:<sha>` (for example `/viber:code-auditor security diff:a1b2c3d`) picks the diff scope measured from that commit instead of the default branch, so even on the default branch the changes since that commit are audited; whatever is missing is asked as in S1.

### S3 - Diff scope [NEW]

Given a branch with commits since its merge base with the default branch and uncommitted edits
When the user picks the Changes scope
Then the run audits the files changed since the merge base plus every staged, unstaged and untracked file (deleted files excluded); on the default branch itself only the uncommitted files count, even when it holds unpushed commits. The repository is still profiled from its memory and history, so severity is judged by this repository's own standards, while only the changed files are grouped for investigation and no cheap scoring narrows them. Each kind of defect the lens looks for gets its own in-depth investigation across all changed files, and every finding is verified against the code as it is now in the working tree, uncommitted edits and new files included.

### S4 - Directory and repository scope [CHANGED - was: scripts swept every file, Haiku scored every file and pair, Node.js gates cut the hotlist]

Given a directory or the whole repository as scope
When the run maps the code
Then the run first maps the code with the lens's own signals, reading the repository's memory and history, and ranks at most 40 modules or directories worth a look; when more of them are listed than the scope can afford to investigate deeply (8 for a directory, 16 for the repository), cheap scoring narrows the list to the best ones; each kept module is then investigated in depth through every angle of the lens. At most 16 investigations run at once.

### S5 - Lens-defined verification [CHANGED - was: every finding replayed in a clean worktree]

Given a hunter filed a finding
When the critic verifies it
Then an independent verifier, who never sees the investigator's reasoning, proves or refutes it by the lens's own method: the lenses that prove by running code (bugs, security, web performance, runtime performance, tests) replay the claim on a clean checkout of the repository, which on the diff scope carries the uncommitted edits and new files under audit; the design lens checks the cited evidence and history without running anything and without a checkout.

### S6 - Findings and an offered variant wave [CHANGED - was: new waves opened automatically]

Given the critics have returned
When the skill synthesizes
Then the user sees the findings report and, when at least one finding was confirmed, is asked whether to run one variant wave looking for the same confirmed defect classes elsewhere: in the code outside the changed files on the diff scope, in the mapped but uninvestigated modules on the directory and repository scopes (asked there only while such modules remain). Nothing runs without a yes, and a wave rewrites the report from every finding of the run.

### S7 - Nothing to audit [NEW]

Given nothing has changed on the diff scope, or the repository holds nothing the lens audits (for example no frontend for web performance)
When the run reaches that point
Then the user sees one line naming the reason and the run ends there, with no further analysis spent.

### S8 - Node.js no longer needed [REMOVED - reason: the ranking scripts are gone and the model ranks units]

Given a machine without Node.js
When the user runs `/viber:code-auditor`
Then the run proceeds; no Node.js check or requirement exists anywhere for this skill.

### S9 - Docs and help describe the lens-based auditor [CHANGED - was: they described jobs, hotlists and a Node.js requirement]

Given a user reading the viber README, the root README or the `/viber:help` page in English or Polish
When they look up the auditor
Then they find the six lenses, the three scopes and the argument form, no Node.js requirement, and no mention of the retired agents or scripts anywhere outside the maintainers' `CLAUDE.md` notes.

### Edge cases

- A token that names a lens and also an existing directory -> it is the lens; `./<name>` addresses the directory.
- A directory token outside the repository, carrying `..`, or not existing -> the run stops with the C8 directory message, which lists the six lens names.
- The current branch is the default branch, with or without unpushed commits -> only uncommitted files are audited.
- The default branch cannot be resolved, HEAD is detached, or the branch shares no history with the default branch -> only uncommitted files are audited.
- A repository with no commit yet, on the diff scope -> a lens that proves by running code ends the run with one line asking for a first commit, since no clean checkout can exist; the design lens audits the staged and untracked files.
- A `diff:<sha>` token naming a commit that does not exist -> the run ends with one line naming the value, before any analysis.
- The repository map cannot be produced on a second attempt -> the run ends with one line saying so; there is nothing to investigate without it.
- A lens signal finds nothing -> it counts as an empty signal, never as a failure of the run.

## Glossary

- lens - the purpose of one audit run (bugs, security, web performance, runtime performance, tests or design), deciding what counts as a finding and how it is proven. Not a severity level and not a scope.
- angle - one kind of defect a lens looks for, such as a contract mismatch between two files in the bugs lens; on the diff scope each angle gets its own investigator.
- scope - how much code a run covers: the current changes, one directory, or the whole repository.
- unit - a module or group of files one investigator takes on as a whole.
- hunt - one investigator's assignment, either one unit through every angle or one angle across every changed file.
- run file - the one description of a run (lens, scope, repository, map) that every agent of that run reads, so all of them judge by the same frame.

## Acceptance criteria

1. Six lens files exist under `viber/skills/code-auditor/references/lenses/`, each holding exactly the headings `## Hunts`, `## Map signals`, `## Excluded`, `## Verify`, `## Severity` in that order, 3 to 6 angles, a `Worktree:` line, at least one map-signal command block, at most 8000 bytes, its content drawn from the approved research notes.
2. Every map-signal command of every lens runs under bash in a throwaway repository and ends with exit 0, or exit 1 with empty stderr; the bugs lens's fix-history command lists a fix commit from 5 days ago and leaves out one from 400 days ago and a non-fix commit.
3. `diff-files.sh` prints the diff base and the changed files per the diff-scope rules of S3, S2's explicit base and the edge cases, proven by its own test.
4. `/viber:code-auditor` takes `[<lens>] [diff | <directory> | repo]`, resolves a lens-named token to the lens, asks per S1 for what is missing, reads only the selected lens file, accepts `diff:<sha>` as the diff scope measured from that commit, and stops with the C8 messages on an invalid directory, on a `diff:<sha>` naming no commit, on an empty diff, and on a diff scope with no commit yet under a lens that runs code, each before any agent dispatch.
5. The skill runs Frame, Map, Hunt, Verify, Synthesize per S3 to S6 with the hunter budgets and the 16-agent concurrency cap, stops with the C8 messages when the mapper reports nothing to audit or its map misses a heading twice, and per S6 offers, never starts unasked, a variant wave seeded with the confirmed classes on every scope.
6. The agents `mapper` and `hunter` exist and are registered; `profiler`, `detective` and `edge-scout` are gone; `scout` scores units; `critic` verifies per the lens's `## Verify` section; the help page carries one line per registered agent.
7. `collect_signals.sh`, `collect_edges.sh`, `rank.ts`, `rank_edges.ts`, `check_node.sh` (viber's copy), `jobs.md`, `scoring.md` and their tests are deleted; the superui `check_node` test no longer references a viber copy.
8. No tracked file outside `docs/`, other than a `CLAUDE.md` node, references a removed script, agent or reference, and every agent the skill dispatches is registered in `plugin.json`, both proven by a unit test.
9. `viber/README.md`, the root `README.md` and `help.html` (English and Polish) describe the lenses and scopes and state no Node.js requirement for `/viber:code-auditor`; the `.claude/rules/` files cite no removed file.
10. On the diff scope, every clean checkout a hunter or critic replays in carries the staged, unstaged and untracked changes of the working tree, through `diff-overlay.sh`, proven by its own test.

## Scope

### File map

- add - viber/skills/code-auditor/references/lenses/bugs.md - bugs lens: correctness, silent failure, crash, concurrency and resources, cross-file contract mismatch, variants of past fixes
- add - viber/skills/code-auditor/references/lenses/security.md - security lens
- add - viber/skills/code-auditor/references/lenses/web-performance.md - web performance lens (browser-side bytes, render path, Core Web Vitals)
- add - viber/skills/code-auditor/references/lenses/runtime-performance.md - runtime performance lens (any code running as a process)
- add - viber/skills/code-auditor/references/lenses/tests.md - test-suite quality lens with the mutation oracle
- add - viber/skills/code-auditor/references/lenses/design.md - design quality lens with evidence gates
- add - viber/skills/code-auditor/scripts/diff-files.sh - prints the diff base and the changed files of the diff scope
- add - viber/skills/code-auditor/scripts/diff-overlay.sh - lays the working tree's uncommitted changes onto a clean checkout
- add - tests/viber/diff-overlay.test.ts - `diff-overlay.sh` behaviour
- add - viber/agents/mapper.md - lens-aware mapper writing `map.md`
- add - viber/agents/hunter.md - frontier investigator of one unit or one angle
- add - tests/viber/lenses.unit.test.ts - structure check of every lens file
- add - tests/viber/lens-map-signals.test.ts - runs every lens map-signal command; the fix-history window check
- add - tests/viber/diff-files.test.ts - `diff-files.sh` behaviour
- add - tests/viber/code-auditor.unit.test.ts - lens set named by the skill, agent registration, no stale references
- modify - viber/skills/code-auditor/SKILL.md - new entry, arguments and pipeline
- modify - viber/skills/code-auditor/references/synthesis.md - hunter report and sidecar schema, critic verdict, findings shape, offered wave
- modify - viber/agents/scout.md - scores units of a lens
- modify - viber/agents/critic.md - verifies per the lens's `## Verify`, worktree only when required
- modify - viber/skills/code-auditor/scripts/worktree.sh - header comment names hunter and critic as callers
- modify - viber/.claude-plugin/plugin.json - `agents[]` gains mapper and hunter, loses profiler, detective, edge-scout
- modify - viber/skills/setup/assets/help.html - agent lines, the code-auditor card, the command list entry, the optional-tools note
- modify - viber/README.md - code-auditor rows and the Node.js note
- modify - README.md - requirements row for viber
- modify - tests/superui/check_node.test.ts - drops the parity case with viber's removed copy
- modify - .claude/rules/shell-awk-environ.md - drops the citation of `collect_signals.sh`
- modify - .claude/rules/shell-script-header.md - script count and list without the removed scripts, with `diff-files.sh` and `diff-overlay.sh`
- modify - .claude/rules/shell-preload-contract.md - code-auditor calls its scripts through `sh` only
- modify - .claude/rules/agent-frontmatter.md - Haiku example without `edge-scout`
- delete - viber/agents/profiler.md, viber/agents/detective.md, viber/agents/edge-scout.md
- delete - viber/skills/code-auditor/references/jobs.md, viber/skills/code-auditor/references/scoring.md
- delete - viber/skills/code-auditor/scripts/check_node.sh, collect_signals.sh, collect_edges.sh, rank.ts, rank_edges.ts
- delete - tests/viber/check_node.test.ts, collect_signals.test.ts, collect_edges.test.ts, rank.test.ts, rank_edges.test.ts, profiler.test.ts

### Out of scope

- Every other viber skill and agent, and the superui, supercc and superbiz plugins (apart from the superui test's parity case).
- Release, version bump and the `claude plugin eval` evaluation.
- `CLAUDE.md` nodes (`viber/CLAUDE.md`, `viber/agents/CLAUDE.md`, `viber/skills/CLAUDE.md`, `tests/viber/CLAUDE.md`, `superui/CLAUDE.md`, `superui/skills/CLAUDE.md`, `tests/superui/CLAUDE.md`): the build's memory close updates them, including the Node.js requirement and the repo-profile headings they state.
- `viber/docs/configuration.md` and `viber/docs/files.md`: neither mentions code-auditor; `.temp/viber/code-auditor/<run-id>/` stays the run workspace.
- `.claude/rules/plugin-manifests.md`: the skill keeps its name and its place in `skills[]`.
- Running several lenses in one run, and automatic waves.

## Solution requirements

- Every script and map-signal command works in Git Bash on Windows and on macOS.
- Lens content comes from the approved, git-ignored research notes `.temp/viber/intent/lens-research/<lens>.md` (one per lens, with sources); a map-signal command those notes mark unverified is run by a test or rewritten until it runs cleanly; the unverified commands of their `Verify` parts are settled in the T3 and T5 done clauses. Git Bash is proven by running that test on this Windows machine during the build, Linux by CI on every push, macOS by a manual dispatch of the CI workflow.
- A run costs the user less of their Claude Code usage limits than today: the skill loads one lens's instructions per run and its own instructions stay short.
- No em dash or en dash in any file.
- After the release is installed, the owner runs `/viber:code-auditor` once on this repository per scope (`diff`, a directory, `repo`) as a manual acceptance check; no task can perform it.
