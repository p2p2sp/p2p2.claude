# P2P2 Claude Code plugins (one per subdir) + marketplace catalog

> **These are the plugins' SOURCE files, not the live plugins.** This repo is the source
> of the `superdev`, `superui`, `supergh`, and `superfix` plugins (the first three are *also installed* in this session). Editing files here (skills,
> manifests, hooks, the `plugin.json` of any plugin) does **NOT** change the behavior of the currently loaded
> plugins — the routing manifests and skill instructions active in this session were loaded at install/session
> start and stay frozen regardless of edits. Your changes take effect only after the **user publishes** them
> (commit + push to the marketplace source, then `/plugin update`). So: do not expect an edit to alter how skills
> route or behave in the current session, and do not "test" a change by trying to trigger the edited skill
> here — it will run the old, installed version.
>
> **Likewise, this repo's own `CLAUDE.md` and `.claude/rules/` are NOT plugin inputs.** They are dev-time
> orientation for editing the source (and conventions for working *in this repo*) — they never reach the
> skills, manifests, or hooks as runtime data. All four plugins are stack-agnostic and read host-project memory
> from the **consuming** repo's `CLAUDE.md` + `.claude/rules/` only when they run there, and every host has
> different ones. So when reasoning about how any skill / manifest / hook behaves, do NOT factor in this
> repo's `CLAUDE.md` or rules as though they shaped that behavior — they don't ship, they don't travel, and
> the plugins will execute against entirely different memory files elsewhere. Treat them strictly as guidance
> for working on the source, never as a runtime signal the plugins consume.

## What this repo is

**Four self-contained Claude Code plugins, each in its own subdirectory — `superdev/`, `superui/`, `supergh/`, and `superfix/`.** The
repo root carries a four-entry **marketplace catalog** (`.claude-plugin/marketplace.json`) that co-lists them
by subdir `source` (`"./superdev"`, `"./superui"`, `"./supergh"`, `"./superfix"`), so the repo is the catalog that ships all four.
Each plugin is independently installable; none declares another as a dependency. End-user help lives in
`README.md`; this file is orientation for the assistant.

- **superdev** — project memory, planning, and the agentic-development pipeline.
- **superui** — the design / frontend ecosystem (the framework-agnostic L1 system, target adaptation, web
  preview, the UI-edit guardian, a shareable-artifact publisher, and a user-only design-system audit — the
  `design-audit` orchestrator plus its two plugin agents `design-scout` (cheap haiku scorer) / `design-detective`
  (frontier opus investigator)).
- **supergh** — the GitHub / git ecosystem (the `gh` CLI/REST/GraphQL reference, a fully-specified operation
  executor, Conventional-Commits commits, and template-driven issue / PR creation). Ships **no hooks and no
  manifest** — its skills route purely via CSO `description:` (unlike `superfix`, supergh's skills are still
  model-routable, not user-only).
- **superfix** — prioritized multi-agent codebase investigation (one user-invoked skill, no hooks/manifest):
  the `code-auditor` skill sweeps a repo, scores Impact × Opportunity, and dispatches `scout` (cheap triage) /
  `detective` (deep) plugin agents.

