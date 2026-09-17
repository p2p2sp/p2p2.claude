# supergh

## Purpose

The GitHub/git plugin: the `gh` CLI/REST/GraphQL reference, a fully-specified operation
executor, Conventional-Commits commits, and template-driven issue/PR creation. Single-domain, so
skills carry no group prefix (the plugin name is the group) and are flat-named. Ships NO hooks
and NO manifest - skills route purely via CSO `description:` (the always-on "do NOT call gh
directly" guardrail lives in each consumer skill's own description clause instead).

## Entry points (qualified `supergh:<name>`)

- `cli` - GitHub CLI reference (which layer - subcommand / `gh api` REST / `gh api graphql` - an
  operation needs). Reference-only, never executes.
- `cli-executor` - fork-only sub-worker (dispatched via the `Skill` tool by a consumer skill,
  never invoked directly): runs ONE fully-specified gh/REST/GraphQL operation out of context,
  returns a single tagged line, guards every GraphQL mutation against the silent-200 error case.
- `commit` - a haiku fork (CSO-routed) owning the whole commit end-to-end by selector
  (`all`/`staged`/a path). Bundles `scripts/commit-context.sh` (recent-style + scoped
  status/diff), authors the Conventional-Commits message from bundled
  `references/commit-conventions.md`, then `scripts/commit.sh` does the staging+commit+verify
  (never an LLM `git commit`) and `scripts/commit-selfcheck.sh` confirms HEAD moved before the
  fork reports its `<sha> | <message>` line.
- `create-issue` / `create-pr` - interactive, template-driven creators (`gh issue create` /
  `gh pr create --draft`); every gh/git call runs through bundled `scripts/` plus the shared
  `shared/scripts/preflight.sh` (`!`-injected read-only auth+git facts) and
  `shared/scripts/body-path.sh` (timestamp+slugify body-path builder). Out-of-scope API
  follow-ups (e.g. draft->ready) go to `cli-executor`.

## Contracts & invariants

- Keeps shared scripts under `supergh/shared/scripts/` - this plugin's own convention, differs
  from superdev's plugin-root layout.
- No manifest, no hooks - deliberately dropped; the 1%-rule guardrail folds into each skill's
  own "do NOT ... directly" description clause instead.
- Script vs fork (the `commit` case): `commit.sh` proves HEAD moved and cannot fabricate a
  landed commit; `commit-selfcheck.sh` re-derives VERIFIED/FAILED from HEAD before/after. The
  verify-before-claim guarantee lives in those scripts; the fork's returned line is trusted by
  its caller.
- Verify the current skill list from `supergh/.claude-plugin/plugin.json` `skills[]` before
  restating it.

## Anti-patterns

- The `cli` skill executing a gh command itself instead of staying reference-only.
- An LLM running `git commit` directly instead of going through `commit.sh`.

## Related context

- Root cross-plugin invariants: `../CLAUDE.md`
- Soft chains (CSO-only, engage only when both plugins installed):
  `superdev:superspec -> supergh:create-issue`, `superdev:superbuild-reviewer -> supergh:create-pr`.
  supergh declares no dependencies.
