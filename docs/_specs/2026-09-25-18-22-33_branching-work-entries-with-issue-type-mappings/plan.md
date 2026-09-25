---
source: C:/Projects/p2p2.claude/docs/_specs/2026-09-25-18-22-33_branching-work-entries-with-issue-type-mappings/plan.md
---

# Branching work entries with issue type mappings

Build: skill `implementor`

## Goal

Let a project describe several kinds of run branch - each with its own base, name pattern and pull request target - and let the type of the GitHub issue a run starts from pick the right kind. This makes GitFlow, GitHub Flow, GitLab Flow, trunk based development and Release Flow expressible in one `branching:` schema, with every decision made by scripts so the planner and the implementor carry no extra instructions.

## Problem

`branching:` holds one `base` and one `name`, so every run branch is cut from the same base and a project using GitFlow (feature branches from `develop`, hotfix branches from `main`) cannot configure viber at all. The implementor also names the single `base` as the pull request target, which is wrong for any strategy where a branch returns somewhere else. Teams whose issue types already encode the kind of work (an organisation-level `Bug-Report` meaning a production fix) have to pick the branch by hand every time.

## Current behaviour

`config.sh` resolves `branching.mode`, `branching.base` and `branching.name` and prints all three in the config block every skill preloads. `run-branch.sh`, sourced by `plan-path.sh`, expands `name` with `{type}` (fix when a task carries `Repro:`, else feature), `{issue}` (the number from the plan frontmatter `issue:` URL, dropped with its separator when absent) and `{slug}`. `plan-path.sh --branch` prints a read-only report (`mode`, `base`, `current`, `new`, `new-exists`, `behind`, `dirty`); the planner asks one question from it and writes the frontmatter `branch:` key. A first landing puts HEAD on that branch, creating it from `base`. The implementor names `branching.base` as the pull request target in its final summary. `issue-facts.sh` prints an issue's number, URL, title, state, author, labels and comments, but not its type.

### Must not change

- With branching off, or outside a git repository, a landing reports no branch, the branch report says only that branching is off, and HEAD never moves.
- The branch report never moves HEAD, the index or the tree.
- Nothing is ever fetched, pushed, merged or deleted by any branching step.
- The landing's existing refusals (bad arguments, no plan, a non-draft target, a failed copy) and its idempotent re-landing keep their meaning.
- A skill loading the viber configuration never fails because of it.

## Roadmap

Part 1 of 2 - work entries and issue type mappings

1. Work entries and issue type mappings (this plan)
2. The `viber:pr` skill: pull request creation and push, `releases`, `version`, pull request `template` and `title`, the placeholders `{version}`, `{issue-title}`, `{base}` and `{target}`, moving `docs/assets/viber-flow.svg` beside `usage.html` with a wider canvas and a header link to it

## Behaviour

### S1 - A GitFlow project gets a hotfix branch from a production bug [NEW]

A run tied to an issue of type `Bug-Report` is offered the hotfix branch cut from `main` first.

Given branching required, a feature kind of branch (from `develop`, back to `develop`, named `feature/issue.<number>`), a hotfix kind (from `main`, back to `main`, named `hotfix/issue.<number>`), and `Bug-Report` issues mapped to hotfix
When the planner prepares the branch for a plan tied to issue 6759 of type `Bug-Report`
Then the user is offered `hotfix/issue.6759` from `main` as the recommended choice, with `feature/issue.6759` from `develop` as an alternative, and the plan remembers the choice

### S2 - The user overrides the suggested kind [NEW]

Given the offer of S1
When the user picks the feature kind instead
Then the plan remembers `feature/issue.6759`, and the build starts on it, cut from `develop`

### S3 - An unmapped issue type stops the planning [NEW]

Given `Bug-Report` and `Feature-Request` mapped, nothing else
When the planner prepares the branch for a plan tied to an issue of type `Task`, or to an issue with no type
Then the user sees a message naming the type and the missing mapping, and no branch is chosen

### S4 - A run without an issue [NEW]

Given one kind named from the plan title and one kind named from the issue number
When the planner prepares the branch for a plan tied to no issue
Then the kind named from the issue number is left out, the kind named from the title is used with no question about the kind, and the user is asked only whether to create its branch

