# Endpoint index (SigNoz v0.143.0)

## Contents

1. Envelope - 2. Logs and querying - 3. Dashboards, alerts - 4. Saved views - 5. Services and traces - 6. Metrics - 7. Logs configuration - 8. Instance info - 9. Admin only

Mark: [E] needs Editor, [A] Admin only; unmarked routes need read access. Routes marked "legacy" are not in the OpenAPI file. Anything else: grep `openapi-v0.143.0.yml`.

## 1. Envelope

- New routes: `{"status": "success", "data": ...}`; errors `{"status": "error", "error": {"type", "code", "message"}}`.
- Some legacy routes return bare JSON (`/api/v1/version`, `/api/v1/services`, `/api/v1/services/list`, `/api/v1/logs/fields`).
- A missing route returns the web UI HTML with HTTP 200; the helper reports it as a missing route.

## 2. Logs and querying

- `POST /api/v5/query_range`, `POST /api/v5/query_range/preview` (SQL and scan estimate), `POST /api/v5/substitute_vars`: see `logs-query.md`.
- `POST /api/v1/export_raw_data?format=csv|jsonl`: query_range body, streams up to 50k raw rows.
- `GET /api/v1/fields/keys`, `GET /api/v1/fields/values`: helper `keys`, `values`.
- Legacy autocomplete: `GET /api/v3/autocomplete/attribute_keys?dataSource=logs&aggregateOperator=noop&searchText=`, `GET /api/v3/autocomplete/attribute_values?dataSource=logs&aggregateOperator=noop&attributeKey=severity_text&filterAttributeKeyDataType=string&tagType=tag&searchText=`.
- Legacy `POST /api/v3/query_range`, `/api/v4/query_range`: old builder format; do not use.
- `GET /api/v3/logs/livetail`: streaming; not usable through the helper.

## 3. Dashboards, alerts

- Dashboards: `dashboards.md`. Rules, channels, maintenance, history, firing alerts: `alerts.md`.
- `GET /api/v2/metrics/alerts?metricName=`, `GET /api/v3/metrics/dashboards?metricName=`: where a metric is used.
- `GET /api/v1/route_policies`: alert routing policies (writes [A]).

## 4. Saved views (explorer queries)

- `GET /api/v2/saved_views?source=logs&name=`, `GET /api/v2/saved_views/{id}`, `POST` (201, `{id}`) [E], `PUT /{id}` [E], `DELETE /{id}` [E].
- Body:

```json
{"generateName": true, "source": "logs", "schemaVersion": "v2",
 "spec": {"displayName": "Error logs", "panelType": "list", "requestType": "raw",
   "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs",
     "filter": {"expression": "severity_number >= 17"},
     "order": [{"key": {"name": "timestamp"}, "direction": "desc"}, {"key": {"name": "id"}, "direction": "desc"}],
     "limit": 100}}],
   "selectedFields": []}}
```

- `source`: `logs`, `traces`, `metrics`. `panelType`: `list`, `graph`, `table`, `value`, `trace`. PUT takes the same body without `name`/`generateName`.
- Legacy `/api/v1/explorer/views` still works; use v2.

## 5. Services and traces

- `GET /api/v1/services/list`: service names from traces (bare array).
- `POST /api/v2/services` (enveloped) or legacy `POST /api/v1/services` (bare): body `{"start": "<ns>", "end": "<ns>", "tags": []}`, times as strings in nanoseconds. Returns per service `p99`, `avgDuration` (ns), `numCalls`, `callRate`, `numErrors`, `errorRate`, `num4XX`, `fourXXRate`.
- `POST /api/v2/service/top_operations`, `POST /api/v2/service/entry_point_operations`: per-operation stats for one service. UNVERIFIED body.
- `POST /api/v4/traces/{traceID}/waterfall`, `POST /api/v3/traces/{traceID}/flamegraph`, `POST /api/v1/traces/{traceID}/aggregations`: one trace. Body schema in the OpenAPI file.
- Span queries: `query_range` with `"signal": "traces"` (helper: `count --signal traces`). Common fields: `service.name`, `name` (operation), `duration_nano`, `has_error`, `http_method`, `response_status_code`, `http.route`, `http.response.status_code`, `kind_string`, `status_code_string`, `db.system`, `db.statement`, `trace_id`, `isRoot`, `isEntryPoint`. Old camelCase aliases (`serviceName`, `durationNano`, `hasError`) still resolve. Aggregations as for logs, e.g. `p99(duration_nano)`, `rate()`.

## 6. Metrics

- `GET /api/v2/metrics?searchText=&limit=`: metric names with type, unit, temporality.
- `GET /api/v2/metrics/metadata?metricName=`, `GET /api/v2/metrics/attributes?metricName=`, `GET /api/v2/metrics/highlights?metricName=`.
- `POST /api/v2/metrics/metadata` [E]: edit description, unit, type.
- `POST /api/v2/metrics/stats`, `POST /api/v2/metrics/treemap`, `POST /api/v2/metrics/inspect`: cardinality and samples.
- PromQL: `GET|POST /prometheus/api/v1/query?query=`, `/prometheus/api/v1/query_range?query=&start=&end=&step=`.
- Builder metrics query spec: `{"name": "A", "signal": "metrics", "aggregations": [{"metricName": "x", "temporality": "cumulative", "timeAggregation": "rate", "spaceAggregation": "sum"}], "groupBy": [...]}`.

## 7. Logs configuration

- `GET /api/v1/logs/pipelines/latest`, `POST /api/v1/logs/pipelines` [E] (replaces the full pipeline list; GET first), `POST /api/v1/logs/pipelines/preview`.
- `GET /api/v1/logs/fields`: selected (materialized) and interesting fields. `POST /api/v1/logs/fields` [E] changes materialization; it affects ingestion, ask first.
- `GET|POST /api/v1/logs/promote_paths` [E for POST]: promote JSON body paths to indexed columns.

## 8. Instance info

- `GET /api/v1/version`, `GET /api/v1/health`, `GET /api/v2/features`.
- `GET /api/v1/stats`: counts of alerts, channels, dashboards, ingestion.
- `GET /api/v1/global/config`.
- `GET /api/v1/service_accounts/me`: the key's identity and role.

## 9. Admin only (403 for Editor)

Notification channel writes, `/api/v2/notification_channels` (even list), route policy writes, users, service accounts and keys, roles, auth domains, org preferences, TTL setting writes, public dashboards, licenses, span mappers, metric reduction rules.