They ship no application code — the artefacts are markdown (skills) + JSON (manifests) + the per-plugin hook
scripts under `<plugin>/hooks/scripts/` (only `superdev` / `superui` have hooks; `supergh` / `superfix` ship
none), plus a handful of deterministic helper scripts bundled under
individual skills' `scripts/` dirs (the `superui` preview scripts, the superdev pipeline commit scripts
`superbuild/scripts/commit-task.sh` + `superbuild/scripts/commit-adr.sh` + `superbuild/scripts/commit-docs.sh`, the fixed recipe harness
`superbuild-recipe/scripts/recipe.template.sh`, the `superbuild-decomposer` deterministic edges
`superbuild-decomposer/scripts/precheck.sh` (Step 0 idempotency, `!`-injected) + `copy_plan.sh` (Step 7.0 byte-exact plan copy + status reset) + `validate_tasks.py` (Step 8 structural validator) + `toposort.py` (Step 5 topological sort + cycle detection) + their sourced `slug-guard.sh` helper, each with a committed `*.test.sh` harness (`precheck.test.sh`, `copy_plan.test.sh`, `validate_tasks.test.sh`, `toposort.test.sh`) plus `skill_contract.test.sh` (grep-asserts the rewritten SKILL.md) and `scripts/fixtures/handtrace-{plan,expected,transcript}.md`, the `supergh` `commit` fork's own scripts
`commit/scripts/commit.sh` (self-verifying stage+commit+verify) + `commit-context.sh` (injects recent-style + status/diff scoped to the selector) + `commit-selfcheck.sh` (HEAD-moved check) + their sourced `commit-args.sh` selector helper, the `memory-rules` mode router `memory-rules/scripts/route.sh` + its discovery
scripts `memory-rules/scripts/scan_extensions.sh` (+ `detect_state.sh`, `scan_conventions.sh`), the one-time `setup/scripts/bootstrap.sh`,
and the `superfix` investigation scripts `code-auditor/scripts/collect_signals.sh` (deterministic signal sweep) + `rank.py` (the gate/rank step)).
Six helpers instead live at **plugin-level** `<plugin>/shared/scripts/` (one copy shared across a plugin's
skills): `superdev/shared/scripts/lib_find_excludes.sh` (sourced by the `memory-layers` / `memory-rules` scan scripts),
`superdev/shared/scripts/auditor-contract.sh` (router-style assembler `!`-injected by the four `superbuild-reviewer-{quality,architecture,testing,readiness}` final-review lenses;
takes the lens name and cat-concatenates `shared/references/_input.md` + `lens-<lens>.md` + `_output.md` — placeholder-free, so no `${CLAUDE_PLUGIN_ROOT}` survives into the fork),
`superdev/shared/scripts/persist-report.sh` (self-verifying write+parse of a pipeline runner report → its 3-line stdout, so a verdict is emitted only once the report file has landed; shared by the `runner` agent (runtime `Read` of the core) + the `superbuild-runner` skill (`!`-injected core); with `persist-report.test.sh`),
`superui/shared/scripts/check_python.sh` (the Python preflight, `!`-injected by each `superui` skill that runs a Python step),
and the two `supergh/shared/scripts/` helpers `preflight.sh` (`!`-injected read-only auth+git fact block, shared by
`create-issue` / `create-pr` / `cli-executor`) + `body-path.sh` (deterministic timestamp+slugify body-path builder
called by `create-issue` / `create-pr` in their Step 8). (The `commit` skill's own stage+commit+verify script now
lives skill-local at `commit/scripts/commit.sh` — no longer shared — since `agent-committer` is gone.)
**Editing markdown / JSON IS shipping** — there is no build / test /
lint at any level. Contracts between files are enforced by humans reading carefully.

All four plugins are **stack-agnostic on purpose**: skills read project-specific knowledge (test framework, build
tool, naming, how to launch the app) from the **host** project's `CLAUDE.md` + `.claude/rules/`, never from
the plugin sources. Do not bake ecosystem assumptions (dotnet, npm, pytest…) into skill prompts.

DO NOT USE ADR capture for this project. The plugins are constantly refactored.

## Why four plugins

Each plugin keeps its domain's skills together so a consumer can install just the development ecosystem
(`superdev`), just the design ecosystem (`superui`), just the GitHub ecosystem (`supergh`), or just the
codebase-investigation tool (`superfix`). Within a plugin, skills compose through CSO (frontmatter
`description:`) and — for the two manifest-bearing plugins (`superdev`, `superui`) — that plugin's single
injected manifest documents the in-plugin chains (e.g. `improver → memory-rules` in superdev); `supergh` and
`superfix` ship no manifest (superfix's sole skill is user-only; supergh routes purely via CSO descriptions —
see their sections below). Each is
**self-contained**: its `plugin.json` declares **no `dependencies`** — installing it gives that whole
ecosystem. Cross-plugin chains are **soft and optional**: superdev's `superspec → supergh:create-issue` and
`superbuild-reviewer → supergh:create-pr` are CSO compositions that fire only when `supergh` is also
installed; absent it they simply do not engage (no declared dependency, graceful degradation).

## Repository layout

