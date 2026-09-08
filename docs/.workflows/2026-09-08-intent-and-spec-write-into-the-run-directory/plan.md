# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "Intent and spec write into the run directory"
Intent: docs/.workflows/20260908-intent-spec-in-run-dir-intent.md
Plan: C:\Users\dariu\.claude\plans\zany-dancing-stream.md

---
<!-- HEADER -->

## Goal
The `intent` skill creates the run directory `docs/.workflows/<YYYY-MM-DD>-<slug>/` and writes `intent.md` inside it; `superspec` writes `spec.md` into that same directory; `decompose.sh` adopts that directory as its working dir, so `status.md`, `base.md`, `plan-header.md`, `plan.md`, `tasks/` and `implementation/` land next to the intent and the spec instead of beside a flat pair of files.

## Context
Today three names are derived independently: `intent` slugs the interview title with `date +%Y%m%d`, `superspec` slugs the spec title with the same compact date, and `decompose.sh` builds `docs/.workflows/$(date +%F)-<plan-slug>/` only at build time. The result is a flat `docs/.workflows/` holding a run directory plus two unrelated sibling files per run, with mismatched date formats. Moving both documents inside the run directory gives one directory per run from the first interview question onward, and lets `cleanup-run.sh` remove everything with the `rm -rf` it already performs. The chain in between (`simpleplan`, `superplan`, their templates, the plan reviewers, `simplebuild`/`superbuild`, `resolve-input.sh`, `superdev-changelog-writer`) already copies `Intent:`/`Spec:` verbatim, so it is untouched; `cleanup-run.sh` and its test suite are untouched too, its per-path removal staying as the handler for runs started before this change.

## Acceptance criteria
1. `decompose.sh` uses the directory holding the plan's `Intent:` file as its working dir when that directory sits under `docs/.workflows/`, falling back to the `Spec:` file's directory, and only then to the current `docs/.workflows/<YYYY-MM-DD>-<plan-slug>/` derivation; an absolute path carrying a `docs/.workflows/` segment is normalised to the repo-relative form.
2. A failing `decompose.sh` run never deletes an adopted, pre-existing run directory, so a user's `intent.md` and `spec.md` survive a decomposition error.
3. `tests/superdev/decompose.test.ts` covers adoption from `Intent:`, adoption from `Spec:` alone, `Intent:` winning over a `Spec:` in a different directory, the absolute-path form, the fallback when neither path sits under `docs/.workflows/`, and survival of the adopted directory on a failed run; the whole suite passes.
4. `intent` creates `docs/.workflows/<YYYY-MM-DD>-<slug>/` and writes the synthesis to `intent.md` inside it, appending `-2`, `-3`, … to the **directory** name on collision in a fresh run, while a resume overwrites its own file in place.
5. `intent` resumes from an argument naming a file called `intent.md` instead of one ending in `-intent.md`, and its `## Run` date is `date +%F`, matching the `Date:` field the synthesis template already asks for.
6. `superspec` writes a new spec to `spec.md` inside the run directory taken from the handoff's `intent:` path, and creates `docs/.workflows/<YYYY-MM-DD>-<slug>/` itself with the same convention when the handoff carries no `intent:`; refining an existing spec still overwrites it in place.
7. `superdev/README.md`, the root `CLAUDE.md`, the `cleanup` comment in `superdev/skills/setup/assets/config.yml` with its assertion in `tests/superdev/bootstrap.test.ts`, and the spec-path label in `docs/assets/superdev-flow.svg` describe the new layout.

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - feat(superdev): decompose.sh adopts the run directory from Intent/Spec
- Covers: criteria #1, #2, #3
- TDD: none

### Dependencies
- none - this task is the contract the two skill tasks write against.

### Files
- modify - superdev/scripts/decompose.sh (`run_dir_of`, `dir`, `spec_path`, `intent_path`, `cleanup_on_failure`)
- modify - tests/superdev/decompose.test.ts (`simplePlan`, `superPlan`, `run`, `todayISO`, `seedInitialCommit`)

### Test Commands
#### Build
- none - the repo has no build step (markdown, JSON and shell only).

#### Tests
- `node --test "tests/superdev/decompose.test.ts"`
- `node --test "tests/**/*.test.ts"`