### S5 - The build names the pull request target [CHANGED - was: the configured single base was named as the target]

Given a plan that chose the hotfix kind and `hotfix/issue.6759`
When the build lands the plan, or later resumes the run
Then the build works on `hotfix/issue.6759`, cut from `main` the first time, and its final summary names that branch with `main` as the pull request target

### S6 - A legacy configuration is refused only when a branch has to be cut [CHANGED - was: the flat base and name were used]

Given a branching group still carrying the flat base and name, or a name pattern using the old issue placeholder, with branching on
When a new plan needs a branch reported or cut
Then the user sees a message naming the legacy setting and its replacement, and nothing moves

### S7 - A run planned before the upgrade resumes [NEW]

Given a plan landed by an older viber whose branch exists locally, and a configuration the new version refuses
When the build resumes the run
Then it continues on that branch with no message

### S8 - A user configures their strategy from the documentation [NEW]

Given a project following one of the documented strategies
When its user opens `viber/BRANCHING.md` or the Branching section of the usage page
Then they find a complete `branching:` block for that strategy, using only settings viber reads

### Edge cases

- No issue type mappings configured -> the issue type is never looked up and never refused; the single kind of branch, or none, is recommended.
- A mapping pointing at a kind that does not exist -> refused, naming both.
- An issue type whose name contains spaces or is quoted -> matched exactly, case-sensitively, quotes ignored.
- The issue type cannot be read (no GitHub command line tool, no network, a host without issue types) while mappings exist -> treated as no type, so S3 applies.
- A kind of branch missing its base, name or target, or holding an invalid value -> that kind is ignored and named in a refusal message.
- Branching on with no usable kind -> refused.
- A plan that remembers no kind (plain plan mode, older plan) -> the single kind is used when there is exactly one; with several, a build that has to cut a branch is refused, naming the missing choice.
- A build that has to cut a branch from a kind named from the issue number, for a plan tied to no issue -> refused, naming the missing issue.
- Branching required and no branch remembered while the work sits on the kind's base -> that kind's branch is cut, as today.
- Branching required and the remembered branch equal to the kind's base -> refused, as today.

## Glossary

- work entry - one kind of run branch a project allows: where it is cut from, how it is named, and where its pull request goes. Not a release: releases belong to part 2.
- issue type - the organisation-level type of a GitHub issue (`Bug-Report`, `Task`), not a label and not an issue form template name.
- issue type mapping - the rule that an issue of a given type is worked on through a given work entry.
- suggested entry - the work entry the planner recommends first: the mapped one, or the only one.

## Acceptance criteria

1. Work entries with a base, a name and a target, and issue type mappings, are read from the configuration; the flat base and name, the old issue placeholder, an incomplete or invalid entry and a mapping to a missing entry are each refused with a readable message, and the configuration block every skill loads names only the branching mode.
2. The issue type is read with the rest of the issue, and the planner recommends the entry its mapping names; an issue whose type is missing or unmapped, while mappings exist, is refused with a message.
3. For a plan tied to no issue, the single entry is recommended, or none, and an entry named from the issue number is not offered; the planner asks which entry and which branch, and the plan remembers the entry beside the branch.
4. A first landing cuts a new branch from the base of the plan's entry.
5. Every landing and every resumption under branching on names the entry's target, and the build's final summary names the branch and that target as the pull request target.
6. A plan whose remembered branch already exists continues on it whatever the configuration is refused for; a refused configuration stops a landing only when it has to cut a branch.
7. Name patterns fill in the issue number, the run slug and the fix or feature type.
8. `viber/BRANCHING.md` and the Branching section of `usage.html` hold a complete example per strategy - trunk based development (off, and short-lived branches), GitHub Flow, GitLab Flow (environments, release branches), Release Flow and GitFlow - and `viber/README.md` and the `branching:` comment of the configuration template point to `BRANCHING.md`.

## Scope

### File map

