# viber - interview, plan, build, remember

Every skill, agent and script here is a stage of one run, so most edits touch a contract two or
three files share. `PRODUCT.md` holds the product assumptions (unit tests far outnumber
integration tests, integration last and serial, one full-suite run at the close) that
`references/test-strategy.md` and `references/integration-tests.md` turn into rules: a change to
how tests are planned or run answers to it. `README.md` and `skills/setup/assets/usage.html` (the
guide `setup` opens in the browser, hand-written, no generator) are the user's view of the same
commands and switches. After any change to a user-facing command, its arguments, a switch, a
`viber.yml` key or a default, re-read `usage.html` against the change and fix it in the same edit,
since nothing else catches a stale page.

## Layout

```
skills/<name>/SKILL.md   11 skills; setup, memory, rules, commit bundle their own scripts/
skills/<name>/           files a skill reads at one step: planner templates/ + references/adr-tasks.md,
                         intent references/issue.md, triage assets/comment.md, commit
                         references/commit-conventions.md, setup templates/viber.yml + assets/
agents/                  13 agents, each dispatched only by the callers its description names
                         (update it when a skill starts or stops dispatching the agent)
scripts/                 11 plugin-wide scripts, shared across skills and agents
references/              read at runtime by agents through the `refs:` dispatch line
hooks/                   SessionStart manifest + PreToolUse plan gate
```

