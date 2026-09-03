# superbiz - the business analysis ecosystem

> Dev-time orientation for **editing this plugin's source**. Like the repo root `CLAUDE.md`, it is **not a
> plugin input** - it never reaches the skill as runtime data. See the root `CLAUDE.md` for the repo-wide
> warnings and cross-plugin invariants; this file holds only what is specific to `superbiz`.

`superbiz` holds **two independent business-analysis skills**. They share no code, no references and no run
directory - they are co-located because they answer business questions, not because they compose.

- `idea-validator` - **an idea that does not exist yet**: is it worth turning into a side project? Not "is it
  a good startup". The build is assumed cheap (an AI coding agent writes it), so what is judged is the
  problem, distribution, and whether the thing runs without its owner after launch. User-only
  (`disable-model-invocation: true`), so it does not route at all.
- `hormozi-report` - **a business that already exists**: where is it actually constrained? A structured
  interview plus web research, delivered as a long-form written diagnosis with every claim cited to the page
  it was read from. Model-routable via its CSO `description:`.

Both deliver a single self-contained HTML file, each built by its own bundled Python renderer. The plugin
ships **no `hooks/`, no injected manifest and no `agents[]`** - `idea-validator` fans out `general-purpose`
Agent subagents rather than dispatching sibling skills or bundled persona agents, and `hormozi-report` runs
entirely in one context. The catalog of record is `.claude-plugin/plugin.json` `skills[]`.

> **`hormozi-report` was externally sourced and is now self-contained.** It has no external dependency left:
> the renderer is bundled TypeScript resolved through `${CLAUDE_PLUGIN_ROOT}`, research runs on `WebSearch` /
> `WebFetch`, and the brand config defaults to a (never-shipped) `brand.config.json` beside the skill rather
> than one in `~/.claude/`. Gone with the external engine: the `{{HORMOZI_*}}` installer placeholders, the
> PowerShell `&` call syntax, the `hormozi-advisor` CLI and `~/.claude/skills/ask-hormozi/` corpus, and the
> reference to a `stop-slop` skill that does not exist in this marketplace.
>
> Two cosmetic divergences from repo convention remain, both deliberate: the skill uses `reference/` where
> every other skill here uses `references/`, and it keeps a bundled `LICENSE` plus `license:` frontmatter,
> which no other skill carries - that one stays, because the MIT notice it came with must be retained.

## Layout (superbiz internals)

```
superbiz/
  .claude-plugin/plugin.json   The plugin manifest - skills[] is the catalog of record
  skills/
    idea-validator/
      SKILL.md                     Sequence, hand-offs and ground rules only; protocols live in references/
      references/process.md        Intake questions, Lean Canvas fields, hypothesis format, the three research
                                   briefs, source-quality rules
      references/dimensions.md     9 scorecard dimensions with 1-5 anchors and weights, the three autopilot
                                   layers and the hours/week mapping, the verdict rules
      references/council.md        Round 1 / round 2 output formats, moderator protocol, safeguards against
                                   fake diversity
      references/council/*.md      The 7 member prompts: 01-customer, 02-skeptic, 03-analyst, 04-growth,
                                   05-operator, 06-risk, 07-visionary
      references/experiments.md    Experiment catalogue and threshold-setting guidance
      references/report-schema.md  JSON structure consumed by scripts/build_report.py
      references/frameworks.md     Frameworks used, with links verified at authoring time
      scripts/build_report.py      report-data.json + assets/report-template.html -> report.html; validates
                                   required fields and exits 1 listing what is missing. Python 3 stdlib only
      assets/report-template.html  HTML/CSS/JS shell the script fills
      evals/evals.json             Dev-time eval cases (not shipped as runtime data)
    hormozi-report/
      SKILL.md                     Four stages: business context, retrieval, write, render
      reference/report-spec.md     report.json structure consumed by scripts/build_report.ts
                                   (note the singular dir name - a divergence, see the warning above)
      scripts/build_report.ts      report.json -> one self-contained .html plus a report.md companion.
                                   TypeScript run directly by Node 22.6+ (native type stripping), no deps.
                                   --brand defaults to a brand.config.json beside SKILL.md; none ships, and
                                   the fallback palette + system fonts are a supported rendering, not a
                                   degraded one
      LICENSE                      Bundled MIT text - no other skill in this repo carries one
```

No plugin-root `agents/`, `scripts/`, `references/` or `shared/` dir - each skill bundles everything it needs.

## Skills

### `superbiz:hormozi-report`

Model-routable. Four stages, all in the main context: (1) business context - pasted or user-named material,
or a rigid twelve-question interview asked ONE question per turn, ending in a confirmed profile table marking
every value verified / inferred / missing; (2) research - 8-14 `WebSearch` queries, each promising result
opened with `WebFetch` before anything is quoted from it; (3) the written report as `report.json`, whose
mandatory constraint board ranks the top three constraints, each `target` resolving to a real section id;
(4) `scripts/build_report.ts` renders the deliverable HTML plus a `report.md` companion.

`report.md` is the working artifact, never handed over - it exists so a later conversation answers questions
about a finished report by reading ~4k words of prose instead of the base64-heavy HTML or the verbose JSON.

Renderer invariants worth keeping:

