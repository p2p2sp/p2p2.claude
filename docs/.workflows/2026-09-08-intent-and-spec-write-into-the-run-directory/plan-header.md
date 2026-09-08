Title: "Intent and spec write into the run directory"
Intent: docs/.workflows/20260908-intent-spec-in-run-dir-intent.md


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

