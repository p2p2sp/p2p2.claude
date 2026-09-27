# Cross-model rules

Contents: Where a file runs on several models / Rules that hold on every model / Where the models pull apart / Choosing model and effort / Frontmatter mechanics.

## Where a file runs on several models

- An agent with `model: inherit` or no `model:`, a skill without `model:`, and an agent its callers dispatch with different `model` values all run on whatever model the session or caller picks.
- Write such a file for the union: a mitigation that is harmless on the other models goes in; one that hurts another model goes in only behind the condition that triggers it, or the file pins `model:` instead.

## Rules that hold on every model

- Use the action verb you mean: every current model reads "suggest" as suggest, not edit.
- State the range of every instruction ("every file", "only the first section") and what is out of scope ("report, do not fix"). Sonnet 5 under-generalises, Fable 5.1 and Sonnet 5 over-reach; the explicit range fixes both.
- Give each rule one clause of why: all models generalise from a reason better than from a bare ban.
- Plain wording, no shouted MUST or CRITICAL: current models over-trigger on emphasis.
- Say what to do, not only what to avoid, especially for format; the prompt's own formatting pulls the output toward it.
- Separate instructions, data and examples with XML tags; make examples diverse and wrap them in example tags.
- Long input first, the question or task last.
- "Read a file before making any claim about it": the cheapest hallucination guard for every model.
- Every output contract carries an explicit "unknown" or "cannot determine" form, so no model fabricates to fill a field.
- Coding workers: "Write a general solution for all valid inputs; never special-case tests; if a test looks wrong, say so." Every model games tests at some rate.
- Destructive, irreversible or externally visible actions need confirmation; reversible local steps proceed without asking. Enforce hard limits with `tools:`, `disallowed-tools:` or hooks: several models work around limits stated only in prose.
- Never write "think carefully": effort, or thinking on Haiku, is the lever. Never ask a model to reproduce its reasoning in the reply; ask for a conclusion and a short justification.
- Never add "summarise every N tool calls" scaffolding: current models narrate on their own, and where they do not (Fable 5.1), ask for the content of the update, not a cadence.
- Parallel reads: "Request every independent tool call in one response; dependent ones in sequence; never guess a missing parameter."

## Where the models pull apart

- Formatting: Fable 5.1 under-formats, Haiku 4.5 over-formats. Write one conditional rule: lists only for multifaceted content, prose otherwise.
- Stopping: Fable 5.1 and Opus 5.5 end unattended turns early; Sonnet 5 pushes past approvals. For an unattended agent write both halves in one rule: continue through reversible steps without asking, stop only for destructive steps or a decision the user owns.
- Reviewer recall: "be conservative" makes Sonnet 5 under-report. Give every reviewer a concrete reporting bar instead of a tone.
- Exploration: Opus 5.5 under-explores loosely specified tasks, Haiku 4.5 over-calls tools. Name the sources to read, or the class of sources, rather than "explore as needed".
- Context: Haiku 4.5 has 200K, the rest 1M. A file that may run on Haiku keeps its working set well under 200K.
- Knowledge: Haiku 4.5 knows up to Feb 2025, Sonnet 5 to Jan 2026, Opus 5.5 and Fable 5.1 to Jun 2026. Put every fact newer than the oldest target's cutoff into the prompt.
- Effort: Haiku 4.5 has none; Opus 5.5 defaults to `medium`, Fable 5.1 and Sonnet 5 to `high`. An `effort:` line is needed wherever depth matters and the file may run on Opus 5.5.

## Choosing model and effort

- Orchestrator, planner, final judge: `opus`; `fable` only where Opus at higher effort measurably falls short.
- Implementing worker: `sonnet`; `opus` for long autonomous or cross-cutting changes.
- Scanner, classifier, triage scorer, high-volume extractor: `haiku`, or `sonnet` at `low` when the task needs a 1M context or post-2025 knowledge.
- Reviewer: a concrete reporting bar and no authorship labels on the work under review; Fable 5.1 and Haiku 4.5 both judge Claude-labelled output more favourably.
- Effort: tune within a model before switching models. `low` suits most subagents; `high` for complex reasoning and coding; `xhigh` for long-horizon agentic work on the models that support it; `max` only for frontier problems, since it overthinks structured tasks. Level names do not mean the same depth across models.

## Frontmatter mechanics

- `model:` takes an alias (`fable`, `opus`, `sonnet`, `haiku`), a full model ID, or `inherit`. On an agent, resolution order is the dispatch's `model` parameter, then the frontmatter, then `CLAUDE_CODE_SUBAGENT_MODEL`, then the session model.
- A family alias resolves to the session's exact model when the session already runs that family, or when the provider hides the family. Pin a full ID where the exact snapshot matters.
- `effort:` takes `low`, `medium`, `high`, `xhigh`, `max` where the model supports the level; absent, it inherits the session. It overrides the session only while the agent or skill is active.
- A skill's `model:` holds for the rest of the current turn only; with `context: fork` it sets the forked agent's model. A value the organisation's model allowlist excludes is ignored silently.
- An orchestrator's dispatch passes `model` but never effort: the agent's frontmatter is the only place its effort is set.
