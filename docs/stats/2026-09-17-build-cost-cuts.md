# Build stats - 2026-09-17-build-cost-cuts

One row per dispatch label, one per dispatch kind, the whole run's totals, and every anomaly the run
recorded. Wall time reads `mm:ss`. A `-` stands for a figure the harness never reported.

## Per task

| Task | Implementor | Review | Rounds | Wall | Tokens |
| --- | --- | --- | --- | --- | --- |
| task-01.md | sonnet/- | - | 1 | 04:52 | 130138 |
| task-02.md | sonnet/- | - | 1 | 01:49 | 85167 |
| task-03.md | opus/- | - | 1 | 04:32 | 109222 |
| task-04.md | sonnet/- | - | 1 | 04:21 | 115502 |
| task-05.md | sonnet/- | - | 1 | 03:01 | 110756 |
| fix-01 | opus/- | - | 0 | 02:40 | 107387 |
| task-06.md | sonnet/- | - | 1 | 02:58 | 98036 |
| task-07.md | sonnet/- | - | 1 | 01:58 | 81369 |
| task-08.md | opus/- | - | 1 | 06:04 | 150341 |
| task-09.md | sonnet/- | - | 1 | 05:37 | 178100 |
| task-10.md | sonnet/- | - | 1 | 01:32 | 89919 |
| task-11.md | sonnet/- | - | 1 | 01:09 | 82950 |
| task-12.md | opus/- | - | 2 | 12:29 | 224174 |
| task-12-fix | opus/- | - | 0 | 01:14 | 49495 |
| task-13.md | sonnet/- | - | 1 | 02:32 | 104445 |
| task-14.md | sonnet/- | - | 1 | 05:16 | 146018 |
| task-15.md | sonnet/- | - | 1 | 01:00 | 72291 |
| fix-02 | - | - | 0 | 03:01 | 85246 |

## Per dispatch kind

| Kind | Count | Wall | Tokens |
| --- | --- | --- | --- |
| start | 1 | 00:00 | - |
| implementor | 17 | 38:43 | 1135321 |
| task-reviewer | 16 | 21:41 | 692602 |
| commit | 17 | 02:20 | - |
| fork | 7 | 36:36 | - |
| fix-implementor | 2 | 05:41 | 192633 |

## Totals

- Wall time: 109:27
- Tokens: 2020556
- Dispatches: 59

## Anomalies

02:19 implementor task-01.md - Edit/Write tools disabled in session - test comments not edited
04:30 implementor task-01.md - retry after Edit/Write re-enabled

| Task | UNDERSPECIFIED | DECISION | CARRY | touched | NOTE: plan defect | Extra review rounds |
| --- | --- | --- | --- | --- | --- | --- |
| checkpoint-02 | 0 | 0 | 0 | 0 | 1 | 0 |
| fix-01 | 1 | 0 | 0 | 3 | 0 | 0 |
| fix-02 | 1 | 0 | 0 | 3 | 0 | 0 |
| review-01 | 0 | 0 | 0 | 0 | 1 | 0 |
| task-03 | 1 | 0 | 2 | 0 | 0 | 0 |
| task-04 | 1 | 0 | 0 | 0 | 0 | 0 |
| task-05 | 1 | 0 | 0 | 0 | 0 | 0 |
| task-06 | 2 | 0 | 0 | 0 | 0 | 0 |
| task-12 | 7 | 0 | 1 | 1 | 2 | 0 |