```
.claude-plugin/
  marketplace.json   Marketplace catalog — co-lists superdev "./superdev", superui "./superui", supergh "./supergh", superfix "./superfix"
superdev/            The superdev plugin
  .claude-plugin/plugin.json   The plugin manifest — skills[] + agents[] are the catalog of record
  hooks/             One injected dispatcher manifest + the two hook scripts
    hooks.json       SessionStart (inject manifest) + PreToolUse: ExitPlanMode (plan-review gate)
    content/manifest.md  The injected `using-superdev` dispatcher
    scripts/         session-start.sh, review-plan.sh
  shared/            Plugin-level shared assets + scripts (rubric.md; rubric-core.md — the shared 4-section "How to …" review-rubric core, read by both rubric.md and superbuild/references/task-review.md; references/ — auditor-contract.sh fragments (_input.md, _output.md, lens-{architecture,code-quality,production-readiness,testing}.md) + run-and-report.md — the shared runner executor core read by the runner agent + superbuild-runner; coder-modes/ work-order files; scripts/lib_find_excludes.sh — sourced by the memory-layers / memory-rules scans; scripts/auditor-contract.sh — router-style body assembler `!`-injected by the four superbuild-reviewer-{quality,architecture,testing,readiness} lenses; scripts/persist-report.sh (+ persist-report.test.sh) — the self-verifying pipeline-report persister shared by the runner agent + superbuild-runner)
  skills/            Skills (bare-named by functional role; the implementation-pipeline forks share the `superbuild-*` family prefix); some skills bundle a
                     deterministic helper under their own scripts/ dir (superbuild/scripts/commit-task.sh
                     + commit-adr.sh + commit-docs.sh + task-pipeline.workflow.js, superbuild-recipe/scripts/recipe.template.sh
                     (+ recipe.template.test.sh), memory-rules/scripts/route.sh, setup/scripts/bootstrap.sh);
                     superbuild also bundles the 5 per-task pipeline plugin agents under its agents/ subdir
                     (coder.md, runner.md, task-reviewer.md, improver.md, commiter.md), plus a bundled
                     references/task-review.md (task-reviewer's own task-review variant — the 5 dimensions /
                     3-bucket severity / PASS-FAIL mapping only; the four shared "How to …" sections live once
                     in shared/rubric-core.md)
superui/             The superui plugin
  .claude-plugin/plugin.json   The plugin manifest — skills[] + agents[] are the catalog of record
  hooks/             One injected dispatcher manifest + SessionStart only (no plan gate)
    content/manifest.md  The injected `using-superui` dispatcher
  shared/            Plugin-level shared scripts (scripts/check_python.sh — the Python preflight)
  skills/            Flat-named skills (single-domain plugin); some bundle preview scripts. The user-only
                     design-audit orchestrator (disable-model-invocation; deliberately out of the manifest, like
                     superdev's setup / superfix's code-auditor) bundles its two plugin agents under
                     skills/design-audit/agents/ (design-scout.md + design-detective.md — superui's ONLY agents[],
                     the code-auditor-style orchestrator pattern) plus scripts/ (collect_signals.sh, rank.py,
                     route.sh, each with a *.test.sh) and references/ (rubric-{css,js-theme,flutter,agnostic}.md,
                     scoring.md, synthesis.md)
supergh/             The supergh plugin (NO hooks, NO manifest — skills route purely via CSO descriptions)
  .claude-plugin/plugin.json   The plugin manifest — skills[] is the catalog of record
  shared/            Plugin-level shared scripts (scripts/preflight.sh — `!`-injected auth+git fact block;
                     scripts/body-path.sh — deterministic timestamp+slugify body-path builder)
  skills/            Flat-named skills (cli, cli-executor, commit, create-issue, create-pr);
                     the commit skill (haiku fork) bundles scripts/{commit.sh (self-verifying stage+commit+verify),
                     commit-context.sh (injects recent-style + status/diff), commit-selfcheck.sh (HEAD-moved check),
                     commit-args.sh (sourced selector helper)} + references/commit-conventions.md (the Conventional-Commits subject/footer rules, injected into the fork)
superfix/            The superfix plugin (NO hooks, NO manifest — single user-only skill)
  .claude-plugin/plugin.json   The plugin manifest — skills[] + agents[] are the catalog of record
  skills/            One user-invoked skill code-auditor/ (disable-model-invocation); bundles
                     references/ (jobs.md, scoring.md, synthesis.md) + scripts/ (collect_signals.sh, rank.py)
  agents/            Two plugin agents: scout.md (cheap haiku triage) + detective.md (frontier opus deep-dive)
README.md            User-facing help (install + how it works)
.github/             CI: scripts/release.sh + workflows/ (auto-version.yml, release-version.yml)
.claude/rules/       Development-only conventions for this repo
```

Versioning is tag-driven and shared across all four plugins (one version namespace). CI keeps **all four**
`plugin.json` `version` fields (`superdev/`, `superui/`, `supergh/`, `superfix/`) in sync with the highest `MAJOR.MINOR.PATCH`
git tag (no `v` prefix, seed `0.1.0`): `.github/workflows/auto-version.yml` patch-bumps on every push to
`main`, and `.github/workflows/release-version.yml` is a manual `workflow_dispatch` that bumps a chosen
part (major/minor/patch). The shared `.github/scripts/release.sh` computes the next version from the tags,
writes it into all four manifests, commits the bump (`chore(bump): …`, no `[skip ci]`), pushes the commit + tag,
and then publishes a **GitHub Release** whose notes are built from the commits since the previous tag (grouped
by conventional type) with GitHub's auto-generated notes appended. The bump commit carries no `[skip ci]`
token; the loop is instead broken by an `auto-version.yml` job guard
(`if: !startsWith(github.event.head_commit.message, 'chore(bump)')`) — keep that `chore(bump)` prefix in sync
with the script. The tag is the source of truth; each `plugin.json.version` is derived. Because each
`plugin.json` carries a `version`, `/plugin update` ships a new version on each bump.

