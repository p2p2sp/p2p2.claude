---
source: /Users/dario/Projects/p2p2.claude/docs/_specs/2026-09-25-15-37-13_run-branching-driven-by-viber-yml/plan.md
---

# Run branching driven by viber.yml

Build: skill `implementor`

## Goal

Let a project declare in its viber configuration whether a viber run works on its own git branch, from which base and under which name, so the run's commits land where the project's branching strategy (GitFlow, GitHub Flow, trunk based development) expects them. The decision is taken during planning, confirmed by the user, and carried out before the run's first file lands in its run directory.

## Problem

Every run commits onto whatever branch is checked out: the plan decomposition, every task commit and the archive. A project that never commits straight to `main` or `develop` depends on the user remembering to create a branch before planning; forgetting it puts a whole build on the base branch, and untangling that afterwards costs history rewrites. The session manifest even forbids the model to create a branch unless asked, so nothing in the chain can help.

## Current behaviour

viber has no notion of a branch. Landing copies the approved plan into a dated run directory on the current branch; the decomposition, the task commits and the archive are committed there; nothing pushes. The planner lands a draft round itself and leaves it uncommitted. The commit skill reads the branch name only to derive an issue footer. The session manifest tells the model never to create a branch unless the user explicitly asks.

### Must not change

- With branching off, or with no branching group in the configuration, landing prints exactly the lines it prints today and never moves HEAD.
- A landed run is never written over; the no-argument resolution, and a landing whose source is itself a landed run plan, never move HEAD.
- Landing's existing exit codes keep their meaning and their "nothing landed" guarantee.
- The configuration resolver always succeeds and keeps every line it prints today, in the same order.
- `/viber:setup` keeps every value a project's existing configuration carries.

## Behaviour

### S1 - Branching off changes nothing [NEW]

Given a project whose configuration has no branching group, or sets branching off
When a plan is planned, landed and built
Then no branch question is asked, landing prints what it prints today, and every commit lands on the branch the user stands on

### S2 - Setup seeds the branching settings [NEW]

Given a project set up before this change
When the user runs `/viber:setup`
Then the configuration gains the branching group with branching off, every existing value is kept, and the resolved configuration reports the three branching settings at their defaults

### S3 - The planner asks about the run's branch [NEW]

Under allowed or required, once the plan is written and before it goes to review, the planner shows the user the branch situation and asks one question: stay on the current branch (offered when it is not the base), create the proposed branch from the base, or, under allowed only, work without a branch. It names a local base that is behind its remote-tracking branch, and a dirty tree that would block the chosen switch. The answer is recorded in the plan, so the approved plan carries it. A later round of the same draft carries the recorded answer over and asks nothing.

Given branching allowed, base `develop`, the user on `develop`
When the planner finishes writing the plan
Then it asks whether to create the proposed branch from `develop` or to work without a branch, and records the answer in the plan before review

### S4 - Landing creates the run's branch from the local base [NEW]

Given an approved plan naming a branch that does not exist, and HEAD on the base
When the plan is landed (by the implementor, or by the planner for a draft)
Then the branch is created from the local base, uncommitted work (a reproduction test, a draft) travels with it, the plan lands on it, and landing reports the branch as created

### S5 - Landing stays on a working branch [NEW]

Given the user already on a branch other than the base, and a plan naming that branch
When the plan is landed
Then nothing is switched and landing reports the branch as kept; a later draft round landed on the same branch behaves the same way

### S6 - Required branching without a planner decision [NEW]

A plan written in plain plan mode records no branch.

Given branching required and a plan recording no branch
When the plan is landed while HEAD is on the base
Then a branch named by the name pattern is created from the base without a question; on any other branch the run stays where it is

Given branching allowed and a plan recording no branch
When the plan is landed
Then no branch is created and landing reports the current branch as kept

### S7 - Landing refuses a switch it cannot make safely [NEW]

Given a plan whose branch needs HEAD to move to another commit, and uncommitted changes in the tree
When the plan is landed
Then landing fails with the reason, lands nothing and switches nothing; the implementor, or the planner for a draft, reports the reason and stops

