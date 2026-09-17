# superdev/agents

## Purpose

The agent layer of superdev: 12 agent `.md` files. Verify the current list from the directory
itself if this drifts; each is dispatched by exactly ONE caller and never invoked directly by
the user - a change here means checking the agent's own `description:` still says so.

## Entry points

- `superbuild-task-implementor.md` / `simplebuild-task-implementor.md` - dispatched per task by
  `superbuild` / `simplebuild` with the `Agent` tool, at that task's `Model:` marker; the tool
  takes no `effort` parameter, so the agent's own frontmatter supplies it. The task's `Kind:`
  marker (`code` | `scaffold` | `text`) sets the implementor's own discipline: `code` is today's
  unchanged behavior, `text` is one pass over only `### Files` and the files `### Approach`
  names (no probe, no repo-wide precedent search), `scaffold` writes generated output only by
  running the generator/tool `### Approach` names - unless that `### Approach` carries the
  output verbatim, which both implementors also accept. A task carrying no `Kind:` marker (a
  pre-axis plan) is treated as `code`. Detail lives in the agents' own bodies, never here.
- `superbuild-task-reviewer.md` - dispatched by `superbuild` after each implementor run, at that
  task's `Review:` marker in three states: no marker uses the reviewer's own frontmatter
  default, `Review: <model> <effort>` passes only `<model>`, and literally `Review: none` skips
  the dispatch entirely; where it runs, it runs a failure pass over the task's diff.
- `superbuild-reviewer-spec.md`, `superbuild-reviewer-change.md` - the Super track's two build
  review dimensions, dispatched by `superbuild` under the shared stage contract
  (`stage: checkpoint|final|re-review`). The code dimension runs the checkpoint round every 5
  committed tasks, the final round and the re-review after a fix; the spec dimension runs at
  `final` and at its own re-review only - mid-build the criteria of the tasks still unwritten are
  unmet by construction. At `final` both are dispatched as TWO `Agent` tool uses in ONE message
  and run concurrently: neither reads the other's report, so the only thing they share is the
  working tree their gate commands run against.
- `simplebuild-reviewer.md` - the Simple track's single build reviewer, dispatched by
  `simplebuild`, owning both dimensions at once. One per round, never a concurrent pair.
- `memory-writer.md`, `rules-writer.md`, `qa-writer.md` - Close Out wave 1, dispatched together
  in ONE message: `memory-writer` + `rules-writer` always, `qa-writer` joins that wave whenever
  `qa`, `e2e-ui` or `e2e-api` reads `true`.
- `changelog-writer.md` - Close Out wave 2, dispatched alone after wave 1 completes, gated by
  `changelog: true`.
- `e2e-writer.md` - dispatched by the user-only `e2e` skill alone, once per pending QA scenario
  ID; NEVER at Close Out, never during a build.
- `vibe-implementor.md` - dispatched by the `vibe` skill alone; never at Close Out.

## Contracts & invariants

- The hard tool allowlist for an agent is its `tools:` frontmatter field (the agent-side
  equivalent of a skill's `disallowed-tools`).
- Agents are dispatched with the `Agent` tool; the per-call `model` is honored, but the tool
  takes no `effort` parameter at all - the agent's frontmatter decides. In fix mode, on a
  re-dispatch against a review report, both task agents run with no `model` parameter set.
- Why agent and not fork skill: EVERY worker a build orchestrator dispatches is an agent, and the
  reason is the `Skill` tool's two hard limits. It takes no `model` parameter, so a fork runs at
  one static strength whoever calls it - that is what moved the task implementors and the task
  reviewer here. And fork invocations are serialized with no way to await a pair, so two
  independent workers cost the sum of their times - that is what moved the four closeout writers
  here, and then the three build reviewers. A fork also returns no usage figures at all, so a run
  measured under `stats: true` cannot see what a fork cost; an agent's completion notification
  carries `subagent_tokens`, `tool_uses` and `duration_ms`, which is why every dispatch of a build
  is measurable today. The one fork left anywhere in a build round is `skills/executor`, and a
  reviewer invokes it - the orchestrator never does.
- An agent carries no `${CLAUDE_PLUGIN_ROOT}`, so anything it needs from inside the plugin arrives
  as a label value its dispatch resolved: `refs:` for the references directory, and `runner:` for
  the executor's `run.sh` that every gate command goes through. An agent that spells a plugin path
  itself is broken wherever the plugin is installed.
- A task implementor or the task reviewer returns `VERDICT: BLOCKED` on a re-dispatch carrying a
  `decisions:` label when a task/fix raises a `DECISION:` it cannot settle. Behaviour recorded
  in a task's `### Failure modes` is itself a decision - a `NOTE: plan defect` line, never a
  Critical or Important finding.
- The verdict vocabulary (`VERDICT: BLOCKED`, `UNDERSPECIFIED:`, `DECISION:`,
  `NOTE: plan defect`) is owned by `../references/review-contract.md`. This node points at that
  file; it never redefines the terms.
- Every agent with `Write`/`Edit` in `tools:` carries a read-back guard against an ORPHAN
  closing tag (`</content>`, `</parameter>`) landing as the last line of a file it wrote - the
  closing tag of its own write call leaking into the value. It is an emission artifact, not a
  content decision, so the guard reduces it and never eliminates it; `tests/orphan-tags.test.ts`
  is the deterministic half and the only thing that stops one from shipping again (one did, in
  `superdev/references/changelog-entry-format.md`, release 0.46.1).

## Anti-patterns

- Adding, removing or renaming an agent without updating `superdev/.claude-plugin/plugin.json`
  `agents[]` and this node.
- Letting an agent appear in both `skills[]` and `agents[]`.
- Dispatching `e2e-writer` or `vibe-implementor` from Close Out - both are single-caller agents
  outside that flow.

## Related context

- Skill layer (orchestrators that dispatch these agents): `../skills/CLAUDE.md`
- Plugin-wide facts: `../CLAUDE.md`
- Review vocabulary owner: `../references/review-contract.md`
