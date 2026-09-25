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