- **The https gate applies to BOTH outputs.** A citation URL that is not `https://` is dropped with one
  stderr warning, and the link degrades to plain text in the HTML *and* in `report.md`. The markdown is what
  a later conversation reads, so a URL the dashboard refused must never survive there as a live link.
- One warning per distinct bad URL - the inline citation and the sources appendix both reach it, and warning
  twice makes the stderr count read as two faults.
- Section and subsection ids are stamped unique before any rendering, so nav and body agree by construction
  and a user section titled "Sources" cannot collide with the built-in appendix.
- The Sources appendix always renders, stating plainly when nothing was cited; a source card with no working
  link is dropped rather than shipped as a broken citation.
- The template is filled in ONE regex pass, so prose containing a literal `__SECTIONS__` is never spliced.

### `superbiz:idea-validator`

`idea-validator` - user-only (`disable-model-invocation: true`), argument `[idea text | path/to/idea.md]
[--quick]`. Fifteen steps, always in the same order so two ideas stay comparable:

- Steps 0-2 (main context): intake (one batched `AskUserQuestion` for segment, geography, revenue model,
  weekly hours, existing channels, stage), Lean Canvas plus hidden assumptions, risk hypotheses sorted
  riskiest-first.
- Steps 3-5: three `general-purpose` subagents in one parallel dispatch - problem, market, competition
  research over `WebSearch` / `WebFetch`.
- Steps 6-9 (main context): business model, distribution, side-project fit, autopilot fit (hours/week per
  acquire / deliver / maintain layer plus autopilot killers with a remove / automate / redesign fix).
- Step 10: council round 1 - seven `general-purpose` subagents in one parallel dispatch, isolated from each
  other. Step 11: round 2, the same seven, each now seeing all round-1 files, responding by name. Round 2 is
  on by default and skipped only with `--quick`.
- Step 12 (main context, moderator role): synthesis and scorecard - agreed points, disputes kept as disputes,
  verdict Go / Pivot / No-Go, biggest single risk, a mandatory dissenting opinion, council health.
- Steps 13-14: experiment plan (cheapest test that can kill the hypothesis first) and the Go / Pivot / No-Go
  thresholds, pre-committed before any result exists.
- Step 15: assemble `report-data.json` per `references/report-schema.md`, run `scripts/build_report.py`, hand
  the user the path plus a three-line summary.

## Architecture invariants (superbiz-specific)

- **No manifest, no hooks.** `idea-validator` is user-only, so there is nothing for a `SessionStart`-injected
  dispatcher to route; `hormozi-report` routes on its own CSO `description:`. Two skills that never compose
  need no dispatcher between them.
- **The two skills stay independent.** No shared `references/`, no shared script, no shared run directory,
  and neither invokes the other. Do not "unify" them into a common pipeline: they answer different questions
  about different objects (an idea that does not exist yet vs. a business that already does).
- **Subagents, not sibling skills.** The heavy work stays out of the main context through the `Agent` tool
  (3 research + 7 council x 2 rounds), not through `Skill` forks. Every subagent receives **file paths**, never
  pasted content, and writes its own numbered file into the run directory; the main context keeps the
  conclusions, not the material.
- **Council isolation is the product.** Round-1 members never see each other's output and are never told what
  verdict is expected; the moderator adds no arguments of its own and attributes every sentence to a member.
  Unanimity without reservations is a **failure signal** (the council did not produce independent views), not
  confidence - the report must say so.
- **Disagreement is preserved, never averaged** - between sources and between members. A council dispute of 2+
  points forces the dimension's confidence to `low` and shows the range, not a mean.
- **The script owns the deliverable.** In both skills the HTML is never hand-written or hand-edited: the LLM
  produces the JSON, the bundled renderer validates it and renders. A failed validation is fixed in the JSON.
  `idea-validator` uses `build_report.py` (Python 3, stdlib only); `hormozi-report` uses `build_report.ts`
  (Node 22.6+, native type stripping, no deps). Both renderers are self-verifying and trusted by their
  caller - do not re-check or retry their output.
- **Evidence or `no data found`.** Every number in the report carries a source URL or is marked as missing; an
  estimate is allowed only when labelled as one with its method shown. `no data found` is an expected result.
- **Report language follows the idea.** All skill instructions are English; the report and the council members
  write in whatever language the idea was written in.
- **Artifact home - the two skills differ, and only one is compliant.**
  `hormozi-report` writes its whole run - `report.json`, `report.md` and the `report.html` deliverable - to
  `.temp/superbiz/hormozi-report/<subject-slug>-<YYYY-MM-DD>/`, which is one of the three locations the root
  `CLAUDE.md` allows. Because `.temp/` is normally gitignored the run is disposable, so the skill tells the
  user the path and says the HTML is theirs to copy out.
  `idea-validator` still writes to `./idea-validation/<slug>-<YYYY-MM-DD>/` at the **host repo root**, holding
  both the numbered working files (00-13) and its `report.html`. That is none of the three allowed locations
  and remains a **known, deliberate divergence** - resolve it by moving the run under `.temp/superbiz/` (and
  the report to `docs/business/<idea-slug>/` if it should persist), or by amending the root invariant. Do not
  quietly document it as compliant, and do not cite it as precedent now that a sibling skill complies.

`superbiz` declares no cross-plugin chains and, since its two skills never invoke one another, no in-plugin
chains either.
