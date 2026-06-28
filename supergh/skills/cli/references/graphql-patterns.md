# GraphQL patterns with `gh api graphql`

`gh` ships a generic API client. The GraphQL endpoint is fixed (`/graphql`); everything else is your query string plus variables.

## Basic shape

```bash
gh api graphql -f query='
  query($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) { id }
  }
' -F owner=octocat -F repo=hello-world
```

## Variable flags — `-f` vs `-F`

- `-f, --raw-field key=value` — **always a string**. Use for the `query` text itself and for any GraphQL variable that is genuinely a `String!`.
- `-F, --field key=value` — **typed magic conversion**: numbers become `Int`, `true`/`false`/`null` are coerced, `@filename` reads a file, `-` reads stdin. Use for `Boolean`, `Int`, numeric IDs, and placeholder substitution.
- Both flags can be repeated; every key other than `query` / `operationName` is forwarded as a GraphQL variable.

Rule of thumb for GraphQL via `gh`: **`-f query=...` for the query body; `-F` for everything else** unless the variable is genuinely a String.

## Pagination — `--paginate`

`--paginate` only works when the query is explicitly written for it. The query MUST:

1. accept `$endCursor: String` as a variable,
2. select `pageInfo { hasNextPage endCursor }` on every paginated connection,
3. pass the cursor in as `after: $endCursor`.

Without `pageInfo` in the selection set, `--paginate` silently fetches one page.

Each page returns a separate JSON object on stdout; combine with `--slurp` to wrap them into a single array.

`--paginate` cannot be used with `--input`.

Example:

```bash
gh api graphql --paginate --slurp -F owner=octocat -F repo=hello-world -f query='
  query($owner: String!, $repo: String!, $endCursor: String) {
    repository(owner: $owner, name: $repo) {
      issues(first: 50, after: $endCursor) {
        pageInfo { hasNextPage endCursor }
        nodes { number title }
      }
    }
  }'
```

## Schema introspection

Verify a mutation or field actually exists on the live schema before writing automation:

```bash
gh api graphql -f query='{ __schema { types { name kind } } }'
gh api graphql -f query='{ __type(name: "Issue") { fields { name type { name kind } } } }'
```

## Error handling — errors ride inside `200 OK`

`gh api graphql` returns HTTP 200 even for GraphQL errors. The exit code is 0, but the response body contains an `errors` array. Always select enough of the response to detect failure, and when scripting capture the errors through `gh`'s built-in jq engine (no system `jq` needed):

```bash
err="$(gh api graphql -f query='...' --jq '.errors // empty')"
[ -n "$err" ] && { echo "GraphQL failed: $err" >&2; exit 1; }
```

A non-empty `$err` is your real failure signal — `gh --jq` does NOT propagate `jq -e`'s exit code, so test the captured output, not the exit status.

For mutations that return an object, always select at least one field of the return type. An empty selection compiles but returns nothing useful for downstream parsing.

## Discovery query → mutation pairing

Every GraphQL mutation that takes a `*Id` input needs a preceding query to resolve that ID. The pattern across this skill's references is **always pair the snippets**: any mutation example is preceded by the discovery query that produces its IDs.

Examples (linked from the per-feature references):
- `addSubIssue` → query `repository.issue.id` to get the node ID.
- `updateProjectV2ItemFieldValue` → query `organization.projectV2.fields` to get `projectId`, `fieldId`, and (for single-select) `optionId`.
- `resolveReviewThread` → query `repository.pullRequest.reviewThreads.nodes.id` to get the `PRRT_…` thread ID.

## Preview headers

Some recent features still expect a preview header even after going GA. Include them defensively:

```bash
gh api graphql -H 'GraphQL-Features: issue_types' -f query='...'
```

The header is a no-op once the feature is fully GA in the schema you hit. Specifically:

- `GraphQL-Features: issue_types` — for `updateIssueIssueType`, `organization.issueTypes`, `Issue.issueType`.

For REST (`gh api`) the equivalent is `-H 'X-GitHub-Api-Version: 2026-03-10'` on endpoints like `/repos/{o}/{r}/issues/{n}/sub_issues`.

## Rate limits

REST and GraphQL have separate buckets. GraphQL is metered by query cost (points), not by request count. For bulk operations on sub-issues, projects, or review threads, prefer one GraphQL query with batching over N REST calls.

## Sources

- gh manual — api: <https://cli.github.com/manual/gh_api>
- GraphQL reference: <https://docs.github.com/en/graphql/reference>
