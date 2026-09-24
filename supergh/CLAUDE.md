# supergh - commits, issues, pull requests

Three skills, no agents, no hooks: `commit` (model-invocable, `model: haiku`, `context: fork`),
`create-issue` and `create-pr` (user-only: `disable-model-invocation: true`, `model: sonnet`,
interactive, never forked). Every git/gh mutation goes through a bundled script; a skill body
never composes a `git` or `gh` write itself.

## Layout

```
shared/scripts/preflight.sh      preload of create-issue + create-pr: GH_PRESENT, GH_AUTH, BRANCH, UPSTREAM, REPO
shared/scripts/body-path.sh      runtime: .temp/<prefix>/<ts>-<slug>.md, parent dir created first
skills/commit/scripts/           commit-args.sh (sourced parser), commit-context.sh (preload),
                                 commit.sh, commit-selfcheck.sh
skills/commit/references/        commit-conventions.md, cat-preloaded into the fork
skills/create-issue/scripts/     create.sh (gh issue create + REST PATCH of the issue type)
skills/create-pr/scripts/        check-base.sh, pr-facts.sh, create.sh (draft hardcoded)
skills/*/references/auto-fill.md binding auto-fill heuristics, one per interactive skill
```

## Two script dialects

- `commit`'s four scripts are bash (`#!/usr/bin/env bash`, arrays, `[[ ]]`, `BASH_REMATCH`) and
  are called DIRECTLY by quoted path under the skill's bare `allowed-tools: Bash`.
- `shared/` and the `create-issue` / `create-pr` scripts are POSIX `#!/bin/sh`: keep them free
  of bashisms. Their runtime calls go through the interpreter, `sh "${CLAUDE_PLUGIN_ROOT}/..."`,
  pre-approved by one `Bash(sh:*)` entry. That is why `create.sh`, `check-base.sh` and
  `pr-facts.sh` sit at 100644 while `body-path.sh` (also called via `sh`) is 100755. This is a
  deliberate divergence from the root's direct-invocation rule: moving a call to the direct form
  needs the exec bit AND a per-script `Bash(<path>:*)` pattern in the same edit, or the call
  starts prompting. Only `preflight.sh` is a `!` preload here, invoked directly, 100755.

## Script contracts (the skill trusts every block)

- Scripts report facts as a `KEY=VALUE` block; STOP / re-ask logic stays in the skill, which
  never re-runs the probe or re-verifies the result. `preflight.sh`, `check-base.sh` and
  `pr-facts.sh` always exit 0 (fail-open, empty values); exit 2 means bad arguments.
- `create.sh` (both) prints the URL block only after parsing a well-formed github.com URL from
  gh's output; otherwise exit 1 with one `ERROR` line on stderr. Bodies always travel through
  `--body-file`, never inline. `create-pr/scripts/create.sh` hardcodes `--draft`.
- `create-issue/scripts/create.sh` applies `--type` by REST PATCH after creation (`gh issue
  create` has no type flag). A PATCH failure never rolls the issue back: it reports
  `TYPE=dropped` (benign: types disabled, 403/404, validation) or `TYPE=error`, with `TYPE_ERROR`.
- `body-path.sh` resolves against the caller's cwd, not the repo root, and writes under
  `.temp/create-issue/` / `.temp/create-pr/` (per skill, not `.temp/supergh/`). Its slugify
  transliterates Polish diacritics and runs under `LC_ALL=C`.

## commit invariants

- `commit-args.sh` is the ONE selector parser, sourced by both `commit-context.sh` (measures the
  set) and `commit.sh` (stages it); they drifted when each parsed on its own. Change selector
  semantics there only.
- Selector: issue refs (`#N` with non-alnum boundaries, GitHub `/issues/N` links) are stripped
  first and become a `Refs:` footer; an existing path (disk, index or HEAD) wins over the
  keyword `all`; tokens split on whitespace and commas; a path with a space works only as the
  sole selector. No existing path plus a path-shaped token (`/` or `\`) -> mode `missing`:
  nothing committed, `commit.sh` exits 3. Never fall back to committing everything when paths
  were named; the skill never re-runs `commit.sh` with a wider selector.
- Mode `paths` stages tracked paths via `add -u` and untracked ones only when no ignore rule
  covers them, then commits under a pathspec so other staged changes stay out.
- `commit-context.sh` diffs against the empty tree on an unborn HEAD and caps the diff at 400
  lines. It runs `set -uo pipefail` without `-e` (best-effort preload).
- Proof of landing: the `Before SHA` preload (`(none)` when unborn) is compared to HEAD by
  `commit-selfcheck.sh`, which prints `VERIFIED` / `FAILED` and exits 0 on both.
- The fork never pushes, never branches, never adds `Co-Authored-By`, returns one line.

## create-issue / create-pr invariants

- Template authority: `.github/ISSUE_TEMPLATE/*.yml|*.yaml` and
  `.github/pull_request_template.md` are read fresh every run and parsed in-context (no
  `yq`/parser); labels and headings stay verbatim. `create-pr` falls back to a built-in
  skeleton when the PR template is missing.
- Auto-fill uses only what is already in the session, never a fresh `Read`/`Glob`/`Grep`; when
  in doubt the field is MISSING and gets asked. Required fields are never bypassed.
- The preview loop (Save / Edit field / Cancel) and the pre-write echo of the exact body are
  never skipped. Output is exactly two lines.
- `create-pr`: refuses `main`/`master`/`develop` and an unpushed branch (never pushes); GitFlow
  base routing (`hotfix/*` -> `main`, `feature|fix|refactor/*` -> `develop`) is only a default
  and is always confirmed; issue number cascade is argument -> branch `(task|issue).N` ->
  session -> ask; title `[#N] <issue title>`. `gh pr edit`, `gh pr ready`, labels and reviewers
  are deliberately out of scope.
- Several user-facing prompts in `create-pr` are written in Polish and marked
  "language-appropriate": the model translates them to the conversation language.

## Tests

`node --test "tests/supergh/*.test.ts"`. One file per script by basename, except the
per-skill scripts: `create-issue.test.ts` covers `create-issue/scripts/create.sh`,
`create-pr.test.ts` covers `check-base.sh`, `pr-facts.sh` and `create-pr/scripts/create.sh`.