- modify - viber/scripts/issue-facts.sh - adds the issue type line to the fetched block
- modify - tests/viber/issue-facts.test.ts - the type line cases, gh stub answering the type call
- modify - viber/scripts/config.sh - resolves and validates the `branching` group; `--branching` detail output; the plain block's branching lines
- modify - tests/viber/config.test.ts - branching resolution and error cases, the plain block's offsets
- modify - viber/scripts/run-branch.sh - entry selection, issue type lookup, name expansion, report, landing from an entry, target
- modify - viber/scripts/plan-path.sh - header contract of the report and the `target:` line, the `--branch` wiring
- modify - tests/viber/plan-path.test.ts - report and landing cases rewritten for work entries
- modify - viber/skills/planner/SKILL.md - the branch question reads entries and records `work:`
- modify - viber/skills/planner/templates/spec-full.md - frontmatter `work:` line
- modify - viber/skills/planner/templates/spec-lite.md - frontmatter `work:` line
- modify - viber/skills/implementor/SKILL.md - relays the `target:` line
- modify - viber/skills/setup/templates/viber.yml - the new `branching:` block and its comment
- modify - tests/viber/bootstrap.test.ts - assertions over the template's `branching:` block
- add - viber/BRANCHING.md - the schema, placeholders and one complete example per strategy
- modify - viber/README.md - short branching section linking to BRANCHING.md
- modify - viber/skills/setup/assets/usage.html - the Branching section, both languages

### Out of scope

- Part 2: pull request creation, push, `releases`, `version`, pull request `template` and `title`, `{version}`, `{issue-title}`, `{base}`, `{target}`, the diagram move and the `usage.html` header link.
- Cherry-picks and back-merges between branches.
- `intent`, `fixer` and `triage`: they keep reading issues as before and ignore the type.
- This repository's own `.claude/viber.yml`.
- `CLAUDE.md` nodes and `.claude/rules/`: the build's close owns them.

## Constraints

- Everything works on Windows (Git Bash) and macOS.
- The planner and the implementor learn about branching only from what the bundled scripts print; they never read the configuration themselves.
- The branch instructions of the planner and the implementor get no longer than they are today.
- The configuration block every skill loads does not grow.

## Tasks

<!-- TASK -->
### T1 - Print the issue type in the issue facts block
- TDD: required
- Covers: #2
- Uses: C2
- Depends-on: none
- Files: viber/scripts/issue-facts.sh, tests/viber/issue-facts.test.ts
- Delivers: the fetched block carries one `TYPE=` line after `LABELS=`, read through the gh REST call of C2; a failed type lookup leaves it empty without failing the fetch; the header contract names the line and the call.
- Verification: node --test tests/viber/issue-facts.test.ts -> every test passes, including a typed issue, an untyped issue, a failed type lookup and an enterprise host URL
- DoD: a typed issue prints `TYPE=<name>` right after `LABELS=`; an untyped issue prints `TYPE=`; a failing type call still exits 0 with `TYPE=`; a URL argument queries the owner and repository of that URL; a URL on a host other than `github.com` passes that host through `--hostname`; the header's stdout contract lists the line
<!-- /TASK -->

<!-- TASK -->
### T2 - Resolve work entries and mappings in the configuration
- TDD: required
- Covers: #1
- Uses: C1
- Depends-on: none
- Files: viber/scripts/config.sh, tests/viber/config.test.ts
- Delivers: `config.sh --branching` prints the mode, one line per valid work entry, one line per mapping and one `error:` line per configuration problem, in file order; the plain block is left exactly as today; the header contract documents the new output.
- Verification: node --test tests/viber/config.test.ts -> every test passes, including the legacy keys, `{issue}`, an incomplete entry, an invalid value and a mapping to a missing entry
- DoD: `--branching` prints valid entries and mappings in file order; each error case of C1 prints its line; a valid configuration made only of work entries and mappings prints no legacy `error:` line; an invalid entry and an entry using `{issue}` are absent from the entry lines; the plain block output is unchanged; the exit is 0 for every input
<!-- /TASK -->

