To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Fix the findings of the review of the plugin fold

## Goal

The code review of the commits that folded superui, superbiz and supercc into viber and moved the repository links to `p2p2sp/viber` found issues that ship wrong links, dead-end workflow paths, a false documentation promise and avoidable token cost. This change fixes them so every shipped link, skill path and document matches what viber actually does, and UI tasks stop paying for a design reference written for another context.

## Acceptance criteria

1. No tracked file outside `docs/archive/`, `docs/_specs/` and `docs/specs/` contains `p2p2.claude`; the help page's repository link, slug and both install commands (English and Polish) point at `https://github.com/p2p2sp/viber`.
2. A `tune` request in `viber/skills/skill-designer/SKILL.md` (model, effort or per-model wording only) has its own path through the workflow: it skips steps 2, 3, 5, 6 and 7, writes no file, and its output is the model and effort recommendation, never the three evaluation scenarios.
3. `viber/docs/files.md` states that `docs/business/<slug>/report.html` is a fixed path that `directories:` in `.claude/viber.yml` does not change.
4. `viber/skills/extension/SKILL.md` invokes `viber:skill-designer` once, on the agent file and every phase skill directory together; when `viber:skill-designer` is not in the skill listing, the step is skipped with one line saying so.
5. On a task whose `Files` render or style an interface, `task-coder` and `task-reviewer` read a short UI tells checklist of at most 4096 bytes, written without references to pro-designer's context, instead of `anti-slop.md`; `pro-designer` still reads the full `anti-slop.md`; a unit test fails when the checklist and `anti-slop.md` stop sharing the same `##` sections.
6. `pro-designer`'s `description` no longer carries "ALWAYS" nor the "even if the user only says build/add/fix" clause, and names work where the interface's look is the goal (a new screen or page, a redesign, a UI review or critique); the skill stays model-invoked, so `prototype-writer`'s `viber:pro-designer` fallback keeps working; the help page card and `viber/README.md` describe the same trigger.
7. `docs/viber-functions.html` has a section each for `pro-designer`, `idea-validator` and `skill-designer`, its "Task coding and review" section names the UI tells checklist read, and its "Where it writes" section lists `docs/business/<slug>/` and `.temp/viber/idea-validator/`.
8. `tests/github/release.test.ts` has a case proving that a manifest already ending in a newline is rewritten ending in exactly one newline.

## Scope

### File map

- modify - viber/skills/setup/assets/help.html - repository link, slug and install commands (both languages); the pro-designer card's start line
- modify - CONTRIBUTING.md - bug report link
- modify - .github/ISSUE_TEMPLATE/config.yml - security policy link
- modify - docs/viber-functions.html - footer source line; sections for pro-designer, idea-validator, skill-designer; coding and write-location lines
- modify - viber/skills/skill-designer/SKILL.md - the tune path through the workflow and the Output section
- modify - viber/docs/files.md - the fixed `docs/business/` path statement
- modify - viber/skills/extension/SKILL.md - single skill-designer invocation and its fallback
- add - viber/references/ui-tells.md - the UI tells checklist the two task agents read
- modify - viber/agents/task-coder.md - reads the checklist instead of `anti-slop.md`
- modify - viber/agents/task-reviewer.md - reads the checklist instead of `anti-slop.md`
- add - tests/viber/ui-tells.unit.test.ts - holds the checklist to its size, its wording bans and the section set of `anti-slop.md`
- modify - viber/skills/pro-designer/SKILL.md - shorter description
- modify - viber/README.md - the pro-designer row's trigger
- modify - tests/github/release.test.ts - the newline-terminated manifest case

### Out of scope

- Notifying users of the retired superui, superbiz and supercc plugins (review finding 7).
- `idea-validator`'s code: its report path stays hard-coded.
- `skill-designer`'s `description`.
- `viber/skills/pro-designer/references/anti-slop.md`: unchanged, still read in full by `pro-designer`.
- `viber/agents/prototype-writer.md`: its `impeccable`, else `viber:pro-designer`, invocation keeps working unchanged.
- Every `CLAUDE.md`: `build.memory` is on, so the nodes naming `anti-slop.md` as the task agents' read (`viber/agents/CLAUDE.md`, `viber/skills/pro-designer/CLAUDE.md`) and the extension invocation (`viber/skills/CLAUDE.md`, `viber/skills/skill-designer/CLAUDE.md`) are updated by the build's close, and the duplicate line "> All files in English" in the root `CLAUDE.md` (review finding 10) reaches the user through the build close's `SUGGEST:` line, since no task may edit the root file.
- `docs/_specs/` and `docs/specs/` are excluded from AC1's check because this plan's own run directory and archive quote the old repository name.
