# viber/scripts - the plugin-level bundled scripts

This directory holds the scripts more than one viber skill or agent calls: the config parser, the run lifecycle (`plan-path.sh`, `plan-index.sh`, `commit-task.sh`, `archive-run.sh`, `run-clock.sh`), the switch fragment selector and the GitHub and browser wrappers. A script used by one skill alone lives under that skill's `scripts/`, and the hook scripts live under `hooks/scripts/`.

## Terms

- Run scripts: the four bash scripts of the run lifecycle, `plan-path.sh`, `plan-index.sh`, `commit-task.sh` and `archive-run.sh`, all `set -euo pipefail`, each refusal a distinct exit code.
- GitHub wrappers: the `#!/bin/sh` scripts `issue-facts.sh`, `issue-templates.sh`, `issue-create.sh`, `post-comment.sh`, `pr-facts.sh`, `pr-create.sh` and `qa-comment.sh`. Each prints a fixed `KEY=value` block on stdout only after `gh` succeeded and its output parsed (self-verifying), and one `ERROR <script>: ...` line on stderr otherwise; the bash scripts report on stderr as `error: ...`.

## Relationships

- Callers: `config.sh` is preloaded by `implementor`, `planner`, `e2e` and run by `skills/extension/scripts/extension.sh` and `hooks/scripts/plan-gate.sh`; `run-clock.sh` by `implementor` alone; `switch-text.sh` by `implementor`, `planner`, `intent`, `fixer`, `triage` and `prototype`; `plan-path.sh` by `planner`, `implementor`, `intent` and `fixer` (`--start`/`--checkout`) and `e2e` (no argument, the latest run); `plan-index.sh` by `planner` (validate) and `implementor` (`--split`); `commit-task.sh` by `implementor` and `e2e` (`--e2e`); `archive-run.sh` by the `closeout` agent alone.
- GitHub callers: `issue-facts.sh` by `intent`, `fixer`, `triage`, `prototype`; `issue-templates.sh` and `issue-create.sh` by `create-issue`, `intent`, `fixer`; `post-comment.sh` by `intent`, `triage`, `prototype`; `pr-facts.sh` and `pr-create.sh` by `create-pr`; `qa-comment.sh` by `create-pr` and the `implementor` close (`qa.true.md`); `open-page.sh` by `setup`, `help`, `prototype`; `check-playwright.sh` by `e2e`.
- Sibling calls inside the directory: `switch-text.sh`, `issue-templates.sh` and `pr-facts.sh` run `bash "$here/config.sh"`; `run-branch.sh` runs `config.sh --branching` and `sh issue-facts.sh` (for the issue type); `plan-path.sh` sources `run-branch.sh`.

## Contracts

- `run-branch.sh` is a library: sourced by `plan-path.sh`, never invoked, mode 100644 in the index, no `set` line of its own. Its functions return 6 with the reason on stderr and HEAD, index and tree untouched; `plan-path.sh` turns that into its own exit 6 (run branch could not be set).
- Exit codes of the run scripts are part of their contract, each documented in the header: `plan-path.sh` 2 argv, 3 no plan, 4 bad `--into` target, 5 copy failed, 6 run branch; `plan-index.sh` 2 unusable plan or argv, 3 no task blocks, 4 broken task contract; `commit-task.sh` 2 bad arguments, 3 no such task, 4 no change (or a bad `--landed`), 5 staging or commit failed with `status.md` restored; `archive-run.sh` 2 argv outside `docs/<runs>/`, 3 destination exists, 4 run unfinished, 5 a git step failed.
- `archive-run.sh` takes the run directory exactly as `plan-path.sh` printed its `path:` line minus `/plan.md`, and refuses (never corrects) any path outside `docs/<runs>/`, an absolute one or one with a `..` segment.
- `commit-task.sh` exports `GIT_LITERAL_PATHSPECS=1`: every path it stages is one exact path, never a pattern (bracketed App Router segments). It refuses any `.temp/` path, and derives the `work/` trail paths it stages from the task id or round, never from the caller.
- `qa-comment.sh` posts at most once per run: the body's first line `<!-- viber:qa <path> -->` marks the run key (the qa file's parent directory name), and a comment already carrying the same key, from the run directory or its archive, yields `STATUS=skip`, `REASON=exists`. It writes the body to `.temp/viber/qa-comment/<run key>.md` and leaves it there.
- The `--branching` report of `config.sh` is read by `run-branch.sh` and `pr-facts.sh` only; every other reader takes the default block.

## Commands

- Each script's test is `tests/viber/<basename>.test.ts`, integration tier (CI only). `run-branch.sh` has no file of its own: `tests/viber/plan-path.test.ts` covers it through `--branch`, `--start`, `--checkout` and `--land`.

## Change together

- The issue reference grammar (`<N>`, `#<N>`, or `https://<host>/<owner>/<repo>/issues/<N>` with any `#...` fragment or `?...` query dropped) is parsed the same way in `issue-facts.sh` and `post-comment.sh`; `qa-comment.sh` applies it to `--pr` pull request URLs.
- A `config.sh --branching` line added or renamed: its readers in `run-branch.sh` and `pr-facts.sh`.

## Traps

- The GitHub wrappers are `#!/bin/sh` and must stay POSIX: CI runs them under every POSIX shell present, and the portability sweep flags bash-only syntax in them. The other scripts are bash and may use arrays and `[[ ]]`.
- A failed GitHub call is never retried by its caller: `post-comment.sh` exits 1 when whether the comment landed is unknown, and `pr-create.sh` exits 1 after the push may already have happened (its ERROR line names the pushed branch); the caller reports instead.
- `issue-create.sh` never removes a created issue when applying its type fails: the failure is reported as `TYPE=dropped` (benign: types not enabled, 403, 404) or `TYPE=error`, with exit 0.