### Approach
1. Move the `Spec:` and `Intent:` extraction blocks (`spec_line`/`spec_path` with its `exit 4`, `intent_line`/`intent_path` with its stderr warning) above the `dir=` assignment, keeping their current text and exit codes unchanged.
2. Add `run_dir_of()` taking one path: return empty for an empty argument; take `dirname`, replace `\` with `/`, return empty unless the result matches `*docs/.workflows/*`, otherwise keep the tail after the last `docs/.workflows/` and echo `docs/.workflows/` plus that tail's **first segment only**, so a deeper-nested path still adopts the run directory itself rather than a subdirectory of it.
3. Set `dir` to `run_dir_of "$intent_path"`, falling back to `run_dir_of "$spec_path"`, and only then to the existing `docs/.workflows/$(date +%F)-${slug}`; leave `slug` computed as today because `cleanup-run.sh` and the commit message still read it.
4. Leave `dir_preexisted` and `cleanup_on_failure` as they are - an adopted directory always pre-exists, so the trap already refuses to remove it; extend the header comment block to document the adoption rule and this guarantee.
5. Add the six test cases from criterion #3 to `tests/superdev/decompose.test.ts` using the existing `withGitRepo`, `seedInitialCommit`, `simplePlan`, `superPlan`, `specFixture`, `taskBlock`, `run`, `todayISO` and `slash` helpers, writing the intent/spec fixtures into `<repo>/docs/.workflows/2026-01-02-adopted/` rather than the out-of-repo `withTempDir` directory the current intent tests use.

### Edge cases
- `Intent:` naming a file that does not exist: unchanged - warning on stderr, the path is dropped, and adoption then falls through to `Spec:` or to the derived name.
- `Spec:` naming a file that does not exist: unchanged `exit 4`; because extraction now runs before the directory is created, no working dir is left behind at all.
- A file sitting directly in `docs/.workflows/` (a run started before this change): `dirname` yields `docs/.workflows` with no trailing slash, the pattern does not match, and the derived name is used - old plans keep decomposing exactly as today.
- A Windows-style absolute path (`C:\...\docs\.workflows\<run>\intent.md`): backslashes are normalised before the match, so adoption still fires.
- A path nested deeper than one level (`docs/.workflows/<run>/sub/intent.md`): only the first segment is adopted, so the working dir is `docs/.workflows/<run>`, never `<run>/sub`.

### Contracts
- `run_dir_of <path>` -> repo-relative run directory on stdout, or empty output; never exits non-zero.
- The stdout index keeps its current shape (`workdir:`, `status:`, `base:`, `plan-header:`, `plan:`, optional `spec:`, optional `intent:`, then `<task-file><TAB><title>`); only the `workdir:` value can now be an adopted directory.

### DoD
`node --test "tests/**/*.test.ts"` is green, including the six new adoption cases and every pre-existing decompose case.

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - feat(superdev): intent creates the run directory and writes intent.md
- Covers: criteria #4, #5
- TDD: none

### Dependencies
- Task 1 - blocks: the directory `intent` creates is only honoured once `decompose.sh` adopts it.

### Files
- modify - superdev/skills/intent/SKILL.md (frontmatter `argument-hint`, `## Run`, `## Resume from a file`, `## Synthesis`, `## Handoff - the user picks the track [GATE]`)

### Test Commands
#### Build
- none - editing markdown is shipping; the repo has no build and no lint.

#### Tests
- `node --test "tests/**/*.test.ts"` - no test covers this file; the command must stay green as a no-regression check.

### Approach
1. In `## Run`, change the preload to `date +%F` and relabel it so the value is the `<YYYY-MM-DD>` the synthesis template's own `Date:` field already expects.
2. In `## Synthesis`, replace the write target with: write the synthesis to `docs/.workflows/<Date>-<slug>/intent.md` (`<Date>` from `## Run`, `<slug>` = short title as slug); on a fresh run whose directory already exists, append `-2`, `-3`, … to the **directory** name; a resume overwrites its own `intent.md` in place. Phrase it so the directory is created by the `Write` call itself and the collision check by `Glob` - both already in `allowed-tools` - never by a `mkdir` shell call, which the skill's `Bash(date:*)` entry would not pre-approve and which would prompt mid-interview.
3. In `## Resume from a file`, replace both `-intent.md` recognition rules with "a path to an existing file named `intent.md`" and "names an `intent.md` path that does not exist", leaving the two branches' behaviour unchanged.
4. Change the frontmatter `argument-hint` from `[path-to-intent.md]` to `[path-to-run-dir/intent.md]` so the hint matches the new recognition rule.
5. Leave `## Handoff` passing `intent: <path to the intent file>` verbatim to `simpleplan` / `superspec` and the `intent <path>` resume hint in the stop branch - both now carry the nested path with no wording change needed.

### Edge cases
- Argument that is neither an `intent.md` path nor an existing file: unchanged - fall through to the normal flow using the argument text as the request.
- A resume whose file was written before this change (flat `<date>-<slug>-intent.md`): out of scope by the intent's own decision; the user re-runs the interview.

### Contracts
- Intent file path: `docs/.workflows/<YYYY-MM-DD>-<slug>[-N]/intent.md`, passed to the next skill on an `intent: <path>` line, unchanged in shape.

### DoD
`superdev/skills/intent/SKILL.md` names no `docs/.workflows/<date>-<slug>-intent.md` file shape anywhere, its `## Run` preload is `date +%F`, its `argument-hint` and both resume rules name `intent.md`, and `node --test "tests/**/*.test.ts"` stays green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - feat(superdev): superspec writes spec.md into the run directory
- Covers: criterion #6
- TDD: none

