# Projects v2

`gh project` exists and is surprisingly capable. REST has **no Projects v2 endpoints at all** - anything past what `gh project` exposes is GraphQL-only. There is no legacy `gh project` for classic Projects - the subcommand always means Projects v2.

## Subcommand map

```
gh project list / view / create / edit / copy / delete / close / link / unlink / mark-template
gh project item-add / item-edit / item-create / item-list / item-archive / item-delete
gh project field-create / field-list / field-delete
```

## Verdict at a glance

| Operation | `gh project` | GraphQL fallback |
|---|---|---|
| Add an existing issue/PR to a project | `gh project item-add <number> --owner <o> --url <issue-url>` | `addProjectV2ItemById` |
| Set a text / number / date / single-select / iteration field | `gh project item-edit --id <item-id> --project-id <pid> --field-id <fid> [--text | --number | --date | --single-select-option-id | --iteration-id]` (**one field per invocation**) | `updateProjectV2ItemFieldValue` |
| Clear a field | `gh project item-edit --clear ...` | `clearProjectV2ItemFieldValue` |
| Create / list / delete a field | `gh project field-create / field-list / field-delete` | `createProjectV2Field` etc. |
| Manage single-select **options** (add/rename/recolor) | **not supported by `gh`** | `updateProjectV2SingleSelectField` |
| Reorder items / set position relative to siblings | **not supported by `gh`** | `updateProjectV2ItemPosition` |
| Bulk-set multiple fields on one item in one call | not supported (one field per `item-edit`) | combine multiple mutations in a single GraphQL request via aliases |

## Discovery - get the IDs you need

`item-edit` and every GraphQL mutation need `projectId`, `itemId`, `fieldId`, and (for single-select) `optionId` or (for iteration) `iterationId`. These are not surfaced in the UI - query them:

```bash
gh api graphql -F org="$ORG" -F number=42 -f query='
  query($org: String!, $number: Int!) {
    organization(login: $org) {
      projectV2(number: $number) {
        id
        fields(first: 50) {
          nodes {
            ... on ProjectV2Field             { id name dataType }
            ... on ProjectV2IterationField    { id name configuration { iterations { id title startDate } } }
            ... on ProjectV2SingleSelectField { id name options { id name } }
          }
        }
      }
    }
  }'
```

For a user-owned project, swap `organization(login:)` for `user(login:)`.

To find an item ID for a specific issue already on the project:

```bash
gh api graphql -F projectId="$PID" -F issueNodeId="$ISSUE_NODE_ID" -f query='
  query($projectId: ID!, $issueNodeId: ID!) {
    node(id: $projectId) {
      ... on ProjectV2 {
        items(first: 100) {
          nodes { id content { ... on Issue { id number } } }
        }
      }
    }
  }'
```

(For large projects use `--paginate` and a cursor; see `graphql-patterns.md`.)

## Set a single-select field via GraphQL

```bash
gh api graphql -f query='
  mutation($p: ID!, $i: ID!, $f: ID!, $opt: String!) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $p, itemId: $i, fieldId: $f,
      value: { singleSelectOptionId: $opt }
    }) { projectV2Item { id } }
  }' \
  -F p="$PROJECT_ID" -F i="$ITEM_ID" -F f="$FIELD_ID" -F opt="$OPTION_ID"
```

Other value shapes (one `value` key per call):
- Iteration: `value: { iterationId: "..." }`
- Date: `value: { date: "2026-05-22" }`
- Text: `value: { text: "..." }`
- Number: `value: { number: 3 }`

## Auth

Projects v2 needs the `project` scope on the token:

```bash
gh auth refresh -s project
```

See `auth-and-scopes.md` for the full scope matrix and CI guidance.

## Sources

- gh manual - project: <https://cli.github.com/manual/gh_project>
- Projects v2 GraphQL guide: <https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-api-to-manage-projects>
