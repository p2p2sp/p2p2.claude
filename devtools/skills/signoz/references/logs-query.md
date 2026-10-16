# Logs query reference (POST /api/v5/query_range)

## Contents

- 1. Request
- 2. Builder query spec (signal logs)
- 3. Filter syntax
- 4. Aggregations, having, formulas
- 5. Response shapes
- 6. Examples
- 7. Pagination
- 8. ClickHouse SQL
- 9. Gotchas

Run a body with `signoz.mjs query FILE --since 1h`; the helper sets `schemaVersion`, `start`, `end`. Shapes marked UNVERIFIED are untested.

## 1. Request

```json
{
  "schemaVersion": "v1",
  "start": 1790600000000, "end": 1790603600000,
  "requestType": "raw | time_series | scalar | raw_stream",
  "compositeQuery": {"queries": [{"type": "builder_query", "spec": {}}]},
  "variables": {"service": {"type": "dynamic", "value": ["a", "b"]}},
  "formatOptions": {"fillGaps": false, "formatTableResultForUI": false},
  "noCache": false
}
```

- `start`/`end`: epoch milliseconds, 13 digits. Seconds are accepted silently and give wrong ranges.
- Query `type`: `builder_query`, `builder_formula`, `clickhouse_sql`, `promql`, `builder_trace_operator`.
- Logs support `raw`, `raw_stream`, `time_series`, `scalar` only. `trace` is for spans.
- `variables`: referenced as `$name` in filters. Types `query`, `dynamic`, `custom`, `text`. A `dynamic` value `"__all__"` drops the condition; an empty list is an error.
- Dry run: `POST /api/v5/query_range/preview?verbose=true` returns the generated ClickHouse SQL and scan estimate.
- Bulk export: `POST /api/v1/export_raw_data?format=csv|jsonl` with the same body, default 10k rows, max 50k.

## 2. Builder query spec (signal logs)

Unknown fields are rejected with HTTP 400. Allowed fields:

- `name` (unique, e.g. `A`), `signal: "logs"`, `disabled`, `legend`
- `stepInterval`: seconds (`60`) or duration (`"60s"`); only for time_series
- `filter: {"expression": "..."}`
- `aggregations: [{"expression": "count()", "alias": "n"}]`
- `groupBy: [{"name": "service.name", "fieldContext": "resource", "fieldDataType": "string"}]` (context and type optional)
- `order: [{"key": {"name": "timestamp"}, "direction": "desc"}]` for raw queries. Aggregation queries (time_series, scalar) may order only by a groupBy key, an aggregation alias or expression, or its index (`"0"`); `timestamp` there returns 400. Without groupBy omit `order`.
- `selectFields: [{"name": "body", "fieldContext": "log"}]` (raw only; empty returns all default columns)
- `limit` (max 10000), `offset`, `cursor`, `limitBy: {"keys": [...], "value": "N"}`
- `having: {"expression": "count() > 100"}`
- `functions: [{"name": "ewma5"}]`; names: cutoffmin, cutoffmax, clampmin, clampmax, absolute, runningdiff, log2, log10, cumulativesum, ewma3, ewma5, ewma7, median3, median5, median7, timeshift, anomaly, fillzero

`fieldContext`: `resource`, `attribute`, `log` (intrinsic columns), `body`, `scope`. `fieldDataType`: `string`, `bool`, `float64`, `int64`, `number`.

Intrinsic log columns: `body`, `timestamp`, `id`, `trace_id`, `span_id`, `trace_flags`, `severity_text`, `severity_number`, `scope_name`, `scope_version`.

Severity numbers: 1-4 trace, 5-8 debug, 9-12 info, 13-16 warn, 17-20 error, 21-24 fatal.

## 3. Filter syntax

- Keys: `[context.]name[:type]`, e.g. `resource.service.name`, `attribute.http.status_code:number`, `body.user.id` (JSON body). Without a prefix the server resolves the context.
- Comparison: `=`, `!=`, `<>`, `<`, `<=`, `>`, `>=`
- Sets: `IN ('a','b')`, `NOT IN (...)`, also `IN $var`
- Patterns: `LIKE '%x%'` (case-sensitive), `ILIKE` (case-insensitive), `NOT LIKE`, `NOT ILIKE`, `REGEXP 're2'`, `NOT REGEXP`, `CONTAINS 'x'`, `NOT CONTAINS`
- Range: `BETWEEN 1 AND 5`, `NOT BETWEEN`
- Existence: `x EXISTS`, `x NOT EXISTS`
- Boolean: `AND`, `OR`, `NOT`, parentheses; precedence `()` > `NOT` > `AND` > `OR`. Two conditions side by side mean AND.
- Full text on body: a bare quoted string, `'connection refused'`, is tried as RE2 regex, else literal substring. Unquoted words are ANDed terms.
- Functions: `hasToken(body, 'timeout')` (whole token, uses index), `has(body.arr, v)`, `hasAny`, `hasAll` (JSON body arrays), `search('term'[, body|attribute|resource])` (literal substring across fields; expensive, rejected with 400 when the scan estimate exceeds 60M rows).
- Negative operators (`!=`, `NOT IN`, `NOT LIKE`) also match rows where the field is missing. Write `x EXISTS AND x != 'v'` to exclude them.
- Escape `'` inside strings as `\'`.

