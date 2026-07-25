# PR review threads

A review **thread** is the group of review comments anchored to the same diff location. It has an `isResolved` flag and an `id` shaped like `PRRT_…`. REST exposes the underlying review **comments** but does **not** expose thread objects or the resolution state. Resolving threads is GraphQL-only.

## Verdict at a glance

| Operation | `gh` | REST | GraphQL |
|---|---|---|---|
| List threads with resolution state | no | **not supported** (REST has no thread objects) | `pullRequest.reviewThreads` |
| Reply to a specific review thread | no | `POST /repos/{o}/{r}/pulls/{n}/comments/{comment_id}/replies` | `addPullRequestReviewThreadReply` |
| Resolve a thread | no (tracked in `cli/cli#12419`) | **not supported** | `resolveReviewThread` |
| Unresolve a thread | no | **not supported** | `unresolveReviewThread` |

To resolve programmatically you need the **thread** node ID (`PRRT_…`), which is only obtainable via GraphQL - so both the lookup and the mutation are GraphQL.

## Discovery - list threads of a PR

```bash
gh api graphql -F owner="$O" -F name="$R" -F num=123 -f query='
  query($owner: String!, $name: String!, $num: Int!) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $num) {
        reviewThreads(first: 50) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            isResolved
            isOutdated
            isCollapsed
            comments(first: 1) {
              nodes { path body author { login } }
            }
          }
        }
      }
    }
  }'
```

For large PRs add `--paginate --slurp` and re-emit with `$endCursor` (see `graphql-patterns.md`).

## Resolve a thread

```bash
gh api graphql -F threadId="$PRRT_ID" -f query='
  mutation($threadId: ID!) {
    resolveReviewThread(input: { threadId: $threadId }) {
      thread { id isResolved }
    }
  }'
```

Unresolve:

```bash
gh api graphql -F threadId="$PRRT_ID" -f query='
  mutation($threadId: ID!) {
    unresolveReviewThread(input: { threadId: $threadId }) {
      thread { id isResolved }
    }
  }'
```

## Reply to a thread

Two paths:

REST (when you already have the parent comment's DB id):

```bash
gh api -X POST repos/{owner}/{repo}/pulls/{num}/comments/{comment_id}/replies \
  -f body='Acknowledged, will fix in the next push.'
```

GraphQL (when you already have the thread node id):

```bash
gh api graphql -F threadId="$PRRT_ID" -f body='…' -f query='
  mutation($threadId: ID!, $body: String!) {
    addPullRequestReviewThreadReply(input: {
      pullRequestReviewThreadId: $threadId,
      body: $body
    }) { comment { id body } }
  }'
```

## Bulk-resolve outdated threads - common script shape

```bash
# 1. Page through threads; filter outdated + unresolved with gh's built-in jq (no system jq).
gh api graphql --paginate --slurp -F owner="$O" -F name="$R" -F num=123 \
  --jq '.[].data.repository.pullRequest.reviewThreads.nodes[]
        | select(.isOutdated and (.isResolved | not))
        | .id' \
  -f query='
  query($owner: String!, $name: String!, $num: Int!, $endCursor: String) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $num) {
        reviewThreads(first: 50, after: $endCursor) {
          pageInfo { hasNextPage endCursor }
          nodes { id isResolved isOutdated }
        }
      }
    }
  }' \
  | while read -r THREAD_ID; do
      gh api graphql -F threadId="$THREAD_ID" -f query='
        mutation($threadId: ID!) {
          resolveReviewThread(input: { threadId: $threadId }) { thread { isResolved } }
        }'
    done
```

## Sources

- GraphQL - resolveReviewThread: <https://docs.github.com/en/graphql/reference/mutations#resolvereviewthread>
- REST - Pull request review comments: <https://docs.github.com/en/rest/pulls/comments>