<!-- TASK -->
### T3 - Report the work entries for a plan
- TDD: required
- Covers: #2, #3, #7
- Uses: C1, C2, C3
- Depends-on: T1, T2
- Files: viber/scripts/run-branch.sh, viber/scripts/plan-path.sh, tests/viber/plan-path.test.ts
- Delivers: `plan-path.sh --branch` prints the report of C3 from `config.sh --branching`, reading the issue type through the sibling `issue-facts.sh` only when mappings exist and the plan has an issue; names expand `{issue-number}`, `{slug}` and `{type}`; the landing is left reading the plain block as today; the header contract shows the new report.
- Verification: node --test tests/viber/plan-path.test.ts -> every test passes, including mapped, unmapped and untyped issues, a plan without an issue, a single entry and a legacy configuration
- DoD: a mapped type is suggested; an unmapped or missing type with mappings present prints an `error:` line; without mappings the type is never fetched; an entry needing an issue the plan lacks prints `new: -`; a single entry is suggested; configuration errors are relayed as `error:` lines; `mode: off` still prints that line alone; the report moves nothing; the existing landing cases still pass
<!-- /TASK -->

<!-- TASK -->
### T4 - Cut a new branch from the plan's work entry
- TDD: required
- Covers: #1, #4
- Uses: C1, C4
- Depends-on: T3
- Files: viber/scripts/run-branch.sh, viber/scripts/plan-path.sh, tests/viber/plan-path.test.ts, viber/scripts/config.sh, tests/viber/config.test.ts
- Delivers: a first landing that creates a branch takes base and name from the plan's `work:` entry, or the single entry when the plan records none, and applies the required-mode rules against that entry's base; the plain config block drops `branching.base` and `branching.name`; every existing landing case is rewritten onto work entries.
- Verification: node --test tests/viber/plan-path.test.ts tests/viber/config.test.ts -> every test passes, including creation from a non-default entry base, several entries with no `work:` key and an entry needing an issue the plan lacks
- DoD: a new branch is created from its entry base; several entries and no `work:` key exit 6 when a branch must be created; an entry named from `{issue-number}` with no plan issue exits 6 when a branch must be created; the required-mode base checks use the entry base; the plain block ends with `branching.mode:` and carries no `branching.base` or `branching.name`
<!-- /TASK -->

<!-- TASK -->
### T5 - Print the pull request target of the work entry
- TDD: required
- Covers: #5
- Uses: C1, C4
- Depends-on: T4
- Files: viber/scripts/run-branch.sh, viber/scripts/plan-path.sh, tests/viber/plan-path.test.ts
- Delivers: every `plan-path.sh` resolution that prints a `branch:` line - a first landing, a re-landing and the no-argument form - prints `target: <target>` right after it when the plan's entry resolves; the header contract shows the line.
- Verification: node --test tests/viber/plan-path.test.ts -> every test passes, including the target line on a first landing, on the no-argument form, its absence under off and its absence when no entry resolves
- DoD: `target:` follows `branch:` on a first landing; the no-argument form prints it for the resolved run; mode off prints neither line; a plan whose entry does not resolve prints no `target:` line
<!-- /TASK -->

<!-- TASK -->
### T6 - Resume a recorded branch whatever the configuration errors
- TDD: required
- Covers: #6
- Uses: C1, C4
- Depends-on: T5
- Files: viber/scripts/run-branch.sh, viber/scripts/plan-path.sh, tests/viber/plan-path.test.ts
- Delivers: a plan whose recorded `branch:` exists locally is switched to or kept even when `config.sh --branching` reports errors or the plan's entry does not resolve; a landing that has to create a branch under configuration errors exits 6 naming the first error, nothing moved.
- Verification: node --test tests/viber/plan-path.test.ts -> every test passes, including a resumed plan under a legacy configuration and creation refused under a configuration error
- DoD: an existing recorded branch lands under a legacy configuration; an existing recorded branch lands when its `work:` key names no entry; creation under a configuration error exits 6 with that error on stderr; HEAD, index and tree are unchanged after that exit
<!-- /TASK -->

