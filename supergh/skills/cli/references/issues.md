# Issues — create, edit, type, labels, milestones, assignees

## Verdict at a glance

| Operation | Path | Notes |
|---|---|---|
| Create issue (title, body, labels, assignees, projects, milestone) | `gh issue create` | Use `--body-file`, never `--body` with inline string. |
| **Create issue with an issue type** | `gh api repos/{o}/{r}/issues -f type=...` (REST) | `gh issue create` has **no `--type` flag**. |
| **Set type on existing issue** | `gh api -X PATCH repos/{o}/{r}/issues/{n} -f type=...` (REST) | Or GraphQL `updateIssueIssueType` (needs node ID). |
| Edit issue (title, body, labels, assignees) | `gh issue edit` | |
| View, list, comment, close, reopen, transfer, pin, lock | `gh issue <subcommand>` | |
| Manage label **definitions** (CRUD) | `gh api .../labels` (REST) | `gh label create/list/clone/delete` also exists. |
| Manage milestone **definitions** (CRUD) | `gh api .../milestones` (REST) | No top-level `gh milestone`. |
| Manage org issue type **definitions** | `gh api .../orgs/{org}/issue-types` (REST) | Or GraphQL `createIssueType`/`updateIssueType`/`deleteIssueType`. |

## `gh issue create` — canonical pattern

```bash
gh issue create \
  --title "<title>" \
  --body-file <path-to-body.md> \
  --label bug --label triage \
  --assignee @me \
  --project "Roadmap Q2"
```

- `--body-file` is mandatory for any non-trivial body. `--body "<inline>"` breaks on newlines, quotes, backticks, dollar signs.
- `--label`, `--assignee`, `--project`, `--milestone` are repeatable / take comma-separated lists.
- `--web` opens the browser instead of creating directly.
- On success, the new issue URL is printed to stdout.

## Issue types — the gotcha

`gh issue create` does **not** accept `--type`. The flag does not exist (manual: <https://cli.github.com/manual/gh_issue_create>). Two paths to set the type:

### Path A — REST, in one call (preferred when starting fresh)

```bash
gh api repos/{owner}/{repo}/issues \
  -f title='Crash on startup' \
  -f body='Steps to reproduce…' \
  -f type=Bug \
  -F labels='["bug","triage"]' \
  -F assignees='["octocat"]'
```

Notes:
- `type=` accepts the **name** of the type (`Bug`, `Feature`, `Task`, or any org-custom name).
- `labels` and `assignees` are JSON arrays — use `-F` so the string is parsed.
- Response body contains the new issue (`.number`, `.html_url`, `.id`).

### Path B — REST PATCH after `gh issue create` (preferred when wrapping `gh issue create`)

```bash
gh issue create --title '...' --body-file body.md --label bug --assignee @me
# capture URL → parse issue number N
gh api -X PATCH repos/{owner}/{repo}/issues/{N} -f type=Bug
```

This is the right pattern when an existing skill already builds a `gh issue create` invocation and we just need to bolt on the type. Used by the `create-issue` skill in this plugin.

### Path C — GraphQL (needed only if you already hold a node ID, not a number)

```bash
gh api graphql -H 'GraphQL-Features: issue_types' \
  -F issueId="$NODE_ID" -F issueTypeId="$TYPE_ID" \
  -f query='
    mutation($issueId: ID!, $issueTypeId: ID!) {
      updateIssueIssueType(input: { issueId: $issueId, issueTypeId: $issueTypeId }) {
        issue { number issueType { name } }
      }
    }'
```

Discover org type IDs (also useful when validating a `type=` value before sending):

```bash
gh api graphql -H 'GraphQL-Features: issue_types' \
  -F org="$ORG" \
  -f query='
    query($org: String!) {
      organization(login: $org) {
        issueTypes(first: 25) { nodes { id name description color isEnabled } }
      }
    }'
```

To clear a type: REST `PATCH` with `-f type=` (empty), or GraphQL `updateIssue(input: { issueId, issueTypeId: null })`.

### Errors to expect and how to handle them

| Stderr / response | Cause | Reaction |
|---|---|---|
| `unknown flag: --type` | You used `gh issue create --type ...`. Flag does not exist. | Drop the flag; use Path A or B. |
| `Validation Failed: Type … is not a valid issue type` | Type name wrong, or not enabled in the org. | Surface a 1-line warning; continue without type. |
| `Issue types are not enabled for this organization` | Org has not enabled the feature. | Same — warn, continue. |
| `403 Resource not accessible by personal access token` | Token missing scope. | Re-run with `admin:org` (classic PAT) or the fine-grained `Issue types` permission. See `auth-and-scopes.md`. |

## Labels

`gh issue edit <n> --add-label X --remove-label Y` attaches/detaches existing labels. To manage label definitions:

```bash
gh label create bug --color d73a4a --description "Something isn't working"
gh label list -R owner/repo
gh label clone source-owner/source-repo
gh label delete bug --confirm
```

REST equivalents under `/repos/{o}/{r}/labels`.

## Milestones

No top-level `gh milestone` subcommand — use REST:

```bash
gh api repos/{owner}/{repo}/milestones -f title='Q2 2026' -f state=open -f description='…'
gh api repos/{owner}/{repo}/milestones                                  # list
gh api -X PATCH repos/{owner}/{repo}/milestones/{n} -f state=closed
gh api -X DELETE repos/{owner}/{repo}/milestones/{n}
```

Attach an existing milestone to an issue via `gh issue create -m "Q2 2026"` or `gh issue edit <n> -m "Q2 2026"`.

## Sources

- gh manual — issue: <https://cli.github.com/manual/gh_issue>
- REST — Issues (with `type` field): <https://docs.github.com/en/rest/issues/issues>
