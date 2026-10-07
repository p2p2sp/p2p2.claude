---
source: C:/Projects/p2p2.claude/docs/_specs/2026-10-07-15-45-49_lens-based-entry-and-a-lighter-multi-agent-pipeline-for-code/plan.md
---

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

## Tasks

<!-- TASK -->
### T1 - Add the bugs lens and the lens checks
- TDD: none
- Covers: #1, #2
- Uses: C1
- Depends-on: none
- Files: viber/skills/code-auditor/references/lenses/bugs.md, tests/viber/lenses.unit.test.ts, tests/viber/lens-map-signals.test.ts
- Delivers: the bugs lens written from `.temp/viber/intent/lens-research/bugs.md` in the C1 shape, a unit test holding every lens file present in `references/lenses/` to the C1 shape, and an integration test running every map-signal command of every lens file present plus the bugs fix-history window check.
- Verification: node --test tests/viber/lenses.unit.test.ts tests/viber/lens-map-signals.test.ts -> both pass with `bugs.md` checked
- DoD: `bugs.md` holds exactly the five C1 headings in order with 3 to 6 angles including a contract-mismatch angle and a past-fix-variant angle, a `Worktree: required` line and at most 8000 bytes; `lenses.unit.test.ts` fails on a synthetic lens text missing a heading, holding the five headings out of order, carrying 2 angles, carrying 7 angles, holding no bash block under `## Map signals`, lacking the `Worktree:` line, holding a bash block outside `## Map signals` or exceeding 8000 bytes, and passes on `bugs.md`; both test files register one case per lens file present, its name carrying the file name (`bugs.md`), so a pattern on the file name selects that lens alone; `lens-map-signals.test.ts` runs every bash block of every lens file with `<scope>` replaced by `.` and empty stdin, in a throwaway repository holding at least two commits and a few source files, and accepts exit 0 or exit 1 with empty stderr; `lens-map-signals.test.ts` proves the first bugs block lists a fix commit 5 days old and leaves out a fix commit 400 days old and a non-fix commit.
<!-- /TASK -->

<!-- TASK -->
### T2 - Add the security lens
- TDD: none
- Covers: #1, #2
- Uses: C1
- Depends-on: T1
- Files: viber/skills/code-auditor/references/lenses/security.md
- Delivers: the security lens written from `.temp/viber/intent/lens-research/security.md` in the C1 shape.
- Verification: node --test --test-name-pattern "security\.md" tests/viber/lenses.unit.test.ts tests/viber/lens-map-signals.test.ts -> every case naming `security.md` passes; grep -c -i -E 'rate limiting|reachability|attacker control' viber/skills/code-auditor/references/lenses/security.md -> at least 3
- DoD: `security.md` passes the lens structure check with `Worktree: required`; its `## Excluded` carries the hard exclusions of the research note (denial of service, rate limiting, memory safety in memory-safe languages among them); its `## Verify` names the six gates for a claim that cannot be executed and the INCONCLUSIVE conditions; every one of its map-signal commands passes `lens-map-signals.test.ts`.
<!-- /TASK -->

<!-- TASK -->
### T3 - Add the web performance lens
- TDD: none
- Covers: #1, #2
- Uses: C1
- Depends-on: T1
- Files: viber/skills/code-auditor/references/lenses/web-performance.md
- Delivers: the web performance lens written from `.temp/viber/intent/lens-research/web-performance.md` in the C1 shape, verifying by static evidence plus production-build measurement, never a browser or a dev server.
- Verification: node --test --test-name-pattern "web-performance\.md" tests/viber/lenses.unit.test.ts tests/viber/lens-map-signals.test.ts -> every case naming `web-performance.md` passes; grep -c -E 'PARTIALLY VERIFIED|none: |dev server' viber/skills/code-auditor/references/lenses/web-performance.md -> at least 3, and grep -c '\.next/server' viber/skills/code-auditor/references/lenses/web-performance.md -> 0
- DoD: `web-performance.md` passes the lens structure check with `Worktree: required`; its `## Verify` caps the verdict at PARTIALLY VERIFIED when the project memory names no build command and forbids a browser and a dev server; its `## Map signals` states that a repository with no frontend framework gives the units line `none: <reason>`; its `## Verify` finds a route's initial chunks from the script and stylesheet tags of the built HTML or, for Vite, the manifest's `isEntry` chunk and its `imports`, and names no `.next/server` path; it reads image dimensions with `file` only for PNG, JPEG and GIF; every one of its map-signal commands passes `lens-map-signals.test.ts`.
<!-- /TASK -->

