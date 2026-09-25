# viber - interview, plan, build, remember

Every skill, agent and script here is a stage of one run, so most edits touch a contract two or
three files share. `PRODUCT.md` holds the testing assumptions that `references/test-strategy.md`
and `references/integration-tests.md` turn into rules. A change to
a user-facing command, its arguments, a switch, a `viber.yml` key or a default fixes `README.md`
and the hand-written `skills/setup/assets/usage.html` in the same edit: nothing else catches a
stale page.

## Layout

```
skills/<name>/           12 skills: SKILL.md plus files read at one step (templates/,
                         references/, assets/); setup, memory, rules, commit bundle scripts/
agents/                  14 agents, each dispatched only by the callers its description names
                         (update it when a skill starts or stops dispatching the agent)
scripts/                 13 plugin-wide scripts, shared across skills and agents
references/              read at runtime by agents through the `refs:` dispatch line
hooks/                   SessionStart manifest + PreToolUse plan gate
```

## The chain

- `intent` (interview) or `fixer` (RED reproduction test + diagnosis) -> `planner` -> `implementor`.
  `planner` treats any other input as unresolved and suggests `intent`; `implementor` refuses a
  draft (a landed plan with no TASK block).
- `intent` and `fixer` take an issue reference only under `issues: true`; `intent` can also
  save its summary as a new issue. An `Issue: <URL>` handoff line becomes the plan frontmatter
  `issue:`, carried into `spec.md`; `plan-index.sh` and `commit-task.sh` foot commits `Refs: #<N>`.
- `prototype`, user-only, has `prototype-writer` build a UI change into one HTML mockup
  (`.temp/viber/prototype/<slug>.html`, `<N>-` prefixed for issue N, fixed for the run;
  `open-page.sh` on the first `PASS` only), then hands to `intent` with a `Prototype:` line. It
  dispatches `mode:`, `round:` (`create`/`revise`/`narrow`) and `variant:` and branches on
  `VERDICT:`, `FILE:`, `BASIS: design-system|code|brief` and one
  `VARIANT: <A|B|C> - <title> - <trade-off>` per variant: renaming either side breaks the loop.
- `triage` sits before the chain: it assesses one issue, names `/viber:fixer #N`, `/viber:intent #N`
  or a one-line summary for pasted text, and invokes nothing. Its `disallowed-tools:` lifts at the
  prose publish answer, so in that turn only the body keeps `Skill` unused.
- `tdd` (`user-invocable: false`) is invoked only by `task-coder`, through the Skill tool, on a
  `TDD: required` task before the first line of production code.
- `commit` stands outside the chain (`model: haiku`, `context: fork`); a build never calls it,
  its commits go through `commit-task.sh`.

## Orchestrator contract

- `implementor` opens no file and writes none. It knows only the `config.sh` and `run-clock.sh`
  preloads, `plan-path.sh`, `plan-index.sh` and `commit-task.sh` stdout (`progress: <n>/<total>`,
  exit 4 naming `--landed`, the `refused` / `took` / `claimed by no task` warnings it carries to
  the final summary), and agents' return lines. Every script's stdout and every agent's
  `## Output` vocabulary is an interface: renaming a line on one side only breaks the build
  silently.
- Every agent returns `VERDICT: DENIED` plus `REASON: <tool>: <call>` on a refused tool call (the
  auditors in place of `AUDIT:`), and every caller, the plan gate included, branches on it.
- Only coder, reviewer and repair-coder dispatches carry `model`: the task's profiled tier
  (repair-coder: `sonnet`, raised only by `retry`) clamped into `tiers.min`..`tiers.max`.
- Coder `EXTRA:` becomes `--with`, `DEFERRED:` becomes `--defer`, stored as `deferred:` in
  `status.md` and handed to the owing task's coder and reviewer.
- task-coder, task-reviewer, test-runner and e2e-writer share a "Stop what you started" section;
  implementor's `SendMessage` on a "stopped with background work" notice is its other half.
- Coders and reviewers keep git read-only (never `stash`, `checkout`, `restore`, `clean`):
  parallel tasks share one working tree.

