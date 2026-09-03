# superbiz - the idea validation ecosystem

> Dev-time orientation for **editing this plugin's source**. Like the repo root `CLAUDE.md`, it is **not a
> plugin input** - it never reaches the skill as runtime data. See the root `CLAUDE.md` for the repo-wide
> warnings and cross-plugin invariants; this file holds only what is specific to `superbiz`.

`superbiz` answers one question about one idea: **is it worth turning into a side project?** Not "is it a good
startup". The build is assumed cheap (an AI coding agent writes it), so what is judged is the problem,
distribution, and whether the thing runs without its owner after launch. The deliverable is a single
self-contained HTML report.

It is a **single-skill** plugin: one user-invoked entry, `idea-validator`, which fans out its own
`general-purpose` Agent subagents rather than dispatching sibling skills or bundled persona agents. It ships
**no `hooks/`, no injected manifest and no `agents[]`** - the skill carries `disable-model-invocation: true`,
so it does not route at all; the user invokes it by name. The catalog of record is
`.claude-plugin/plugin.json` `skills[]`.

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
```

No plugin-root `agents/`, `scripts/`, `references/` or `shared/` dir - the one skill bundles everything it
needs.

## Skill (qualified `superbiz:idea-validator`)

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

- **No manifest, no hooks, no routing.** The sole skill is user-only, so there is nothing for a
  `SessionStart`-injected dispatcher to route; a CSO `description:` trigger would not fire either.
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
- **The script owns the deliverable.** `report.html` is never hand-written or hand-edited: the LLM produces
  `report-data.json`, `build_report.py` validates it and renders. A failed validation is fixed in the JSON.
- **Evidence or `no data found`.** Every number in the report carries a source URL or is marked as missing; an
  estimate is allowed only when labelled as one with its method shown. `no data found` is an expected result.
- **Report language follows the idea.** All skill instructions are English; the report and the council members
  write in whatever language the idea was written in.
- **Artifact home - deviation from the repo-wide rule.** The run directory is `./idea-validation/<slug>-<YYYY-MM-DD>/`
  at the **host repo root**, holding both the numbered working files (00-13) and the deliverable `report.html`.
  The root `CLAUDE.md` invariant allows only `docs/<layer>/`, `.claude/` and `.temp/<plugin>/` in a host repo, so
  this is a **known, deliberate divergence** - resolve it either by moving the working files to
  `.temp/superbiz/` and the report to `docs/business/<idea-slug>/`, or by amending the root invariant. Do not
  quietly document it as compliant.

`superbiz` declares no cross-plugin chains and, since the plugin collapsed to one skill, no in-plugin chains
either.