<!-- TASK -->
### T4 - Add the runtime performance lens
- TDD: none
- Covers: #1, #2
- Uses: C1
- Depends-on: T1
- Files: viber/skills/code-auditor/references/lenses/runtime-performance.md
- Delivers: the runtime performance lens written from `.temp/viber/intent/lens-research/runtime-performance.md` in the C1 shape, covering any code that runs as a process.
- Verification: node --test --test-name-pattern "runtime-performance\.md" tests/viber/lenses.unit.test.ts tests/viber/lens-map-signals.test.ts -> every case naming `runtime-performance.md` passes; grep -c -E '10N|call count|web-performance' viber/skills/code-auditor/references/lenses/runtime-performance.md -> at least 3
- DoD: `runtime-performance.md` passes the lens structure check with `Worktree: required`; its `## Verify` requires a measurement at N and 10N or a call count and names the INCONCLUSIVE conditions; its `## Excluded` hands browser-side findings to the web performance lens; every one of its map-signal commands passes `lens-map-signals.test.ts`.
<!-- /TASK -->

<!-- TASK -->
### T5 - Add the tests lens
- TDD: none
- Covers: #1, #2
- Uses: C1
- Depends-on: T1
- Files: viber/skills/code-auditor/references/lenses/tests.md
- Delivers: the tests lens written from `.temp/viber/intent/lens-research/tests.md` in the C1 shape, its mutation and flake procedures taking every clean checkout from `worktree.sh`.
- Verification: node --test --test-name-pattern "tests\.md" tests/viber/lenses.unit.test.ts tests/viber/lens-map-signals.test.ts -> every case naming `tests.md` passes; grep -c -i -E 'reachability probe|equivalence|worktree\.sh' viber/skills/code-auditor/references/lenses/tests.md -> at least 3, and grep -c -E 'git worktree|randomSeed' viber/skills/code-auditor/references/lenses/tests.md -> 0, and grep -c -e '-shuffle=on' viber/skills/code-auditor/references/lenses/tests.md -> 1
- DoD: `tests.md` passes the lens structure check with `Worktree: required`; its `## Verify` holds the reachability probe, the one-mutant-per-line order, the equivalence sentence and the flake procedure, and calls no `git worktree` directly; its `## Severity` caps at 4 a finding with no surviving mutant and no reproduced flake; its flake procedure shuffles order only with `jest --randomize --seed <S>` (Jest 29.2 or newer), `vitest --sequence.shuffle.tests`, `pytest -p randomly --randomly-seed=<S>` and `go test -run <NAME> -shuffle=on -count=20` (Go 1.17 or newer), and for `node:test` relies on repeated runs alone, naming no `randomSeed`; every one of its map-signal commands passes `lens-map-signals.test.ts`.
<!-- /TASK -->

<!-- TASK -->
### T6 - Add the design lens
- TDD: none
- Covers: #1, #2
- Uses: C1
- Depends-on: T1
- Files: viber/skills/code-auditor/references/lenses/design.md
- Delivers: the design lens written from `.temp/viber/intent/lens-research/design.md` in the C1 shape, verified by evidence gates with no worktree.
- Verification: node --test --test-name-pattern "design\.md" tests/viber/lenses.unit.test.ts tests/viber/lens-map-signals.test.ts -> every case naming `design.md` passes; grep -c -i -E 'fix economics|same knowledge|bump' viber/skills/code-auditor/references/lenses/design.md -> at least 3
- DoD: `design.md` passes the lens structure check with `Worktree: none`; its `## Verify` holds the seven gates (existence, same knowledge, change scenario, pain evidence, not deliberate, fix economics, dead-code reachability); its `## Severity` caps at 6 unless the flaw already caused a bug; its co-change command skips version-bump and release commits; every one of its map-signal commands passes `lens-map-signals.test.ts`.
<!-- /TASK -->