## Commit ownership

- Only scripts commit: `plan-index.sh --split` (the decomposition), `commit-task.sh` (every task,
  repair, close and e2e commit), `archive-run.sh` (the archive), and outside a build the `commit`
  skill's `commit.sh`. No agent or skill runs `git add` or `git commit`. `planner` leaves a
  landed draft uncommitted; `memory` and `rules` leave their writes unstaged.
- `commit-task.sh` never takes a subject from its caller (a task commit is the plan's
  `T<n> - <title>` heading, no type prefix). It stages only the paths it is named, as literal
  pathspecs (App Router `[id]` paths), refuses `.temp/`, and adds the run's `work/` trail itself.
- Never two `commit-task.sh` calls at once: each rewrites the index and `status.md`.
- `commit-args.sh` is the ONE selector parser, sourced by `commit-context.sh` and `commit.sh`. An
  existing path (disk, index or HEAD) wins over the keyword `all`; a path-shaped token existing
  nowhere is mode `missing`, `commit.sh` exits 3, and the fork never widens the selector.
- The `commit` skill's `git rev-parse` and `cat` preloads are inline commands under a bare `Bash`
  allow: the one exception to the literal-script-line preload form.

## The run directory

`docs/<runs>/<stamp>_<slug>/` (`docs/_specs/` by default), landed by `plan-path.sh --land`, which
copies (never moves) the plan-mode file, a round landing into the draft its `into:` key names:

- `plan.md` - frozen once it carries a task block; a draft is relanded in place, round by round.
- `spec.md`, `tasks/<id>.md` - `plan-index.sh --split`, rebuilt from scratch on every call. A task
  file is a coder's whole input; a coder never sees the plan.
- `status.md` - `commit-task.sh` is its only writer (`plan-index.sh` creates it empty).

`archive-run.sh` moves it to `docs/<specifications>/<key>/` (`docs/specs/` by default), dropping
only the scaffolding it enumerates, and refuses a run with a task in neither `done` nor
`skipped`. `closeout` edits `spec.md` first, so the drift edit and the move are one commit.

## The run branch

- `branching:` (`mode` off|allowed|required, default `off`; `base` `main`; `name`
  `{type}/{issue}-{slug}`) is resolved by `config.sh` and read only by `run-branch.sh`, sourced
  by `plan-path.sh`, which alone moves HEAD. Outside a git repository it acts as `off`.
- `planner` asks from the read-only `plan-path.sh --branch <plan>` report (`mode`, `base`,
  `current`, `new`, `new-exists`, `behind`, `dirty`, or `mode: off` alone) and writes the answer
  to the frontmatter `branch:` (a name, or `none` under `allowed`), read by `plan_branch()`. A
  draft round carries it over; a fix changing the title, issue or a `Repro:` re-runs the report.
  Renaming a report key or `branch:` breaks the step.
- A first landing sets the branch before any run lookup or copy, so a run open there is found,
  never minted again, and prints `branch: <name> (created | switched | kept)` or
  `detached (kept)`; `implementor` names a branch other than `base` as the PR source.
- Exit 6: branch not set (a commit switch on a dirty tree, untracked counting; a base missing
  locally, never fetched; an invalid name; under `required` the base as target or a detached HEAD
  with no `branch:`). Nothing lands or moves; `planner` and `implementor` stop.

## The plan format is parsed in five places

The template shape (`<!-- TASK -->` markers, `### T<n> - <title>` headings, task fields, the
`## Contracts` appendix of `### C<n>` blocks opening on `File:`) is read by `plan-index.sh`,
`plan-path.sh` (its comment strip must keep the TASK markers), `commit-task.sh` (subject,
`Files:` staging), `archive-run.sh` and `run-branch.sh`'s `plan_type()` (a task's `Repro:` line,
for `{type}`). A field or marker change touches the templates, `references/plan-rules.md` and
every parser.

- In `plan-rules.md`, `(script)` means `plan-index.sh` rejects the breach and `(review)` means
  `planner-review` gates it: a rule moving between the two moves its enforcement with it.
