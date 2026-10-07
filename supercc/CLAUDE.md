# supercc - plugin for writing, auditing and tuning Claude Code skills and agents

supercc owns two skills, `skill-designer` (authoring doctrine and the `lint_skill.sh` linter) and `model-prompting` (per-model prompting profiles), plus its manifest and README. It carries no agents, no hooks and no runtime dependency; what each skill's files say and how they work belongs to `skills/CLAUDE.md`.

## Relationships

- Child node: `skills/CLAUDE.md`.
- `viber/skills/extension/SKILL.md` invokes `supercc:skill-designer` through `Skill` when it is in the session's skill listing, and silently skips the step when it is not: the skill's name is a cross-plugin contract.
- The deliverable is the user's own skill or agent file: supercc writes no `docs/<layer>/` output.

## Contracts

- `.claude-plugin/plugin.json` `skills[]` lists `./skills/skill-designer/` then `./skills/model-prompting/`; there is no `agents[]` key.

## Commands

- No suite under `tests/` covers supercc, and `lint_skill.sh` has no test file. The only check is the linter itself: `bash supercc/skills/skill-designer/scripts/lint_skill.sh <skill-dir | file.md>` (exit 1 on any FAIL).

## Change together

- Renaming or removing `skill-designer` updates `plugin.json`, the README and the `supercc:skill-designer` line in `viber/skills/extension/SKILL.md`.
- The set of covered models lives in three places: the files under `skills/model-prompting/references/`, the `model-prompting` description and workflow list, and the README's "Tuned for each model" line.
- The README's example requests show what each skill fires on: a change to a skill's `description:` that narrows its triggers updates them.

## Traps

- The README says "No dependencies": the linter is plain bash called through `bash`, and any new script must keep that true or the README changes with it.