<!-- TASK -->
### T7 - Add the diff scope script
- TDD: required
- Covers: #3
- Uses: C4
- Depends-on: none
- Files: viber/skills/code-auditor/scripts/diff-files.sh, tests/viber/diff-files.test.ts
- Delivers: a POSIX script, headed per `.claude/rules/shell-script-header.md`, printing the diff base and the changed files of the diff scope per C4.
- Verification: node --test tests/viber/diff-files.test.ts -> pass
- DoD: on a feature branch with a commit since its merge base with `main`, a staged edit, an unstaged edit and an untracked file, the script prints `BASE <merge-base sha>` then all four paths once each; a file deleted since the base is not printed; on `main` itself only the uncommitted paths are printed and the base line reads `BASE HEAD`; on `main` with an `origin` remote whose `HEAD` points at `main` and one unpushed commit on `main`, the file of that commit is not printed and the base line reads `BASE HEAD`; with no `origin/HEAD`, `main` or `master` the base line reads `BASE HEAD`; on a detached `HEAD` the base line reads `BASE HEAD`; on a branch sharing no history with `main` (an orphan branch) the base line reads `BASE HEAD`; files under `.temp/viber/code-auditor/` are never printed, even when that directory is not ignored; on `main` with an explicit base argument naming the commit two commits back, the base line reads `BASE <that sha>` and the files of the two later commits are printed along with the uncommitted paths; an explicit base naming no commit prints `BAD_BASE <value>` and exits 1; with changed paths `b.txt` (committed) and `a.txt` (both committed and edited again uncommitted), the path lines read `a.txt` then `b.txt`, each once; in a repository with no commit the base line reads `BASE none` and the staged and untracked paths follow; with nothing changed only the base line is printed; outside a repository the script prints `NOT_A_REPO <path>` and exits 1; a path with a space or a non-ASCII character is printed raw.
<!-- /TASK -->

<!-- TASK -->
### T8 - Add the diff overlay script
- TDD: required
- Covers: #10
- Uses: C9
- Depends-on: none
- Files: viber/skills/code-auditor/scripts/diff-overlay.sh, tests/viber/diff-overlay.test.ts
- Delivers: a POSIX script, headed per `.claude/rules/shell-script-header.md`, laying the working tree's staged, unstaged and untracked changes onto a clean checkout of `HEAD` per C9.
- Verification: node --test tests/viber/diff-overlay.test.ts -> pass
- DoD: given a repository with a staged edit, an unstaged edit, a staged deletion, an untracked file and an ignored file, and a clean checkout of `HEAD` made by `worktree.sh add`, the script leaves the checkout's edited files byte-identical to the working tree, the deleted file absent, the untracked file present, the ignored file absent and an untracked file under `.temp/viber/code-auditor/` absent, prints `OVERLAY_APPLIED <n>` with `n` the paths written or removed, and exits 0; an edited binary file arrives byte-identical; a path holding a space arrives intact; with nothing changed it prints `OVERLAY_APPLIED 0`; a checkout path that is not a git worktree gives `OVERLAY_FAILED <reason>` and exit 1; the target repository's working tree and index are unchanged after every case.
<!-- /TASK -->

