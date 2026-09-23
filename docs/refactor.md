# viber: skills and agents review

Scope: every `SKILL.md` and agent file of `viber`, plus the runtime references they read (`test-strategy.md`, `qa-format.md`, `rule-admission.md`, planner templates). Goal: correctness and precision of the instructions, less unneeded prose, lower token and time cost without losing quality.

## Key conclusions

- Shortening agent returns to bare `PASS`/`FAIL` + reason with a legend: 2/10. Returns are already 1 to 3 labelled lines (`VERDICT:`, `REASON:`, `FILES:`). Dropping `VERDICT:` saves about 2 tokens per return and removes the anchor that makes parsing unambiguous.
- The real token cost sits in: (1) instruction text read on every dispatch (a coder reads task-coder + tdd + test-strategy, about 3150 words, before its first line), (2) files agents write (output tokens), (3) rationale clauses attached to every output field and rule.
- Shorter prompts buy quality and context budget, not much speed. Cutting 50% of a prompt gives about 1 to 5% latency; cutting 50% of output gives about 50% (https://developers.openai.com/api/docs/guides/latency-optimization). Thinking tokens are output tokens.
- The biggest speed lever is `effort` and `model` per agent. `opus` + `effort: high` today: task-coder, e2e-writer, qa-writer, closeup, memory-auditor, rules-auditor, planner-review.
- Contradictory instructions are the link between prompt text and speed: the model deliberates over conflicts in its thinking. Removing contradictions matters more than removing words.

## Correctness defects

1. `agents/memory-writer.md:30` and `agents/rules-writer.md:29` order deleting obsolete files, while `:35` / `:33` restrict `Bash` to `wc -c` "and nothing else". `Write`/`Edit` cannot delete a file, so the agent either breaks the rule or leaves the file.
2. `agents/rules-writer.md:36` allows 2 new rule files per run; `references/rule-admission.md:15` says keep ONE when several candidates stand.
3. Three finding-severity vocabularies: task-reviewer emits Critical/Important (`agents/task-reviewer.md:36`), planner-review Critical/Major (`agents/planner-review.md:54`), task-coder is told to leave Minor alone (`agents/task-coder.md:18`), a level the reviewer never emits.
4. `skills/planner/SKILL.md:20` says the input carries three decisions never to be reopened, then the next sentence asks the user which draft round it is. The `fixer` handoff (`skills/fixer/SKILL.md:44-51`) carries no spec shape at all; the rule "fixer -> spec-lite" lives only in `idea`, which that path skips.
5. `skills/planner/SKILL.md:22` "the plan answers HOW ... says nothing about how a task should be coded" conflicts with the WHAT/WHY framing at `:42`.
6. `skills/planner/SKILL.md:76` claims `plan-index.sh` "validates every rule above". It does not check `Delivers`, `Verification` scope, `DoD` observability or the TDD choice, so the model may skip its own check of those.
7. `skills/tdd/SKILL.md:81` ("consider what the new code reveals about existing code") contradicts `:41` (no opportunistic refactor) and `agents/task-coder.md:29` (no unrequested refactors).
8. `skills/idea/SKILL.md`: the canonical question example (`:62`, where the session token lives) is a design decision, while `:86` says design decisions belong to the planner, and the example wins over the rule. The recommendation label differs: "(recommended)" at `:52`, "[Recommended]:" at `:64`. `:50` "never batch two questions into one call" refers to the banned `AskUserQuestion`. `:90` "all unknowns must be known" contradicts `:84` (unknowns may be resolved later). `:21` grammar: "everything what's is".
9. `skills/implementor/SKILL.md`: "retry" after 2 review rounds (`:112`) and 2 test rounds (`:131`) is undefined (tier? round counter reset?). "abort" in step 5 names no destination. The repair coder (`:127`) gets `spec:` with no value and no `out:`.
10. `skills/implementor/SKILL.md:27` requires every argument double-quoted; its own examples at `:52`, `:113`, `:128` are unquoted. Examples beat rules.
11. `agents/qa-writer.md:25` "Neither answer yes -> VERDICT: NONE naming which one" is meaningless. `agents/planner-review.md:24` claims a Contracts block is "the only thing a coder can be handed"; a coder also gets Goal, Covers, Out of scope and Must not change.

## Bloat, ordered by multiplier

Files read on every task first: their cost is multiplied by the number of tasks.

- `skills/tdd/SKILL.md` (1078 words, about 450 needed): the same rules three times, in RED, the checklist and the anti-patterns (mock only at boundaries 3x, public interface 3x, no database 2x). Workflow sits at the end and belongs first. "Violating the letter..." and the capitalised Iron Law are shouting.
- `references/test-strategy.md` (974 words): "Blocking findings" mirrors "Writing tests". Tag blocking rules in place and delete the mirror list.
- Cross-file repeats inside ONE context: "the whole suite belongs to the close" appears in 6 files, "a unit test has no database, queue or network" in 5. In a coder context (task-coder + tdd + test-strategy) these are real tokens, not only drift risk.
- Rationale clauses written for a human: `skills/implementor/SKILL.md:27, :54, :100, :102, :115, :118`; `agents/task-coder.md:23, :28, :49, :51`; `agents/e2e-writer.md:56` explains `Edit` mechanics the model already knows. `.claude/rules/_common.md` already says decision history belongs in CLAUDE.md.
- Defences against inputs the caller never sends: `agents/rules-auditor.md:27` (frozen files the skill never passes), `agents/rules-auditor.md:42` and `agents/rules-writer.md:26` (restate rule-admission criteria and the silent drop), `agents/closeup.md:34, :42` (narrative).
- Output bloat: `agents/memory-auditor.md:35` and `agents/rules-auditor.md:38` write an `OK` line for every checked sentence. The writer reads only non-OK lines, so this is output nobody reads.
- `skills/planner/SKILL.md:50-65`: rules the script already enforces (ids, lower-numbered deps, `Files` format, disjoint files, `Uses`) need one line each, no rationale; the script's error message teaches on failure. Showing the plan path is repeated 3 times (`:14`, `:78`, `:97`).
- `skills/fixer/SKILL.md`: process steps 1 to 5 restate Law 1; the Overview restates the description.
- `hooks/content/manifest.md` opens with "EXTREMELY IMPORTANT" and is injected into every session. The `tdd` description (about 60 words) sits in every session's skill list while only task-coder invokes it.

## Techniques, rated

| Technique | Rating | Notes |
|---|---|---|
| Tune `effort` / `model` per agent (closeup, qa-writer, auditors to sonnet or medium) | 9/10 for speed | Main latency lever. Needs measuring on a real build; where quality drops is unknown. |
| Findings files carry only non-OK lines | 8/10 | Output tokens are latency. |
| Cut rationale; keep a why of at most 6 words only where the rule's edge is non-obvious | 8/10 | "Does this paragraph justify its token cost?" (https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices). A clause helps generalisation, a paragraph does not. |
| One owner per rule; drop copies from files read in the same context | 8/10 | Across separate agents the gain is consistency; every dispatch re-reads a shared file anyway. |
| Inline tags instead of mirror lists | 7/10 | test-strategy "Blocking findings". |
| One canonical example instead of prose describing a format | 7/10 | Anthropic prompting guide. The example must agree with the rules, because the model follows the example (see `idea`). |
| Remove defences the caller or a script already guarantees | 7/10 | |
| Less shouting (CAPS, IRON LAW, CRITICAL, EXTREMELY IMPORTANT) | 6/10 | Quality: current models overtrigger on aggressive language (https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices). |
| Most frequent and critical instruction first | 6/10 | IFScale: models favour earlier instructions (https://arxiv.org/html/2507.11538). |
| Telegraphic ("caveman") prompt compression | 3/10 | No evidence on Claude 4+; ambiguity risk. Cut whole lines, not grammar. |
| Bare PASS/FAIL with a legend in returns | 2/10 | Returns are already minimal. |

Estimated effect (not measured): per-coder instructions from about 3150 to about 1900 words, per-reviewer about 30% less. `effort` tuning and dropping OK lines will likely move wall-clock time more than prose cuts.

## Proposed order

1. Fix correctness defects 1 to 11 (small, certain).
2. Slim the per-task files: `tdd`, `test-strategy`, `task-coder`, `task-reviewer`, `planner-review`.
3. `effort` / `model` experiment on one real build.

Each step goes through an approved plan first.
