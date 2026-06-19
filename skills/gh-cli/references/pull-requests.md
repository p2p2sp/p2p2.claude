# Pull requests

`gh pr` is the most mature surface in the CLI. Almost everything you need at PR creation/edit/review/merge time is a flag — escalate to REST/GraphQL only for the specific gaps called out below.

## Subcommand map

```
gh pr list / view / status / diff / checks
gh pr create / edit / ready / close / reopen / merge
gh pr review / comment
gh pr checkout / lock / unlock
```

## `gh pr create` — canonical pattern

```bash
gh pr create \
  --base main --head feature/foo \
  --title "feat(area): one-line subject" \
  --body-file <path-to-body.md> \
  --draft \
  --label refactor --label needs-review \
  --reviewer octocat --reviewer @org/team \
  --assignee @me \
  --project "Roadmap Q2" \
  --milestone "Q2 2026"
```

Full flag list (verbatim from `gh pr create --help`):

| Flag | Purpose |
|---|---|
| `--title <string>` | Title for the pull request |
| `--body <string>` | Body for the pull request |
| `--body-file <file>` | Read body text from file (use `-` for stdin) |
| `--template <file>` | Template file to use as starting body text |
| `--draft` | Mark pull request as a draft |
| `--fill` | Use commit info for title and body |
| `--fill-first` | Use first commit info for title and body |
| `--fill-verbose` | Use commits msg+body for description |
| `--base <branch>` | The branch into which you want your code merged |
| `--head <branch>` | The branch that contains commits for your pull request |
| `--label <name>` | Add labels by name (repeatable) |
| `--assignee <login>` | Assign people by their login (repeatable; `@me` = yourself) |
| `--reviewer <handle>` | Request reviews from people or teams (repeatable; `@org/team` for teams) |
| `--project <title>` | Add to projects by title (repeatable) |
| `--milestone <name>` | Add to a milestone by name |
| `--recover <string>` | Recover input from a failed run of create |
| `--web` | Open the web browser to create the PR |

Notes:
- Use `--body-file` (not `--body "<inline>"`) for any body with newlines, quotes, backticks, dollar signs.
- `--fill` / `--fill-first` / `--fill-verbose` are mutually exclusive ways to seed from commit messages; useful for one-shot/automation flows.
- `--draft` toggles the PR to draft state at creation. To toggle later: `gh pr ready` (un-draft) — no direct "make draft" subcommand; for that, use GraphQL `convertPullRequestToDraft`.

## Editing an existing PR

```bash
gh pr edit <number-or-url> \
  --title '…' \
  --body-file body.md \
  --base main \
  --add-label foo --remove-label bar \
  --add-assignee @me --remove-assignee octocat \
  --add-reviewer @org/team --remove-reviewer octocat \
  --add-project "Roadmap Q2" --remove-project "Backlog" \
  --milestone "Q2 2026"
```

## Review actions

```bash
gh pr review <num> --approve --body 'LGTM'
gh pr review <num> --request-changes --body 'See comments'
gh pr review <num> --comment --body 'Some context'
gh pr review <num> --body-file review.md
```

For per-line review comments, the CLI does not have first-class support — escalate to REST (`POST /repos/{o}/{r}/pulls/{n}/comments`) or GraphQL (`addPullRequestReviewThread`).

## Merge

```bash
gh pr merge <num> --merge       # plain merge commit
gh pr merge <num> --squash      # squash-and-merge
gh pr merge <num> --rebase      # rebase-and-merge
gh pr merge <num> --auto        # merge when checks pass (with chosen strategy)
gh pr merge <num> --delete-branch
gh pr merge <num> --subject '…' --body '…'   # override commit message
```

`--auto` requires the repo to allow auto-merge in settings.

## Gaps — when to escalate beyond `gh pr`

| Need | Path |
|---|---|
| List / resolve PR review **threads** (the wrapping object with `isResolved`) | GraphQL only — see `pr-review-threads.md` |
| Convert an open PR back to draft | GraphQL `convertPullRequestToDraft` |
| Attach PR to a Projects v2 board | `gh project item-add` — see `projects-v2.md` |
| Set or clear an issue type on the **linked issue** | REST `PATCH /repos/.../issues/{n}` — see `issues.md` |
| Bulk reactions on review comments | REST `/repos/.../pulls/comments/{id}/reactions` |

## Sources

- gh manual — pr: <https://cli.github.com/manual/gh_pr>
- gh manual — pr create: <https://cli.github.com/manual/gh_pr_create>
- gh manual — pr edit: <https://cli.github.com/manual/gh_pr_edit>
- gh manual — pr review: <https://cli.github.com/manual/gh_pr_review>
- gh manual — pr merge: <https://cli.github.com/manual/gh_pr_merge>
- REST — Pulls: <https://docs.github.com/en/rest/pulls/pulls>
- GraphQL — PullRequest object: <https://docs.github.com/en/graphql/reference/objects#pullrequest>