## 4. Aggregations, having, formulas

- `count()`, `count(x)`, `count_distinct(a[, b...])`, `countIf(cond)`, `count_distinct_if(x, cond)`
- `sum(x)`, `avg(x)`, `min(x)`, `max(x)` and `sum_if(x, cond)` style variants
- `p05`, `p10`, `p20`, `p25`, `p50`, `p75`, `p90`, `p95`, `p99`, `p999` and `_if` variants
- `rate()` (per second), `rate_if(cond)`, `rate_sum(x)`, `rate_avg(x)`, `rate_min(x)`, `rate_max(x)`
- One function per expression. Never write `AS` in the expression; use `alias`.
- `order[].key.name` for aggregations: a groupBy key, the alias, the expression text (`count()`), or the index `"0"`.
- Result columns are named `__result_0`, `__result_1` in scalar output even when an alias is set.
- `having.expression`: `count() > 100`, `__result_0 != 0`.
- Formula: add `{"type": "builder_formula", "spec": {"name": "F1", "expression": "A / B * 100"}}` and set `"disabled": true` on A and B to return only F1. Group both queries by the same keys, or the formula divides each A series by the ungrouped B total.
- time_series `limit` keeps the top N series by the order key.

## 5. Response shapes

The helper formats these. With `--json` the raw `data` object is printed:

- raw: `data.results[].rows[] = {"timestamp": "RFC3339", "data": {"body", "severity_text", "severity_number", "trace_id", "span_id", "id", "timestamp" (ns), "attributes_string": {}, "attributes_number": {}, "attributes_bool": {}, "resources_string": {}, "scope_string": {}}}` plus `nextCursor`.
- time_series: `data.results[].aggregations[].series[] = {"labels": [{"key": {"name"}, "value"}], "values": [{"timestamp": ms, "value"}]}`. Values are not guaranteed chronological and empty buckets are omitted unless `formatOptions.fillGaps` is `true`. The helper sorts by time and sets `fillGaps: true` for time_series unless the body sets it.
- scalar: `data.results[] = {"columns": [{"name", "columnType": "group|aggregation"}], "data": [[...row...]]}`.
- `data.meta`: `rowsScanned`, `bytesScanned`, `durationMs`. `data.warning`: step clamps, search cost, trace window notes.

## 6. Examples

Error count per service, table (scalar):

```json
{"requestType": "scalar", "compositeQuery": {"queries": [{"type": "builder_query", "spec": {
  "name": "A", "signal": "logs",
  "filter": {"expression": "severity_number >= 17"},
  "aggregations": [{"expression": "count()", "alias": "errors"}],
  "groupBy": [{"name": "service.name", "fieldContext": "resource"}],
  "order": [{"key": {"name": "errors"}, "direction": "desc"}],
  "limit": 10, "having": {"expression": "count() > 5"}}}]}}
```

Error count per 15 minutes for one service (time_series, no groupBy, no order):

```json
{"requestType": "time_series", "compositeQuery": {"queries": [{"type": "builder_query", "spec": {
  "name": "A", "signal": "logs", "stepInterval": "15m",
  "filter": {"expression": "severity_number >= 17 AND service.name = 'checkout'"},
  "aggregations": [{"expression": "count()"}]}}]}}
```

Error trend for the top 3 services plus error share in percent (time_series):

```json
{"requestType": "time_series", "compositeQuery": {"queries": [
  {"type": "builder_query", "spec": {"name": "A", "signal": "logs", "stepInterval": "5m",
    "filter": {"expression": "severity_text IN ('Error','Fatal')"},
    "aggregations": [{"expression": "count()", "alias": "errors"}],
    "groupBy": [{"name": "service.name", "fieldContext": "resource"}],
    "order": [{"key": {"name": "errors"}, "direction": "desc"}], "limit": 3}},
  {"type": "builder_query", "spec": {"name": "B", "signal": "logs", "stepInterval": "5m",
    "aggregations": [{"expression": "count()"}],
    "groupBy": [{"name": "service.name", "fieldContext": "resource"}], "disabled": true}},
  {"type": "builder_formula", "spec": {"name": "F1", "expression": "A / B * 100"}}]}}
```

