# superbiz - side-project idea validation plugin

Owns the plugin's manifest (`.claude-plugin/plugin.json`), its human `README.md` and its one skill, `idea-validator`, which turns an idea into a sourced Go / Pivot / No-Go HTML report. The skill's files (body, references, council members, report script and template, evals) belong to `superbiz/skills/CLAUDE.md`, the script's tests to `tests/superbiz/CLAUDE.md`.

## Relationships

- Listed by the root `.claude-plugin/marketplace.json` with source `./superbiz`; no other plugin reads or calls it.
- Child node: `superbiz/skills/CLAUDE.md` - the `idea-validator` skill and everything bundled with it.

## Contracts

- The only skill is user-only (`disable-model-invocation: true`): superbiz never triggers on its own, so its `description:` routes nothing and it has no manifest entry anywhere.
- Host writes are exactly two, sharing one slug: working files under `.temp/superbiz/<slug>-<YYYY-MM-DD>/` and the deliverable `docs/business/<slug>/report.html`. Nothing else is created in the host repo.
- Runtime needs are web access (`WebSearch`, `WebFetch`) and Node.js 18 or newer: the README promises "No packages to install", so `build_report.mjs` imports only `node:` built-ins and uses no API newer than Node 18. The Node minimum sits in `superbiz/README.md` and the root `README.md` requirements table.

## Change together

- `plugin.json` `description` and the superbiz entry's `description` in the root `marketplace.json` are the same sentence, verbatim.
- `README.md` restates the skill's shape for humans: the nine dimensions, the seven advisors, the Go / Pivot / No-Go verdict, the experiment count, `--quick`, the intake questions and the `docs/business/<slug>/report.html` path. The skill is the authority (`SKILL.md`, `references/dimensions.md`, `references/council/`, `references/experiments.md`, which sets 3 to 8 experiments): a change there updates the README in the same edit.
