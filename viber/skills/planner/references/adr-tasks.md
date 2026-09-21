# ADR tasks

Read only under `adr: true`, before the tasks are written. Each accepted decision becomes a task of its own, ahead of every other task.

## 1. Find the candidates

Look over the change and the design decisions this plan settles for one that is architecturally significant and lasting: it constrains work that comes after it, reversing it is expensive, and `docs/adr/` does not record it yet. A choice the code already implies is not one, and neither is a preference. No candidate means no question and no ADR task.

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
