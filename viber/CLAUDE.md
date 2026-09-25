# viber - interview, plan, build, remember

Every skill, agent and script here is a stage of one run, so most edits touch a contract two or
three files share. `PRODUCT.md` holds the product assumptions (unit tests far outnumber
integration tests, integration last and serial, one full-suite run at the close) that
`references/test-strategy.md` and `references/integration-tests.md` turn into rules: a change to
how tests are planned or run answers to it. `README.md` and `skills/setup/assets/usage.md` are the
user's view of the same commands and switches; keep both in step when either changes.

## Layout

```
skills/<name>/SKILL.md   11 skills; setup, triage, memory, rules, commit carry their own scripts/
                         (${CLAUDE_SKILL_DIR}; commit addresses its own through ${CLAUDE_PLUGIN_ROOT})
skills/planner/          templates/ (spec-lite, spec-full, tasks) + references/adr-tasks.md
agents/                  13 agents, each dispatched only by the callers its description names
scripts/                 7 plugin-wide scripts, shared across skills and agents
references/              read at runtime by agents through the `refs:` dispatch line
hooks/                   SessionStart manifest + PreToolUse plan gate
```

## The chain

- `idea` (interview) or `fixer` (RED reproduction test + diagnosis) -> `planner` -> `implementor`.
  `planner` treats any other input as unresolved and suggests `idea`; `implementor` refuses a
  draft (a landed plan with no TASK block). `planner`, `implementor` and `tdd` are
  `user-invocable: false`, reached only through the chain (`tdd` through `task-coder`). `setup`,
  `triage`, `e2e`, `memory` and `rules` are user-only commands (`disable-model-invocation: true`).
- `triage` sits before the chain: it assesses one issue, names `/viber:fixer`, `/viber:idea` or no
  step, and invokes nothing. It runs inline, never forked, with `disallowed-tools: Skill, Agent,
  Edit, NotebookEdit, AskUserQuestion`: a fork's return hands the main session a turn in which it
  could start `fixer` itself, while the inline removal holds until the next user message. The
  publish question is asked in prose on purpose, so the user's answer lifts that block: in the
  publishing turn only the body's rule keeps `Skill` unused, and `post-comment.sh` is past its
  one-turn `allowed-tools` pre-approval, so that call can prompt.
- `commit` stands outside the chain: model-invocable, `model: haiku`, `context: fork`, used at any
  point outside a build. A build never calls it; its commits go through `commit-task.sh`.
- Dispatchers: planner -> planner-review; implementor -> task-coder, task-reviewer, test-runner,
  memory-writer, memory-auditor, memory-node-writer, rules-writer, qa-writer, closeout; memory ->
  memory-auditor, memory-node-writer; rules -> rules-auditor, rules-writer; e2e -> e2e-writer; the
  plan gate's deny -> plain-plan-review, dispatched by the main session. An
  agent's `description:` names its callers: update it when a skill starts or stops dispatching it.

## Orchestrator contract

- `implementor` opens no file and writes none. It knows only what arrives as text: the
  `config.sh` and `run-clock.sh` preloads, `plan-path.sh` and `plan-index.sh` stdout, and agents'
  return lines. So every script's stdout line format and every agent's `## Output` vocabulary
  (`VERDICT:`, `REASON:`, `DOD:`, `EXTRA:`, `DEFERRED:`, `REVIEW:`, `REPORT:`, `FILES:`, `OVER:`,
  `AUDIT:`, `DRIFT:`, `PATH:`) is an interface: renaming a line on one side without the branch
  that reads it on the other breaks the build with no error.
- Every agent returns `VERDICT: DENIED` plus `REASON: <tool>: <call>` on a tool call the harness
  refuses (the auditors in place of their `AUDIT:` line), and every caller, the plan gate
  included, branches on it. A ToolSearch miss or a tool absent from a listing is no refusal: each
  agent's opening says its tools are loaded and to call them directly.
