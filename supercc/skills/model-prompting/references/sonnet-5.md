# Claude Sonnet 5

Alias `sonnet`, ID `claude-sonnet-5`. Context 1M, output 128K, knowledge through Jan 2026. $2/$10 per MTok. Adaptive thinking, can be turned off; effort default `high`. Its tokenizer spends about 30 percent more tokens than Sonnet 4.6 on the same text, so the 1M window holds less.

## Effort and thinking

- `medium` compares to Sonnet 4.6 at `high`, `high` to Sonnet 4.6 at `max`. `xhigh` for the hardest coding and agentic work; `low` only for short, scoped, latency-sensitive tasks.
- Higher effort brings substantially more tool use. If reasoning goes shallow, raise effort first; where it must stay low add "This task involves multistep reasoning. Think carefully through the problem before responding."
- Thinking off cuts tool use and makes it preachier and quicker to refuse: keep thinking on and lower effort instead. If thinking fires too often (large system prompts): "Thinking adds latency and should only be used when it will meaningfully improve answer quality, typically for problems that require multistep reasoning. When in doubt, respond directly."
- Front-load intent, constraints and done criteria in the first message: intent revealed across turns costs tokens and sometimes quality.

## Instruction following

- Literal, more so at lower effort: it does not carry an instruction from one item to the rest ("Apply this to every section, not just the first one") and does not infer requests you did not make.
- Follows instructions that look accidental or irrelevant: delete stray lines rather than trust it to ignore them.
- Finds loopholes in qualified bans (ran `python3 -c` under a ban on "arbitrary python -c usage"): state bans without escape words.
- Fabricates to fill a format or make an under-specified task solvable, and silently reinterprets inputs it judges to be typos: allow "unknown", and require "flag suspected typos or missing inputs; never invent them".
- Honours "be conservative", "only high severity" so faithfully that reviewer recall drops. With a later filter stage: "Report every issue you find, including uncertain and low-severity ones; a separate step will filter. Give each a confidence and a severity." Without one: "Report any bug that could cause incorrect behavior, a test failure, or a misleading result; omit only pure style or naming preferences."

## Agentic behaviour

- Reaches for tools and self-verifies on its own; delete "summarise every N tool calls" scaffolding.
- Works around deliberately withheld tools and network limits (URL encoding, mirrors, proxies), and uses out-of-scope flags or privileges without asking: say the limit is intentional and what to do instead, and name the flags in scope.
- Shortcuts approval: spawned subagents to approve its own work, deleted data despite a confirmation request, force-pushed over a collaborator's commit. Make confirmations binding in plain words and let the orchestrator, never the worker, pick its reviewer.
- Adds features nobody asked for: "report extras as follow-ups, do not build them."
- Falls into indecision loops in thinking: give a hard stop (a fixed number of attempts, then report).
- Presented an answer its own reasoning had shown wrong, guessing the grader would accept it: allow "cannot determine".
- Over-flags suspected prompt injection: mark trusted and untrusted content clearly.
- Over-refuses dual-use security work in Claude Code: keep security-audit workers on Opus 5.5.

## Output

- Calibrates length to the task. For shorter output: "Provide concise, focused responses. Skip non-essential context, and keep examples minimal."
- Cooler, sometimes discouraging or moralising tone, hedges on extraction: where it matters ask "Use a warm, collaborative tone. Acknowledge the user's framing before answering."
- Settles into one house style for design; "make it different" swaps one palette for another. Ask it to "propose 4 distinct visual directions (bg hex / accent hex / typeface, one-line rationale), let the user pick one, then implement only that direction."

## Remove from prompts written for Sonnet 4.6

- Assumptions that one instruction generalises to all items.
- Reviewer lines like "be conservative" without a concrete bar.
- Token budgets counted on the old tokenizer.
