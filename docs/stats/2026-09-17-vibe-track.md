# Build stats - 2026-09-17-vibe-track

One row per dispatch label, one per dispatch kind, the whole run's totals, and every anomaly the run
recorded. Wall time reads `mm:ss`. A `-` stands for a figure the harness never reported.

## Per task

| Task | Implementor | Review | Rounds | Wall | Tokens |
| --- | --- | --- | --- | --- | --- |
| task-01.md | opus/high | - | 1 | 17:29 | - |
| task-02.md | opus/high | - | 1 | 07:54 | - |
| task-03.md | opus/xhigh | - | 1 | 11:44 | - |
| task-04.md | sonnet/medium | - | 1 | 02:10 | - |
| task-05.md | sonnet/medium | - | 1 | 03:50 | - |
| fix-01 | opus/xhigh | - | 0 | 11:30 | - |

## Per dispatch kind

| Kind | Count | Wall | Tokens |
| --- | --- | --- | --- |
| start | 1 | 00:00 | - |
| implementor | 5 | 28:25 | - |
| task-reviewer | 5 | 14:42 | - |
| commit | 11 | 06:47 | - |
| fork | 3 | 16:53 | - |
| fix-implementor | 1 | 11:30 | - |
| writer | 1 | 01:28 | 62435 |

## Totals

- Wall time: 79:54
- Tokens: 62435
- Dispatches: 26

## Anomalies

| Task | UNDERSPECIFIED | CARRY | touched | NOTE: plan defect | Extra review rounds |
| --- | --- | --- | --- | --- | --- |
| fix-01 | 2 | 0 | 5 | 0 | 0 |
| review-01 | 0 | 0 | 0 | 1 | 0 |
| task-01 | 2 | 2 | 0 | 0 | 0 |
| task-02 | 4 | 0 | 0 | 0 | 0 |
| task-03 | 5 | 0 | 0 | 0 | 0 |
| task-05 | 0 | 1 | 2 | 0 | 0 |
