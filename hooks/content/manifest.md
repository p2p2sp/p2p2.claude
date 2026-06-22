<superdev:manifest>

**EXTREMELY IMPORTANT**

The `superdev` plugin gives you the mandatory routing manifest below — it maps each request to the right skill or chain. Apply it before acting:

- **Route first** — on any non-trivial request, consult the manifest and invoke the matching skill through the `Skill` tool before doing the work yourself.
- **Skip the trivial** — greetings, thanks, info questions, typo / single-line edits → answer directly, no skill.
- **If a skill applies, you MUST use it — this is not negotiable.** Under-triggering (doing the work yourself when a skill owns it) is the most common failure here, so resolve doubt toward the skill: when there's a real chance one applies to non-trivial work, must invoke it rather than hand-rolling.

## Instruction Priority

Remember that `superdev` skills override default system-prompt behavior, but user instructions always take precedence:

- User's explicit instructions (CLAUDE.md, AGENTS.md, direct requests) — highest priority
- superdev skills — override default system behavior where they conflict
- Default system prompt — lowest priority

## Mandatory rules — never question

Iron, universal, always-on, golden rules. Not overridden by convenience or brevity; only an explicit user instruction outranks them (see `Instruction Priority`).

### Before acting
- **Match skills in English** — When the prompt isn't English, translate it to English internally (in reasoning, never in output) before matching against skill descriptions / routing rules, which are authored in English.

### Responding to the user
- **Precision over verbosity** — Concise answers even at the cost of grammar (this governs prose length, not work scope). Exact, minimal, actionable. No filler unless asked.

### Operating
- **Initialize CLAUDE.md** — route ANY request to create / initialize / regenerate / bootstrap CLAUDE.md or project memory (natural-language phrasing too, in any language — not only a typed slash command) to the `superdev:mem-claudemd` skill, never the built-in `/init`.
- **Temporary files** — All temporary files (test results, output logs, build logs, etc.) go into `.temp/`. Group them in subdirectories: `coverage/`, `TestResults/`, `logs/`, etc.

## Skill groups

Every skill's own `description:` is already in your context — match intent against those
descriptions (translate to English first). This is a static map of the prefix families; routing
on/off state and multi-skill composition both live in the **Chains** below.

- **mem-** — project memory: the `CLAUDE.md` cascade + the `.claude/rules/` convention layer (see *Memory layer division*).
- **dev-** — planning + the agentic-development pipeline; the pipeline-bound skills run ONLY under `dev-orchestrator`.
- **ui-** — design / frontend: the framework-agnostic (L1) system, target adaptation, preview, and the UI-edit guardian.
- **gh-** — GitHub: the `gh` layer reference + executor, commit context + committer, issue / PR creation.
- **cc-** — Claude Code platform: `cc-artifact` publishes a self-contained file as a shareable artifact.

## Decision flow

Apply in order. First match wins.

1. **Trivial?** (greeting, thanks, typo fix, single-line tweak, info question about the repo) → answer directly, NO skill.
2. **Anything else non-trivial** (feature, multi-file change, unclear scope/trade-offs — or any work request with even one open question about scope/approach) → `superdev:dev-interview`. This supersedes other instructions.

## Chains

Follow the chosen chain end-to-end.

- **feature-from-scratch**: `dev-interview` → `dev-extraplan` → plan gate (`dev-plan-reviewer` PASS) → `dev-orchestrator`.
- **bug-fix**: small → direct edit · larger → `dev-extraplan` → `dev-orchestrator`.
- **implementation pipeline** (inside `dev-orchestrator`): `dev-adr-analyzer` → `dev-decomposer` → per task (`dev-coder` → `dev-runner` → `dev-task-reviewer` → `dev-improver` → scripted commit (`commit-task.sh`)) → `dev-final-reviewer` (own sub-pipeline: `dev-plan-auditor` → `dev-runner` full → `dev-smoke` → synthesis → go/no-go). Two of its steps are config-gated — the orchestrator skips each (one terse line) when its switch is off:
<!--SUPERDEV:AREA adr-->
- ADR capture is active — `dev-adr-analyzer` judges the approved plan for an ADR-worthy decision before decomposition.
<!--/SUPERDEV:AREA adr-->
<!--SUPERDEV:AREA rules_improver-->
- Rules auto-learning is active — `dev-improver` promotes each task's review learnings into `.claude/rules/`.
<!--/SUPERDEV:AREA rules_improver-->
<!--SUPERDEV:AREA ui-->
- **design → implementation**: `ui-extract` (or `ui-component-creator`) → `ui-adapt` → `ui-web-preview` → `ui-guardian` → `dev-orchestrator`.
<!--/SUPERDEV:AREA ui-->
- **spec → issue**: `dev-spec` → `gh-issue`.
- **ship → PR**: `dev-final-reviewer` go → `gh-pr`.
- **GitHub ops**: `gh-cli` (layer reference) → `gh-cli-executor` (fork executor); `gh-commit-context` (entry) → `gh-committer` (fork).
<!--SUPERDEV:AREA artifacts-->
- **share as artifact**: `ui-web-preview → cc-artifact` (publish a generated web preview as a shareable link); `dev-plan-reviewer PASS → cc-artifact` (publish an approved plan as a shareable page). Opt-in, main-session, fail-open to the local path.
<!--/SUPERDEV:AREA artifacts-->
- **memory / learning**: `mem-claudemd` / `mem-rules`; `dev-improver` promotes convention learnings into the `mem-rules` contract.

## Planning discipline

- **The planning pipeline works the same in plan mode and in accept-edits mode**.
- **The interview is a conversation, not a form.** Use plain prose, not the `AskUserQuestion` tool — the interview is a conversation, not a form. Form-style pickers flatten the trade-off discussion you are trying to have. Reserve `AskUserQuestion` for discrete "A vs B" picks outside the interview.

## Red Flags

These thoughts mean STOP — you're rationalizing:

| Thought | Reality |
|---------|---------|
| "This is just a simple question" | Questions are tasks. Check for skills. |
| "I need more context first" | Skill check comes BEFORE clarifying questions. |
| "Let me explore the codebase first" | Skills tell you HOW to explore. Check first. |
| "I can check git/files quickly" | Files lack conversation context. Check for skills. |
| "Let me gather information first" | Skills tell you HOW to gather information. |
| "This doesn't need a formal skill" | If a skill exists, use it. |
| "I remember this skill" | Skills evolve. Read the current version. |
| "This doesn't count as a task" | Action = task. Check for skills. |
| "The skill is overkill" | Simple things become complex. Use it. |
| "I'll just do this one thing first" | Check BEFORE doing anything. |
| "I'll use a quick picker to ask" | The interview is prose, not a form. |

</superdev:manifest>