<!-- TASK -->
### T9 - Replace the sweep agents with mapper and hunter
- TDD: none
- Covers: #5, #6, #10
- Uses: C1, C2, C3, C5, C6, C7, C9
- Depends-on: T1, T8
- Files: viber/agents/mapper.md, viber/agents/hunter.md, viber/agents/scout.md, viber/agents/critic.md, viber/agents/profiler.md, viber/agents/detective.md, viber/agents/edge-scout.md, viber/skills/code-auditor/references/synthesis.md, viber/skills/code-auditor/scripts/worktree.sh, viber/.claude-plugin/plugin.json, viber/skills/setup/assets/help.html, tests/viber/profiler.test.ts
- Delivers: the `mapper` and `hunter` agents, `scout` scoring units, `critic` verifying per the lens, `synthesis.md` carrying the hunter report, sidecar, verdict and findings rules, the three retired agents and the profiler test removed, the registration and the help page's agent lines matching.
- Verification: node --test tests/viber/help.unit.test.ts tests/viber/worktree.test.ts -> pass; grep -c -E '"\./agents/(mapper|hunter|scout|critic)\.md"' viber/.claude-plugin/plugin.json -> 4, and grep -c -E '^name: (mapper|hunter)$' viber/agents/mapper.md viber/agents/hunter.md -> 1 each; for f in viber/agents/profiler.md viber/agents/detective.md viber/agents/edge-scout.md tests/viber/profiler.test.ts; do test ! -e "$f" || echo "LEFT $f"; done -> prints nothing; grep -c -E 'collect_|rank_edges|rank\.ts|check_node|edge-scout|profiler|detective|jobs\.md|job\.md|scoring\.md|Impact x Opportunity' viber/skills/code-auditor/references/synthesis.md viber/agents/scout.md viber/agents/critic.md viber/agents/mapper.md viber/agents/hunter.md viber/skills/code-auditor/scripts/worktree.sh -> 0 for each file; grep -c 'diff-overlay.sh' viber/agents/hunter.md viber/agents/critic.md -> at least 1 each
- DoD: `mapper.md` and `hunter.md` take the sweep-agent form (`# <Name> - <role>`, `## Inputs you are given`, `## Hard rules`, no `DENIED` line) with frontmatter fields in the order `.claude/rules/agent-frontmatter.md` sets; `mapper.md` carries `tools: Read, Write, Grep, Glob, Bash`, `model: inherit` and `color: cyan`; `hunter.md` carries `tools: Read, Write, Grep, Glob, Bash`, `model: inherit`, `effort: high` and `color: purple`; `hunter.md` and `critic.md`, when their brief carries `Overlay script:`, run it right after `WORKTREE_READY` and treat `OVERLAY_FAILED` like `WORKTREE_FAILED` (`NO FINDING` for the hunter, `INCONCLUSIVE` for the critic); `mapper.md` and `hunter.md` state under `## Hard rules` that `No such tool available` on `Glob` or `Grep` means using `find` and `grep` through `Bash`; `mapper.md` reads back the tail of `map.md`, and `hunter.md` the tail of each report and claim sidecar, deleting a trailing bare closing-tag line such as `</content>`; `synthesis.md` orders ties and names merged groups by hunt id and `<hunt id>-<k>`, with no report rank left; `mapper.md` takes the C3 brief and writes `map.md` in the C3 shape, running each map-signal block of the lens with `<scope>` replaced per C3's signal-scope rule (`.` for `Scope: diff` and `Scope: repo`, the directory for a directory scope); `mapper.md` treats a signal command ending with exit 1 and empty stderr, or any signal command failing in a repository with no commit yet, as an empty signal, never as an error; `synthesis.md` declares the C2 run file shape, which `SKILL.md` writes and every agent reads; `synthesis.md` rebuilds `findings.md` after a variant wave from the first wave's and the variant wave's findings together; `hunter.md` hunts the classes of its `Seed:` lines first when the brief carries any; `hunter.md` takes the C6 brief, writes at most three findings per C6 or one `NO FINDING` file, and uses a worktree only when the brief carries one; `scout.md` returns one C5 line per unit; `critic.md` takes the C7 brief, follows the lens's `## Verify` and never opens a hunter report; `synthesis.md` defines C6, C7, the `findings.md` title `# Findings - <run-id> (<lens>, <scope>)`, the ten-entry cap, the second dispatch and `INCONCLUSIVE` filing of a critic returning no `VERDICT:` line, and the offered variant wave; `synthesis.md`'s `findings.md` header line reads `<lens> · <scope> · U units mapped · H hunts · K confirmed findings · J units not investigated.` and its coverage notes name units not investigated, with no edge track and no hotspot wording; `synthesis.md` keeps no generic-band fallback for a missing repository profile, since a run with no map never reaches synthesis; `critic.md` and `synthesis.md` calibrate severity from the C2 run file's `## Map` -> `## Severity calibration`, falling back to the lens's `## Severity` only when that section holds no band line, and name no `job.md`; `synthesis.md`, `scout.md`, `critic.md` and `worktree.sh` name no removed script, agent or reference; the `help.html` code-auditor card links no removed `agent-` id; `profiler.md`, `detective.md`, `edge-scout.md` and `tests/viber/profiler.test.ts` no longer exist; `plugin.json` `agents[]` lists `mapper.md` and `hunter.md` and none of the three removed agents; `help.html` carries one bilingual `agent-<name>` line for `mapper`, `scout`, `hunter` and `critic` and none for the removed agents; `worktree.sh`'s header names hunter and critic runs and its behaviour is unchanged.
<!-- /TASK -->

