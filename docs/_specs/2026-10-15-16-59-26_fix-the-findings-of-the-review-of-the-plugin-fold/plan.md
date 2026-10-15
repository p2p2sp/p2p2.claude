---
source: C:/Projects/viber/docs/_specs/2026-10-15-16-59-26_fix-the-findings-of-the-review-of-the-plugin-fold/plan.md
---

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

## Tasks

<!-- TASK -->
### T1 - Point the remaining repository links at p2p2sp/viber
- TDD: none
- Covers: AC1
- Uses: none
- Depends-on: none
- Files: viber/skills/setup/assets/help.html, CONTRIBUTING.md, .github/ISSUE_TEMPLATE/config.yml, docs/viber-functions.html
- Delivers: every link and repository name still naming `p2p2sp/p2p2.claude` or the `p2p2.claude` repository now names `p2p2sp/viber`: the help page's repository link and slug, its install snippet and both language versions of the in-session install command, the bug report link, the security policy link and the function catalogue's footer.
- Verification: `git grep -n "p2p2\.claude" -- . ":(exclude)docs/archive" ":(exclude)docs/_specs" ":(exclude)docs/specs"` -> no output; `git grep -c "github.com/p2p2sp/viber" -- viber/skills/setup/assets/help.html README.md` -> at least 4 in `help.html` and at least 1 in `README.md`; `node --test tests/viber/help.unit.test.ts` -> all tests pass
- DoD: no tracked file outside `docs/archive/`, `docs/_specs/` and `docs/specs/` contains `p2p2.claude`; `help.html`'s repository link and its slug text read `p2p2sp/viber`; `help.html`'s install snippet and the English and Polish in-session install commands use `https://github.com/p2p2sp/viber`; `CONTRIBUTING.md` links bug reports to `https://github.com/p2p2sp/viber/issues/new/choose`; `.github/ISSUE_TEMPLATE/config.yml` links `https://github.com/p2p2sp/viber/security/policy`; `docs/viber-functions.html`'s footer names the viber repository
<!-- /TASK -->

<!-- TASK -->
### T2 - Give skill-designer's tune request its own path
- TDD: none
- Covers: AC2
- Uses: none
- Depends-on: none
- Files: viber/skills/skill-designer/SKILL.md
- Delivers: the workflow's classification states that a tune request skips steps 2, 3, 5, 6 and 7 and ends after step 4 on the model and effort recommendation, writing no file; the Output section ties the three evaluation scenarios and the lint result to requests that write or lint a file, never to a pure recommendation.
- Verification: `bash viber/skills/skill-designer/scripts/lint_skill.sh viber/skills/skill-designer` -> `FAIL=0 WARN=0`; `git grep -n "tune" -- viber/skills/skill-designer/SKILL.md` -> step 1 names steps 2, 3, 5, 6 and 7 as skipped for tune, and the Output section's scenario and lint lines exclude a recommendation-only result
- DoD: step 1 of the workflow lists steps 2, 3, 5, 6 and 7 as skipped for a tune request; a tune request ends on the model and effort recommendation and writes no file; the Output section asks for the three evaluation scenarios only for a new skill or a behaviour change, never for a tune request; `lint_skill.sh` on `viber/skills/skill-designer` prints `FAIL=0 WARN=0`
<!-- /TASK -->

<!-- TASK -->
### T3 - State that the idea-validator report path is fixed
- TDD: none
- Covers: AC3
- Uses: none
- Depends-on: none
- Files: viber/docs/files.md
- Delivers: `files.md` says that `docs/business/<slug>/report.html` is a fixed path, and that `directories:` changes only the run and archive directory names.
- Verification: `git grep -n "docs/business" -- viber/docs/files.md viber/skills/idea-validator/SKILL.md` -> the `files.md` lines state the path is fixed and not changed by `directories:`, and `idea-validator/SKILL.md` still writes to `docs/business/`
- DoD: the `docs/business/<slug>/report.html` row or the sentence under the table states the path is fixed; the sentence about `directories:` no longer reads as covering every directory under `docs/`; the path written in `files.md` matches the one `idea-validator/SKILL.md` writes
<!-- /TASK -->

<!-- TASK -->
### T4 - Run skill-designer once over an extension's files, skipped when absent
- TDD: none
- Covers: AC4
- Uses: none
- Depends-on: none
- Files: viber/skills/extension/SKILL.md
- Delivers: step 4 invokes `viber:skill-designer` through `Skill` once, naming the agent file and every phase skill directory written in this run in that one invocation, then applies what it approves; when `viber:skill-designer` is not in the skill listing, the step says in one line that the review was skipped and goes on to step 5.
- Verification: `git grep -n "skill-designer" -- viber/skills/extension/SKILL.md viber/.claude-plugin/plugin.json` -> `extension/SKILL.md` names one invocation covering every written file and a skip line for an absent listing, and `plugin.json` still lists `./skills/skill-designer/`
- DoD: step 4 holds exactly one `viber:skill-designer` invocation; that invocation names the agent file and every phase skill directory together; the absence of `viber:skill-designer` from the skill listing leads to one line saying the review was skipped and to step 5, with no `Skill` call
<!-- /TASK -->

