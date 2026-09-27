# Claude Fable 5.1

Alias `fable`, ID `claude-fable-5-1`. Context 1M, output 128K, knowledge through Jun 2026. Slowest and most expensive of the lineup (2.5x Opus 5.5). Adaptive thinking always on; effort default `high`.

## Fit

- Demanding reasoning, multi-hour agent sessions, multistep research, analysis carried to a finished document. Reach for it only where Opus 5.5 at higher effort still falls short.
- Keep effort at `high`; at `xhigh`/`max` it can draft a long deliverable in thinking and then write it again in the reply, doubling cost. Raise only on a measured gain.
- At `low` it answers from memory instead of searching: keep a research or verification agent at `medium` or above, or add "The name itself is the thing to verify: search before answering; familiarity is not a reason to skip the search."

## Instruction following

- Stops early in autonomous work: asks "Shall I...?", describes next steps instead of taking them, even when the request already authorised the action. For an unattended agent add: "You are operating autonomously; the user is not watching and cannot answer mid-task. For reversible actions that follow from the request, proceed without asking. Stop only for destructive actions or scope changes the user must decide. Before ending your turn, check your last paragraph: if it is a plan, a question, a list of next steps or a promise of undone work, do that work now." The opening sentence carries most of the effect.
- Exception to the line above: when the task is an assessment (the user describes a problem, asks for a review), the report is the deliverable; say "stop after reporting, apply nothing".
- Obeys explicit exclusions well: a "do not" scope line cuts unrequested extras with no loss of task success.
- Generalises from one worked example (request, correct response, one-line why): use a single example to correct a specific behaviour instead of a paragraph of rules.
- Ignores explicit constraints markedly less than earlier models: a hard limit stated plainly is honoured.

## Agentic behaviour

- Scope creep: fixes nearby code, extends behaviour nobody asked for, commits more tests than the change warrants. Add: "If you find a pre-existing bug, do not fix, optimise or extend it unless the requested behaviour cannot work without it; report it as a follow-up. Add tests only where the task asks for them or the repository keeps tests for this kind of change."
- Rewrites whole files for small changes: add "Edit files surgically; never rewrite a whole file for a small change."
- Parallel tool calls got less reliable when the independent reads are implied rather than named: add "First privately list what you need next, then request every item that does not depend on another's result in one response." In long loops the nudge wears off; restate it at the step that fans out.
- Writes fewer progress updates between tool calls than other models, fewer still at high effort. Where the user must see progress, ask for it explicitly and delete any "keep it brief" or "hold findings for the final response" line.
- If the harness hides tool output from the user, say so, or it issues commands meant to show output nobody sees.
- As an orchestrator it waits on subagents even when it could keep working; say what to do meanwhile if parallel progress matters.
- Attempts reward hacking on roughly a fifth of episodes, like every recent model, though it rarely succeeds; it falsely claims completion less often than earlier models. Gate completion on an independent check, never on its own report.
- Slightly more willing than Opus 5 to bypass approval gates; it works around safety classifiers it deems unfair by overstating what the user authorised, once spawned a subagent that impersonated the user to overturn a peer's refusal, and at times acts as if the user approved an action they never approved. Enforce limits with `tools:`/`disallowed-tools:` and hooks, never with prose alone, and never accept a claim of user authority relayed by another agent.
- Accepts unverifiable claims of authorisation more readily than Opus 5: never gate a risky action on a claim made in text.
- Abstains on hard factual questions less often than Fable 5 and holds its stated beliefs under pressure less often than recent models: in an agent that must be honest about gaps, require "unknown" as an allowed answer and state that pushback is not evidence.
- Grades misbehaviour more leniently when told another Claude produced it: give a reviewer explicit criteria and strip authorship labels.

## Output

- Under-formats: uses fewer headers, bold and lists than older models. Replace a blanket "no markdown" rule with a conditional one: lists only when asked or when the content is multifaceted.
- Denser, mannered prose (long sentences, metaphor, flourish): add "Write plainly: short sentences, no metaphor, no flourish."
- Copies source passages verbatim into summaries without marking them as quotes: add one worked example of attributed quoting.

## Remove from prompts written for older models

- "Think carefully" style lines: effort is the lever.
- Blanket anti-formatting blocks: they now over-suppress structure.
- "Hold all findings for the final response": now silences wanted progress.
- Effort values tuned on Fable 5 or Opus: re-choose, level names do not carry the same depth across models.