<!-- TASK -->
### T10 - Rewrite the code-auditor entry and pipeline
- TDD: none
- Covers: #4, #5, #7, #10
- Uses: C1, C2, C3, C4, C5, C6, C7, C8, C9
- Depends-on: T2, T3, T4, T5, T6, T7, T9
- Files: viber/skills/code-auditor/SKILL.md, viber/skills/code-auditor/references/jobs.md, viber/skills/code-auditor/references/scoring.md, viber/skills/code-auditor/scripts/check_node.sh, viber/skills/code-auditor/scripts/collect_signals.sh, viber/skills/code-auditor/scripts/collect_edges.sh, viber/skills/code-auditor/scripts/rank.ts, viber/skills/code-auditor/scripts/rank_edges.ts, tests/viber/check_node.test.ts, tests/viber/collect_signals.test.ts, tests/viber/collect_edges.test.ts, tests/viber/rank.test.ts, tests/viber/rank_edges.test.ts, tests/superui/check_node.test.ts
- Delivers: the skill taking the C8 arguments, asking per S1, writing the C2 run file, running Map, Hunt, Verify and Synthesize per S3 to S7, and the retired scripts, references and their tests removed.
- Verification: node --test tests/portability.unit.test.ts tests/superui/check_node.test.ts -> pass; for l in bugs security web-performance runtime-performance tests design; do grep -q "references/lenses/$l.md" viber/skills/code-auditor/SKILL.md && test -f "viber/skills/code-auditor/references/lenses/$l.md" || echo "MISSING $l"; done -> prints nothing; wc -c < viber/skills/code-auditor/SKILL.md -> at most 9000; grep -q 'scripts/diff-files.sh' viber/skills/code-auditor/SKILL.md && grep -q 'scripts/diff-overlay.sh' viber/skills/code-auditor/SKILL.md && test -f viber/skills/code-auditor/scripts/diff-files.sh && test -f viber/skills/code-auditor/scripts/diff-overlay.sh && echo OK -> OK; grep -c -E '^disable-model-invocation: false$' viber/skills/code-auditor/SKILL.md -> 1; grep -o -E '(^|[^/a-z])viber:[a-z-]+' viber/skills/code-auditor/SKILL.md | grep -o -E 'viber:[a-z-]+' | sort -u -> exactly viber:critic, viber:hunter, viber:mapper, viber:scout; grep -c -E '(^|[^a-z])node( |$)|collect_|rank_edges|rank\.ts|check_node|edge-scout|jobs\.md|scoring\.md' viber/skills/code-auditor/SKILL.md -> 0
- DoD: `SKILL.md`'s frontmatter keeps `user-invocable: true` and `disable-model-invocation: false`, and its `description` names the six lenses and the three scopes as what triggers it, with no `Impact x Opportunity` wording; `SKILL.md`'s `argument-hint` reads `[<lens>] [diff | diff:<sha> | <directory> | repo]`; `SKILL.md` names the six lens files by path and states that only the selected one is read; `SKILL.md` asks per S1 through `AskUserQuestion` (two questions in the first call, a second call only for Performance or Quality); `SKILL.md` resolves a token equal to a lens name to the lens, a `performance` or `quality` token to its group with only the second question asked, and documents `./<name>` for a directory of that name; `SKILL.md` stops with the C8 directory message for a directory outside the root, carrying `..` or missing; `SKILL.md` asks for the directory path in prose after the Directory answer; `SKILL.md` reads a `diff:<sha>` token as the diff scope and passes `<sha>` to `diff-files.sh` as its base argument, stopping with the C8 bad-base message before any `Agent` dispatch when the script prints `BAD_BASE`; `SKILL.md` runs `diff-files.sh` for the diff scope and stops with the C8 empty-diff message before any `Agent` dispatch when it prints no path; `SKILL.md` stops with the C8 no-commit message before any `Agent` dispatch when `diff-files.sh` prints `BASE none` and the lens reads `Worktree: required`; `SKILL.md` dispatches the mapper on every scope with the C3 brief, the signal scope following from the run file's `Scope:` line per C3, and on the diff scope dispatches no scout and one hunter per lens angle; `SKILL.md` stops with the C8 nothing-to-audit message when `## Units` reads `none: <reason>`, and with the C8 map message after a second `map.md` missing a C3 heading; `SKILL.md` dispatches `viber:mapper`, `viber:scout`, `viber:hunter` and `viber:critic` and no other agent; `SKILL.md` states the hunter budgets (one per angle on the diff, 8 for a directory, 16 for the repository), the 16-agent concurrency cap and scouting only above the budget; `SKILL.md` reserves a worktree only for a lens whose `## Verify` reads `Worktree: required`, and on the diff scope adds the C9 `Overlay script:` line to every hunter and critic brief that carries a worktree; `SKILL.md` offers the variant wave through `AskUserQuestion` only when at least one finding was confirmed, on the directory and repository scopes only while mapped units remain uninvestigated, starts none unasked, and dispatches each wave hunter with one C6 `Seed:` line per confirmed class; on the diff scope that wave dispatches one `V-<n>` hunt per confirmed class over the repository outside the changed files; `SKILL.md` invokes no `node` and names no removed script, agent or reference; `SKILL.md` is at most 9000 bytes; the five removed scripts, `jobs.md`, `scoring.md` and their five tests no longer exist and are removed from the git index with `git rm`; `tests/superui/check_node.test.ts` passes and names no viber path.
<!-- /TASK -->