- Only coder, reviewer and repair-coder dispatches carry `model`. Coder and reviewer take the
  task's profiled tier, clamped into `tiers.min`..`tiers.max` (ladder `haiku < sonnet < opus <
  fable`, `fable` only when the host names it); repair-coder carries no task to profile, so it
  always starts at `sonnet` within that same clamp, raised only by a `retry` answer. Every other
  dispatch, in the close and in the `memory`, `rules` and `e2e` commands, passes none: the agent's
  frontmatter is its strength.
- Coder output feeds the commit: `EXTRA:` becomes `--with`, `DEFERRED:` becomes `--defer`, stored
  as `deferred:` in `status.md` and handed to the owing task's coder and reviewer.
- task-coder, task-reviewer, test-runner and e2e-writer share a "Stop what you started" section
  (background work only through `run_in_background`, killed and `ps`-checked before returning);
  implementor's `SendMessage` on a "stopped with background work" notice is its other half.
- Coders and reviewers keep git read-only (never `stash`, `checkout`, `restore`, `clean`):
  parallel tasks share one working tree.

## Commit ownership

- Only scripts commit: `plan-index.sh --split` (the decomposition), `commit-task.sh` (every task,
  repair, close and e2e commit), `archive-run.sh` (the archive), and outside a build the `commit`
  skill's `commit.sh`. No agent and no skill runs
  `git add` or `git commit`. `planner` leaves a landed draft uncommitted; the `memory` and `rules`
  commands leave their writes unstaged.
- `commit-task.sh` never takes a subject from its caller: a task commit is the plan's
  `T<n> - <title>` heading with its `###` marker stripped and no Conventional Commits type prefix
  added, every flag form derives its own. It stages only the paths it
  is named through literal pathspecs (`GIT_LITERAL_PATHSPECS`, for App Router `[id]` paths),
  refuses `.temp/`, and adds the run's `work/` trail by paths derived from the id or round.
- Never two `commit-task.sh` calls at once: each rewrites the git index and `status.md`.

## The commit skill

- `commit-args.sh` is the ONE selector parser, sourced by `commit-context.sh` (measures the set)
  and `commit.sh` (stages it): change selector semantics there only. Issue refs (`#N` with
  non-alnum boundaries, `/issues/N` links) are stripped first and become a `Refs:` footer; an
  existing path (disk, index or HEAD) wins over the keyword `all`; a path-shaped token that exists
  nowhere is mode `missing`, `commit.sh` exits 3, and the fork never retries with a wider selector.
- The preload passes the arguments as `'$ARGUMENTS'`: Claude Code substitutes the text before the
  shell parses the line, so single quotes are what keep `$`, backticks and backslashes literal.
  An apostrophe breaks it, which the description rules out. `commit-context.test.ts` runs that
  literal line.
- Proof of landing: the `Before SHA` preload (`(none)` when unborn) goes to `commit-selfcheck.sh`,
  which prints `VERIFIED` / `FAILED` and exits 0 on both.
- The `git rev-parse` and `cat` preloads are inline commands under a bare `Bash` allow, not
  bundled scripts: the one exception to the literal-script-line preload form.
- The fork never pushes, never branches, never adds `Co-Authored-By`, returns one line.

## The run directory

`docs/<runs>/<stamp>_<slug>/` (`docs/_specs/` by default), landed by `plan-path.sh --land`, which
copies the plan-mode file and never moves it, points the copy's frontmatter `source:` at the copy
and lands a round into the draft its frontmatter `into:` key names:

- `plan.md` - frozen once it carries a task block; a still-draft plan (no task block yet) is
  relanded in place by `plan-path.sh --land --into <key>`, one round at a time.
- `spec.md`, `tasks/<id>.md` - `plan-index.sh --split`, rebuilt from scratch on every call. A task
  file is a coder's whole input (its block with `DoD` cut into `DoD.<k>` lines, the Goal, its
  `Covers` criteria, its `Uses` contracts, `Must not change`, `Out of scope`); a coder never sees
  the plan.
- `status.md` - `progress`, `done`, `skipped`, `unreviewed`, `deferred`, `closed`. `commit-task.sh`
  is its only writer (`plan-index.sh` creates it empty); `plan-index.sh`, `plan-path.sh` (`open:`
  lines) and `archive-run.sh` read it.
