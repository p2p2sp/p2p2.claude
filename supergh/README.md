# supergh

The GitHub / git ecosystem for Claude Code: Conventional-Commits commits, template-driven issue and pull
request creation, and a `gh` CLI/REST/GraphQL reference so the model stops guessing which API layer an
operation needs.

Every `gh` and `git` call runs through bundled, self-verifying scripts - the model never improvises a
`git commit` or a `gh` invocation. Ships no hooks and no manifest.

## Install

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install supergh@p2p2 --scope user
```

Requires the `gh` CLI installed and authenticated (`gh auth login`). Nothing else.

## Quick start

- **Commit.** Say "commit", "commit changes", or "commit all". A haiku fork reads the recent-commit style
  plus the scoped `git status`/diff, writes the Conventional Commits message, commits, and verifies that
  HEAD actually moved before reporting `<sha> | <message>`. It never creates a branch. Scope it with a
  selector: everything (`all`), only what is staged (`staged`), or a single path. Mention an issue -
  `#42` or a GitHub issue link - and it lands in the message as a `Refs: #42` footer.
- **Open an issue.** Run `/supergh:create-issue`. It reads `.github/ISSUE_TEMPLATE/` fresh, auto-fills what
  it can from the session, enforces the template's required fields and frontmatter (labels, type,
  assignees), previews the result, then creates it.
- **Open a pull request.** Run `/supergh:create-pr`. It reads `.github/pull_request_template.md`, resolves
  the linked issue from the branch name (`task.N` / `issue.N`), an argument, or the session context, and
  creates a **draft** PR titled `[#N] {issue-title}`.
- **Ask about the GitHub API.** Questions like "how do I add a sub-issue?" or "how do I resolve a review
  thread?" route to the `cli` reference, which answers which layer (`gh` subcommand, `gh api` REST, or
  `gh api graphql`) is correct - without executing anything.

## Skills

| Skill | Role |
| --- | --- |
| `commit` | Haiku fork, routed automatically - the only path to a commit in this plugin. Gathers the change context, authors the Conventional Commits message, stages and commits via a self-verifying script, then confirms HEAD moved. Never branches. |
| `create-issue` | User command (`/supergh:create-issue`) - interactive, template-driven GitHub issue creation via `gh issue create`, with a tolerant follow-up PATCH for the issue type. |
| `create-pr` | User command (`/supergh:create-pr`) - interactive, template-driven draft PR creation via `gh pr create --draft`, with base-branch and open-PR pre-checks. |
| `cli` | Reference only, never executes: which layer a GitHub operation needs, plus auth and scopes, issue types, Projects v2, sub-issues, Discussions, PR review threads, pagination and error handling. |
| `cli-executor` | Fork - runs ONE fully-specified gh / REST / GraphQL operation out of the main context and returns a single tagged line. Guards every GraphQL mutation against the silent-200 error case. Invoked by another skill, never directly. |