<!-- TASK -->
### T7 - Ask the branch question from the work entries
- TDD: none
- Covers: #3
- Uses: C3, C4
- Depends-on: T3
- Files: viber/skills/planner/SKILL.md, viber/skills/planner/templates/spec-full.md, viber/skills/planner/templates/spec-lite.md
- Delivers: the planner stops on any report `error:` line; otherwise one `AskUserQuestion` carries two questions - which entry, only when more than one entry is usable (the suggested first, at most four, the rest reachable through the free-text answer), and create that entry's `new:` branch (naming its base behind its remote when `behind:` is above 0 and the tree dirty when `dirty: yes` would block the switch), stay on `current:` when it is not that entry's base, or, under allowed, no branch - and the planner writes `work:` and `branch:`; a draft round carries `work:` over with `branch:`; the review-round rule re-asks when the report's entries changed; both templates carry the `work:` frontmatter line.
- Verification: grep -n "suggested:" viber/skills/planner/SKILL.md && grep -n "suggested:" viber/scripts/run-branch.sh && grep -n "^work:" viber/skills/planner/templates/spec-full.md && grep -n "^work:" viber/skills/planner/templates/spec-lite.md && test "$(grep "plan-path.sh\" --branch" viber/skills/planner/SKILL.md | wc -w)" -le 151 -> every grep matches and the word test exits 0
- DoD: SKILL.md names `suggested:`, `entry:`, `new: -` and `error:` exactly as run-branch.sh prints them; no question offers more than four options; the entry question is skipped when one entry is usable; the planner writes `work:` beside `branch:`; an `error:` line stops the step with nothing recorded; both templates carry the `work:` line; the lines of SKILL.md naming `plan-path.sh" --branch` hold at most 151 words together, their count before this change
<!-- /TASK -->

<!-- TASK -->
### T8 - Name the entry target as the pull request target
- TDD: none
- Covers: #5
- Uses: C4
- Depends-on: T5
- Files: viber/skills/implementor/SKILL.md
- Delivers: the final summary line names the landed branch and the `target:` value as the pull request target, with no line when there is no `target:` line or the branch equals the target; the skill no longer reads `branching.base`.
- Verification: grep -n "target:" viber/skills/implementor/SKILL.md && grep -n "target:" viber/scripts/plan-path.sh && ! grep -n "branching.base" viber/skills/implementor/SKILL.md && test "$(grep "pull request target" viber/skills/implementor/SKILL.md | wc -w)" -le 43 -> both files match `target:`, SKILL.md holds no `branching.base` and the word test exits 0
- DoD: SKILL.md relays `target:` as printed by plan-path.sh; SKILL.md holds no `branching.base`; the paragraph naming the pull request target holds at most 43 words, the count of the one it replaces
<!-- /TASK -->

<!-- TASK -->
### T9 - Ship the work entry block in the configuration template
- TDD: none
- Covers: #8
- Uses: C1
- Depends-on: none
- Files: viber/skills/setup/templates/viber.yml, tests/viber/bootstrap.test.ts
- Delivers: the template's `branching:` group is `mode: off` plus one work entry (`main` to `main`, `'{type}/{slug}'`) and a commented `issue-type-mappings` example indented inside the group, so a whole-group append by the setup merge carries it; its comment points to `viber/BRANCHING.md` instead of listing strategies; the bootstrap assertions match the new block.
- Verification: node --test tests/viber/bootstrap.test.ts -> every test passes with the new block
- DoD: the template holds no flat `base:` or `name:` under `branching:`; its work entry carries base, name and target; the commented mapping example sits indented inside the group; its comment points to BRANCHING.md; the bootstrap tests assert the new block and pass
<!-- /TASK -->

<!-- TASK -->
### T10 - Document the branching schema and a configuration per strategy
- TDD: none
- Covers: #8
- Uses: C1, C3, C4
- Depends-on: T3
- Files: viber/BRANCHING.md, viber/README.md, viber/skills/setup/assets/usage.html
- Delivers: BRANCHING.md describes modes, work entries, mappings, placeholders (a name with `{issue-number}` needs `issues: true`), the refusal messages and a complete `viber.yml` block for trunk based development (off and short-lived branches), GitHub Flow, GitLab Flow with environment branches and with release branches, Release Flow and GitFlow, noting what part 2 adds for releases; the README keeps a short branching paragraph linking to it; the usage page Branching section is rewritten in English and Polish with the same examples.
- Verification: grep -c "issue-type-mappings" viber/BRANCHING.md viber/README.md viber/skills/setup/assets/usage.html viber/scripts/config.sh && grep -c "issue-number" viber/BRANCHING.md viber/scripts/run-branch.sh -> every file counts at least 1
- DoD: BRANCHING.md and the usage page each hold one complete example per listed strategy; every key it names is one config.sh resolves and every placeholder one run-branch.sh expands; BRANCHING.md states that `{issue-number}` needs `issues: true`; README links to BRANCHING.md; the usage page section is present in both languages; no document mentions `branching.base`, `branching.name` or `{issue}` as current
<!-- /TASK -->

