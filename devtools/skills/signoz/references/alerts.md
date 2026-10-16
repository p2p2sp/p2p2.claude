# Alerts reference (rules, channels, planned maintenance, history)

## Contents

1. Rule endpoints - 2. Rule body (v2alpha1) - 3. Condition and thresholds - 4. Other rule types - 5. Channels - 6. Planned maintenance - 7. History and firing alerts - 8. Gotchas

## 1. Rule endpoints

- `GET /api/v2/rules`: `data` is an array of rules with `id` and `state` (`inactive`, `pending`, `firing`, `recovering`, `nodata`, `disabled`).
- `GET /api/v2/rules/{id}`
- `POST /api/v2/rules`: 201, returns the rule.
- `PATCH /api/v2/rules/{id}`: partial JSON merged onto the stored rule, 200, returns the rule. Example: `{"disabled": true}` or `{"description": "..."}`. The patch is JSON-decoded onto the stored rule: arrays (`thresholds.spec`, `queries`) are replaced entirely, so send each changed array complete.
- `PUT /api/v2/rules/{id}`: full replace, 204. Body = GET result without `id`, `state`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`.
- `DELETE /api/v2/rules/{id}`: 204.
- `POST /api/v2/rules/test`: evaluates the body and sends a real test notification. Ask the user first.
- `{id}` is a UUIDv7. Legacy `/api/v1/rules` still works (`data.rules`), but use v2.

## 2. Rule body (v2alpha1)

Start from `templates/rule-logs-threshold.json`, replace `CHANNEL_NAME`.

- `alert` (name), `alertType`: `LOGS_BASED_ALERT`, `TRACES_BASED_ALERT`, `METRIC_BASED_ALERT`, `EXCEPTIONS_BASED_ALERT`.
- `ruleType`: `threshold_rule` (builder or ClickHouse), `promql_rule`, `anomaly_rule`.
- `version: "v5"` (only allowed value), `schemaVersion: "v2alpha1"` (`"v2"` is rejected).
- `condition`: section 3. `evaluation`, `notificationSettings`: below. All three are required in v2alpha1.
- `labels`: `{"severity": "critical|warning|info", ...}`; `annotations`: `summary`, `description`. Keys match `[a-zA-Z_.][a-zA-Z0-9_.]*`; values are Go templates with `{{$value}}`, `{{$threshold}}`, `{{$labels.service.name}}`.
- `disabled`: create with `true` when the user wants to review before it starts evaluating.
- `evaluation`:
  - rolling: `{"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}}`
  - cumulative: `{"kind": "cumulative", "spec": {"schedule": {"type": "hourly|daily|weekly|monthly", "minute": 0, "hour": 9, "weekday": 1, "day": 1}, "frequency": "1h", "timezone": "UTC"}}` (UNVERIFIED)
- `notificationSettings`: `{"groupBy": ["service.name"], "newGroupEvalDelay": "2m", "usePolicy": false, "renotify": {"enabled": true, "interval": "4h", "alertStates": ["firing", "nodata"]}}`. `alertStates` accepts only `firing` and `nodata`.

## 3. Condition and thresholds

```json
"condition": {
  "compositeQuery": {"queryType": "builder", "panelType": "graph", "unit": "", "queries": [V5 QUERY ENVELOPES]},
  "selectedQueryName": "A",
  "thresholds": {"kind": "basic", "spec": [
    {"name": "critical", "op": "above", "matchType": "in_total", "target": 100, "targetUnit": "", "recoveryTarget": null, "channels": ["CHANNEL_NAME"]}]},
  "alertOnAbsent": false, "absentFor": 10
}
```

- `queryType`: `builder`, `clickhouse_sql`, `promql`. Queries use the envelopes from `logs-query.md`: `builder_query`, `builder_formula`, `clickhouse_sql`, `promql`. `selectedQueryName` names the query (or formula) that is compared.
- Put `groupBy` in the query to alert per service, host or tenant; each group fires separately.
- `op`: `above`, `below`, `equal`, `not_equal`, `above_or_equal`, `below_or_equal`, `outside_bounds`.
- `matchType` over the eval window: `at_least_once`, `all_the_times`, `on_average`, `in_total`, `last`. For log counts use `in_total` (sum of the window) or `at_least_once` with per-minute steps.
- Several threshold tiers (critical, warning) are allowed; the higher tier inhibits the lower.
- `channels`: channel display names (the `name` in `GET /api/v1/channels`). Unknown names are rejected. An empty list is rejected with `at least one channel is required` unless `notificationSettings.usePolicy` is `true` (routing by org route policies, `GET /api/v1/route_policies`).
- `alertOnAbsent` + `absentFor` (minutes): fire when the query returns no data.
- Error rate alert: queries A (errors) and B (all), both with `disabled: true`, formula F1 `A / B * 100`, `selectedQueryName: "F1"`, target in percent.
- Preview the condition before creating: run its queries through `signoz.mjs query` as `time_series` over the eval window.

## 4. Other rule types

- PromQL: `queryType: "promql"`, query `{"type": "promql", "spec": {"name": "A", "query": "sum(rate(x[5m]))"}}`, `ruleType: "promql_rule"`.
- ClickHouse: `queryType: "clickhouse_sql"`, query `{"type": "clickhouse_sql", "spec": {"name": "A", "query": "SELECT ... AS value, ts ..."}}`.
- Anomaly (`anomaly_rule`): not supported under v2alpha1; use `schemaVersion: "v1"` with `condition.op`, `condition.matchType`, `condition.target`, `condition.algorithm: "standard"`, `condition.seasonality: "hourly|daily|weekly"`, top-level `evalWindow`, `frequency`, `preferredChannels`. UNVERIFIED.

## 5. Channels (Editor: read and test only)

- `GET /api/v1/channels`: `[{id, name, type, data}]`. `GET /api/v1/channels/{id}`. Use these.
- `/api/v2/notification_channels` returns 403 for Editor even on list; do not use it.
- Create, update, delete need Admin (403 for Editor). Tell the user; do not retry.
- `POST /api/v1/channels/test` sends a real message; ask first.

## 6. Planned maintenance (downtime)

- `GET /api/v1/downtime_schedules?active=&recurring=`, `GET /{id}`, `POST` (201), `PUT /{id}` (204, full body), `DELETE /{id}` (204).
- Body:

```json
{"name": "deploy window", "description": "", "alertIds": ["<rule id>"],
 "schedule": {"timezone": "UTC", "startTime": "2027-01-10T22:00:00Z", "endTime": "2027-01-10T23:00:00Z",
   "recurrence": {"repeatType": "daily|weekly|monthly", "duration": "1h", "repeatOn": ["monday"]}}}
```

- Empty `alertIds` silences all rules. `recurrence` is optional; with it both `repeatType` and `duration` are required.
- Response adds `status` (`active`, `upcoming`, `expired`) and `kind` (`fixed`, `recurring`).

## 7. History and firing alerts

- `GET /api/v2/rules/{id}/history/timeline?start=<ms>&end=<ms>&state=&limit=&order=&cursor=`: `{items[], total, nextCursor}`.
- `GET /api/v2/rules/{id}/history/stats?start=&end=`: trigger counts and average resolution time, current vs previous period.
- `GET /api/v2/rules/{id}/history/overall_status|top_contributors|filter_keys|filter_values?start=&end=`.
- `GET /api/v1/alerts`: currently firing alerts (Alertmanager format: `labels`, `annotations`, `startsAt`, `status`, `fingerprint`). Optional `active`, `silenced`, `inhibited`, repeated `filter=<matcher>`.

## 8. Gotchas

- A rule referenced by a maintenance window cannot be deleted (409), and the window cannot be deleted while it references the rule (409). PUT the window without that rule id (or delete other ids first), then delete in either order.
- Unknown JSON fields return 400.
- `schemaVersion` values are `v1` and `v2alpha1` only.
- After create, GET the rule: `state` should be `inactive` (or `disabled`), not an error.
