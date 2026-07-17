# supergh — the GitHub / git ecosystem

> Dev-time orientation for **editing this plugin's source**. Like the repo root `CLAUDE.md`, it is **not a
> plugin input** — it never reaches the skills as runtime data. See the root `CLAUDE.md` for the repo-wide
> warnings and cross-plugin invariants; this file holds only what is specific to `supergh`.

`supergh` is the GitHub / git ecosystem: the `gh` CLI/REST/GraphQL reference, a fully-specified operation
executor, Conventional-Commits commits, and template-driven issue / PR creation. It is a **single-domain**
plugin, so its skills carry **no group prefix** (the plugin name is the group) and are flat-named. It ships
**no `hooks/` and no injected manifest** — unlike `superdev` / `superui`, its skills route purely via their CSO
`description:` (the always-on guardrail formerly carried by a manifest now lives in each skill's "Do NOT call
gh… directly" description clause). A `SessionStart`-injected dispatcher would add no routing value over the
skill descriptions, so there is none. The **per-skill** catalog of record is `.claude-plugin/plugin.json`
`skills[]`.

## Layout (supergh internals)

```
supergh/
  .claude-plugin/plugin.json   The plugin manifest — skills[] is the catalog of record
  shared/            Plugin-level shared scripts:
                     scripts/preflight.sh — `!`-injected read-only auth+git fact block (replacing the old
                     per-skill 2–5 gh/git probes; shared by create-issue / create-pr / cli-executor);
                     scripts/body-path.sh — deterministic timestamp+slugify body-path builder (ends the
                     slugify-prose duplication between create-issue and create-pr; called in their Step 8)
  skills/            Flat-named skills (cli, cli-executor, commit, create-issue, create-pr).
                     The commit skill (haiku fork) bundles scripts/{commit.sh (self-verifying stage+commit+verify),
                     commit-context.sh (injects recent-style + status/diff scoped to the selector),
                     commit-selfcheck.sh (HEAD-moved check), commit-args.sh (sourced selector helper)} +
                     references/commit-conventions.md (the Conventional-Commits subject/footer rules, injected
                     into the fork). This machinery is skill-local — no longer shared — since agent-committer is gone.
                     create-issue bundles scripts/create.sh (gh issue create + URL parse + tolerant type-PATCH
                     in one self-verifying call). create-pr bundles scripts/{check-base.sh (base-exists +
                     open-PR probe), pr-facts.sh (issue title + first subject + closes-refs + changed files +
                     raw commits in one block), create.sh (gh pr create with --draft/--body-file hardcoded +
                     URL parse)}.
```

## Skills (qualified `supergh:<name>`)

- `cli` — GitHub CLI **reference** (which layer — `gh` subcommand / `gh api` REST / `gh api graphql` — a given
  operation needs); reference-only, never executes.
- `cli-executor` — **fork** (reachable from the main session and from consumer skills) that runs ONE
  fully-specified gh/REST/GraphQL operation out of context and returns a single tagged line; guards every
  GraphQL mutation against the silent-200 error case.
- `commit` — a **haiku fork** (CSO-routed, runs out of the main context) that owns the whole commit
  end-to-end by selector (`all` / `staged` / a path): `commit-context.sh` injects the recent-commit style +
  `git status`/diff scoped to that selector, the fork authors the Conventional-Commits message (rules injected
  from its `references/commit-conventions.md`), then `commit.sh` does the staging+commit+verify (never an LLM
  `git commit`) and `commit-selfcheck.sh` confirms HEAD moved. `commit.sh` proves HEAD advanced before the fork
  reports its `<sha> | <message>` line, closing the verify-before-claim gap — the fork does the commit AND the
  check itself, so there is no LLM relay hop to distrust and no separate git-truth backstop is needed.
- `create-issue` / `create-pr` — interactive, template-driven creators (`gh issue create` / `gh pr create
  --draft`); every `gh`/`git` call runs through bundled per-skill `scripts/` (plus the shared `preflight.sh` /
  `body-path.sh`); out-of-scope API follow-ups (e.g. draft→ready) go to `cli-executor`.

`commit` and `cli-executor` are both forks reachable from the main session (CSO-routed), not fork-only
sub-workers — supergh no longer has a fork-only skill (the former `agent-committer` was folded into `commit`).

## Architecture invariants (supergh-specific)

- **No manifest, no hooks.** supergh deliberately dropped its manifest; its skills stay model-routable via CSO
  `description:`, with the 1%-rule guardrail folded into each skill's "Do NOT … directly" description clause.
- **Script vs. fork (the `commit` case).** The one haiku `commit` fork runs `commit.sh` (which cannot fabricate
  a landed commit — it proves HEAD moved) and then `commit-selfcheck.sh` (re-derives `VERIFIED`/`FAILED` from
  HEAD before/after), reporting a single `<sha> | <message> (<verification>)` line. The verify-before-claim
  guarantee lives in those scripts; the fork's returned line is trusted by its caller — a fabricating fork is
  not separately backstopped (the former main-context `verify-landed.sh` was dropped when `agent-committer` was
  folded in, the same "not yet hardened" caveat as the superdev pipeline's per-task commit twin).

## Soft cross-plugin chains

`superdev:superspec → supergh:create-issue` and `superdev:superbuild-reviewer → supergh:create-pr` are CSO-only
compositions that engage only when both plugins are installed. `supergh` declares no dependencies.
