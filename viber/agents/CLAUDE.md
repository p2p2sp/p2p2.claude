# viber agents

Each agent file is its own contract: `## Input` is what its caller's dispatch lines must carry,
`## Output` what the caller branches on. Change a line on one side, change the caller in the
same edit.

## Callers and write scope

| Agent | Dispatched by | Writes |
|---|---|---|
| `task-coder` | `implementor` (task, test-run `report:`, final-review `review:` fix) | source, its `notes` |
| `task-reviewer`, `final-reviewer` | `implementor` (`final-review.true.md` for the second) | its report only |
| `test-runner` | `implementor`, its baseline fragments, `intent`'s fast path | its report only |
| `arbiter` | `implementor`, `baseline-run.<value>.md`, `final-review.true.md` | nothing |
| `qa-writer`, `memory-writer`, `rules-writer`, `closeout` | `implementor`'s `qa`, `memory`, `rules`, `cleanup` fragments; `rules-writer` also `rules` | `qa.md`/`qa.e2e.md`; nodes; `.claude/rules/`; `spec.md` |
| `planner-review`, `adr-screener` | `planner` (`adr-screener` only under `adr: true`, once the plan is written and indexed) | nothing |
| `plain-plan-review` | the plan gate's request | nothing |
| `prover` | `intent --prove` | nothing (plus web) |
| `prototype-writer` | `prototype` | its one mockup file |
| `e2e-writer` | `e2e` | one spec file, its `## Automation` line |
| `memory-auditor`, `memory-node-writer` | `memory` | findings file; one node and its sections |
| `rules-auditor` | `rules` | findings file |
| `profiler`, `scout`, `edge-scout`, `detective`, `critic` | `code-auditor` | see `CLAUDE.code-auditor.md` |

The description's `Invoked only by ...` names these callers: a new caller updates it.

Read `CLAUDE.code-auditor.md` before editing `profiler`, `scout`, `edge-scout`, `detective` or
`critic`.

## Shared text - change together

- All eighteen but the five `code-auditor` agents carry the same "Your tools are ..., every one of them loaded" paragraph and
  "Never narrate your work - no commentary between tool calls."
- The `DENIED` line is `REASON: <refused tool name>: <the exact refused command, or the path for
  a file tool>` everywhere; `prover` adds the URL or query of a web tool. `closeout` keeps its
  `DRIFT:` line between `VERDICT: DENIED` and `REASON:`, `arbiter` drops its four lines for the
  two. On `DENIED` no reviewer or `test-runner` writes its report and `e2e-writer` writes no
  status line.
- "A message with no tool call ends your run..." sits on the long-loop writers only:
  `task-coder`, `e2e-writer`, `memory-node-writer`, `prototype-writer`.
- `baseline: <path>`: a failure is pre-existing only when its test name and file match a line of
  the baseline report, message ignored; a missing file makes none pre-existing. Stated in
  `test-runner` (which writes that report: a `status: pass | skip | fail | build-failed` line,
  then `<test name> | <file> | <assertion or error>` per failure), `task-coder` and
  `task-reviewer`. `test-runner`'s baseline mode reuses an existing report and runs nothing.
- `decision: <task-id>: <text>` beats the task file or a report; `auto:`-prefixed text is the
  build's own ruling, binding the same. Read by `task-coder`, `task-reviewer`,
  `final-reviewer` (`decision: final-review:` on a recheck) and `closeout`, which takes them
  from `status.md` plus every line of `rulings.md`.
- An integration or browser run gets an explicit timeout in minutes (a default one reads as a
  false red): `task-coder`, `task-reviewer`, `test-runner`, `e2e-writer`.

## Traps

- `task-coder` returns `FILES:` only without a task file (a `report:` or `review:` dispatch),
  `DOD:` always with one, `FIXED:` only with `review:` lines. A `report:` with no task file is a
  test-run report: every failure is Blocking.
- `test-runner` runs the suite once, in the background, to `.temp/viber/test-runner/<report name>.log`,
  the command ending `echo "exit=$?"` into it; a foreground wait at timeout 600000 loops on that
  `exit=` line and is the only call it repeats. The wait has no time cap, so a suite that never
  writes the line hangs it.
- `test-runner`'s scope is set by `suite:` and `run:`: no `suite:` runs the host's fast command,
  then the integration tests whose adapter (or a file it depends on) is among the change; `run: <dir>`
  (every `implementor` final dispatch) bases the change on the commit that first added
  `<dir>/plan.md`, no `run:` (`intent`'s fast path) on the working tree. It joins both commands
  as `<fast> && <integration>` in the one run, so an integration failure stays hidden behind a fast
  failure until the next round. No fast command or marker convention in the host's instructions, or
  no plan commit found, runs every layer but end-to-end. It is `sonnet`/`effort: low`, and its
  selection paragraph ends on "Think the problem through before you answer."
- `final-reviewer` is the one gate where a Minor-only finding writes the report and fails: the
  single fix round settles both levels. Owner findings go only to `OWNER:` lines. It finds each
  task's commit by `commit-task.sh`'s subjects `<id> - <title>` and `<id>(<n>) - <title>`, and a
  file several tasks changed belongs to the slice of the lowest-numbered one. Under `memory: true`
  it reports nothing living in a `CLAUDE.md`.
- `arbiter`: `case:` is one of `decide|cap|baseline|tests|final-review|commit`, matching its
  three call sites. `RULING` is copied verbatim from `options:` (the first option is the
  fallback), and `WHY`/`COST` hold no double quote, dollar sign, backtick or backslash: they
  become shell arguments of `commit-task.sh --rule`.
- `closeout` makes one Bash call, the literal `archive-run.sh "<run>"` line, and marks drift as
  `[D<n>]` plus one appended section in `spec.md`'s own language; never `qa.md` or `qa.e2e.md`.
- Auditor findings land at `<out><slug>-audit.md`, `/` in the scope becoming `--` (`root` for the
  repository root, `new--<scope>` for a `rules-auditor` proposal, which writes no file when
  nothing passes); `rules-writer` globs `*-audit.md`, `memory-node-writer` gets the path.
- `e2e-writer` writes exactly `<spec-dir>/<qa-id>-<slug>.spec.ts`, chromium-only through
  `test.use`, explores only through `playwright-cli`, keeps scratch under `.temp/viber/e2e/`,
  and never edits application code: a false business assertion is `BLOCKED`, never a weakened
  test.
- `prototype-writer` invokes `impeccable`, else `superui:pro-designer`, through `Skill` when
  listed: renaming superui's skill drops the advice silently. It keeps basis and variant labels
  inside the mockup so a later round reads them back.
- `adr-screener` proposes, never decides: its `VERDICT: NONE|FOUND|DENIED` and the `ADR:`,
  `DEPRECATE:`, `APPEND:`, `ROUTE: comment|rule|ops` lines are one loop with `planner`'s
  `references/adr-tasks.md`, which relays every line and adds none. The test itself lives only in
  `references/adr-admission.md`, which it reads whole through `refs:`; a criterion added to the
  agent or to `adr-tasks.md` splits it.
- `qa-writer` returns `KEPT` and writes nothing when `qa.md` exists: a resumed build never
  overwrites scenarios a tester may have worked through.
