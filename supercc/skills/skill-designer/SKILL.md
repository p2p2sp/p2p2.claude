---
name: skill-designer
description: Design, create, refactor, split, shrink or audit skills and agents (SKILL.md files, agent .md files, their scripts and references). Use whenever the user wants a new skill or agent, asks to improve, clean up, compress, optymize or fix an existing one, complains a skill is too long, drifts or triggers badly, wants a skill split into forks, or asks for a review of skill files, even when they only say "make a skill for X" or "this agent does too much".
---

# skill-designer

## Input

- A request naming the skill or agent to create or change, plus any existing files.
- Optional: target directory, constraints, example inputs and outputs.

## Workflow

1. Classify the request: new, refactor, split, or audit. For an existing file read it whole before touching it.
2. Run the responsibility check. If it fails or the request is a split, read `${CLAUDE_SKILL_DIR}/references/split-patterns.md` and build the split, not a bigger monolith.
3. Decide where the work runs before writing it: read `${CLAUDE_SKILL_DIR}/references/architecture.md` when the skill drives noisy tool calls, chains stages, or repeats a behaviour other skills already carry.
4. Writing a body from scratch: read `${CLAUDE_SKILL_DIR}/references/example.md` first.
5. Write frontmatter, then body, then scripts and references.
6. Lint: `bash "${CLAUDE_SKILL_DIR}/scripts/lint_skill.sh" <skill-dir-or-agent-file>`. Fix every FAIL, judge every WARN.
7. Return per Output.

## Responsibility check

One skill = one concern. Extra concerns become noise and drift, so each one goes to its own skill, preferably a fork out of the main context. Carry more only when a split is genuinely impossible, and keep the count minimal.

- Fails when: the body spells out modes with disjoint instructions; it both asks the user and does heavy work; several concerns can apply to one task at once; it scans a large set in the main context to find change sites.
- Passes when the modes share most of their instructions and differ by a short checklist.

## Frontmatter

- `description:` is the primary triggering mechanism and the only place for "when to use". Put none of it in the body.
- Skills undertrigger, so write the description pushy: what it does, then explicit contexts and phrasings that should fire it, including indirect ones.
- Routing guards ("invoked only by X, never directly") live here and nowhere else.
- Metadata (name + description) is always in context: aim for about 100 words.
- Hard platform caps, not style: name 64 chars, lowercase letters, digits and single hyphens, no reserved word (anthropic, claude); description 1024 chars, no angle brackets. Everything past 1024 is truncated, so the trigger words in the tail vanish with no error.

## Body

Write `input -> work -> output`. The skill receives input, works, returns output; it never needs to know who called it or why.

- Cut caller narrative: the caller's name, its surrounding flow, the rationale for the call. Litmus: would the line still be true for a different caller sending the same input? Keep it. Only true of this caller's world? Cut.
- Frame input-driven behaviour on the input: "if `Report path:` present -> write there", never "X hands over `Report path:`, so...".
- Keep real scope boundaries even when they name siblings ("you own ONLY X; Y and Z are out of scope").
- Document only the delta from sensible defaults. Always skip what the model already knows or a competent developer would do anyway.
- Most critical and most frequent instructions first, under clear headings. Mid-paragraph content gets unreliable attention.
- Prevention over correction: put constraints, profiles and negative examples into the generation step. A separate fixer pass costs more and never converges.
- Imperative form. One short why per constraint beats an all-caps MUST.
- Bullets and sub-points over prose, closer to code than narrative. Shortening never reduces precision.

## Progressive disclosure

Three layers load at different times: metadata always, body on trigger, bundled files only when read or executed. Place content by the moment an invocation first needs it, never by total length: what every run needs before its first action goes in the body; what one step, some runs, or a single decision point needs goes in a bundled file read exactly at that step.

- Litmus per paragraph: does every invocation need this before it starts working? Yes -> body. No -> `references/` (instructions, checklists, examples, domain notes) or `assets/` (templates, boilerplate, output formats), regardless of how short the body already is.
- Typical movers: an output or report template, a checklist for one phase, a worked example, the long procedure of one branch, notes consulted once at a decision. Inlined, each costs full context on every run; on demand, near zero on the runs that skip it.
- The pointer replaces the content: one line at the exact step that consumes the file, stating the condition and the purpose, e.g. "Writing the report: fill `${CLAUDE_SKILL_DIR}/assets/report.md`" or "If the check fails, read `${CLAUDE_SKILL_DIR}/references/split-patterns.md`". Never restate the file in the body.
- Read at the step, never up front. A "read all references first" opener loads every file on every run and cancels the layer; a file read before its step is body text with extra tool calls.
- Mode selected by a parsable argument: a router script that `!`-injects only the chosen playbook beats references, because it costs zero extra reads.
- Multiple domains or variants: one reference per variant, body holds workflow and selection only. Split a reference by step when different steps read different parts of it.
- Address bundled files as `${CLAUDE_SKILL_DIR}/...`; a relative path does not resolve from the session cwd.
- Ceiling, not trigger: body under 500 lines; a reference over 100 lines gets a table of contents at the top, because a partial read sees only the head.
- The agent can read any bundled file even if undocumented; still name the ones that matter and the step that needs them.

## Scripts

Replace reasoning with a script wherever the step is deterministic: parsing JSON, sorting, compiling, searching, API calls, math. Scripts are repeatable, cheaper and pre-tested.

- Clean bash only, no `jq`, no `bc`.
- Tell the skill to run the script and use its output, not to redo the work by hand.

## Formatting and don'ts

- Clean text: no italics, no tables, no emoji.
- Do not chop paragraphs into multiline text.
- Do not instruct the agent to read project instruction files; the harness injects them.

## Audit mode

Review like a codebase and remove mercilessly, everything costs context. Beyond the Frontmatter, Body and Progressive disclosure rules above, hunt for:

- Contradicting instructions.
- Situation-specific guidance never scoped to its situation.
- Documentation for tools or patterns no longer used.
- Information repeated within or across files.

## Output

- Created or changed files under the target skill or agent directory.
- Lint result with zero FAIL.
- Three-line summary: responsibility, trigger, deliberate omissions.