## superdev skill taxonomy (functional roles, not name prefixes)

The roles below are **superdev's** — its skills are bare-named (the `dev-`/`mem-`/`doc-` group prefixes are
gone), except the implementation-pipeline forks which share the `superbuild-*` family prefix (see the naming sub-convention below); the functional roles below are how they group. `superui`'s
flat-named skills (single-domain plugin; `cc-artifact` is the distinct Claude-Code-platform publisher) live in
that plugin and are documented in its own `<plugin>/hooks/content/manifest.md` + `README.md`; `supergh`'s
flat-named skills (see the **supergh plugin** section below) ship **no manifest** — they self-document via their
own `description:` + `README.md`. For each plugin, the **per-skill** catalog of record is its own
`<plugin>/.claude-plugin/plugin.json` `skills[]`; for the manifest-bearing plugins (`superdev`, `superui`) the
injected manifest (`<plugin>/hooks/content/manifest.md`) documents that plugin's groups/roles + cross-skill
chains, not individual skills.

**Naming sub-convention (`superbuild-*` family).** The implementation-pipeline fork skills share a hierarchical
`superbuild-*` prefix that mirrors the call tree: `superbuild` (the dispatcher) invokes `superbuild-recipe`,
`superbuild-adr`, `superbuild-docs`, `superbuild-decomposer`, `superbuild-runner`, and `superbuild-reviewer`;
`superbuild-reviewer` in turn fans out to `superbuild-reviewer-plan`, `superbuild-reviewer-quality`,
`superbuild-reviewer-architecture`, `superbuild-reviewer-testing`, `superbuild-reviewer-readiness`. They are
forked, fork-only **skill** workers — invoked **only by a superordinate skill via the `Skill` tool** (never the
user, never auto-routed) — and stay **skills** (not `agents/<name>.md` definitions). The name no longer carries
that signal (the former `agent-` marker is gone); fork-only nature lives entirely in frontmatter (`context: fork`
+ `user-invocable: false` + a one-line "pipeline-bound; invoked only by …" guard `description`). The five
per-task pipeline workers are NOT `superbuild-`-prefixed: `coder`, `runner`, `task-reviewer`, `improver`,
`commiter` are real **plugin agents** (`superdev/skills/superbuild/agents/*.md`, listed in `plugin.json`
`agents[]`, dispatched by the `task-pipeline.workflow.js` via `agentType:'superdev:<name>'`) — bare-named
precisely because they are genuine agents, not fork-skills. (`commiter` is a thin haiku wrapper — it only runs
`commit-task.sh` and relays its tag; `runner` is a haiku executor that runs the task gate directly (reads the
shared run-and-report core, runs the recipe verbs, persists via `persist-report.sh`) — no longer nesting a
`superbuild-runner` fork — but each is still a workflow-dispatched plugin agent, so they stay
bare-named like the other three.) Every user-facing / auto-routed superdev skill is bare-named, as is the
planning fork `superplan-reviewer` and the self-mode code-review fork `self-reviewer`.

- **Entry & environment** — two top-level skills:
  - `superdev`: the always-on **entry skill** (the renamed former `dev-interview`), named after the plugin
    itself because it is the heart of the ecosystem — every session's creative work starts here. It interviews
    the user to map the design tree before any plan/code, then hands off silently to `superplan`. It is
    model-invocable and is the skill the manifest's decision flow forces first (step 1), unlike `setup`.
  - `setup`: one-time, user-only environment bootstrap (`/setup`). Seeds `.temp/` + `.superdev/`,
  copies the bundled `.gitignore` / `.claude/settings.json` templates, **seeds `.claude/rules/_superdev.md`
  from a bundled asset** (a frozen, `_`-prefixed pointer rule reminding the agent of the `<superdev:manifest>`
  mandatory rules — this is how the plugin gets any standing memory into `.claude/rules/`, since a plugin
  cannot ship that directory at install time), and **seeds `.superdev/config.yml` from a
  bundled asset** (`setup/scripts/bootstrap.sh` copies `assets/config.yml`, all switches seeded `false`, never
  overwriting an existing one), then **interactively asks the 3 opt-in switches** and `Edit`s the freshly-seeded
  file to flip the selected ones on. Runs in the **main session** (not a fork) so it can prompt via
  `AskUserQuestion`. It is `disable-model-invocation` (Claude never auto-routes to it) so it is **deliberately
  absent from the manifest** — see the Self-documentation invariant.
