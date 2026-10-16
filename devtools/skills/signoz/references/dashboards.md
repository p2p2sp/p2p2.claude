# Dashboards reference (/api/v2/dashboards, schema v6)

## Contents

- 1. Endpoints
- 2. Create
- 3. Update: PATCH, PUT
- 4. Spec structure
- 5. Panels
- 6. Queries in panels
- 7. Variables
- 8. Layout
- 9. Gotchas

`/api/v1/dashboards` no longer exists. The format is Perses-based `schemaVersion: "v6"`; the old `widgets`/`layout` JSON is legacy.

## 1. Endpoints

- `GET /api/v2/dashboards?query=&sort=&order=&limit=&offset=`: list. `data = {dashboards[], total, tags[]}`; list items carry only `spec.display`. `limit` default 20, max 200. `sort`: `updated_at` (default), `created_at`, `name`; `order`: `asc`/`desc`.
  - `query` is a filter DSL: `name`, `description`, `created_by` with `=`, `!=`, `LIKE`, `ILIKE`, `CONTAINS`, `REGEXP`, `IN`; `created_at`/`updated_at` numeric; `locked = true`; any other key is a tag key, e.g. `team = 'platform'`. URL-encode it.
- `GET /api/v2/dashboards/{id}`: full object `{id, name, schemaVersion, locked, source, tags, spec, createdBy, ...}`. Save with `--out`, dashboards are large.
- `POST /api/v2/dashboards`: 201, returns the created object with server `id` and `name`.
- `PATCH /api/v2/dashboards/{id}`: RFC 6902 JSON Patch array, 200.
- `PUT /api/v2/dashboards/{id}`: full replace, 200.
- `DELETE /api/v2/dashboards/{id}`: 204.
- `PUT /api/v2/dashboards/{id}/lock` locks, `DELETE /api/v2/dashboards/{id}/lock` unlocks: 204. Only the creator or an Admin.
- `POST /api/v2/dashboards/{id}/clone`: 201 copy.
- `POST /api/v2/dashboards/{id}/migrate`: converts a `legacy: true` (v1) dashboard to v6.
- `GET /api/v3/metrics/dashboards?metricName=`: dashboards using a metric.

## 2. Create

Start from `templates/dashboard-v6.json` (TimeSeries, Number and List panels on logs with a dynamic variable).

- Required: `schemaVersion: "v6"`, `tags` (array, may be empty), `spec`.
- Name: send `"generateName": true` and no `name`; the server derives a DNS label from `spec.display.name` plus a random suffix. Or send `name` as a DNS-1123 label (lowercase, digits, `-`, max 63 chars).
- `tags`: `[{"key": "...", "value": "..."}]`, max 10. Keys `name`, `description`, `created_at`, `updated_at`, `created_by`, `locked`, `source` are reserved.
- `image` (optional): `/assets/Icons/...`, `/assets/Logos/...` or a `data:image/...` URI.
- Never send `id`; the server generates it.

## 3. Update

PATCH for targeted edits (lenient: `remove` of a missing path is a no-op, `add` creates parents; the result is still validated):

```json
[
  {"op": "replace", "path": "/spec/panels/errors-total/spec/display/name", "value": "Errors (5xx)"},
  {"op": "add", "path": "/spec/panels/new-panel", "value": {"kind": "Panel", "spec": {}}},
  {"op": "add", "path": "/spec/layouts/0/spec/items/-", "value": {"x": 0, "y": 14, "width": 6, "height": 6, "content": {"$ref": "#/spec/panels/new-panel"}}},
  {"op": "add", "path": "/tags/-", "value": {"key": "env", "value": "prod"}}
]
```

Adding a panel needs two operations: the panel under `/spec/panels/<key>` and its layout item. Removing one needs both removed; a layout `$ref` to a missing panel is rejected.

PUT: GET the dashboard, keep `schemaVersion`, `name`, `tags`, `spec` (and `image` if set), change what is needed, send it back. Drop `id`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `orgId`, `locked`, `source`, `legacy`; unknown fields are rejected. `name` is immutable.

Both fail on locked dashboards and on `source` `system` or `integration`.

## 4. Spec structure

```json
{
  "display": {"name": "Title (max 128)", "description": ""},
  "duration": "1h",
  "refreshInterval": "",
  "variables": [],
  "panels": {"<panel-key>": {"kind": "Panel", "spec": {}}},
  "layouts": [{"kind": "Grid", "spec": {"items": []}}],
  "links": []
}
```

`display`, `variables`, `panels`, `layouts` are required and must not be null (use `[]`/`{}`). Panel keys match `^[a-zA-Z0-9_.-]+$`, max 75 chars; use readable keys like `errors-by-service`.

## 5. Panels

```json
{"kind": "Panel", "spec": {
  "display": {"name": "Title", "description": ""},
  "plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {}},
  "queries": [ONE QUERY],
  "links": []}}
```

Plugin kinds (v1 panelType in brackets):
- `signoz/TimeSeriesPanel` (graph), `signoz/AreaChartPanel`, `signoz/BarChartPanel` (bar)
- `signoz/NumberPanel` (value), `signoz/PieChartPanel` (pie), `signoz/TablePanel` (table)
- `signoz/HistogramPanel` (histogram), `signoz/ListPanel` (list of logs or spans)
- `signoz/TextPanel`: markdown, `{"mode": "markdown", "text": "..."}`, must have `queries: []`

Exactly one query per panel (except TextPanel). Several queries plus formulas go into one `signoz/CompositeQuery`.

