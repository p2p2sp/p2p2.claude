# Claude Haiku 4.5

Alias `haiku`, ID `claude-haiku-4-5-20251001`. Context 200K, output 64K, reliable knowledge through Feb 2025. Fastest and cheapest of the lineup. Extended thinking with a token budget, no adaptive thinking, no effort parameter. Retirement not sooner than 2026-10-15: re-check what the `haiku` alias resolves to before relying on this profile.

## Fit

- Worker subagent under a stronger orchestrator: parallel, narrow, well-specified subtasks such as scans, triage scoring, classification, extraction, simple edits.
- Near-frontier but not frontier: keep nuanced judgment, design decisions and long unattended autonomy on a larger model.
- `effort:` does nothing here; the only depth lever is whether thinking is on. Spend the saving on a tighter prompt instead.
- Its knowledge is the oldest in the lineup: put every fact newer than early 2025 (tool versions, APIs, Claude Code features, file formats) into the prompt or a file it reads.
- Keep a task's working set well under 200K: an agent that reads a large repo or long logs belongs on a 1M model.

## Instruction following

- Literal: "suggest changes" yields suggestions, not edits. Use the action verb you mean ("change", "write", "delete").
- Responds well to numbered steps when order matters, one clause of rationale per rule, XML tags that separate instructions from data, and 3 to 5 diverse examples in example tags.
- Plain wording works; shouted MUST and CRITICAL invite over-triggering.
- Give one narrow task with a fixed output format; a worker holding many rules drifts.

## Agentic behaviour

- Tracks its remaining context: wraps up as the budget nears the end and persists while it is far. If the harness compacts or the agent saves state, say so, or it stops early near the limit.
- Runs independent tool calls in parallel on its own; an explicit "call independent tools in one response, dependent ones in sequence, never guess a missing parameter" raises the rate further.
- Hardcodes or special-cases tests more often than Sonnet 4.5. For any coding worker add: "Write a general solution that works for all valid inputs. Never special-case or hardcode test values. If a test or the task looks wrong, say so instead of working around it." This instruction measurably cuts gaming on this model.
- Leans toward excessive tool calls, over-engineering and hallucination: add "Read a file before making any claim about it" and "Do only what the task asks; no extra files, helpers or error handling."
- Favours output labelled as Claude's when comparing: keep reviewer and judge roles off Haiku, or strip authorship labels.

## Output

- Concise by default and may skip a summary after tool calls: require the output format explicitly, down to field names.
- Drifts toward markdown and bullets for long-form text: ask for the shape you want in positive terms ("write flowing prose").
- Less emotive and less positive than older models.

## Thinking

- Extended thinking helps on coding and reasoning. Prefer "think it through" over a hand-written step-by-step plan: its own reasoning usually beats the script.
- Thinking from earlier turns is dropped, so a plan it made two turns ago is gone unless it wrote it down.
