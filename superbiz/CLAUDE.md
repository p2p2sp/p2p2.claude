# superbiz - `idea-validator`

One skill, no agents, no hooks, no shared dir: `skills/idea-validator/`. It is user-only
(`disable-model-invocation: true`). It dispatches only
`general-purpose` subagents (3 research, then 7 council members per round, round 2 on unless
`--quick`), which cannot see the skill: every member prompt is the pasted text of its
`references/council/<nn>-<member>.md`, never a path to it.

## Run layout

- Working files go to `.temp/superbiz/<slug>-<YYYY-MM-DD>/`, numbered `00-input.md` to
  `13-experiments.md` plus `10-council-r1/`, `11-council-r2/`, `report-data.json`. The numbers are
  a contract: council members are handed files 01-09 by path, and `council.md` names them.
- The deliverable `report.html` is the one file outside it, at `docs/business/<slug>/` (same slug).
- Skill instructions are English; every user-facing string (report, member output, `labels`) is in
  the language the idea was written in.

## The report contract (three files, edited together)

`references/report-schema.md` (field names) -> `scripts/build_report.py` (validator + injector) ->
`templates/report-template.html` (JS renderer reading the injected JSON). A field renamed in one and
not the others breaks the report silently or fails validation.

- The script replaces three placeholders in the template: `__REPORT_DATA__` (JSON, `</` escaped),
  `__LANG__`, `__TITLE__`. It resolves the template as `../templates/report-template.html` from its
  own path, so the two directories move together.
- `DEFAULT_LABELS` in the script is the English fallback merged under the run's `labels` (the
  template reads them as `L.<key>`); a label key added to the template needs an entry there too.
- It exits 1 listing every problem, and the skill fixes the JSON and reruns, never the HTML.
- The template holds legitimate closing tags with their openers; `tests/orphan-tags.unit.test.ts`
  names it as an allowed precedent.

## Rules duplicated between markdown and the validator

`build_report.py` hard-codes what the references state; change both in the same edit:

- the 9 dimension keys in canonical order (`problem ... autopilot_fit`), weight 1 or 2 each, and
  the weighted total recomputed with a 0.06 tolerance - `dimensions.md` (weights sum to 11);
- key dimensions `problem`, `distribution`, `autopilot_fit`: Go is rejected when one scores <= 2,
  and needs `verdict.conditional_on` when one has `low` confidence - `dimensions.md` verdict rules;
- exactly 7 council members - the `council.md` member list, the seven member files, the skill body and
  its `description:`;
- 3-8 experiments, `thresholds.go/pivot/no_go`, `round2_held` true unless `meta.quick_mode`.

## Python dependency (the deliberate tool choice)

- `build_report.py` is stdlib-only Python 3, and the skill carries no fallback for a host without
  `python3`. The root `README.md` lists Python 3 as the plugin's requirement.
- It is NOT invoked directly like the repo's bash scripts: the skill runs
  `python3 ${CLAUDE_SKILL_DIR}/scripts/build_report.py ...`, `allowed-tools` pre-approves exactly
  `Bash(python3 ${CLAUDE_SKILL_DIR}/scripts/build_report.py:*)`, and the file is tracked `100644`
  with a `python3` shebang. The call line and the pattern change together or the call prompts.

## Evals

`skills/idea-validator/evals/evals.json` holds 3 expected-behaviour cases for a human or a
skill-designer eval run. Nothing in `tests/` or CI executes them.