Plugin spec fields (all optional; `{}` is valid):
- TimeSeries/Area/Bar: `visualization {timePreference, fillSpans, stack|stackedBarChart}`, `formatting {unit, decimalPrecision}`, `axes {softMin, softMax, isLogScale}`, `legend {position: bottom|right, mode: list|table}`, `chartAppearance {lineInterpolation, showPoints, lineStyle, fillMode, spanGaps}` (TimeSeries), `thresholds [{value, color, label, unit}]`
- Number: `formatting`, `visualization {timePreference}`, `thresholds [{value, color, operator, unit, format: text|background}]`
- Table: `formatting {columnUnits {"A": "ms"}, decimalPrecision}`, `thresholds [{columnName, value, color, operator}]`
- `timePreference`: `global_time` (default) or `last_5_min` ... `last_1_month`
- `unit` examples: `short`, `percent`, `ms`, `s`, `ns`, `reqps`, `bytes`
- Exact schemas: grep `openapi-v0.143.0.yml` for `^    Dashboardtypes<Kind>PanelSpec:`.

## 6. Queries in panels

```json
{"kind": "time_series", "spec": {"name": "A", "plugin": {"kind": "signoz/BuilderQuery", "spec": {V5 BUILDER QUERY}}}}
```

- Outer `kind` is the request type: `time_series` for charts, `scalar` for Number, Pie and Table, `raw` for List.
- Builder spec = the v5 builder query from `logs-query.md` section 2 (same strict field list), plus `legend` such as `"{{service.name}}"`. Give aggregation queries an explicit `order` and `limit`.
- Composite (several queries and formulas):

```json
{"kind": "time_series", "spec": {"plugin": {"kind": "signoz/CompositeQuery", "spec": {"queries": [
  {"type": "builder_query", "spec": {"name": "A", "signal": "logs", "stepInterval": 60, "aggregations": [{"expression": "count()"}], "filter": {"expression": "severity_number >= 17"}, "groupBy": [{"name": "service.name"}], "disabled": true}},
  {"type": "builder_query", "spec": {"name": "B", "signal": "logs", "stepInterval": 60, "aggregations": [{"expression": "count()"}], "groupBy": [{"name": "service.name"}], "disabled": true}},
  {"type": "builder_formula", "spec": {"name": "F1", "expression": "A / B * 100", "legend": "{{service.name}}"}}]}}}}
```

- Other query plugins: `signoz/ClickHouseSQL` `{"name", "query"}`, `signoz/PromQLQuery` `{"name", "query"}` (not in Pie or Table), `signoz/Formula`, `signoz/TraceOperator`. List panels accept only `signoz/BuilderQuery`.
- Traces use the same shape with `"signal": "traces"` and fields like `service.name`, `name`, `duration_nano`, `has_error` (full list in `endpoints.md` section 5); metrics use `aggregations: [{"metricName", "temporality", "timeAggregation", "spaceAggregation"}]`.
- Test a panel query before saving: wrap its builder spec as `{"requestType": "<kind>", "compositeQuery": {"queries": [{"type": "builder_query", "spec": ...}]}}` and run `signoz.mjs query`, passing variables in `variables`.

## 7. Variables

All referenced in queries as `$name`.

- Dynamic (field values, recommended): `{"kind": "ListVariable", "spec": {"name": "service", "display": {"name": "service"}, "allowMultiple": true, "allowAllValue": true, "sort": "alphabetical-asc", "plugin": {"kind": "signoz/DynamicVariable", "spec": {"name": "service.name", "signal": "logs"}}}}`. `signal`: `logs`, `traces`, `metrics`, `all`.
- Query (ClickHouse): same `ListVariable`, plugin `{"kind": "signoz/QueryVariable", "spec": {"queryValue": "SELECT ..."}}`.
- Custom list: plugin `{"kind": "signoz/CustomVariable", "spec": {"customValue": "a,b,c"}}`.
- Text: `{"kind": "TextVariable", "spec": {"name": "q", "display": {"name": "q"}, "value": "", "constant": false}}`.
- `sort`: `none`, `alphabetical-asc|desc`, `numerical-asc|desc`, `alphabetical-ci-asc|desc`. Optional `defaultValue`. Names must be unique.
- With `allowMultiple`, filter with `IN $var`; single value with `= $var`.

## 8. Layout

```json
{"kind": "Grid", "spec": {"display": {"title": "Section", "collapse": {"open": true}}, "items": [
  {"x": 0, "y": 0, "width": 6, "height": 6, "content": {"$ref": "#/spec/panels/<key>"}}]}}
```

- 12-column grid: `width` 1-12, `x` 0-11, `x + width <= 12`, `height >= 1`. Items must not overlap.
- Each `$ref` is exactly `#/spec/panels/<key>`, points to an existing panel and appears once in the dashboard.
- A collapsible row (v1 `row` panel) is a separate Grid entry with `display.title`. Omit `display` for a plain grid.
- Typical sizes: full width 12x6, half 6x6, stat tile 3x3 or 4x4, log list 12x8.

## 9. Gotchas

- Unknown fields anywhere in the body return 400; copy shapes from this file or the template.
- An aggregation expression holds one function: `count(), sum(x)` is rejected; use two aggregations.
- Ambiguous field names (same key with two types) produce wrong panels; qualify them (`attribute.http.status_code:number`).
- After create or edit, give the user the UI link `<SIGNOZ_URL>/dashboard/<id>`.