### S8 - The build ends naming where the pull request goes [NEW]

Given a build that ran on a branch other than the base
When the implementor writes its final summary
Then one line names the branch and the base a pull request should target; nothing is pushed

### S9 - The model may put a run on its configured branch [CHANGED - was: never create a branch unless the user explicitly asks]

Given branching allowed or required
When a session starts
Then the manifest still forbids an unrequested branch, except the run branch an approved plan or the branching setting puts a run on

### Edge cases

- Outside a git repository -> branching acts as off.
- Detached HEAD -> a plan naming a branch switches to it or creates it as usual; under required a plan recording no usable branch fails, since a detached HEAD is no branch to stay on.
- The base does not exist locally (a fresh clone of another branch, an unborn repository) -> creating a branch from it fails naming the base.
- The plan's branch already exists and is not the current one -> landing switches to it, under the same dirty-tree rule; it is never recreated or reset.
- A plan recording "no branch" under required -> read as recording no branch.
- A plan naming the base itself under required -> landing fails.
- No issue known -> the proposed name simply has no issue number and no leftover separator where it would have been.
- A name that is not a valid branch name after expansion -> landing fails naming it.
- A local base behind its remote-tracking branch -> reported in the planner's question only; nothing is fetched.
- A plan landed before this change records no branch -> the rule of S6 applies, and only on a first landing.
- The approved plan landed again from another branch while its run already sits on the run branch -> landing ends on the run branch with the existing run found there, never a duplicate run beside it.
- A landing that fails for any reason other than the branch itself (a bad argument, a draft target that is not a draft) -> HEAD stays where it was.

## Glossary

- base - the branch a new run branch starts from, and the branch a pull request goes back to.
- run branch - the branch a run's commits land on: kept, switched to, or created at the first landing.
- branch name pattern - a branch name with placeholders for the kind of change, the issue number and the run's slug, used when the plan records no name of its own.
- branching mode - off (viber never touches branches), allowed (the planner proposes and asks), required (a run never commits on the base).
- first landing - a landing that copies a plan into a run directory: a new run, or a later round of a draft; never the resolution of a run already landed.

## Acceptance criteria

1. With branching off or no branching group, landing prints nothing new and never moves HEAD, and the resolved configuration reports branching off.
2. The resolved configuration reports the branching mode, base and name pattern after the model tiers, each at its default when missing or unusable.
3. `/viber:setup` seeds a new configuration, and merges into an existing one lacking it, a commented branching group with branching off; the README and both languages of the onboarding page describe it.
4. The planner can obtain, without changing anything, the mode, base, current branch, proposed branch name, whether that name exists, how far the local base is behind its remote-tracking branch and whether the tree is dirty.
5. Under allowed or required, the planner asks the branch question after writing the plan and before dispatching its review, and records the answer in the plan; under required the question offers no "no branch" answer; a later draft round carries the recorded answer over without asking.
6. A first landing puts HEAD on the run branch the plan records, kept, switched to or created from the local base, before anything is copied, and reports the branch and what was done.
7. Under required, a first landing never leaves HEAD on the base: a plan recording no usable branch stays on a non-base branch or creates the pattern branch, and a plan naming the base is refused.
8. A first landing that would move HEAD to another commit on a dirty tree, needs a base missing locally, or targets an invalid name fails with the reason, lands nothing and leaves HEAD where it was.
9. The implementor stops with the reason when landing fails that way, and its final summary names the run branch and the base to open a pull request against when they differ; the planner reports the branch, or the failure, when it lands a draft.
10. The session manifest no longer forbids the run branch an approved plan or the branching setting puts a run on.

## Scope

### File map

