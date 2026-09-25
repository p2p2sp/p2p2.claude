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
