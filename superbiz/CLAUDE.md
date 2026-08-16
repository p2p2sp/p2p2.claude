# superbiz - the business validation / product roadmap ecosystem

> Dev-time orientation for **editing this plugin's source**. Like the repo root `CLAUDE.md`, it is **not a
> plugin input** - it never reaches the skills as runtime data. See the root `CLAUDE.md` for the repo-wide
> warnings and cross-plugin invariants; this file holds only what is specific to `superbiz`.

`superbiz` is the business validation / product roadmap ecosystem: turning a raw idea into a sourced viability
report, then turning a validated idea into a phased execution roadmap. It is a **single-domain** plugin, so
its skills carry **no group prefix** (the plugin name is the group) and are flat-named. It ships **no
`hooks/` and no injected manifest** - each pair (entry + fork) routes purely via its CSO `description:`; a
`SessionStart`-injected dispatcher would add no routing value over the skill descriptions, so there is none.
The **per-skill** catalog of record is `.claude-plugin/plugin.json` `skills[]`.

## Layout (superbiz internals)

```
superbiz/
  .claude-plugin/plugin.json   The plugin manifest - skills[] is the catalog of record
  skills/
    business-idea-validator/               Entry - interactive intake, dispatches the researcher fork
    business-idea-validator-researcher/     Fork - web research + report writing, out of the main context
      references/frameworks.md
      references/report-template.md
    product-phase-roadmap/                 Entry - interactive intake, dispatches the writer fork
    product-phase-roadmap-writer/           Fork - phased doc writing, out of the main context
      references/phase-blueprint.md
```

## Skills (qualified `superbiz:<name>`)

- `business-idea-validator` - interactive entry. Interviews the user about the idea (AskUserQuestion), writes
  an intake capture file to `.temp/superbiz/validator/capture-<RUN_ID>.md`, dispatches
  `business-idea-validator-researcher` via the `Skill` tool, and relays the finished report path back to the
  user. On success it offers (AskUserQuestion) to chain into `product-phase-roadmap`.
- `business-idea-validator-researcher` - fork-only sub-worker (dispatched only by `business-idea-validator`,
  never directly). Runs the deep web research (competitors, market sizing, differentiation) with `WebSearch` /
  `WebFetch`, applies the frameworks in `references/frameworks.md`, and writes the sourced report to
  `docs/business/<idea-slug>/walidacja.md` (or `validation.md` when the report language is English) following
  `references/report-template.md`, then returns a single tagged line.
- `product-phase-roadmap` - interactive entry. Interviews the user about scope/constraints (AskUserQuestion),
  writes an intake capture file to `.temp/superbiz/roadmap/capture-<RUN_ID>.md`, dispatches
  `product-phase-roadmap-writer` via the `Skill` tool, and relays the finished folder path back to the user.
- `product-phase-roadmap-writer` - fork-only sub-worker (dispatched only by `product-phase-roadmap`, never
  directly). Turns a validated idea (typically the validator's report) into a phased folder of Markdown files
  under `docs/business/<idea-slug>/plan/` - landing page + waitlist through MVP to public launch and growth -
  following `references/phase-blueprint.md`, then returns a single tagged line.

Both entries are model-invocable via CSO `description:` and user-invocable directly; both forks carry
`context: fork`, `user-invocable: false`, and a "invoked only by the entry skill, never directly" description
guard.

## Architecture invariants (superbiz-specific)

- **No manifest, no hooks.** superbiz's four skills stay model-routable via CSO `description:` alone; a
  `SessionStart`-injected dispatcher would add no routing value the descriptions do not already carry.
- **Entry asks, fork works.** `AskUserQuestion` is a main-session-only tool, so all interactive intake lives in
  the entry skill; the bulk of the work - web research, multi-file writing - stays out of the main context in
  the fork, dispatched via the `Skill` tool and returned as a single tagged line the entry relays verbatim.
- **Artifact home.** Persisted output lands at `docs/business/<idea-slug>/` in the host repo - the validator's
  report (`walidacja.md`, or `validation.md` when the report language is English) and the roadmap's `plan/`
  folder; scratch intake capture files land at `.temp/superbiz/validator/` and `.temp/superbiz/roadmap/`.
- **Honesty rule.** Both forks share the same content invariant: every number in the output must be sourced,
  and every claim is labeled by tier - fact, estimate, or assumption - never presented as more certain than it
  is.

`superbiz` declares no cross-plugin chains - the validator-to-roadmap chain is in-plugin
(`business-idea-validator` to `product-phase-roadmap`).
