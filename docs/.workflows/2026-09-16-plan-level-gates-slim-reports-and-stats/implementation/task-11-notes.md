# Task 11 notes

## Runs
- node --test "tests/**/*.test.ts" -> tests 559 pass 559 fail 0
- node --test tests/superdev/stats-report.test.ts -> tests 12 pass 12 fail 0

The template carries two fixed prose lines under the title (what the tables are, that wall time reads
`mm:ss`, that `-` is a figure the harness never reported); they never vary, so the "nothing outside
the placeholders varies" rule of Approach step 1 still holds byte for byte - the test asserts it.

Approach step 2 lists four failure modes; the script adds a fifth guard, `error: no template: <path>`
plus exit 1, because the template is read from `<script dir>/../references/` and a broken install
would otherwise render an empty report and still print a `stats:` line.

UNDERSPECIFIED: which labels get a per-task row - Approach step 3 says only "group by label", and a
plain group-by would give `plan` (the start event) and every fork its own task row. A label enters
the task table only when one of its events carries a model or its kind matches `implement|review`;
every other label lives in the kind table alone.
UNDERSPECIFIED: the implementor and review cells - written `<model>/<effort>`, and `-` when the
dispatch carried neither; the review cell takes the first review event's strength and `Rounds` counts
every event of that label whose kind matches `review`.
UNDERSPECIFIED: `- Dispatches:` in `## Totals` - counts every event except the `start` and `resume`
markers (so a commit and an escalation count), the kind table holding the breakdown.
UNDERSPECIFIED: wall-time arithmetic - `duration_ms` is rounded to the nearest whole second, a
computed gap is clamped at 0, and every figure prints `mm:ss` with minutes uncapped (`125:03`).
UNDERSPECIFIED: token cells - a row sums only the numeric fields and prints `-` when it has none, at
row level and in the totals.
UNDERSPECIFIED: the anomaly counter markers - counted at the start of a line with a leading `- `
tolerated (`^(- )?UNDERSPECIFIED:`, `CARRY:`, `touched:`, `NOTE: plan defect`), so a report quoting
one mid-sentence does not inflate the count.
UNDERSPECIFIED: the counter table's task key - the `<name>-<NN>` head of the file's basename
(`task-01-notes.md` and `task-01-review-2.md` -> `task-01`, `fix-01-notes.md` -> `fix-01`), the whole
basename when there is none (`decisions.md`); a task whose every counter is zero gets no row.
UNDERSPECIFIED: the anomaly note line carries no list bullet - it is written exactly in the shape
Approach step 4 gives, `<mm:ss> <kind> <label> - <note>`, and a blank line separates the notes from
the counter table.
UNDERSPECIFIED: row order in both tables - first appearance in the events file, so the report is
deterministic without sorting.