<!-- TASK -->
### T11 - Document the lens-based auditor and guard against stale references
- TDD: none
- Covers: #8, #9
- Uses: C8
- Depends-on: T10
- Files: viber/README.md, README.md, viber/skills/setup/assets/help.html, .claude/rules/shell-awk-environ.md, .claude/rules/shell-script-header.md, .claude/rules/shell-preload-contract.md, .claude/rules/agent-frontmatter.md, tests/viber/code-auditor.unit.test.ts
- Delivers: user docs and rule files describing the current auditor, and a unit test proving the skill's lens set and agent registration and the absence of stale references.
- Verification: node --test tests/viber/code-auditor.unit.test.ts tests/viber/help.unit.test.ts -> both pass; for t in web-performance runtime-performance 'diff:<sha>'; do grep -q -F -- "$t" viber/skills/code-auditor/SKILL.md && grep -q -F -- "$t" viber/README.md || echo "MISSING $t"; done -> prints nothing, and grep -c -i -E 'code-auditor.*node|node.*code-auditor' viber/README.md README.md -> 0 each
- DoD: `code-auditor.unit.test.ts` passes when every lens file `SKILL.md` names exists and the set is exactly the six C8 lenses; `code-auditor.unit.test.ts` passes when every `viber:<name>` in `SKILL.md` not preceded by `/` (an agent dispatch, never the `/viber:code-auditor` command) is listed in `plugin.json` `agents[]` with an existing file; `code-auditor.unit.test.ts` fails on a synthetic tracked-file text holding any of `collect_signals`, `collect_edges`, `rank_edges`, `code-auditor/scripts/rank.ts`, `code-auditor/scripts/check_node.sh`, `edge-scout`, `references/jobs.md`, `references/scoring.md`, `viber:profiler`, `viber:detective`, `agents/profiler.md` or `agents/detective.md`, and passes over every tracked file outside `docs/` that is not a `CLAUDE.md`; `code-auditor.unit.test.ts` assembles each forbidden token from fragments, so its own text holds none of them whole; `viber/README.md` describes the six lenses and three scopes and carries no Node.js note for the auditor; the root `README.md` requirements row names no Node.js for `/viber:code-auditor`; the `help.html` card, command list entry and optional-tools note describe lenses and scopes in English and Polish with no Node.js requirement and link only existing `agent-` ids; the four rule files cite no removed file and `shell-script-header.md`'s script count matches the tracked viber scripts.
<!-- /TASK -->

## Contracts

### C1 - Lens file

File: tests/viber/lenses.unit.test.ts, viber/skills/code-auditor/references/lenses/bugs.md

Path: `viber/skills/code-auditor/references/lenses/<lens>.md`, `<lens>` one of the C8 lens names, at most 8000 bytes.

Every line of the shape below is indented by two spaces here only; in the lens file each starts at column 0.