## Contracts

### C1 - config.sh branching output

File: viber/scripts/config.sh

Plain call (no argument): the block as today; from T4 on, its last line is `branching.mode: off|allowed|required` and the `branching.base` and `branching.name` lines are gone.

Configuration shape read:

```yaml
branching:
  mode: required
  work:
    <entry key>:
      base: <branch>
      name: '<pattern>'
      target: <branch>
  issue-type-mappings:
    <issue type>: <entry key>
```

`config.sh --branching`, exit 0 always, lines in this order:

```
mode: off|allowed|required
entry: <key> | base: <branch> | name: <pattern> | target: <branch>
map: <issue type> | <entry key>
error: <reason>
```

`entry:` once per valid child of `branching.work`, file order. `map:` once per child of `branching.issue-type-mappings` naming an existing entry, file order. `error:` zero or more:

- `branching.base and branching.name are no longer read - move them into a branching.work entry` (only for a `base:` or `name:` that is a direct child of `branching:`, never a field of a `work` entry)
- `work entry <key>: {issue} is now {issue-number}` (the entry is dropped)
- `work entry <key>: missing <base|name|target>` (the entry is dropped)
- `work entry <key>: invalid <field>: <value>` (the entry is dropped)
- `issue-type-mappings: <type> names no work entry: <key>` (the mapping is dropped)
- `no valid branching.work entry` (mode other than off only)

Validation: entry key `[A-Za-z0-9._-]+`; base and target `[A-Za-z0-9._/-]+`, not starting with `-` or `/`, no `..`; name with one surrounding quote pair stripped, `[A-Za-z0-9._/{}-]+`; a mapping type has one surrounding quote pair stripped and is kept verbatim.

### C2 - issue-facts.sh type line

File: viber/scripts/issue-facts.sh

One line after `LABELS=`: `TYPE=<issue type name>`, empty when the issue has none or the lookup failed. Read by `gh api repos/<owner>/<repo>/issues/<n> --jq '.type.name // ""'`, owner and repository taken from a URL argument, plus `--hostname <host>` when that URL's host is not `github.com`; `{owner}/{repo}` (resolved by gh from the cwd repository) for a bare number. Every other line and the exit codes are unchanged.

### C3 - plan-path.sh --branch report

File: viber/scripts/run-branch.sh, viber/scripts/plan-path.sh

Mode off or outside a repository: `mode: off` alone. Otherwise:

```
mode: allowed|required
issue-type: <type>|none
suggested: <entry key>|none
entry: <key> | base: <branch> | target: <branch> | new: <name>|- | new-exists: yes|no | behind: <n>|unknown
current: <branch>|detached
dirty: yes|no
error: <reason>
```

`issue-type: none` when mappings are empty, the plan has no `issue:` or the type is empty. `suggested:` is the mapped entry, else the only entry, else `none`. `new: -` when the name needs `{issue-number}` and the plan has no issue; `new-exists` is then `no`. `error:` relays every C1 error, plus `issue type <type> is not in branching.issue-type-mappings` and `issue <n> has no issue type` when mappings exist.

### C4 - work frontmatter key and target line

File: viber/skills/planner/templates/spec-full.md, viber/skills/planner/templates/spec-lite.md, viber/scripts/plan-path.sh

Plan frontmatter: `work: <entry key>` beside `branch:`, dropped under branching off. `plan-path.sh` stdout, every form that prints `branch:`: `target: <branch>` on the next line when the plan's `work:` entry, or the single entry when the plan has none, resolves. Exit 6 reasons added: `the plan records no branching.work entry and several exist`, `work entry <key> needs an issue for {issue-number}`, and the first C1 error when a branch must be created.