- modify - viber/scripts/config.sh - resolves the branching group into three output lines
- modify - tests/viber/config.test.ts - proves the new lines, their defaults and their order
- modify - viber/skills/setup/templates/viber.yml - ships the commented branching group
- modify - tests/viber/bootstrap.test.ts - its merge assertions over the template's full key list
- modify - viber/README.md - documents the group for users
- modify - viber/skills/setup/assets/usage.html - documents the group on the onboarding page, both languages
- add - viber/scripts/run-branch.sh - sourced helper: resolves the run branch, expands the pattern, gathers the facts, performs the switch
- modify - viber/scripts/plan-path.sh - the branch report mode, and the branch step of a first landing
- modify - tests/viber/plan-path.test.ts - proves both through the command line
- modify - viber/skills/planner/SKILL.md - the branch question between writing and review, and the draft landing's branch report
- modify - viber/skills/planner/templates/spec-full.md - the branch frontmatter key
- modify - viber/skills/planner/templates/spec-lite.md - the branch frontmatter key
- modify - viber/hooks/content/manifest.md - the branch rule admits the configured run branch
- modify - viber/skills/implementor/SKILL.md - landing failure, and the pull request line of the final summary

### Out of scope

- Push, pull request creation, merge and branch deletion.
- Fetching or any other network call.
- A base depending on the kind of change (a GitFlow hotfix from `main`).
- Strategy names (`gitflow`, `trunk`) as configuration values.
- A plan review checking the recorded branch.
- The commit skill and its issue footer derived from a branch name.

## Constraints

- Works under Git Bash on Windows and under the bash 3.2 macOS ships.
- Branching adds no new permission prompt to planning or building.
- A plan landed before this change still lands and still builds.
- A failed branch step leaves the tree, the index and HEAD exactly as it found them.
- The branch step never reaches the network.

## Tasks

<!-- TASK -->
### T1 - Resolve the branching group in config.sh
- TDD: required
- Covers: #1, #2
- Uses: C1
- Depends-on: none
- Files: viber/scripts/config.sh, tests/viber/config.test.ts
- Delivers: `config.sh` resolves the `branching:` group into the three lines of C1, after `tiers.max`, each value validated and replaced by its default when missing or unusable; its header contract lists the new keys.
- Verification: node --test tests/viber/config.test.ts -> every test passes, including cases for the three defaults with no file, valid values, a quoted pattern, an unknown mode, an unusable base and pattern, and a same-named key outside the group
- DoD: with no config file the output ends with the three C1 lines at their defaults, in C1 order; a mode written in mixed case resolves to its lowercase value; a quoted pattern prints without its quotes; a base or pattern outside its allowed characters prints the default; the exit is 0 in every case
<!-- /TASK -->

<!-- TASK -->
### T2 - Ship and document the branching group
- TDD: none
- Covers: #3
- Uses: C1
- Depends-on: T1
- Files: viber/skills/setup/templates/viber.yml, tests/viber/bootstrap.test.ts, viber/README.md, viber/skills/setup/assets/usage.html
- Delivers: the setup template carries a commented `branching:` group with the C1 defaults (the pattern quoted) and one example per strategy (trunk based development, GitHub Flow, GitFlow); the bootstrap tests reflect the template's new key; the README and both languages of the onboarding page describe the three modes, the base, the pattern and its placeholders, and that nothing is fetched, pushed or merged.
- Verification: node --test tests/viber/bootstrap.test.ts -> every test passes; grep -n "branching" viber/skills/setup/templates/viber.yml viber/README.md viber/skills/setup/assets/usage.html viber/scripts/config.sh -> matches in all four files
- DoD: a fresh setup seeds `branching:` with the C1 defaults; merging into a config lacking the group reports `branching` among the added keys; the README shows the group in a yaml block; usage.html describes it under both `lang="en"` and `lang="pl"`
<!-- /TASK -->