A skill's own script is called through `${CLAUDE_SKILL_DIR}` (memory, rules, setup's
`bootstrap.sh` and `open-page.sh`) or `${CLAUDE_PLUGIN_ROOT}/skills/<name>/` (commit, setup's `merge-settings.sh`),
its `allowed-tools` pattern in the same form.

## The chain

- `intent` (interview) or `fixer` (RED reproduction test + diagnosis) -> `planner` -> `implementor`.
  `planner` treats any other input as unresolved and suggests `intent`; `implementor` refuses a
  draft (a landed plan with no TASK block). `planner`, `implementor` and `tdd` (via `task-coder`)
  are `user-invocable: false`; `setup`, `triage`, `e2e`, `memory` and `rules` are user-only.
- `intent` and `fixer` take an issue reference (a number, `#N` or a URL, the whole argument) only
  under `issues: true`; with `issues: false` it is plain input text (no fetch, save, comment or
  Issue line). An `intent` run with no reference can save its confirmed summary as a new issue.
  Either path rides an `Issue: <full issue URL>`
  line on the handoff to `planner`, which writes it as the plan frontmatter's `issue:` key;
  `plan-index.sh --split` carries that key into `spec.md`'s frontmatter.
- `triage` sits before the chain: it assesses one issue, names `/viber:fixer #N`, `/viber:intent #N`
  or a one-line summary for pasted text, and invokes nothing. It runs inline, never forked (a
  fork's return hands the main session a turn to start `fixer`), with its `disallowed-tools:`
  holding until the next user message. The publish question is asked in prose, so the answer
  lifts that block: in the publishing turn only the body's rule keeps `Skill` unused, and
  `post-comment.sh`, past its one-turn pre-approval, can prompt.
- `commit` stands outside the chain: model-invocable, `model: haiku`, `context: fork`, used at any
  point outside a build. A build never calls it; its commits go through `commit-task.sh`.

## Orchestrator contract

- `implementor` opens no file and writes none. It knows only the `config.sh` and `run-clock.sh`
  preloads, `plan-path.sh` and `plan-index.sh` stdout, and agents' return lines. So every
  script's stdout format and every agent's `## Output` vocabulary is an interface: renaming a
  line on one side without the branch reading it breaks the build silently.
- Every agent returns `VERDICT: DENIED` plus `REASON: <tool>: <call>` on a tool call the harness
  refuses (the auditors in place of their `AUDIT:` line), and every caller, the plan gate
  included, branches on it.
- Only coder, reviewer and repair-coder dispatches carry `model`: the task's profiled tier
  (repair-coder: `sonnet`, raised only by `retry`) clamped into `tiers.min`..`tiers.max`.
- Coder output feeds the commit: `EXTRA:` becomes `--with`, `DEFERRED:` becomes `--defer`, stored
  as `deferred:` in `status.md` and handed to the owing task's coder and reviewer.
- task-coder, task-reviewer, test-runner and e2e-writer share a "Stop what you started" section;
  implementor's `SendMessage` on a "stopped with background work" notice is its other half.
- Coders and reviewers keep git read-only (never `stash`, `checkout`, `restore`, `clean`):
  parallel tasks share one working tree.

## Commit ownership

- Only scripts commit: `plan-index.sh --split` (the decomposition), `commit-task.sh` (every task,
  repair, close and e2e commit), `archive-run.sh` (the archive), and outside a build the `commit`
  skill's `commit.sh`. No agent and no skill runs `git add` or `git commit`. `planner` leaves a
  landed draft uncommitted; the `memory` and `rules` commands leave their writes unstaged.
- `commit-task.sh` never takes a subject from its caller (a task commit is the plan's
  `T<n> - <title>` heading, no type prefix). It stages only the paths it is named, as literal
  pathspecs (App Router `[id]` paths), refuses `.temp/`, and adds the run's `work/` trail itself.
- Never two `commit-task.sh` calls at once: each rewrites the git index and `status.md`.

## The commit skill

- `commit-args.sh` is the ONE selector parser, sourced by `commit-context.sh` and `commit.sh`:
  change selector semantics there only. An existing path (disk, index or HEAD) wins over the
  keyword `all`; a path-shaped token that exists nowhere is mode `missing`, `commit.sh` exits 3,
  and the fork never retries with a wider selector.
- The preload passes the arguments as `'$ARGUMENTS'`: Claude Code substitutes the text before the
  shell parses the line, so single quotes keep `$`, backticks and backslashes literal. An
  apostrophe breaks it, which the description rules out.
- The `git rev-parse` and `cat` preloads are inline commands under a bare `Bash` allow, not
  bundled scripts: the one exception to the literal-script-line preload form.

## The run directory

`docs/<runs>/<stamp>_<slug>/` (`docs/_specs/` by default), landed by `plan-path.sh --land`, which
copies the plan-mode file (never moves it), points the copy's frontmatter `source:` at the copy
and lands a round into the draft its frontmatter `into:` key names:

- `plan.md` - frozen once it carries a task block; a draft is relanded in place, round by round.
- `spec.md`, `tasks/<id>.md` - `plan-index.sh --split`, rebuilt from scratch on every call. A task
  file is a coder's whole input; a coder never sees the plan.
- `status.md` - `commit-task.sh` is its only writer (`plan-index.sh` creates it empty);
  `plan-index.sh`, `plan-path.sh` (`open:` lines) and `archive-run.sh` read it.

`archive-run.sh` moves the directory to `docs/<specifications>/<key>/` (`docs/specs/` by default),
dropping the enumerated scaffolding `plan.md`, `status.md`, `tasks/`, `work/` (anything else
travels), and refuses a run with a task in neither `done` nor `skipped`. `closeout` edits
`spec.md` before calling it, so the drift edit and the move land in one commit.

## The plan format is parsed in four places

The template shape (`<!-- TASK -->` markers, `### T<n> - <title>` headings, task fields, the
`## Contracts` appendix of `### C<n>` blocks opening on `File:`) is read by `plan-index.sh` (validation, index, split), `plan-path.sh` (TASK-block count
for `draft` and `open:`, and a comment strip that must keep the TASK markers), `commit-task.sh`
(subject, `Files:` staging) and `archive-run.sh` (the unfinished check). A field or marker change
touches the templates, `references/plan-rules.md` and every parser reading it.

- In `plan-rules.md`, `(script)` means `plan-index.sh` rejects the breach and `(review)` means
  `planner-review` gates it: a rule moving between the two moves its enforcement with it.
- A landed plan is frozen, so a run resumed after an upgrade must still validate: a new
  `plan-index.sh` check stays exempt under `--split` (the Exclusive-leaf rule) or skips a plan
  predating it (a contract appendix with no `File:` line at all).

## Duplicated on purpose - change together

- `directories.runs` / `directories.specifications` parsing and sanitizing: `config.sh`,
  `plan-path.sh`, `archive-run.sh`.
- Node budget 12000 / 32000: `references/node-doctrine.md`, `skills/memory/scripts/memory-map.sh`,
  `skills/memory/SKILL.md`. Rule budget 4000 / 40000: `agents/rules-writer.md`,
  `skills/rules/scripts/rules-map.sh`, `skills/rules/SKILL.md`.
- The frozen `_`-prefixed rule file: `rules-map.sh`, `rules-auditor`, `rules-writer`.
- An agent's `tools:` frontmatter and the tool list its opening paragraph names.
- `references/qa-format.md` is the one format authority for `qa-writer`, `e2e-writer` and the `e2e`
  skill, which routes on its headings (`## UI scenarios`, `## API scenarios`, `## Not automatable`,
  `## Automation`).
- A new switch: `skills/setup/templates/viber.yml` (`bootstrap.sh` appends a key an existing config
  lacks), `config.sh`'s key list and fixed output order, `README.md`, `usage.html`, and the skill
  consuming it (implementor's step 3 opens one close entry per close switch).
- The `memory` switch reaches planning twice: the Memory-owned rule of `plan-rules.md` and the
  `memory:` line `planner` passes to `planner-review`.

## Memory and rules layers

- Build close: `memory-writer` may leave a node over budget and report `OVER:`; implementor then
  audits each and has `memory-node-writer` shrink it. The `memory` command writes every node
  through `memory-node-writer`, one per dispatch, and re-dispatches the root when nodes appeared
  or vanished so its index equals `planned:`.
- `rules-auditor` and `rules-writer` pass every line through `references/rule-admission.md`; a
  fact about one place leaves as `MOVE:` for the memory layer, and `rules-writer` never writes a
  `CLAUDE.md`, as `memory-writer` never touches `.claude/rules/`.

## Plan gate

`hooks/scripts/plan-gate.sh` arms on a write to `plans/*.md` within the current plan-mode episode
and picks the reviewer: `planner-review` when a Skill tool_use named `planner` (any plugin prefix)
ran in the episode, otherwise `plain-plan-review` when `config.sh` (run in the payload's `cwd`)
resolves `plain-plan-review: true`. `ExitPlanMode` passes only after that agent, dispatched after
the last plan write, returned `VERDICT: PASS` and the plan's mtime is not newer. The deny reason is
the plain path's only instruction channel. Names match literally: renaming the skill, either
agent, the switch or the verdict line disarms the gate, and fail-open means nothing reports it.

## Tool dependencies

- `triage`, `intent`, `fixer`: `gh`, called only through the shared `issue-facts.sh`,
  `issue-templates.sh`, `create-issue.sh` and `post-comment.sh`; without it each reports the
  script's `ERROR` line (`issue-templates.sh`'s `STATUS=skip REASON=no-gh` for `intent`'s save
  preflight) and pasted/typed text still works, unpublished. `create-issue.sh` exit 0 may carry
  `TYPE=dropped` / `TYPE=error` + `TYPE_ERROR=` (the issue stands, its type left off); a create
  or comment exit 1 leaves the landing unknown and is never retried.
- A multi-line issue body or comment travels only as a file under `.temp/viber/triage/<N>.md` or
  `.temp/viber/intent/` through `--body-file`. `intent`'s write access there is pre-approved as
  `Edit(./.temp/viber/intent/**)`, not `Write(...)`: a file-write call is matched against `Edit`
  rules only.
- `e2e`: `playwright-cli` and `@playwright/test`, probed by `check-playwright.sh`, which never
  installs; the skill installs only once the user agrees. Tests run chromium only.
- `setup`: `merge-settings.sh` needs `node` (with none it prints the recommended block and skips)
  and never touches `.claude/settings.local.json`; `bootstrap.sh` only reports whether `gh` is on
  PATH; `open-page.sh` opens `usage.html` through `open`, `rundll32`, `wslview` or `xdg-open` by
  `uname -s`, and with none (a remote or headless session) prints the path to open by hand.
