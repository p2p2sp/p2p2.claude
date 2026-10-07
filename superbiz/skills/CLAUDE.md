# superbiz/skills - the idea-validator skill and everything bundled with it

Owns `idea-validator/`: the orchestrating `SKILL.md`, its references (`process.md`, `dimensions.md`, `council.md` with the seven `council/<nn>-<member>.md` files, `experiments.md`, `report-schema.md`), `scripts/build_report.mjs`, `templates/report-template.html` and `evals/evals.json`. The plugin manifest, the README and the host-write and Node runtime rules belong to `superbiz/CLAUDE.md`.

## Terms

- Key dimensions: Problem strength, Distribution, Autopilot fit. Any of them scoring 2 or less forbids a Go; Problem strength and Distribution carry weight 2, the other seven weight 1, so the weighted total divides by 11.
- Moderator: the main context in step 12. It adds no argument of its own, attributes every sentence to a member and never resolves a dispute; the dissenting opinion is mandatory.

## Relationships

- `SKILL.md` runs steps 0-15 and sends each step into one reference by `${CLAUDE_SKILL_DIR}/references/...`; only the main context reads references.
- Subagents are `general-purpose` and cannot see the skill: every research prompt carries the pasted brief plus the pasted Research rules of `process.md`, every council prompt the pasted member file. Pass working-file paths, never a skill path.
- `build_report.mjs` finds the template by its own location (`../templates/report-template.html`) and is called through the literal `node ${CLAUDE_SKILL_DIR}/scripts/build_report.mjs` prefix that `allowed-tools` pre-approves.
- `evals/evals.json` holds three hand-run scenarios (full run, `--quick` on a Polish file, an enterprise idea that cannot be Go); the skill run itself has no automated suite.
- Tested by `tests/superbiz/`: `build_report.unit.test.ts` (every validation rule, label merge, template fill, import safety, unit tier) and `build_report.test.ts` (the file-writing CLI cases, integration tier).

## Contracts

- Determinism: same steps, same seven members, same numbered working files (`00-input.md` to `13-experiments.md`, `report-data.json`) and same report layout every run, so two reports compare side by side. Member output headings in `council.md` are verbatim.
- Round-1 isolation: each member is its own subagent, all seven in one turn, told never to read `10-council-r1/` or `11-council-r2/`, and never given a summary, other opinions or an expected verdict.
- `build_report.mjs <report-data.json> <output.html>` validates before rendering: the nine dimension keys in canonical order, integer scores 1-5, weight 1 or 2, confidence high/medium/low, non-empty evidence, `scorecard.total` within 0.06 of the recomputed total (checked only once every score and weight is valid), no Go with a key dimension at 2 or less, `verdict.conditional_on` on a Go with a low-confidence key dimension, `pivot_suggestion` on a Pivot, exactly 7 members, `council.dissent.text`, `round2_held` true unless `quick_mode`, 3-8 experiments, `thresholds.go/pivot/no_go`. Exit 1 lists every problem, or reports unreadable input or a failed write (the skill fixes the JSON, never the HTML), exit 2 on a wrong argument count.
- Rendering: the script merges English `DEFAULT_LABELS` under the JSON's `labels`, embeds the JSON (with `</` escaped) at `__REPORT_DATA__` and fills `__LANG__` and `__TITLE__` in one pass, so inserted text is never re-scanned; the template's JavaScript renders every section from that JSON, so the output is one self-contained file.
- Language: every skill file is English; the report, its labels and the council's writing follow the language of the idea text.

## Change together

- A `report-data.json` field or label key lives in three places: `report-schema.md`, `build_report.mjs` (`validate`, `DIMENSION_KEYS`, `KEY_DIMENSIONS`, `DEFAULT_LABELS`) and the template's renderer, which reads field names directly.
- The verdict rules of `dimensions.md`, the checks in `build_report.mjs` and their cases in `tests/superbiz/build_report.unit.test.ts` (`RULES`); the 3-8 experiment count in `experiments.md` and the script; the council of seven in `council.md`, `council/` and the script.
- Each dimension's weight and primary owner in `dimensions.md`, the member list in `council.md` and the "Primary dimensions" line of each `council/<nn>-<member>.md`.
- The working-file list in `SKILL.md` and the paths named in `process.md`, `dimensions.md`, `council.md` and `experiments.md`.
- `evals.json` expected outputs restate the skill's behaviour.

## Traps

- Passing `build_report.mjs` does not prove the verdict follows `dimensions.md`: the Go floor (total 3.5 or more), the Pivot and No-Go bands and the unfixed-killer rule are checked nowhere but in the moderator's prose.
- A schema `labels` value is an example in Polish only; a missing label silently renders in English.