<!-- TASK -->
### T5 - Give the task agents a short UI tells checklist
- TDD: none
- Covers: AC5
- Uses: C1
- Depends-on: none
- Files: viber/references/ui-tells.md, viber/agents/task-coder.md, viber/agents/task-reviewer.md, tests/viber/ui-tells.unit.test.ts
- Delivers: the UI tells checklist of C1, distilled from `anti-slop.md`, overlapping tells merged into one line where the 4096-byte limit needs it; `task-coder` and `task-reviewer` read `<refs>/ui-tells.md` on a task whose `Files` render or style an interface, under the same condition and design-system exception as today, instead of `anti-slop.md`; a unit test holding the checklist to C1.
- Verification: `node --test tests/viber/ui-tells.unit.test.ts` -> all tests pass; `git grep -n "ui-tells.md\|anti-slop" -- viber/agents/task-coder.md viber/agents/task-reviewer.md` -> one `ui-tells.md` line in each file and no `anti-slop` line
- DoD: `viber/references/ui-tells.md` exists with the same set of `##` headings as `anti-slop.md`; it is at most 4096 bytes; it contains none of `SKILL.md`, `Scope discipline`, `this skill`, an em dash or an en dash; its dash line binds visible interface copy only; `task-coder.md` reads `<refs>/ui-tells.md` before its first edit of a file rendering or styling an interface and names `anti-slop.md` nowhere; `task-reviewer.md` judges a tell from `<refs>/ui-tells.md` as Blocking under the same exception and names `anti-slop.md` nowhere; `ui-tells.unit.test.ts` fails when a `##` heading of `anti-slop.md` is missing from the checklist, when the checklist carries a `##` heading `anti-slop.md` lacks, when it exceeds 4096 bytes, or when it contains a banned phrase or dash, each shown by a case on a synthetic sample
<!-- /TASK -->

<!-- TASK -->
### T6 - Narrow pro-designer's trigger to work where the look is the goal
- TDD: none
- Covers: AC6
- Uses: none
- Depends-on: T1
- Files: viber/skills/pro-designer/SKILL.md, viber/skills/setup/assets/help.html, viber/README.md
- Delivers: a shorter `pro-designer` description that fires on work where an interface's look is the goal (a new screen or page, a redesign, a UI review or critique, choosing colors, type, spacing, layout or motion, a UI that looks generated) and not on a small functional change; the help page card's start line (English and Polish) and the `viber/README.md` row say the same.
- Verification: `git grep -n "ALWAYS\|build/add/fix\|disable-model-invocation" -- viber/skills/pro-designer/SKILL.md` -> no line in the frontmatter; `git grep -n "viber:pro-designer" -- viber/agents/prototype-writer.md` -> the fallback line is still present; `node --test tests/viber/help.unit.test.ts` -> all tests pass
- DoD: the `description` contains neither `ALWAYS` nor `build/add/fix`; the `description` names a new screen or page, a redesign and a UI review as triggers; the frontmatter carries no `disable-model-invocation` and no `user-invocable: false`; the description is shorter than the current one; the `skill-pro-designer` card's start line in `help.html` describes the same trigger in its `en` and `pl` spans; the `/viber:pro-designer` row of `viber/README.md` describes the same trigger
<!-- /TASK -->

<!-- TASK -->
### T7 - Bring the function catalogue up to the folded skills
- TDD: none
- Covers: AC7
- Uses: C1
- Depends-on: T5, T6
- Files: docs/viber-functions.html
- Delivers: three new sections in the catalogue's existing `section` and `ul class="f"` form, one each for `pro-designer`, `idea-validator` and `skill-designer`, describing what each does and when it starts as their `SKILL.md` files state; one "Task coding and review" line for the UI tells checklist read on interface tasks; two "Where it writes" lines for `docs/business/<slug>/` and `.temp/viber/idea-validator/`.
- Verification: `git grep -n "id=\"pro-designer\"\|id=\"idea-validator\"\|id=\"skill-designer\"\|ui-tells\|docs/business\|idea-validator/" -- docs/viber-functions.html` -> each of the three section ids, the checklist line and both write locations present; `git grep -n "docs/business\|\.temp/viber/idea-validator" -- viber/skills/idea-validator/SKILL.md` -> the same two paths on the code side
- DoD: the catalogue holds a `section` with `id="pro-designer"`, one with `id="idea-validator"` and one with `id="skill-designer"`, each with a `data-title`, an `h2` with the count span and a `ul class="f"` list; the pro-designer section states the trigger of the narrowed description; the "Task coding and review" section names `ui-tells.md` as the read on a task rendering or styling an interface; the "Where it writes" section lists `docs/business/<slug>/` and `.temp/viber/idea-validator/`
<!-- /TASK -->

<!-- TASK -->
### T8 - Cover a newline-terminated manifest in the release test
- TDD: none
- Covers: AC8
- Uses: none
- Depends-on: none
- Files: tests/github/release.test.ts
- Delivers: the fixture can write the manifest with or without a trailing newline, and a case runs `release.sh` on a manifest that already ends in a newline and checks the bumped file.
- Verification: `node --test --test-name-pattern "already ends in a newline" tests/github/release.test.ts` -> 1 test passes (skipped, not failed, where `jq` or `bash` is missing); `git grep -n "endsWith" -- tests/github/release.test.ts` -> an assertion that the file does not end in two newlines
- DoD: the default fixture still writes the manifest without a trailing newline; a case named for a manifest that already ends in a newline bumps its version and asserts the file ends in exactly one newline; every existing case keeps its name and assertions
<!-- /TASK -->

## Contracts

### C1 - UI tells checklist

File: viber/references/ui-tells.md

Read by agents as `<refs>/ui-tells.md`. Headings: the `##` headings of `viber/skills/pro-designer/references/anti-slop.md`, the same set. Body: one line per tell, overlapping tells merged into one line. Size: at most 4096 bytes. Never contains: `SKILL.md`, `Scope discipline`, `this skill`, U+2014, U+2013.
