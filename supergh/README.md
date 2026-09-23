# supergh

Commits, issues and pull requests, done properly: Conventional Commits messages, your own issue and
PR templates, and no improvised `git` or `gh` command.

## Install

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install supergh@p2p2 --scope user
```

Requires the `gh` CLI, logged in: `gh auth login`. Nothing else.

## Commands

| Say this | What happens |
| --- | --- |
| "commit", "commit changes", "commit all" | The change is read, a Conventional Commits message written, the commit made and verified. |
| `/supergh:create-issue` | An issue from your own `.github/ISSUE_TEMPLATE/`, previewed before it is created. |
| `/supergh:create-pr` | A draft PR from your own `.github/pull_request_template.md`, titled `[#N] {issue-title}`. |
| "how do I add a sub-issue?" | An answer about the GitHub API, executing nothing. |

## Committing

With no scope everything is committed: modified, new and deleted files. Name one or more paths to
commit only those.
Mention an issue - `#42` or a link to it - and it lands in the message as a `Refs: #42` footer.

It never creates a branch, and it reports back only after confirming the commit actually landed.

## Issues and pull requests

Both read your templates fresh each time, fill in what they can from the session, and ask you for
the rest. The PR command works out the linked issue from the branch name (`task.N` / `issue.N`),
from an argument, or from what you have been working on, and checks for an open PR first.