~~~
  # <Lens title> lens
  <one paragraph: what this lens audits, and which neighbouring lens owns what it leaves out>

  ## Hunts
  ### <angle-slug>            3 to 6 of these, slug [a-z0-9-]+
  <what to look for, what makes it a finding>

  ## Map signals
  <prose: how the mapper ranks units with these signals>
  ```bash
  <exactly one command line, run from the repository root; `<scope>` is its only <word> placeholder>
  ```
  <one or more such blocks; no bash block anywhere else in the file>

  ## Excluded
  - <a class never reported>

  ## Verify
  Worktree: required | none
  <the oracle, the procedure, when VERIFIED, PARTIALLY VERIFIED, REFUTED, INCONCLUSIVE>

  ## Severity
  - <low>-<high>: <what earns it>     bands covering 1 to 10
~~~

In `bugs.md` the first `## Map signals` block is the fix-history command: `git log` over the last 12 months filtered to fix, hotfix, revert and regression subjects, naming the files each commit touched.

### C2 - Run file

File: viber/skills/code-auditor/references/synthesis.md

Path: `.temp/viber/code-auditor/<run-id>/run.md`, written by the skill in Frame, the `## Map` section appended after the map gate.

Shape lines are indented by two spaces here only; in the file each starts at column 0.

```
  Lens: <lens>
  Lens file: <absolute path of the lens file>
  Scope: diff | repo | <root-relative directory>
  Target root: <absolute repository root>
  Base: <BASE value from diff-files.sh>          diff scope only

  ## Changed files                               diff scope only
  <root-relative path, one per line>

  ## Map
  <map.md verbatim>
```

### C3 - Mapper brief and map file

File: viber/agents/mapper.md

Brief lines: `Run file: <run.md path>`, `Lens file: <path>`, `Output: .temp/viber/code-auditor/<run-id>/map.md`. Final message: `map written: <path>`.

Signal scope: the mapper replaces `<scope>` in every map-signal command by `.` when the run file reads `Scope: diff` or `Scope: repo`, and by the directory itself when it reads `Scope: <root-relative directory>`.

Shape lines are indented by two spaces here only; in the file each starts at column 0.

```
  ## Conventions
  <build, fast-test and single-test commands; project rules bearing on the lens>

  ## History
  Already fixed: <n> commits
  <hash> <subject>
  - <recurring class>: <one line> (<hash>, <hash>)

  ## Severity calibration
  - 9-10 <what earns it in this repository for this lens>
  - 7-8 <...>
  - 4-6 <...>
  - 1-3 <...>

  ## Units
  - U<n> | <root-relative path>[, <path>...] | <why, at most 20 words>
```

At most 40 unit lines, best first. On the diff scope every unit holds changed files only and together they hold every changed file. `## Units` holds instead the single line `none: <reason>` when the repository holds nothing the lens audits.

### C4 - diff-files.sh

File: viber/skills/code-auditor/scripts/diff-files.sh

Invocation: `sh diff-files.sh <repo-root> [<base>]`. An explicit `<base>` (any commit-ish) wins over every default-branch rule below: the base line reads `BASE <its full sha>` and the paths are those changed from `<base>` to the working tree, plus staged and untracked, even on the default branch. A `<base>` naming no commit: the single line `BAD_BASE <base>`, exit 1.

```
BASE <merge-base sha> | BASE HEAD | BASE none
<root-relative path>          one per line, sorted, unique, raw (no quoting)
```

