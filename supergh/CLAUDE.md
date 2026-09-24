# supergh

## Purpose

The GitHub/git plugin: Conventional-Commits commits and template-driven issue/PR creation.
Every `gh` call a skill makes runs through its bundled `scripts/`; there is no general-purpose
`gh` reference or executor skill (both existed and were removed - never triggered in practice,
and the one piece of API knowledge that mattered, setting an issue type through REST, lives in
`create-issue/scripts/create.sh`). Single-domain, so
skills carry no group prefix (the plugin name is the group) and are flat-named. Ships NO hooks
and NO manifest - skills route purely via CSO `description:` (the always-on "do NOT call gh
directly" guardrail lives in each consumer skill's own description clause instead).

## Entry points (qualified `supergh:<name>`)

- `commit` - a haiku fork (CSO-routed) owning the whole commit end-to-end by selector
  (none or `all` = every change, or a list of paths). Bundles `scripts/commit-context.sh` (recent-style + scoped
  status/diff), authors the Conventional-Commits message from bundled
  `references/commit-conventions.md`, then `scripts/commit.sh` does the staging+commit+verify
  (never an LLM `git commit`) and `scripts/commit-selfcheck.sh` confirms HEAD moved before the
  fork reports its `<sha> | <message>` line.
- `create-issue` / `create-pr` - interactive, template-driven creators (`gh issue create` /
  `gh pr create --draft`); every gh/git call runs through bundled `scripts/` plus the shared
  `shared/scripts/preflight.sh` (`!`-injected read-only auth+git facts) and
  `shared/scripts/body-path.sh` (timestamp+slugify body-path builder). API follow-ups
  (e.g. draft->ready, resolving review threads) are out of scope - the user does them via
  `gh pr ready` or the UI.

## Contracts & invariants

- Keeps shared scripts under `supergh/shared/scripts/` - this plugin's own convention, not a
  plugin-root `scripts/` layout.
- No manifest, no hooks - deliberately dropped; the 1%-rule guardrail folds into each skill's
  own "do NOT ... directly" description clause instead.
- Script vs fork (the `commit` case): `commit.sh` proves HEAD moved and cannot fabricate a
  landed commit; `commit-selfcheck.sh` re-derives VERIFIED/FAILED from HEAD before/after. The
  verify-before-claim guarantee lives in those scripts; the fork's returned line is trusted by
  its caller.
- Verify the current skill list from `supergh/.claude-plugin/plugin.json` `skills[]` before
  restating it.

## Anti-patterns

- An LLM running `git commit` directly instead of going through `commit.sh`.
- Reintroducing a general-purpose `gh` reference or executor skill: consumer skills embed the
  API knowledge they need in their own `scripts/`.

## Related context

- Root cross-plugin invariants: `../CLAUDE.md`
- supergh declares no dependencies.
