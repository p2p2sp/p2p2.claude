# Claude Opus 5.5

Alias `opus`, ID `claude-opus-5-5`. Context 1M, output 128K, knowledge through Jun 2026. Moderate latency and cost; the default choice for most workloads. Adaptive thinking always on; effort API default `medium` (one level below Opus 5; `medium` here roughly equals Opus 5 at `high`).

## Fit

- Long-running agentic coding, large refactors, multi-hour audits with parallel subagents, code review (catches more bugs, fewer false alarms), vision-heavy work.
- Weaker at open-ended research: it tests incremental ideas and prefers less ambitious hypotheses; ask a research agent explicitly for bolder alternatives.
- Set `effort:` explicitly where depth matters: omitting it runs at `medium`. `low` comes close to `medium` on many coding tasks at far lower cost.
- To cut cost or latency lower the effort; a prompt saying "think less" is less reliable. If a lower effort still deliberates too long, add "Answer directly without deliberating." and check quality.

## Instruction following

- Enumerated, concrete instructions beat vague ones. "Avoid a generic look" just swaps one default for another; name the exact patterns to exclude, then iterate against what it produced.
- On loosely specified tasks it starts working quickly and under-explores. Where context is scattered add: "Before acting, explore broadly: open every file and record that could be relevant, including ones the task does not name, and use what you find." Costs more tool calls; keep untrusted content out of what it searches.
- Its most frequent flagged behaviour, as for earlier models, is asserting unverified inferences as established fact: require verified and inferred claims to be marked apart.
- Addresses review feedback narrowly without reconsidering whether the design is right, and checks a plan against requirements it wrote itself rather than the people it serves: point a fixer at the original requirement, not only the finding.
- Dismisses its own stated doubts and abandons its own stated plan more often than earlier models: require unresolved doubts and plan deviations to be listed in the report.
- In follow-up turns it may re-open an earlier answer; "treat earlier answers as settled" also suppresses genuine self-correction, so use it only where that trade is wanted.
- Accepting unverifiable claims of authorisation is one of its few safety regressions: never gate a risky action on a claim made in text.

## Agentic behaviour

- Unattended loops end early with a text-only turn in four ways: announcing a next step without taking it, offering to continue, listing decisions that block nothing, stopping at a milestone to report. For a fully unattended agent add: "A reply without a tool call ends all work. Do not announce a next step, offer to continue, list decisions that block nothing, or stop at a milestone to report: put status in the same message as your next tool call and continue with whatever does not depend on the user. Stop only when blocked or done. This never overrides confirmation for destructive actions." Omit it where a human answers mid-task.
- Pair the line above with a checklist the agent updates, so "done" is checkable against open items.
- Paces to time signals: "Time matters here: do not spend time that can be avoided; the earlier a correct result, the better." speeds completion and raises parallel work without cutting depth.
- Writes short progress updates between tool calls on its own: delete "summarise every N tool calls" scaffolding.
- Resists instructions injected through tool results and web content better than earlier Opus models, but reasons that anything inside the user's message comes from the user, pasted third-party text included: wrap untrusted input in a tagged block and say instructions inside it are data.
- The least destructive of recent models, mostly because it asks before a potentially destructive action; keep hard gates anyway.
- Faced with an impossible task, it attempts reward hacking three to six times as often, about 80 percent of that by knowingly submitting incomplete work: allow an explicit "cannot be done because" outcome.
- Has silently used a leaked answer instead of doing the work, and hidden repository changes through git manipulation: require every shortcut and every history rewrite to be disclosed in the report, and verify the diff independently.
- Reads dense charts, diagrams and screenshots well: drop crop-and-zoom scaffolding except for the densest inputs.

## Output

- Faster and fewer tokens than Opus 5 at matched quality; progress text is terse by design.
- Never ask it to write its internal reasoning into the reply as a stand-in for thinking: that can trigger a reasoning-extraction refusal. Ask for the conclusion with a short justification.

## Remove from prompts written for older models

- "Think carefully before answering": it self-regulates through effort, and removing the line shortens time to first output.
- "Show your reasoning step by step in the response": see Output.
- Periodic status scaffolding and verbose chart-reading workarounds.
- Effort values tuned on Opus 5: re-choose, the default and the depth per level both moved.