HTTP 5xx responses from one service, slowest first (raw, selected fields):

```json
{"requestType": "raw", "compositeQuery": {"queries": [{"type": "builder_query", "spec": {
  "name": "A", "signal": "logs",
  "filter": {"expression": "service.name = 'api-gateway' AND attribute.http.status_code:number >= 500"},
  "selectFields": [{"name": "body", "fieldContext": "log"}, {"name": "duration_ms", "fieldContext": "attribute"}],
  "order": [{"key": {"name": "duration_ms", "fieldContext": "attribute"}, "direction": "desc"}],
  "limit": 20}}]}}
```

p95 request latency in ms per route (scalar): aggregation `{"expression": "p95(duration_ms)", "alias": "p95"}`, groupBy `http.route`, filter `service.name = 'api-gateway'`, order by `p95` desc.

Variables in a query:

```json
{"requestType": "scalar",
 "variables": {"service": {"type": "dynamic", "value": ["api-gateway", "checkout"]}},
 "compositeQuery": {"queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs",
   "filter": {"expression": "severity_number >= 13 AND service.name IN $service"},
   "aggregations": [{"expression": "count()"}], "groupBy": [{"name": "service.name"}]}}]}}
```

Logs for one trace: `logs --filter "trace_id = '<32 hex>'" --asc --since 1d`. The server narrows the window to the trace span plus 5 minutes.

## 7. Pagination

- Cursor (fast): order exactly `timestamp` then `id`, same direction. The response has `nextCursor` (base64 of the last row's ms timestamp) only when the page is full. Send it as `spec.cursor` with the same filter and range. Rows sharing the boundary millisecond can be skipped.
- Offset: `offset` + `limit`; works with any order but scans more.

## 8. ClickHouse SQL

Query type `clickhouse_sql`, spec `{"name": "A", "query": "...", "disabled": false, "legend": ""}`.

```sql
SELECT timestamp, severity_text, body
FROM signoz_logs.distributed_logs_v2
WHERE timestamp >= $start_timestamp_nano AND timestamp <= $end_timestamp_nano
  AND ts_bucket_start BETWEEN $start_timestamp - 1800 AND $end_timestamp
  AND severity_number >= 17
ORDER BY timestamp DESC LIMIT 100
```

- Always bound both `timestamp` (ns) and `ts_bucket_start` (seconds, 30 min buckets); without the bucket bound the query scans every partition.
- Time series: `SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 1 MINUTE) AS ts, toFloat64(count()) AS value ... GROUP BY ts ORDER BY ts`.
- Resource filter through the fingerprint table:
  `resource_fingerprint GLOBAL IN (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE seen_at_ts_bucket_start >= $start_timestamp - 1800 AND seen_at_ts_bucket_start <= $end_timestamp AND simpleJSONExtractString(labels, 'service.name') = 'x')`
- Columns: `timestamp` (UInt64 ns), `id`, `trace_id`, `span_id`, `severity_text`, `severity_number`, `body`, `attributes_string` / `attributes_number` / `attributes_bool` (maps, e.g. `attributes_number['http.status_code']`), `resources_string` (map), `scope_name`, `ts_bucket_start`, `resource_fingerprint`.
- Variables: `$start_timestamp`/`$end_timestamp` (s), `_ms`, `_nano` variants, `$start_datetime`/`$end_datetime`, `$SIGNOZ_START_TIME`/`$SIGNOZ_END_TIME` (ms), dashboard variables as `{{var}}` or `$var`.

## 9. Gotchas

- `limit` above 10000 returns 400. Raw default limit is 100.
- Step intervals too small for the range are clamped; a warning says so.
- No hard cap on range, but long ranges without a resource filter can time out.
- `severity_text` compares case-sensitively.
- Warning `Key X is ambiguous, found 2 different combinations`: the same name exists with several contexts or types. Qualify it, e.g. `attribute.http.status_code:number`, or results can be incomplete.
- Field discovery: `GET /api/v1/fields/keys?signal=logs&searchText=&fieldContext=&limit=` and `GET /api/v1/fields/values?signal=logs&name=&searchText=&existingQuery=&limit=` (the helper's `keys` and `values`).