- A landed plan is frozen, so a run resumed after an upgrade must still validate: a new
  `plan-index.sh` check stays exempt under `--split` (the Exclusive-leaf rule) or skips a plan
  predating it (a contract appendix with no `File:` line at all).

## Duplicated on purpose - change together

- `issue_ref()` (plan `issue:` URL to `#<N>`): `commit-task.sh`, `plan-index.sh`, and
  `run-branch.sh`'s `plan_issue()` (the bare number, for `{issue}`).
- `directories.*` parsing: `config.sh`, `plan-path.sh`, `archive-run.sh`.
- Node budget 12000 / 32000: `references/node-doctrine.md`, `skills/memory/scripts/memory-map.sh`,
  `skills/memory/SKILL.md`. Rule budget 4000 / 40000: `agents/rules-writer.md`,
  `skills/rules/scripts/rules-map.sh`, `skills/rules/SKILL.md`.
- The frozen `_`-prefixed rule file: `rules-map.sh`, `rules-auditor`, `rules-writer`.
- An agent's `tools:` frontmatter and the tool list its opening paragraph names.
- `references/qa-format.md` is the one format authority for `qa-writer`, `e2e-writer` and the
  `e2e` skill, which routes on its `##` headings.
- A new switch: `skills/setup/templates/viber.yml` (`bootstrap.sh` appends a key an existing
  config lacks), `config.sh`'s key list and fixed output order, `README.md`, `usage.html`, and
  the consuming skill (implementor's step 3 opens one close entry per close switch).
- The `memory` switch reaches planning twice: the Memory-owned rule of `plan-rules.md` and the
  `memory:` line `planner` passes to `planner-review`.

## Memory and rules layers

- `memory-writer` may leave a node over budget (`OVER:`) for `memory-node-writer`, dispatched
  once per node, the root last when nodes appeared or vanished, so its index equals `planned:`.
- `rules-auditor` and `rules-writer` pass every line through `references/rule-admission.md`; a
  fact about one place leaves as `MOVE:` for the memory layer. `rules-writer` never writes a
  `CLAUDE.md`, `memory-writer` never touches `.claude/rules/`.

## Plan gate

`hooks/scripts/plan-gate.sh` arms on a write to `plans/*.md` in the current plan-mode episode and
picks `planner-review` when a Skill tool_use named `planner` (any plugin prefix) ran in it, else
`plain-plan-review` when `config.sh` (in the payload's `cwd`) resolves `plain-plan-review: true`.
`ExitPlanMode` passes only after that agent, dispatched after the last plan write, returned
`VERDICT: PASS` and the plan's mtime is not newer. The deny reason is the plain path's only
instruction channel. Names match literally: renaming the skill, either agent, the switch or the
verdict line disarms the fail-open gate silently.

## Tool dependencies

- `triage`, `intent`, `fixer`, `prototype`: `gh`, only through the shared `issue-facts.sh`,
  `issue-templates.sh`, `create-issue.sh` and `post-comment.sh`; without it each reports the
  script's `ERROR` line and pasted text still works, unpublished. A create or comment exit 1
  leaves the landing unknown and is never retried.
- A multi-line issue body or comment travels only as a file under `.temp/viber/<skill>/` through
  `--body-file`. `intent`'s and `prototype`'s write access there is pre-approved as
  `Edit(./.temp/viber/<skill>/**)`, not `Write(...)`: a file write matches `Edit` rules only.
- `e2e`: `playwright-cli`, `@playwright/test` (chromium only), probed by `check-playwright.sh`,
  which never installs; the skill installs only once the user agrees.
- `setup`: `merge-settings.sh` needs `node` (else it prints the block and skips), never touches
  `settings.local.json`; `--reset` copies, backing up to `.temp/viber/setup/`. Merge or reset is
  an `AskUserQuestion`: a prose question ends the turn and the pre-approval with it.
- `open-page.sh` opens by `uname -s`; with no opener (headless) it prints the path.
  `prototype-writer` soft-uses `impeccable`, else `superui:pro-designer`, when installed.
