Title: "Fix the 13 confirmed superui audit findings"


## Goal
Every one of the 13 confirmed findings from the `2026-07-26-superui` audit is closed at its root cause: the six `.ts` script defects are fixed and locked behind `node --test` regression suites, and the seven prompt/documentation contract defects state what the code actually does. The `superui` plugin ships no code path where an invented value renders as measured, no gate that passes a defective bundle, and no prompt that instructs a worker to produce output its own consumer rejects.

## Context
A `superfix:code-auditor` sweep of `superui` dispatched 14 detectives over 35 files and 181 artifact pairs; every report was independently replayed by a critic on a clean `git worktree`, yielding 13 confirmed findings (severity 6.5 to 2.0, 0 refuted). Full evidence, repro commands and per-finding fix sketches: `.temp/code-reviewer/2026-07-26-superui/findings.md`. The defects cluster into three root themes the critics identified: an unmeasured value can escape its provenance marker (findings 3, 8, 12), a deterministic gate can pass a defective bundle (findings 4, 5, 7), and a prompt can contradict the code it drives (findings 1, 9, 11, 12).

Two scope decisions, both confirmed with the user: test suites live in a new repo-root `tests/superui/` so nothing new ships inside the installed plugin, and finding 5 is fixed by loosening the canonical-line parse plus treating zero cited refs as a finding, leaving `validate_bundle.ts`'s CLI signature untouched.

Two things are deliberately NOT in scope. `build_registry.ts` reporting all shape errors in one pass (named in finding 1 as secondary hardening) - the prompt fix in Task 8 removes the trigger, and the multi-error report is a separate improvement with no confirmed defect behind it. The vendored decoders `scripts/vendor/{png,jpeg}-decode.ts` - the audit's largest coverage gap, never swept, and no finding names them.

Repo reality every task must respect: no build, no lint, no npm, no `package.json`. Scripts are ESM TypeScript run by Node's native type stripping, `node:` builtins only. Skill and agent markdown follows `.claude/rules/_skills.md` - bullets not prose, no tables, deltas not completeness.

## Acceptance criteria
1. Each of `measure_geometry.ts`, `build_registry.ts`, `render_design_md.ts`, `validate_bundle.ts`, `check_contrast.ts` can be imported from a test file without executing its CLI, and each still runs unchanged from the command line.
2. `fitRadius` returns the constructed ground-truth radius (0, 4, 8, 12, 16, 20 on hard-edged fixtures) instead of a value short by 2-3 px.
3. A `textStyles[]` entry or token that reaches the registry without `proposed: true` inside a `foundation: "proposed"` fragment is rejected, and a fragment's `resolved` list no longer clears an `unknowns` entry when the fragment flags nothing proposed.
4. A `usedFor` value containing `|` or a newline renders as exactly one table cell in sections 3.2 and 3.5, and a measured `notes` value on a 3.2 token renders even when no 3.2 row is proposed.
5. Section 3.10 renders a proposed dark value distinguishably from a measured one.
6. A `canonical:` line carrying leading markdown decoration is parsed as a screen reference, and a bundle whose non-empty satellites cite zero canonical screens yields a finding instead of `CLEAN`.
7. `check_contrast.ts` rejects an out-of-range `rgb()` component and a non-string JSON `fg`/`bg` with a usage message and exit 2, reserving exit 1 for a genuine AA failure, and `pro-designer/SKILL.md`'s stated reading of those exit codes matches.
8. A colors fragment authored strictly from `agents/foundation-analyst.md`'s stated output schema passes `build_registry.ts` on the first run, and no file in the plugin points at the nonexistent "Task 2" document.
9. A second `/superui:design-extractor` run on the same source directory ships no spec whose slug is absent from the current `inventory.md`.
10. Every `> NEEDS INPUT` item a `spec-writer` records reaches the builder's return message as an item, not a count.
11. `design-extractor-builder/SKILL.md`'s stated reason for not gating on reviewer findings is factually true, and `agents/bundle-reviewer.md` no longer claims every bundle value came from a deterministic script.
12. `skills/pro-designer/references/accessibility.md`'s contrast-gate invocation resolves correctly when `pro-designer` runs in an arbitrary host project.
13. `superui/CLAUDE.md` states the real agent ownership split and contradicts itself nowhere about `source-scout` or `check_env.sh`.
14. Root `README.md` and root `CLAUDE.md` state six agents under the correct dispatcher, root `README.md` no longer advertises `pro-designer` as teaching 60-30-10, and root `CLAUDE.md` reflects the new `tests/` tree instead of claiming the repo has no test tooling at any level.

