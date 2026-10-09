# supercc/skills - the files of the skill-designer and model-prompting skills

Owns the two skill directories: `skill-designer` (authoring and audit doctrine in `SKILL.md`, three references, the `scripts/lint_skill.sh` linter) and `model-prompting` (workflow in `SKILL.md`, `references/cross-model.md` plus one profile per covered model). The plugin manifest, README and the cross-plugin name contract belong to `supercc/CLAUDE.md`.

## Relationships

- `skill-designer` step 4 invokes `supercc:model-prompting` and carries its `model:`, `effort:` and mitigations into the write step; `references/architecture.md` (Fork) defers a fork's model and effort to that step. `model-prompting`'s description ends "Not the general authoring doctrine": doctrine stays in `skill-designer`, per-model wording in `model-prompting`.
- `skill-designer` step 7 runs the linter as `bash "${CLAUDE_SKILL_DIR}/scripts/lint_skill.sh" <skill-dir-or-agent-file>`.

## Contracts

- Both skills obey their own doctrine and lint clean (`FAIL=0 WARN=0`) under `lint_skill.sh` on their directory: no tables, italics, emoji or em/en dashes, no hedges, at most five all-caps directives per file.
- Every bundled file is named from its own `SKILL.md` body at the step that reads it, as `${CLAUDE_SKILL_DIR}/references/<file>.md`; the linter warns on a reference whose basename neither the `SKILL.md` nor a `fragments/*.md` beside it contains, since a fragment is preloaded into the body.
- `model-prompting` reads `cross-model.md` on every run and a profile only per target model. Profiles are named `<family>-<major>-<minor>.md`. The body opens with "Knowledge as of <date>" and refuses to extrapolate to an unlisted model.
- Quoted snippets in the profiles are measured wording: `SKILL.md` step 5 and `skill-designer`'s Audit mode forbid rephrasing them, and a sentence a profile marks verbatim (the first sentence of the Fable 5.1 autonomy block) stays verbatim in the profile too.
- `lint_skill.sh`: a directory target lints every `.md` under it plus its `scripts/` and `references/`; a file target lints that file alone unless it is named `SKILL.md`. Prints `FAIL`/`WARN` lines, then `FAIL=<n> WARN=<m>`; exit 1 on any FAIL, 2 on missing argument, else 0. It skips itself in the `scripts/` sweep. A reference over 100 lines needs a table of contents matching its `##` headings both ways: WARN up to 300 lines, FAIL past.

## Change together

- The platform caps and style rules in `skill-designer/SKILL.md` (name 64 chars and charset, description 1024 chars and no angle brackets, reserved words, body 500 lines, reference table of contents past 100 lines, no tables/italics/emoji, no `jq`/`bc`, emphasis budget, hedges, caller narrative, no CLAUDE.md reads) each have a check in `lint_skill.sh`: changing one changes the other.
- `cross-model.md` names every covered model in its comparison bullets (knowledge, context, effort defaults, prices, model choice): adding or retiring a profile updates those bullets and the "Knowledge as of" date with it.

## Traps

- The doctrine lists reserved words (anthropic, claude) among hard platform caps, but the linter reports them as WARN only.
- The repo-wide portability sweep does cover `lint_skill.sh` (shebang, no CRLF). It stays 100644 because every caller runs it through `bash`; calling it bare would require the 100755 exec bit.
