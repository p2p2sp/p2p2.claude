Title: "refactor(superbiz): reprofile business-idea-validator to side-income autopilot validation"
Spec: docs/.workflows/20260819-superbiz-validator-side-income.md

## Out of scope

- `product-phase-roadmap` and `product-phase-roadmap-writer` - they consume the report generically and are not touched.
- `council-this`, `council-this-chairman`, and the five council persona agents - the mandatory council round stays exactly as is; only the council capture content written by the validator changes.
- Tests, hooks, manifests, `plugin.json` (no skill is added, removed, or renamed), and version bumps (tag-driven).
- Fixing stale documentation unrelated to the validator paragraphs being edited.

## Constraints / assumptions

- All skill-source edits obey `.claude/rules/_skills.md`: bullets over prose, document only the delta from defaults, routing guard stays in frontmatter `description:` only, no caller narration in bodies, no italics/tables/emoji in skill sources - the existing carve-out letting `report-template.md` mandate tables in the generated report remains.
- Skill and reference content stays in English; the generated report's language rules (translate headings and tier labels to the capture language) are unchanged.
- The change is markdown-only across exactly seven files: `superbiz/skills/business-idea-validator/SKILL.md`, `superbiz/skills/business-idea-validator-researcher/SKILL.md`, `superbiz/skills/business-idea-validator-researcher/references/frameworks.md`, `superbiz/skills/business-idea-validator-researcher/references/report-template.md`, `superbiz/CLAUDE.md`, root `CLAUDE.md`, and `README.md`; no scripts, no build step, and dev-time regression tests are not required for this plugin.
- No `model:` frontmatter changes anywhere in the chain: the researcher and chairman carry no `model:` key today and keep it that way; the docs edit only stops orientation files from hardcoding a model the source does not declare.
- Editing these source files does not alter the currently installed superbiz plugin; behavior changes ship only after publish and `/plugin update`.

