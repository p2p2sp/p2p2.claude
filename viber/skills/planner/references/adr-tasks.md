# ADR tasks

Read only under `adr: true`, before the tasks are written. Each accepted decision becomes a task of its own, ahead of every other task.

## 1. Find the candidates

A decision this plan settles is a candidate only when all three hold; one missing drops it silently, with no message to the user.

1. Hard to reverse - undoing it costs a migration, a rewritten boundary, a change across every caller. A one-line edit next month fails this.
2. Surprising without context - a competent reader meeting the result cold asks why it was done this way. The obvious default fails this.
3. A real trade-off - genuine alternatives were on the table and one won for reasons the user stated. Nothing to weigh against fails this.

One `docs/adr/` already records is not a candidate. Most plans have none: feature behaviour, naming, validation rules, wiring and anything re-derivable from the code never qualify, and several candidates in one run means the bar slipped. No candidate means no question and no ADR task.

## 2. Ask

Put each candidate to the user in prose, one line each - the decision, the alternative it beat - and let them accept or drop it. Dropping every candidate is a valid answer, and so is dropping the question: the plan is then written with no ADR task and no record criterion, exactly as under `adr: false`. Never argue a dropped candidate back in and never ask twice.

## 3. Write one task per accepted decision

Nothing accepted means nothing in this section applies - go straight on to the rest of the plan.

- `Files: docs/adr/<yyyy-mm-dd>-<slug>.md`, the date from `date +%Y-%m-%d` so the path is exact - it is a commit file map, not a pattern.
- `TDD: none`, `Uses: none`, `Depends-on: none`, and nothing ever depends on it.
- `Delivers` carries the record itself, because the task file is all its writer gets: the title, `Status: accepted` with the date, then Context, Decision, Alternatives (what it beat and why not) and Consequences.
- `Verification: test -f <path> && grep -q '^Status: accepted' <path> -> exit 0`, that path written out in full both times.
- `DoD`: the record exists there and carries every part `Delivers` lists.
- Add one acceptance criterion for the record and point every ADR task's `Covers` at it.