<!-- TASK -->
### T3 - Put a landing run on its branch
- TDD: required
- Covers: #1, #6, #7, #8
- Uses: C1, C2, C4, C5
- Depends-on: T1
- Files: viber/scripts/run-branch.sh, viber/scripts/plan-path.sh, tests/viber/plan-path.test.ts
- Delivers: `run-branch.sh`, sourced by `plan-path.sh` and never invoked on its own, reads the C1 values from the sibling `config.sh` output; a first landing resolves the run branch from the plan's C2 key and the mode, validates argv and the `into:` target first, then keeps, switches to or creates the run branch from the local base, and only then looks up runs by slug and copies the plan; it prints the C4 line and fails with the C4 exit on a switch it cannot make safely; the no-argument form and a source that is itself a landed run plan never move HEAD; under `off` nothing changes. The header contract of `plan-path.sh` documents the step, and the issue number is read from the plan's `issue:` URL the way `issue_ref()` in `commit-task.sh` reads it.
- Verification: node --test tests/viber/plan-path.test.ts -> every test passes, including branch cases built with `withGitRepo` for off, kept, switched, created, required with and without a recorded branch, a dirty tree needing a switch, a missing base, an invalid name, a detached HEAD, a landed run plan given as source, and the approved plan re-landed from the base while its run sits on the run branch
- DoD: under `off` the stdout of every existing case is unchanged; a plan naming a new branch while HEAD is on the base lands on that branch with its uncommitted files carried along; a plan naming the current non-base branch reports it kept; `required` with no recorded branch on the base creates the C5 name; a plan naming the base under `required` fails with the C4 exit; a switch to another commit on a dirty tree fails with the C4 exit, with no run directory created and HEAD unchanged; a landed run plan given as source reports the current branch kept and switches nothing; the approved plan re-landed from the base answers `existing` from the run branch instead of minting a second run; a landing ending on exit 2 or 4 leaves HEAD where it was
<!-- /TASK -->

<!-- TASK -->
### T4 - Report the branch situation for the planner
- TDD: required
- Covers: #4
- Uses: C1, C3, C5
- Depends-on: T3
- Files: viber/scripts/run-branch.sh, viber/scripts/plan-path.sh, tests/viber/plan-path.test.ts
- Delivers: the C3 report for a given plan, printed without writing anything or moving HEAD, the proposed name expanded by C5 from the plan itself; the header contract of `plan-path.sh` documents it.
- Verification: node --test tests/viber/plan-path.test.ts -> every test passes, including report cases for off, a repository on the base, a non-base branch, an existing proposed name, a base behind its remote-tracking ref, no remote-tracking ref, a dirty tree, a plan with a `Repro:` line and one with an `issue:` URL
- DoD: under `off` or outside a repository the output is the C3 off form; the proposed name takes the fix type for a plan carrying a `Repro:` line and the feature type otherwise; it carries the issue number from an `issue:` URL and drops the placeholder without one; the behind count is the number of commits of the remote-tracking base missing from the local base, unknown without such a ref; `git status --porcelain` and HEAD are the same before and after the call; a missing plan file exits 2
<!-- /TASK -->

<!-- TASK -->
### T5 - Ask the branch question while planning
- TDD: none
- Covers: #5, #9, #10
- Uses: C1, C2, C3, C4
- Depends-on: T4
- Files: viber/skills/planner/SKILL.md, viber/skills/planner/templates/spec-full.md, viber/skills/planner/templates/spec-lite.md, viber/hooks/content/manifest.md
- Delivers: under a mode other than `off`, after the plan is written (and after `plan-index.sh` passes, for a plan with tasks) and before the review dispatch, the planner runs the C3 report on the plan and asks one `AskUserQuestion` offering the answers of S3 (no "no branch" under `required`), naming a base behind its remote and a dirty tree that blocks the chosen switch, then writes the answer as the C2 key; a review fix repeats the question only when it changes the branch; a round continuing a draft carries the draft's C2 key over like its `issue:` key and asks nothing; the draft landing of step 4 shows the C4 branch line with the landed path, and on the C4 exit reports the reason and stops without a hand-off; step 4 forbids running git directly rather than any git at all; both spec templates carry the C2 key with a drop-when-off comment; the manifest's branch rule admits the run branch an approved plan or the `branching` setting puts a run on.
- Verification: grep -n 'plan-path.sh" --branch' viber/skills/planner/SKILL.md && grep -n -- '--branch' viber/scripts/plan-path.sh && grep -n '^branch:' viber/skills/planner/templates/spec-full.md viber/skills/planner/templates/spec-lite.md && grep -n 'branching' viber/hooks/content/manifest.md viber/scripts/config.sh -> every command prints a match
- DoD: the planner body places the question after the plan is written and before the review dispatch, for a draft as well; the question is skipped under `off`; the question goes through `AskUserQuestion`; the `required` form offers no "no branch" answer; a continued draft round keeps the C2 key and asks nothing; step 4 shows the branch line and stops on the C4 exit; both templates list the C2 key in the frontmatter; the manifest rule names the `branching` setting as the exception
<!-- /TASK -->

