# Auto-fill body fields (Step 4.5)

Detail for Step 4.5 of `SKILL.md`. **Purpose**: before per-field prompting, populate `body[]` entries with values inferable from the current session, so the user is asked only about fields the context cannot unambiguously answer.

## Mechanism - in-context reasoning only

No new tool calls. Source set is limited to:

- The current session transcript (most recent ~30 turns: user messages, assistant messages, sub-agent results visible in the transcript).
- Contents of plan files (e.g. under `~/.claude/plans/`) that were already opened or quoted in this session - never open new files here.
- Outputs of prior sub-agent runs (Explore, Plan, interview, etc.) already present in the transcript.

Do NOT `Glob`, `Read`, or `Grep` the project tree for field content. Do NOT consult any file not already surfaced in-session.

## Algorithm

Iterate each non-`markdown` entry of `body[]`. For each entry:

1. Build a field descriptor from `attributes.label` + `attributes.description` (if present) + `attributes.placeholder` (if present).
2. Weigh the descriptor against the available context (transcript + already-quoted plan files).
3. Decide:
   - **FILLED** - context unambiguously answers the field; record `value`.
   - **MISSING** - any uncertainty, conflicting signals, or missing information; record no value.

**Conservativeness rule**: when in doubt → MISSING. Hallucination is strictly worse than re-asking.

## Type-specific constraints

- `textarea` - value drawn verbatim from the transcript where possible; light paraphrase allowed only to fit the field's scope. Multi-line preserved.
- `input` - same as `textarea`, single-line; if the matching context spans multiple lines, collapse to one line or mark MISSING.
- `dropdown` - value MUST equal one of `attributes.options[]` (exact string match). Context implying a value outside the option set → MISSING.
- `checkboxes` - selected set MUST be a subset of `attributes.options[].label`. Context implying a label outside the option set → MISSING (do not partially select).

## Output

A map `{field_id → {status: FILLED | MISSING, value?}}`, keyed by `attributes.id` (or `body[]` index when `id` is missing) - same shape Step 5 already uses to store answers. This map is consumed by Step 5.
