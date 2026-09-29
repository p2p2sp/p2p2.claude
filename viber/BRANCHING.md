# Branching

A project's `.claude/viber.yml` can describe more than one kind of run branch - each with its own
base, name pattern and pull request target - and let the type of the GitHub issue a run starts
from pick the right kind. One `branching:` schema is enough to express trunk based development,
GitHub Flow, GitLab Flow, Release Flow and GitFlow; every decision is made by `config.sh` and
`run-branch.sh`, so neither the planner nor the implementor carries stack-specific instructions.

Nothing is ever fetched, pushed, merged or deleted by any branching step: a branch is only
created, switched to and committed on.

## Modes

```yaml
branching:
  mode: off
```

- `off` - a run stays on the branch it started on, exactly as without this feature.
- `allowed` - the run may get its own branch: you pick the entry, or no branch, when the interview
  or diagnosis starts.
- `required` - a run always gets its own branch, and never commits onto the `base` of any work
  entry.

## When the branch is settled

Under `allowed` or `required`, `/viber:intent` and `/viber:fixer` settle the run's work entry
before they read any code:

- The entry is taken without a question when the issue type maps to one or exactly one entry is
  usable; otherwise you are asked which entry, `allowed` adding "no branch".
- HEAD is then checked against that entry's `base`: when HEAD is at another commit you are asked
  to switch to the base now, stay on the current branch, or abort, with how far the base is behind
  its remote. A base missing locally cannot be switched to, and uncommitted changes block the
  switch until you commit or stash them.
- Under `required`, staying is never offered on a detached HEAD or on any entry's base.
- `/viber:intent` continuing a draft asks no entry question and offers a switch to the draft's
  recorded branch when HEAD is elsewhere.

The chosen entry, and the branch you stayed on, travel with the interview summary or the diagnosis
to the planner, which records the branch from them instead of asking again. Under `required`,
landing a plan whose run branch is any entry's base is refused.

## Work entries

Each kind of branch a project wants is one child of `branching.work`, keyed by a short name you
choose:

```yaml
branching:
  mode: required
  work:
    <entry key>:
      base: <branch>
      name: '<pattern>'
      target: <branch>
```

- `base` - the branch the new one is cut from.
- `name` - its name pattern, quoted since it opens on `{`. See Placeholders below.
- `target` - the branch its pull request would land on.

An entry key matches `[A-Za-z0-9._-]+`; `base` and `target` match `[A-Za-z0-9._/-]+`, may not
start with `-` or `/`, and may not hold `..`.

## Issue type mappings

`branching.issue-type-mappings` picks a work entry by the type of the GitHub issue a run starts
from (needs `issues: true` to have a type to read at all):

```yaml
branching:
  issue-type-mappings:
    <issue type>: <entry key>
```

Each mapping names an existing entry; an issue type with no mapping falls back to the single
usable entry when there is exactly one, otherwise the run is asked which entry to use.

## Placeholders

A `name` pattern is filled in from the plan: `{type}` (`fix` or `feature`), `{slug}` and
`{issue-number}`. A pattern holding `{issue-number}` needs `issues: true` - without it, or without
an issue on the run, that entry has no usable branch name and is offered no differently for a
manual choice, never silently.

## Refusal messages

`config.sh --branching` reports every configuration mistake as a readable `error:` line instead of
failing the whole load; a rejected work entry or mapping is dropped, everything else still
resolves:

- `branching.base and branching.name are no longer read - move them into a branching.work entry` -
  the old flat `base:`/`name:` pair directly under `branching:`, from before this schema.
- `work entry <key>: {issue} is now {issue-number}` - the old placeholder in a `name` pattern.
- `work entry <key>: missing <base|name|target>` - one of the three fields is absent.
- `work entry <key>: invalid <field>: <value>` - a field fails its own validation.
- `issue-type-mappings: <type> names no work entry: <key>` - the mapping is dropped, the entry it
  names does not exist.
- `no valid branching.work entry` - mode is `allowed` or `required` and no entry survived.

## One example per strategy

### Trunk based development, branching off

```yaml
branching:
  mode: off
```

Every run keeps committing on whichever branch you already checked out; nothing here decides that.

### Trunk based development, short-lived branches

```yaml
branching:
  mode: allowed
  work:
    main:
      base: main
      name: '{type}/{slug}'
      target: main
```

One entry, cut from and landing back on `main`; `allowed` means you still confirm the branch each
run rather than always getting one.

### GitHub Flow

```yaml
branching:
  mode: required
  work:
    main:
      base: main
      name: '{type}/{issue-number}-{slug}'
      target: main
  issue-type-mappings:
    bug: main
    feature: main
```

Every change gets its own branch off `main`, named after the issue it closes, and lands back on
`main` through a pull request.

### GitLab Flow, environment branches

```yaml
branching:
  mode: required
  work:
    feature:
      base: main
      name: '{type}/{slug}'
      target: main
    hotfix:
      base: production
      name: 'hotfix/{slug}'
      target: production
  issue-type-mappings:
    bug: hotfix
    feature: feature
```

Feature work is cut from and lands back on `main`; a production issue is cut straight from the
long-lived `production` branch instead. Promoting `main` through the environment branches
themselves is not a run branch and stays outside this schema.

### GitLab Flow, release branches

```yaml
branching:
  mode: required
  work:
    feature:
      base: main
      name: '{type}/{slug}'
      target: main
  issue-type-mappings:
    bug: feature
    feature: feature
```

Feature and fix work is cut from and lands back on `main` the same way. A release branch is named
`release/<version>` with the full semver number, such as `release/1.4.0`; cutting it, and
back-merging a fix into it, is part 2.

### Release Flow

```yaml
branching:
  mode: required
  work:
    feature:
      base: main
      name: '{type}/{issue-number}-{slug}'
      target: main
  issue-type-mappings:
    bug: feature
    feature: feature
```

Every change is cut from and lands back on `main`, named after its issue; cutting a release branch
per release and cherry-picking a fix onto it is part 2.

### GitFlow

```yaml
branching:
  mode: required
  work:
    feature:
      base: develop
      name: 'feature/{slug}'
      target: develop
    hotfix:
      base: main
      name: 'hotfix/{slug}'
      target: main
  issue-type-mappings:
    feature: feature
    bug: hotfix
```

Feature work is cut from and lands back on `develop`; a production issue is cut from `main`
instead. Release branches, their version numbers and back-merging a hotfix into `develop` are part
2.

## What part 2 adds for releases

This schema covers the branch a run lands on. A later part adds `releases:` and `version:`
configuration, pull request creation and push, the pull request `template` and `title`, the
`{version}` and `{issue-title}` placeholders used in one, `{base}` and `{target}` used in the
other, and cutting or back-merging a release branch itself. None of that exists yet: every example
above is the full, current configuration for its strategy.