<!-- TASK -->
### T6 - Report the run branch at the end of a build
- TDD: none
- Covers: #9
- Uses: C1, C4
- Depends-on: T3
- Files: viber/skills/implementor/SKILL.md
- Delivers: step 1 names the C4 line among landing's printed lines and, on the C4 exit, reports the stderr reason and stops before step 2; the final summary carries one line naming the run branch and `branching.base` as the pull request target when the C4 line named a branch other than the base.
- Verification: grep -n 'branch:' viber/skills/implementor/SKILL.md && grep -n 'exit 6\|6 - ' viber/skills/implementor/SKILL.md viber/scripts/plan-path.sh -> matches in both files
- DoD: step 1 lists the C4 line among the printed lines; the C4 exit stops the build before step 2 with the reason reported; the final summary rule names the branch and the base from the config block; no summary line appears when there is no branch line or it names the base
<!-- /TASK -->

## Contracts

### C1 - branching config lines

File: viber/scripts/config.sh

```
branching:                                   column-0 group in .claude/viber.yml
  mode: off | allowed | required
  base: <branch name>
  name: <pattern>

printed after tiers.max, in this order:
branching.mode: off | allowed | required     default off; any other value (case-insensitive) -> off
branching.base: <branch name>                default main; [A-Za-z0-9._/-]+, not starting with - or /, no "..", else default
branching.name: <pattern>                    default {type}/{issue}-{slug}; one surrounding pair of ' or " stripped;
                                             [A-Za-z0-9._/{}-]+, else default
```

### C2 - plan frontmatter branch key

File: viber/skills/planner/templates/spec-full.md, viber/skills/planner/templates/spec-lite.md

```
branch: <run branch name> | none
```

Absent key: no branch recorded. `none`: no run branch, read as absent under `required`. The value ends at the first whitespace.

### C3 - plan-path.sh --branch report

File: viber/scripts/plan-path.sh

```
plan-path.sh --branch <plan>        read-only; exit 0, or 2 when <plan> is not a file
stdout, mode allowed or required inside a git repository:
  mode: allowed | required
  base: <base>
  current: <branch> | detached
  new: <C5 name>
  new-exists: yes | no
  behind: <n> | unknown
  dirty: yes | no
stdout, mode off or outside a git repository:
  mode: off
```

### C4 - plan-path.sh landing branch line and exit 6

File: viber/scripts/plan-path.sh

```
stdout line after "state:", only when branching.mode is not off:
  branch: <name> (created | switched | kept)
  branch: detached (kept)
exit 6 - the run branch could not be set: a switch to another commit on a dirty tree, a base
         missing locally, an invalid branch name, the base as target under required, or a
         detached HEAD under required with no branch recorded; stderr names the reason;
         nothing landed, HEAD, index and tree unchanged
```

A first landing (a plan-mode source, or a draft round through `into:`) validates argv and the `into:` target first (exits 2 and 4 leave HEAD where it was), then runs the branch step, then looks up runs under the runs directory by slug and copies. The no-argument form and a source that is itself a landed run plan never switch and report the current branch as kept.

### C5 - branch pattern expansion

File: viber/scripts/run-branch.sh

```
{type}  -> fix when any task block of the plan carries a "Repro:" line, else feature
{issue} -> the issue number of the plan frontmatter's issue: URL, empty without one
{slug}  -> the run slug, normalized exactly as plan-path.sh normalizes it for the run key
then: a run of - _ . next to a / or at either end is dropped; // and -- collapse to one;
      the result must pass `git check-ref-format --branch`, else invalid
```
