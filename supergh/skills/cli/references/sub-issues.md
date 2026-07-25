# Sub-issues (issue hierarchy)

Native GitHub sub-issues are **REST-supported** (API version `2026-03-10`). There is **no native `gh` subcommand** (tracked in `cli/cli#10298`). Community extension `yahsan2/gh-sub-issue` adds sugar but is third-party.

## Verdict at a glance

| Operation | `gh` | REST | GraphQL |
|---|---|---|---|
| List sub-issues of an issue | extension | `GET /repos/{o}/{r}/issues/{n}/sub_issues` | `issue { subIssues(first: 100) { nodes { number } } }` |
| Get parent of an issue | extension | `GET /repos/{o}/{r}/issues/{n}/parent` | `issue { parent { number } }` |
| Add a sub-issue | extension | `POST /repos/{o}/{r}/issues/{n}/sub_issues` body `{ "sub_issue_id": 12345 }` | `addSubIssue(input: { issueId, subIssueId })` |
| Remove a sub-issue | extension | `DELETE /repos/{o}/{r}/issues/{n}/sub_issue` | `removeSubIssue` |
| Reorder sub-issues | extension | `PATCH /repos/{o}/{r}/issues/{n}/sub_issues/priority` | `reprioritizeSubIssue` |

**Hierarchy limits**: 8 levels deep, 100 children per parent.

## The ID trap

| Surface | Wants which ID? |
|---|---|
| REST `/sub_issues` | **DB id** - the numeric `id` field of `GET /repos/{o}/{r}/issues/{n}` (NOT the issue number, NOT the GraphQL node id) |
| GraphQL `addSubIssue` | **node id** - `I_kwDOABCDEF…` (NOT the issue number, NOT the DB id) |

Mixing them silently 404s or misroutes - always resolve the right shape first.

## REST path (preferred - least friction)

Get the child issue's DB id:

```bash
CHILD_DB_ID=$(gh api repos/{owner}/{repo}/issues/{child_number} -q .id)
gh api -X POST repos/{owner}/{repo}/issues/{parent_number}/sub_issues \
  -H 'X-GitHub-Api-Version: 2026-03-10' \
  -F sub_issue_id="$CHILD_DB_ID"
```

List:

```bash
gh api repos/{owner}/{repo}/issues/{parent_number}/sub_issues -H 'X-GitHub-Api-Version: 2026-03-10'
```

Remove:

```bash
gh api -X DELETE repos/{owner}/{repo}/issues/{parent_number}/sub_issue \
  -H 'X-GitHub-Api-Version: 2026-03-10' \
  -F sub_issue_id="$CHILD_DB_ID"
```

Reorder (set sub-issue position relative to siblings):

```bash
gh api -X PATCH repos/{owner}/{repo}/issues/{parent_number}/sub_issues/priority \
  -H 'X-GitHub-Api-Version: 2026-03-10' \
  -F sub_issue_id="$CHILD_DB_ID" \
  -F after_id="$OTHER_CHILD_DB_ID"
```

## GraphQL path

Use when you already hold node IDs (e.g. from a previous GraphQL query in the same workflow).

Discover node IDs:

```bash
gh api graphql -F owner="$O" -F name="$R" -F num=42 -f query='
  query($owner: String!, $name: String!, $num: Int!) {
    repository(owner: $owner, name: $name) {
      issue(number: $num) { id title }
    }
  }'
```

Add:

```bash
gh api graphql -F parent="$PARENT_NODE_ID" -F child="$CHILD_NODE_ID" -f query='
  mutation($parent: ID!, $child: ID!) {
    addSubIssue(input: { issueId: $parent, subIssueId: $child }) {
      issue    { number title }
      subIssue { number title }
    }
  }'
```

Remove uses `removeSubIssue(input: { issueId, subIssueId })`; reorder uses `reprioritizeSubIssue(input: { issueId, subIssueId, afterId })`.

## Sources

- REST - Sub-issues: <https://docs.github.com/en/rest/issues/sub-issues>
- GraphQL - addSubIssue: <https://docs.github.com/en/graphql/reference/mutations#addsubissue>
