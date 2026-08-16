# superbiz - the business validation / product roadmap ecosystem

> Dev-time orientation for **editing this plugin's source**. Like the repo root `CLAUDE.md`, it is **not a
> plugin input** - it never reaches the skills as runtime data. See the root `CLAUDE.md` for the repo-wide
> warnings and cross-plugin invariants; this file holds only what is specific to `superbiz`.

`superbiz` is the business validation / product roadmap ecosystem: turning a raw idea into a sourced viability
report, turning a validated idea into a phased execution roadmap, and turning a framed decision into a
synthesized council verdict. It is a **single-domain** plugin, so
its skills carry **no group prefix** (the plugin name is the group) and are flat-named. It ships **no
`hooks/` and no injected manifest** - each pair (entry + fork) routes purely via its CSO `description:`; a
`SessionStart`-injected dispatcher would add no routing value over the skill descriptions, so there is none.
The catalog of record is `.claude-plugin/plugin.json` `skills[]` + `agents[]`.

## Layout (superbiz internals)

```
superbiz/
  .claude-plugin/plugin.json   The plugin manifest - skills[] + agents[] is the catalog of record
  agents/
    council-contrarian.md              Persona - hunts the fatal flaw
    council-first-principles.md        Persona - strips assumptions, rebuilds from the ground up
    council-expansionist.md            Persona - finds the upside everyone else misses
    council-outsider.md                Persona - responds to only what is on the page, no assumed context
    council-executor.md                Persona - only feasibility and the fastest first step
  skills/
    business-idea-validator/               Entry - interactive intake, dispatches the researcher fork
    business-idea-validator-researcher/     Fork - web research + report writing, out of the main context
      references/frameworks.md
      references/report-template.md
    product-phase-roadmap/                 Entry - interactive intake, dispatches the writer fork
    product-phase-roadmap-writer/           Fork - phased doc writing, out of the main context
      references/phase-blueprint.md
    council-this/                          Entry - interactive intake, dispatches the chairman fork
    council-this-chairman/                 Fork - convenes the five agents, synthesizes the verdict
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
- `council-this` - interactive entry. Frames the user's decision and its stakes (AskUserQuestion for at most
  one clarification), writes an intake capture file to `.temp/superbiz/council/capture-<RUN_ID>.md`, dispatches
  `council-this-chairman` via the `Skill` tool, and relays the fork's tagged verdict line back to the user.
- `council-this-chairman` - fork-only sub-worker (dispatched only by `council-this`, never directly). Convenes
  the five `superbiz:council-*` persona agents in one parallel dispatch, synthesizes the chairman verdict
  itself - no separate peer-review round - and writes it to `docs/business/<decision-slug>/rada.md`
  (`council.md` when the language is English), then returns a single tagged line.

All three entries are model-invocable via CSO `description:` and user-invocable directly; all three forks carry
`context: fork`, `user-invocable: false`, and a "invoked only by the entry skill, never directly" description
guard.

## Agents (qualified `superbiz:<name>`)

Dispatched only by the `council-this-chairman` fork, via the `Agent` tool, in one parallel dispatch - never
directly by a user or any other skill. All five run `model: opus`.

- `council-contrarian` - hunts the fatal flaw: what is wrong, missing, or will fail.
- `council-first-principles` - strips the framing's assumptions and rebuilds the reasoning from the ground up.
- `council-expansionist` - finds the upside everyone else misses; the ceiling, not the floor.
- `council-outsider` - responds to only what is literally on the page, flags jargon and unstated assumptions.
- `council-executor` - only feasibility and the fastest path: the concrete next move.

## Architecture invariants (superbiz-specific)

- **No manifest, no hooks.** superbiz's six skills stay model-routable via CSO `description:` alone; a
  `SessionStart`-injected dispatcher would add no routing value the descriptions do not already carry.
- **Entry asks, fork works.** `AskUserQuestion` is a main-session-only tool, so all interactive intake lives in
  the entry skill; the bulk of the work - web research, multi-file writing - stays out of the main context in
  the fork, dispatched via the `Skill` tool and returned as a single tagged line the entry relays verbatim.
- **Artifact home.** Persisted output lands at `docs/business/<idea-slug>/` in the host repo - the validator's
  report (`walidacja.md`, or `validation.md` when the report language is English), the roadmap's `plan/`
  folder, and the council's verdict (`rada.md`, or `council.md` when the language is English); scratch intake
  capture files land at `.temp/superbiz/validator/`, `.temp/superbiz/roadmap/`, and `.temp/superbiz/council/`.
- **Honesty rule.** The researcher and writer forks share the same content invariant: every number in the
  output must be sourced, and every claim is labeled by tier - fact, estimate, or assumption - never presented
  as more certain than it is. The council chairman applies the same tiering to any number its verdict cites.

`superbiz` declares no cross-plugin chains - the validator-to-roadmap chain is in-plugin
(`business-idea-validator` to `product-phase-roadmap`); `council-this` is not chained from either.