- **Project memory (agent-facing)** (2 skills): `memory-layers` (CLAUDE.md cascade), `memory-rules`
  (`.claude/rules/` layer).

  **Memory layer division.** Agent-facing project knowledge splits current truth across five non-overlapping
  layers, picked by *kind of truth* — all five face the **agent**: (1) the general-rules
  manifest (superdev's `hooks/content/manifest.md`, force-injected per session);
  (2) the `CLAUDE.md` cascade (terse agent orientation; `memory-layers`); (3) `.claude/rules/*` (path-scoped
  conventions; `memory-rules`, which has **4 modes** — A uninitialized bootstrap, B initialized gap-fill, C
  improver-driven authoring (fork), D user-driven authoring (main context; user dictates a rule to append); in-pipeline
  the `improver` agent judges value, `memory-rules` (Mode C) authors);
  (4) `.superdev/adr/` (architectural *why*; written in-pipeline by `superbuild-adr`);
  (5) `.superdev/docs/` (as-built behavioural **what** — what the app does today: an `index.md` slice map plus
  per-slice shards of capabilities / acceptance criteria / contracts / code+test anchors; written in-pipeline by
  `superbuild-docs` as the **last** pipeline step, config-gated `docs`). In the dev
  pipeline, `superbuild-adr` records any architectural decision into layer 4 before decompose
  (config-gated `adr`), the `improver` agent promotes each task's review learnings into layer 3
  (`.claude/rules/`) — judging which learnings are worth keeping and delegating the authoring to `memory-rules`
  Mode C, the in-pipeline writer into `.claude/rules/` — a config-gated step (`rules_improver`), and after the
  final review `superbuild-docs` reconciles layer 5 incrementally against the cumulative `plan.diff`
  (config-gated `docs`).
  The product's **end-user** help documentation is a distinct, non-agent layer owned by the end-user
  documentation role below (NOT agent memory) — same **what** as layer 5 but faced at the end user, not the agent.
- **End-user documentation** (1 skill): `help-writer` (the end-user product-help layer → `.superdev/help/`).
  Authors the human-facing help that ships to the people who use the built app — distinct
  from the agent-facing memory layers above; faces the end user, not Claude.
- **Agentic-development pipeline + diagnostics/specs** (19 skills + 5 plugin agents): planning
  (`superplan`, `superplan-reviewer` — a read-only fork that reviews the plan against the spec and
  superplan's required components/boundaries across six dimensions (spec coverage, decomposer-readiness, codebase
  fit, verifiability/risk, boundary discipline, and a conditional security dimension engaged only when the plan
  touches sensitive surfaces), then returns a `Verdict: PASS | FAIL` plus an ordered fix list to the main
  session; it never edits the plan or calls `ExitPlanMode`; a self-mode plan (§0 `Implementation: self`) carries
  a closing instruction to run the sibling read-only fork `self-reviewer` before committing the plan's changes —
  scope is code-vs-plan only (touch list, decisions, test-strategy mapping, risks, migration; NOT spec fidelity,
  already judged pre-approval), reading `git status`/`git diff HEAD` against an assumed-clean starting tree and
  returning a two-way `Verdict: PASS | FAIL` plus a findings/fix list; this is a Layer-A soft gate only (no
  `PreToolUse` hook backstops it, unlike the `ExitPlanMode` plan gate); the interview entry point now lives in
  the no-prefix `superdev` skill above), the orchestrated implementation pipeline
  (`superbuild` → **mandatory first step** `superbuild-recipe` (derives the host toolchain once →
  `recipe.sh` + `profile.md`; owns the clean-tree guard; FAIL = hard halt) → `superbuild-adr` →
  `superbuild-decomposer` → per task **one `Workflow`** call to `task-pipeline.workflow.js` driving `coder` →
  `runner` → `task-reviewer` → `improver` → commit (the `commiter` agent runs
  `commit-task.sh` as the workflow's final stage, only on PASS) → `superbuild-reviewer` → `superbuild-docs`), the final-gate
  lenses `superbuild-reviewer` fans out in parallel via the Skill tool (`superbuild-reviewer-plan` Plan-alignment +
  the four code-quality lenses `superbuild-reviewer-quality` / `superbuild-reviewer-architecture` /
  `superbuild-reviewer-testing` / `superbuild-reviewer-readiness` + `superbuild-runner` Scope: full; the reviewer
  synthesizes one go/no-go verdict and writes `.superdev/.workflows/<slug>/final-review.md`, the superbuild first
  materializing the cumulative `plan.diff` patch the no-Bash quality lenses read); the **last** pipeline step
  `superbuild-docs` then reconciles the as-built docs layer (`.superdev/docs/` index + shards) incrementally
  against that same `plan.diff` and is committed by `commit-docs.sh` (config-gated `docs`, runs on any final
  verdict since the work is already committed, a mirror of the ADR step). Plus `tdd` / `debug` /
  `superspec` (with its `REVIEW: PASS`-gated quality fork `superspec-reviewer`, the spec-side mirror of
  `superplan-reviewer`: a read-only fork that checks the saved spec against the superspec hard rules and returns
  `REVIEW: PASS | FAIL`, never editing the spec or handing off). The four quality lenses share `shared/rubric-code-review.md` (the dimension-agnostic scope /
  false-positive / 3-bucket-severity rules, mirroring `superbuild/references/task-review.md` at whole-plan
  scope); each lens's per-dimension criteria live in its own `shared/references/lens-*.md` fragment, injected by
  `shared/scripts/auditor-contract.sh`. Separately,
  `shared/rubric.md` (superbuild-reviewer-plan) and `superbuild/references/task-review.md` (task-reviewer) no
  longer duplicate their four stable "How to …" sections — those live once in `shared/rubric-core.md`, read
  alongside each variant; the two variants carry only their own severity buckets + PASS/FAIL(/BLOCKED) mapping.
  The five
  per-task workers `coder` / `runner` / `task-reviewer` / `improver` / `commiter` are **plugin agents**
  (`superdev/skills/superbuild/agents/*.md`), not skills — dispatched by the workflow via `agentType:'superdev:<name>'`.

## supergh plugin (GitHub / git — flat-named skills)

`supergh` is a single-domain plugin, so its skills carry **no group prefix** (the plugin name is the group).
It ships **no `hooks/` and no injected manifest** — unlike `superdev` / `superui`, its skills route purely via
their CSO `description:` (the always-on guardrail formerly carried by the manifest now lives in each skill's
"Do NOT call gh… directly" description clause). Two plugin-level helpers live under `shared/scripts/`:
`preflight.sh` (`!`-injected read-only auth+git fact block, replacing the old per-skill 2–5 `gh`/`git` probes)
and `body-path.sh` (deterministic timestamp+slugify body-path builder, ending the slugify-prose duplication
between `create-issue` and `create-pr`). The `commit` skill's commit machinery (its `commit.sh` +
`commit-context.sh` + `commit-selfcheck.sh` + `commit-args.sh` scripts and its `commit-conventions.md`
reference) is now skill-local under `skills/commit/`, not shared. Five skills, qualified as `supergh:<name>`:

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
  --draft`); each MAY delegate a fully-specified API call to `cli-executor`.

`commit` and `cli-executor` are both forks reachable from the main session (CSO-routed), not fork-only
sub-workers — supergh no longer has a fork-only skill (the former `agent-committer` was folded into `commit`).
Soft cross-plugin chains into superdev: `superdev:superspec → supergh:create-issue`,
`superdev:superbuild-reviewer → supergh:create-pr` (CSO only, engage only when both plugins installed).

## superfix plugin (codebase investigation — no hooks, no manifest)

`superfix` is the only plugin with **no `hooks/` and no injected manifest**. Its single skill `code-auditor`
is `disable-model-invocation: true` (user-only, invoked solely via `/superfix:code-auditor`), so there is
nothing to auto-route — a dispatcher manifest would be dead weight, and the manifest is what the `SessionStart`
hook injects, so dropping the manifest drops the hook too. This is the plugin-scale analogue of superdev's
`setup`: a user-only command that is deliberately outside any routing manifest (see the Self-documentation
invariant exception). Components, qualified `superfix:<name>`:

- `code-auditor` (skill, main context, user-only) — prioritized multi-agent codebase investigation on the
  `score = Impact × Opportunity` law: a deterministic sweep (`scripts/collect_signals.sh`) → cheap `scout`
  scoring fan-out → deterministic gate/rank (`scripts/rank.py`) → frontier `detective` dispatch into the
  hotspots only → verified, severity-ranked synthesis. State lives under a `.temp/code-reviewer/<run-id>/`
  workspace, not the main context. Bundles `references/{jobs,scoring,synthesis}.md`.
- `scout` / `detective` — the two **plugin agents** (`superfix/agents/*.md`, listed in `plugin.json`
  `agents[]`, dispatched via the Task tool with `subagent_type: superfix:<name>`). `scout` is cheap-tier
  breadth-first triage (spawn many); `detective` is frontier-tier depth-first investigation (spawn few).
  Bare-named because they are genuine agents, not fork-skills.

`superfix` declares no cross-plugin chains.

## Architecture invariants

- **One injected manifest (per manifest-bearing plugin).** A single `SessionStart` hook force-injects
  `hooks/content/manifest.md` (the `using-superdev` dispatcher) **verbatim** once per session; `source == "resume"`
  is excluded by the matcher; fail-open (an unreadable manifest = banner only, no `additionalContext`). The hook
  does no per-project rendering — the manifest is injected as-is, identically for every project. This holds for
  `superdev` / `superui`; **`supergh` and `superfix` are the exceptions** — they ship no `hooks/` and no manifest
  at all. `superfix`'s sole skill is user-only (`disable-model-invocation`) with nothing to auto-route; `supergh`
  deliberately dropped its manifest (its skills stay model-routable via CSO `description:`, with the 1%-rule
  guardrail folded into each skill's "Do NOT … directly" description clause). A manifest-less plugin is valid
  whenever a `SessionStart`-injected dispatcher would add no routing value over the skill descriptions.
- **Opt-in switches (`.superdev/config.yml`).** Three booleans — `adr`, `rules_improver`, `docs` — all
  **default-disabled** (a missing file/key = `false`, fail-closed; a repo that never ran `/setup` skips these
  optional steps until it opts in), plus two integer retry keys — `retry_max_attempts`, `retry_escalation_attempts` — both
  **fail-open to `3`** (a missing file/key = `3`). `setup` writes the file (seeding it from a bundled asset —
  see below); `superbuild` reads the config: it skips the `superbuild-adr` / `improver` / `superbuild-docs` steps
  when their switch is off — each skip is **one terse line, never a paragraph** — and forwards the two retry
  integers as the `task-pipeline.workflow.js` cap: `retry_max_attempts` becomes the `retryMaxAttempts` arg on
  the first `Workflow` invocation, and `retry_escalation_attempts` becomes a fresh `retryMaxAttempts` cap on the
  escalation Retry re-invocation. A sixth, non-boolean key, `rule_extensions:` (a
  list of source-type globs), is written **once** by `memory-rules` — in Mode A/B it discovers and **appends**
  `rule_extensions:` when the key is absent (never overwriting an existing one), creating the file if missing —
  and is **read** by `memory-rules` (all modes) and by the `improver` agent (as a fail-open `paths:`-scoping
  hint). Config readers are `superbuild` (reads the booleans + the retry integers), `setup` (writer),
  `memory-rules` (reader + one-time `rule_extensions` writer), and the `improver` agent (reader); the
  `SessionStart` hook does not read config (the manifest is injected verbatim, the same for every project).
- **Plan gate.** Planning happens in plan mode — entering plan mode before drafting a plan is driven by the
  `superplan` skill instruction (Layer-A), not a deterministic hook. The plan's approval is gated by a
  single `PreToolUse` hook: `review-plan.sh` (matcher `ExitPlanMode`) denies the plan's approval until
  `superplan-reviewer` returns `Verdict: PASS`. The `superplan` skill invokes `superplan-reviewer`
  **proactively** before `ExitPlanMode` (Layer-A soft gate), so in the happy path the gate simply allows — the deny
  is a backstop for a skipped review, not the normal trigger. This ExitPlanMode hook is the **single** gate in every mode,
  and `superbuild` trusts it — it does **not** re-review the plan. (Residual: a `PreToolUse` deny is only
  best-effort in the permission-relaxed modes `bypassPermissions`/`dontAsk`/`auto`, so in those modes the gate
  itself is best-effort.) Keep all paths in sync.
- **No `"hooks"` field in `plugin.json`.** Claude Code auto-loads `hooks/hooks.json` from that path; adding a
  `hooks` field to `plugin.json` is a hard install error.
- **File-based dispatch.** The superbuild dispatches by passing **file paths** (task file + path params
  like feedback/retry, reports); agents receive content **injected via dynamic context `!`**, not via `Read`.
  Pipeline state lives under `.superdev/.workflows/<slug>/`; agents reply with a 3-line `STATUS / Report / Summary`
  stdout.
- **Recipe — mandatory first step (fail-closed) + sole clean-tree guard.** `superbuild` invokes
  `superbuild-recipe` as the FIRST step on **every** entry (before ADR); it derives the host
  build/test/lint/launch verbs once and materializes `.superdev/.workflows/<slug>/recipe.sh` + `profile.md`, the
  single artifact every downstream fork (`superbuild-runner`, the `runner` agent, `coder`, `task-reviewer`,
  `superbuild-decomposer`, `superbuild-reviewer-plan`) consumes instead of re-deriving the
  toolchain. It is **fail-closed**: a recipe `STATUS: FAIL` is a hard halt (like a decomposer fail), and the
  recipe agent's Step 0 (`git status --porcelain`) is now the **single** clean-tree guard for the whole run —
  the superbuild's former ADR-step and pre-task-loop `git status` guards are gone. `recipePath` is threaded
  into every per-task `Workflow` invocation so each fork sources its verbs from the one artifact; the recipe
  self-skips regeneration when its own `recipe.sh verify` passes.
- **Script vs. fork.** A pipeline step collapses to a deterministic bundled script (under the owning skill's
  `scripts/` dir) when it operates on a known, fixed tool / format — git, a basename, paths, globs (e.g.
  `superbuild/scripts/commit-task.sh` for the per-task commit, `commit-adr.sh` for the ADR commit). It stays an LLM fork when it must interpret heterogeneous, stack-specific tool
  output (e.g. `superbuild-runner` reading arbitrary build / test output). A self-verifying script carries its I/O
  contract in its header comment and is trusted by its caller — so the caller does NOT re-verify or retry the
  script's result (the verify-before-claim guarantee lives in the script, not a fork-era re-check guard).
  A script may still be *invoked through* a thin fork without losing this property: `commit-task.sh` is run by
  the haiku `commiter` agent (so the commit lives inside the per-task `Workflow`, not the superbuild), but
  the agent only relays the script's tag verbatim — the self-verification stays in the script, so its caller
  (the workflow, then the dispatcher reading `wf_out.commit`) still trusts the result without re-checking.
  **supergh `commit`.** This one haiku fork runs `commit.sh` (which cannot fabricate a landed commit — it
  proves HEAD moved) and then `commit-selfcheck.sh` (re-derives `VERIFIED`/`FAILED` from HEAD before/after),
  reporting a single `<sha> | <message> (<verification>)` line. The verify-before-claim guarantee lives in
  those scripts; the fork's returned line is trusted by its caller — a fabricating fork is not separately
  backstopped (the former main-context `verify-landed.sh` was dropped when `agent-committer` was folded in,
  the same "not yet hardened" caveat as the superdev pipeline's per-task commit twin).
- **Self-documentation.** Any skill add / remove / rename MUST update the **owning plugin's**
  `<plugin>/.claude-plugin/plugin.json` `skills[]` (superdev's for any of its skills, superui's
  for any of its skills, supergh's for a `cli`/`cli-executor`/`commit`/`create-issue`/`create-pr` skill,
  superfix's for the `code-auditor` skill);
  any **agent** add / remove / rename MUST likewise update that plugin's `agents[]`
  (superdev's `coder` / `runner` / `task-reviewer` / `improver` / `commiter`, superfix's `scout` / `detective`, and
  superui's `design-scout` / `design-detective` live there, not in `skills[]`) — and this file
  in either case. They must stay in sync, and a worker must never appear in both `skills[]` and `agents[]`.
  For the manifest-bearing plugins (`superdev`, `superui`), that plugin's injected manifest
  (`<plugin>/hooks/content/manifest.md`) lists its **groups/roles + chains**, not individual skills, so update it
  only when a change adds/removes a group, shifts a group's scope, or alters a documented chain or config-gated
  area — not for every per-skill change. `supergh` / `superfix` have no manifest, so nothing of the sort to sync.
  **Exception:** a user-only one-time command (`disable-model-invocation: true`, e.g. `setup`) does not
  participate in routing and stays out of the manifest entirely — do not "fix" that gap.

## Where contracts live

This file is orientation only. The authoritative contract of each skill is its own body (`# Input contract` /
`# Output format`); hook contracts live in `hooks/hooks.json` and the header comments of `hooks/scripts/*.sh`.

## When editing

- **Catalog / install layer** (`.claude-plugin/marketplace.json`, root `README.md`): keep changes minimal and
  structural. The marketplace co-lists exactly four plugins by subdir `source` (`"./superdev"`, `"./superui"`,
  `"./supergh"`, `"./superfix"`); renaming a plugin must update the marketplace manifest, that plugin's
  `<plugin>/.claude-plugin/plugin.json`, and the root `README.md`.
- **Plugin internals** (`<plugin>/.claude-plugin/plugin.json`, `<plugin>/hooks/`, `<plugin>/skills/`): obey the
  architecture invariants above. Paths in each `plugin.json` are plugin-root-relative (`./skills/…`); hook
  commands use `${CLAUDE_PLUGIN_ROOT}` (that plugin's install dir, i.e. its `superdev/`, `superui/`, `supergh/`, or `superfix/` subdir).

# Assistant Conventions

## Environment
- Shell is bash on Windows; do NOT use PowerShell syntax in Bash tool calls.
