# superdev

## Purpose

Project memory, rules, planning and the agentic-development pipeline. Largest plugin in the
repo. Owns three build tracks - a plan-less **vibe** track, a **Simple** track, and a **Super**
track - plus four knowledge layers (memory, rules, changelog, QA/e2e). Detail on individual
skills/agents lives one level down, in `skills/CLAUDE.md` and `agents/CLAUDE.md` - this node
covers what is true across the whole plugin.

## Entry points

- `skills/intent/` - the interview front end most creative requests enter through.
- `skills/simpleplan/` and `skills/superplan/` - plan writers for the Simple / Super tracks.
- `skills/simplebuild/` and `skills/superbuild/` - build orchestrators.
- `skills/vibe/` - plan-less track for one explicit, one-sentence change.
- `skills/superdev-memory/` and `skills/superdev-rules/` - the memory/rules maintenance fronts.
- `hooks/content/manifest.md` - the injected `SessionStart` routing manifest.

## Contracts & invariants

- The ONLY plugin in the repo that ships `hooks/` and an injected manifest. One `SessionStart`
  hook force-injects `hooks/content/manifest.md` verbatim once per session; `source == "resume"`
  is excluded; fail-open (unreadable manifest = banner only). The other hook, `PreToolUse` on
  `ExitPlanMode` (`hooks/scripts/review-plan.sh`), gates the plan on the reviewer's
  `VERDICT: PASS` and, on its final allow, records the approved plan's sha256 beside the plan as
  `<plan>.sha256`; `scripts/decompose.sh` recomputes it and refuses (exit 7) a plan that differs
  from the one approved, warns and continues when no sidecar exists. Both hooks stay fail-open.
- Plugin-level shared scripts live at `superdev/scripts/`, shared references at
  `superdev/references/` - no `shared/` subdir (that is supergh's convention).
- `superdev/references/review-contract.md` is the single owner of the build review loop's
  vocabulary: labels, finding IDs, report shape, verdict rules, and the reference form every
  task/criterion/finding is named in.
- Config switches are opt-in, read from the host's `.claude/superdev.yml` via
  `scripts/read-config.sh` (fail-open: missing file/key = false). Current keys: `adr`, `rules`,
  `memory`, `changelog`, `cleanup`, `stats`, `qa`, `e2e-ui`, `e2e-api`. Verify against that
  script and the gating skills before restating.
- Knowledge layers superdev writes into a HOST repo live under `docs/<layer>/`: `docs/adr/`,
  `docs/changelog/`, `docs/qa/`, `docs/.workflows/`. Verify which switch gates which layer
  against the skill/agent bodies.
- Temporary machine state goes under `.temp/superdev/` in per-purpose subdirs (`memory/`,
  `rules/`, `logs/`, `stats/`, `vibe/`). NEVER a plugin-named dot-dir at the host root.
- Script vs fork: a step collapses to a deterministic bundled script when it operates on a
  known, fixed tool/format; it stays an LLM fork when it must interpret heterogeneous,
  stack-specific output. A self-verifying script is TRUSTED by its caller - never re-verified.
- `setup`'s permissions step (`skills/setup/scripts/merge-settings.sh`) depends on Node on PATH
  to merge the recommended `.claude/settings.json` template; missing Node is a skip-with-note
  (the merge is skipped, the recommended block printed for a manual merge), never a hard stop -
  the deliberate, documented Node dependency the root's stack-agnostic rule allows.
- That template (`skills/setup/assets/settings.json`) is designed for a session with auto mode
  OFF: it seeds `permissions.disableAutoMode: "disable"`, so no classifier runs and the static
  `deny` -> `ask` -> `allow` order decides every call. Consequences baked into its shape:
  `acceptEdits` already covers in-tree edits, so a bare `Edit`/`Write` in `allow` would only
  widen the rules to paths outside the working dir (and pre-approve shell redirects there), and
  is deliberately absent; `ask` is the only human checkpoint left, so it carries the
  outward-facing commands; `deny` carries wildcard forms (`Bash(git * --force*)`), because a
  `*` matches at any position and plain prefixes miss `git push origin main --force`. The merge
  only ever appends, so dropping an entry from the template never removes it from a host that
  already carries it.

## Scripts inventory (`superdev/scripts/`)

- `check-playwright.sh` - reports whether `playwright-cli`/`@playwright/test` are present in the
  host (installs neither); called by `setup`'s bootstrap and the `e2e` skill's own preload.
- `checkpoint-update.sh`, `status-update.sh` - update run/task status files during a build.
- `cleanup-run.sh` - removes a completed run's `docs/.workflows/<run>/` dir when `cleanup: true`.
- `commit-task.sh` - the per-task commit step used by both build orchestrators.
- `decompose.sh` - renders a plan's task index
  (`<task-file>\t<title>\t<model>\t<review>\t<concurrent>`, five columns - no effort column, the
  plan carries no such marker). `concurrent` is derived, never read from a marker: `yes` only
  when the task is not task 1, carries both `### Dependencies` and `### Files`, has a predecessor
  carrying `### Files` (that predecessor's own dependencies are never read), names no
  `(Task <N>)` pointer to the preceding task and shares no `### Files` path with it - anything
  less complete reads `no`. Also checks the plan against the `<plan>.sha256` sidecar the
  `ExitPlanMode` hook wrote (mismatch = exit 7, absent = warning).
- `last-commit-date.sh` - resolves the last-commit boundary a checkpoint review reads since.
- `lib_find_excludes.sh`, `lib_touched.sh` - shared helpers for scoping a diff/review to touched
  paths.
- `lib_sha256.sh` - `sha256_of <file>` through `sha256sum` / `shasum -a 256` / `openssl`, sourced
  by `decompose.sh` and by `hooks/scripts/review-plan.sh`; no tool available = prints nothing.
- `phases-status.sh` - computes phase status for resuming a `phases <phases.md>` run.
- `read-config.sh` - resolves `.claude/superdev.yml` switches (see above).
- `record-decision.sh` - persists an accepted BLOCKED/decision wording to
  `implementation/decisions.md`, binding later review rounds.
- `run-gate.sh` - the single runner of one review round's gate set: the orchestrator calls it
  once per round with the round's stage (`checkpoint` / `final` / `re-review:<stage>`), it runs
  that stage's subsections of the plan's `## Gate commands` block through the executor's
  `run.sh` and writes the round's gate block, which every reviewer of the round then reads
  instead of running a gate command itself. Its `GATE_BUDGET` bounds the WHOLE run (540 s), not
  one command, because the caller reaches it through the `Bash` tool, whose timeout caps at
  600 s and defaults to 120 - so both build skills give that one call `timeout: 600000`, and a
  command the budget leaves no room for is reported red rather than started.
- `stats-record.sh`, `stats-report.sh` - per-dispatch event log and rendered run report under
  `.temp/superdev/stats/<run>.*`, gated by `stats: true`.
- `vibe-guard.sh` - the vibe track's advisory scope guard.

Do not invent scripts and do not omit ones that exist - re-derive this list from the directory
if it drifts.

## Anti-patterns

- Treating an edit in this repo as if it changed the running plugins, or assuming a build/lint
  step will catch a mistake before it ships - there is none.
- Baking a host project's stack assumptions into a skill prompt.
- Writing a plugin-named dot-dir (`.superdev/`) at a host repo root.

## Related context

- Skill layer detail: `./skills/CLAUDE.md`
- Agent layer detail: `./agents/CLAUDE.md`
- Root cross-plugin invariants: `../CLAUDE.md`
