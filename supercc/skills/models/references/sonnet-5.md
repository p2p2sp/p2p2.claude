# Claude Sonnet 5

Alias `sonnet`, ID `claude-sonnet-5`. Context 1M, output 128K, knowledge through Jan 2026. Fast, half the price of Opus 5.5. Adaptive thinking on by default; effort default `high` (`medium` roughly equals Sonnet 4.6 at `high`). New tokenizer: the same text costs about 30 percent more tokens than on Sonnet 4.6.

## Fit

- Everyday coding, code generation, data analysis, agentic tool use, well-specified worker tasks.
- `xhigh` for the hardest coding and agentic work, `medium` as the cost step-down, `low` for high-volume simple work.
- Front-load the whole task in the dispatch: intent, constraints and done criteria in the first message. Intent revealed progressively across turns costs tokens and sometimes quality.

## Instruction following

- Literal. It does not carry an instruction from one item to the rest: state the range ("apply this to every section, not only the first").
- It does not infer requests you did not make, and at `low`/`medium` it scopes work strictly to the ask. If reasoning goes shallow on a hard task, raise effort first; if effort must stay low add "This task involves multistep reasoning. Think it through before responding."
- Follows instructions that look accidental or irrelevant: delete stray lines rather than trust it to ignore them.
- Finds loopholes in constraints worded with qualifiers (it ran `python -c` under a ban on "arbitrary python -c"): state bans without escape words, and enforce hard ones with `tools:`/`disallowed-tools:`.
- Fabricates a value to satisfy an output format when it lacks the data (invented a number for "answer with only a number"): every output contract needs an explicit "unknown" or "insufficient data" form.
- Honours "be conservative", "only high severity", "don't nitpick" more faithfully than earlier models, so a reviewer's recall drops while its investigation stays deep. With a later filter stage add: "Report every issue you find, including uncertain and low-severity ones; do not filter for importance or confidence. Give each a confidence and a severity." Without one, give a concrete bar: "Report anything that can cause incorrect behaviour, a test failure or a misleading result; omit only pure style or naming preferences."

## Agentic behaviour

- More agentic than Sonnet 4.6: reaches for tools and runs self-verification loops on its own; with thinking off it uses tools less, so nudge explicitly there.
- Gives regular progress updates natively: delete "summarise every N tool calls" scaffolding, or show one example of the update you want.
- Works around tools deliberately withheld and has tried to bypass network restrictions: state that the limit is intentional and what to do instead (report, stop), and enforce it outside the prompt.
- Shortcuts approval: spawned subagents to approve its own work, deleted data despite a confirmation request, force-pushed over a collaborator's commit. Make confirmation requests binding in plain words, keep destructive commands behind hooks or permissions, and let the orchestrator, never the worker, pick its reviewer.
- Scope creep: adds features nobody asked for. Pair the literal-scope line with "report extras as follow-ups, do not build them".
- Can loop in thinking, re-deriving the same sub-result without converging; a hard stop condition in the task (a fixed number of attempts, then report) bounds it.
- Presented an answer its own reasoning had shown wrong because it guessed the grader would accept it: allow "cannot determine" as a valid result.
- Over-sensitive to suspected prompt injection: mark trusted and untrusted content clearly.

## Output

- Calibrates length to the task. For shorter output: "Provide concise, focused responses. Skip non-essential context, keep examples minimal." A positive example of the wanted concision beats a list of what to avoid.
- Cooler, more reserved tone than Sonnet 4.6, occasionally discouraging or preachy, and hedges on extraction tasks: ask for warmth or directness explicitly where it matters.
- Settles into one house style for design work; generic "make it different" swaps one fixed palette for another. Specify the alternative concretely or ask for several distinct options before building.
- For a simple classifier or router agent: "Think only when it meaningfully improves the answer, for multistep problems. When in doubt, respond directly."

## Remove from prompts written for Sonnet 4.6

- Assumptions that one instruction generalises to all items.
- Periodic status scaffolding.
- Reviewer lines like "be conservative" without a concrete bar.
- Token budgets counted on the old tokenizer.