- `work/` - coder notes, review and test reports, committed so a build resumes on another machine.
- `qa.md`, `qa.e2e.md` - `qa-writer`; `e2e-writer` appends the `## Automation` lines.

`archive-run.sh` moves the directory to `docs/<specifications>/<key>/` (`docs/specs/` by default),
dropping the enumerated scaffolding `plan.md`, `status.md`, `tasks/`, `work/` (anything else
travels), and refuses a run with a task in neither `done` nor `skipped`. `closeout` edits
`spec.md` before calling it, so the drift edit and the move land in one commit.

## The plan format is parsed in four places

The template shape (`<!-- TASK -->` / `<!-- /TASK -->`, `## Tasks`, `### T<n> - <title>`, the
fields `TDD`, `Covers`, `Uses`, `Depends-on`, `Files`, `Delivers`, `Verification`, `DoD`, optional
`Exclusive: true` and `Repro:`, a `## Contracts` appendix of `### C<n> - <name>` blocks opening on
`File:`) is read by `plan-index.sh` (validation, index, split), `plan-path.sh` (TASK-block count
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
  lacks), `config.sh`'s key list and fixed output order, `README.md`, `usage.md`, and the skill
  consuming it (implementor's step 3 opens one close entry per close switch).
- The `memory` switch reaches planning twice: the Memory-owned rule of `plan-rules.md` and the
  `memory:` line `planner` passes to `planner-review`.

## Memory and rules layers

- Build close: `memory-writer` may leave a node over budget and report `OVER:`; implementor then
  audits each and has `memory-node-writer` shrink it. The `memory` command writes every node
  through `memory-node-writer`, one node per dispatch, in waves by depth with the root first, then
  re-dispatches the root when nodes appeared or vanished so its node index stays equal to
  `planned:`. A node's index lists only the nodes below its own directory; under `planned: none`
  the writer reconciles it with the tree through `git ls-files`, since `Glob` also
  returns gitignored files.
- The `rules` command hands `rules-writer` only the map lines of the targets the user kept, and
  the writer touches no other existing rule.
- `rules-auditor` and `rules-writer` pass every line through `references/rule-admission.md`; a
  fact about one place leaves as `MOVE:` for the memory layer, and `rules-writer` never writes a
  `CLAUDE.md`, as `memory-writer` never touches `.claude/rules/`.

## Plan gate

`hooks/scripts/plan-gate.sh` arms on a write to `plans/*.md` within the current plan-mode episode
and picks the reviewer: `planner-review` when a Skill tool_use named `planner` (any plugin prefix)
ran in the episode, otherwise `plain-plan-review`, and only when `config.sh`, run in the payload's
`cwd`, resolves `plain-plan-review: true`. It then allows `ExitPlanMode` only after a dispatch of that
agent following the last plan write returned `VERDICT: PASS` and the plan's mtime is not newer. The
deny reason is the plain path's only instruction channel: it tells the session what to pass the
agent. The names are matched literally: renaming the skill, either agent, the switch or the verdict
line disarms the gate, and fail-open means nothing reports it.

## Tool dependencies

- `triage`: `gh`, called only through `issue-facts.sh` and `post-comment.sh`; without it the skill
  reports the script's `ERROR` line, and pasted issue text still works, unpublished. The comment
  body travels through `.temp/viber/triage/<N>.md` and `--body-file`: a multi-line body cannot
  ride one literal Bash line.
- `e2e`: `playwright-cli` and `@playwright/test`, probed by `check-playwright.sh`, which never
  installs; the skill installs only once the user agrees. Tests run chromium only.
- `setup`: `merge-settings.sh` runs its sibling `merge-settings.js` through `node`; with no `node`
  on PATH it prints the recommended block and skips. The template wins a scalar, lists only gain
  entries, an `ask` entry is removed from `deny`, and `.claude/settings.local.json` is never
  touched. `bootstrap.sh` reports whether `gh` is on PATH and never runs or installs it.