Default branch: the target of `refs/remotes/origin/HEAD`, else local `main`, else local `master`; none -> `BASE HEAD`. The current branch is the default branch (its short name, or `origin/HEAD`'s target with the `origin/` prefix dropped) -> `BASE HEAD`, so unpushed commits there are not printed. A detached `HEAD`, or a current branch sharing no merge base with the default branch -> `BASE HEAD`. Paths under `.temp/viber/code-auditor/` are never printed. No commit yet -> `BASE none`. Paths: changed between the base and the working tree (added, modified, renamed to; deleted excluded) plus staged plus untracked files not ignored. Exit 0. Not a repository: the single line `NOT_A_REPO <repo-root>`, exit 1.

### C5 - Scout brief and score line

File: viber/agents/scout.md

Brief lines: `Run file: <run.md path>`, `Lens file: <path>`, then up to 8 unit lines of C3 verbatim. Final message: one line per unit, JSON only.

```
{"unit":"U<n>","score":<1-5>,"reason":"<at most 15 words>"}
```

### C6 - Hunter brief, report and claim sidecar

File: viber/agents/hunter.md, viber/skills/code-auditor/references/synthesis.md

Brief lines: `Run file: <path>`, `Lens file: <path>`, `Schema: <synthesis.md path>`, `Hunt: <hunt id>`, then `Unit: <C3 unit line verbatim>` or `Angle: <angle slug>`, `Reports: .temp/viber/code-auditor/<run-id>/reports/<hunt id>`; on a variant-wave hunt only, one `Seed: <angle slug>: <confirmed class>` line per class confirmed earlier in the run; only for a `Worktree: required` lens `Worktree script: <worktree.sh path>` and `Worktree: <absolute reserved path>`, plus on the diff scope `Overlay script: <diff-overlay.sh path>`. Hunt id: `U<n>`, `A-<angle slug>`, or `V-<n>` for a diff-scope variant-wave hunt, which carries `Angle:` with its `Seed:` line and searches the repository outside the changed files.

Report `<hunt id>-<k>.md`, `k` 1 to 3:

Shape lines are indented by two spaces here only; in the file each starts at column 0.

```
  # <short title>
  LOCATION: <path>:L<start>-L<end>
  CLASS: <angle slug>: <specific class>
  SEVERITY: <0.0-10.0>
  CONFIDENCE: low | medium | high
  HUNT: <hunt id>
  ## Root cause
  ## Reproduction
  ## Verification
  ## Suggested fix (sketch)
```

Sidecar `<hunt id>-<k>.claim.md`: `LOCATION:` and `CLASS:` lines verbatim, then `## Reproduce` carrying what the lens's `## Verify` replays (input, command and observable symptom; for a `Worktree: none` lens the cited locations and the evidence), no reasoning. No finding: `<hunt id>-0.md` whose whole body is `NO FINDING` and one `checked: <line>`.

### C7 - Critic brief and verdict

File: viber/agents/critic.md, viber/skills/code-auditor/references/synthesis.md

Brief lines: `Claim: <sidecar path>`, `Run file: <path>`, `Lens file: <path>`; only for a `Worktree: required` lens `Worktree script: <path>` and `Worktree: <absolute reserved path>`, never the hunter's, plus on the diff scope `Overlay script: <diff-overlay.sh path>`. Final message:

```
VERDICT: VERIFIED | REFUTED | PARTIALLY VERIFIED | INCONCLUSIVE
COMMAND: <the exact command or check performed>
OBSERVED: <what was seen>
SEVERITY: <0-10 | unchanged>
```

### C8 - Arguments and lens names

File: viber/skills/code-auditor/SKILL.md

```
/viber:code-auditor [<lens>] [diff | diff:<sha> | <directory> | repo]
<lens>: bugs | security | web-performance | runtime-performance | tests | design
diff:<sha>: the diff scope with <sha> passed to diff-files.sh as its explicit base
group token: performance | quality      picks the group, asks only the second question
```

Stop messages, one line each, printed before the run stops:

```
code-auditor: area directory not found under <root>: <value> (lenses: bugs, security, web-performance, runtime-performance, tests, design)
code-auditor: nothing changed against <base>
code-auditor: diff base not found: <sha>
code-auditor: nothing to audit for <lens>: <reason from the units line>
code-auditor: map unavailable after two attempts
code-auditor: <lens> verifies on a clean checkout and this repository has no commit yet: commit first, or pick the design lens
```

Question labels map to lenses: Bugs -> `bugs`, Security -> `security`, Performance + Web -> `web-performance`, Performance + Runtime -> `runtime-performance`, Quality + Design -> `design`, Quality + Tests -> `tests`. Scope answers: Changes -> `diff`, Directory -> `<directory>`, Whole repository -> `repo`.

### C9 - diff-overlay.sh

File: viber/skills/code-auditor/scripts/diff-overlay.sh

Invocation: `sh diff-overlay.sh <target-root> <worktree-path>`, run right after `worktree.sh add` printed `WORKTREE_READY` for that path.

```
OVERLAY_APPLIED <count of paths written or removed>
OVERLAY_FAILED <reason>
```

Carries into the worktree: every tracked change of the working tree against `HEAD` (staged and unstaged, binary files and deletions included) and every untracked file that is not ignored, except anything under `.temp/viber/code-auditor/`. Never changes the target's working tree or index. Exit 0 on `OVERLAY_APPLIED`, 1 on `OVERLAY_FAILED`; stdout is exactly one line either way.