### Dependencies
- Task 1 - blocks: the directory `superspec` writes into is only honoured once `decompose.sh` adopts it.
- Task 2 - blocks: the handoff path `superspec` derives its directory from is defined there.

### Files
- modify - superdev/skills/superspec/SKILL.md (`## Publish`, `## Hand off`)

### Test Commands
#### Build
- none - editing markdown is shipping; the repo has no build and no lint.

#### Tests
- `node --test "tests/**/*.test.ts"` - no test covers this file; the command must stay green as a no-regression check.

### Approach
1. In `## Publish`, change the date preload to `date +%F` and relabel it `Save date (YYYY-MM-DD)`.
2. Replace the **New spec** bullet with two cases: the handoff carried `intent: <path>` -> save to `spec.md` in that path's own directory; no `intent:` in the handoff -> create `docs/.workflows/<date>-<slug>/` (`<date>` = the preload value, `<slug>` = a short title as slug, `-2`/`-3` on collision) and save `spec.md` there.
3. Leave the **Refining an existing spec** bullet untouched - it overwrites in place and skips the date/slug step.
4. In `## Hand off`, replace the illustrative `docs/.workflows/<date>-<slug>.md` with `docs/.workflows/<run>/spec.md`, keeping "the saved spec filepath" as the operative instruction.

### Edge cases
- Handoff carries `intent:` naming a file outside `docs/.workflows/`: the spec is written next to it, and `decompose.sh` falls back to the derived working dir - no error, the current behaviour.
- Refine on a spec still living flat in `docs/.workflows/`: overwritten in place, no relocation.

### Contracts
- Spec file path: `docs/.workflows/<YYYY-MM-DD>-<slug>[-N]/spec.md`, passed to `superplan` as the sole argument and written into the plan's `Spec:` line, unchanged in shape.

### DoD
`superdev/skills/superspec/SKILL.md` names no `docs/.workflows/<date>-<slug>.md` spec shape, and `node --test "tests/**/*.test.ts"` stays green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - docs(superdev): describe the run-directory layout
- Covers: criterion #7
- TDD: none

### Dependencies
- Task 2 - blocks: the intent path shape documented here.
- Task 3 - blocks: the spec path shape documented here.

### Files
- modify - superdev/README.md (Quick start steps 3 and 6, the `cleanup` switch row, the `intent` and `superspec` skill rows)
- modify - CLAUDE.md (the superdev bullet, the `docs/.workflows/` repository-layout entry, the host-repo `docs/` invariant)
- modify - superdev/skills/setup/assets/config.yml (`cleanup` comment)
- modify - tests/superdev/bootstrap.test.ts (the asserted `cleanup:` line)
- modify - docs/assets/superdev-flow.svg (the `superspec` node's mono path label)

### Test Commands
#### Build
- none - editing markdown, YAML, JSON and SVG is shipping; the repo has no build and no lint.

#### Tests
- `node --test "tests/superdev/bootstrap.test.ts"`
- `node --test "tests/**/*.test.ts"`

### Approach
1. In `superdev/README.md`, replace `docs/.workflows/<date>-<slug>-intent.md` with `docs/.workflows/<run>/intent.md` and `docs/.workflows/<date>-<slug>.md` with `docs/.workflows/<run>/spec.md`, and reword the two "workdir, spec, intent" phrasings to "the run's working directory".
2. In `CLAUDE.md`, replace the single `docs/.workflows/<date>-<slug>-intent.md` occurrence with `docs/.workflows/<run>/intent.md` (no spec shape appears there), reword the one "workdir, spec, intent" phrasing, and reword the `docs/.workflows/` repository-layout entry plus the host-repo `docs/` invariant so both describe intent and spec as living inside the run directory.
3. Change the `cleanup` comment in `superdev/skills/setup/assets/config.yml` to `# Remove the run's working dir (docs/.workflows/<run>) after a completed build`, keeping the file's existing column alignment, then mirror the new line byte-for-byte into the single asserted string in `tests/superdev/bootstrap.test.ts` (the `defaults: … cleanup=false` summary asserted elsewhere is unaffected).
4. Replace the `superspec` node's mono label in `docs/assets/superdev-flow.svg` with `docs/.workflows/&lt;run&gt;/spec.md` - shorter than the current label, so the 440-wide node still fits it.

### Edge cases
- The `config.yml` comment is asserted verbatim by a test: change both in the same task or the suite fails.
- The SVG is embedded by `superdev/README.md` through a relative path; edit the label text only, never the file's location or its viewBox.

### Contracts
- none.

### DoD
No `docs/.workflows/<date>-<slug>-intent.md` or `docs/.workflows/<date>-<slug>.md` path shape survives in `superdev/README.md`, `CLAUDE.md`, `config.yml` or the flow SVG, and `node --test "tests/**/*.test.ts"` is green.

<!-- /TASK -->
