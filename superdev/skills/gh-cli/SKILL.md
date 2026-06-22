---
name: gh-cli
description: GitHub CLI (gh) reference — when to use native `gh` subcommands, when `gh api` (REST), and when `gh api graphql`. Covers auth & scopes, issue types (REST, not CLI — `gh issue create` has no `--type`), Projects v2, sub-issues, GitHub Discussions, PR review threads, pagination, error handling. Must use this skill whenever an agent or skill needs to call `gh`, `gh api`, or `gh api graphql` — before writing a command from memory, check here which layer (CLI / REST / GraphQL) is correct and whether the field/mutation exists. Triggers include "sub-issue", "review thread", "discussion API", "createDiscussion", "addSubIssue", "resolveReviewThread", "gh pr create". Do NOT execute gh commands directly from this skill — this is a reference skill; execution belongs to consumer skills (gh-issue, commit, gh-pr, …). Trigger applies in any language and to descriptive phrasing too.
user-invocable: false
---

# GitHub CLI reference

Single source of truth for **which layer** (`gh` subcommand / `gh api` REST / `gh api graphql`) is the right tool for a given GitHub operation. Companion references under `references/` give the verbatim snippets.

## Default heuristic

Try **native `gh` → REST via `gh api` → GraphQL via `gh api graphql`**. Escalate to the next layer only when the lower one cannot express the operation, does not return the IDs you need, or the API physically does not exist there.

## Decision table

| Capability | Primary path | Reference |
|---|---|---|
| Create / edit / view issues, PRs, releases, gists, repos | native `gh` | `references/issues.md`, `references/pull-requests.md` |
| Apply labels / milestones / assignees during create | native `gh` flags | `references/issues.md`, `references/pull-requests.md` |
| Manage label & milestone **definitions** (CRUD) | REST via `gh api` | `references/issues.md` |
| **Set issue type** on an issue | REST `gh api .../issues -f type=...` / `PATCH .../issues/{n}` | `references/issues.md` |
| Manage org issue type **definitions** | REST `/orgs/{org}/issue-types` | `references/issues.md` |
| Add issue/PR to Projects v2, set most fields | `gh project item-add` / `gh project item-edit` | `references/projects-v2.md` |
| Projects v2 single-select option mgmt, item reorder, bulk ops | GraphQL `updateProjectV2*` | `references/projects-v2.md` |
| Sub-issues (add / remove / reorder) | REST `/sub_issues` (preferred) or GraphQL `addSubIssue` | `references/sub-issues.md` |
| GitHub Discussions (anything) | **GraphQL only** | `references/discussions.md` |
| Reactions on issues / comments / releases | REST via `gh api` | (covered in `references/issues.md`) |
| Reactions on Discussions / Discussion comments | GraphQL only | `references/discussions.md` |
| **Resolve** PR review threads | GraphQL only | `references/pr-review-threads.md` |
| Reply to a specific PR review thread | REST `/pulls/{n}/comments/{id}/replies` or GraphQL | `references/pr-review-threads.md` |
| Saved replies | GraphQL only | (`viewer.savedReplies`, `createSavedReply`) |
| Repo custom properties / rulesets / branch protection | REST via `gh api` | (none yet — escalate from this list when needed) |
| GraphQL invocation, pagination, error handling | n/a — pattern | `references/graphql-patterns.md` |
| Auth & scopes (CLI and CI) | n/a — pattern | `references/auth-and-scopes.md` |

## Operational must-knows

- **`gh issue create` has no `--type` flag.** Setting issue type requires REST — see `references/issues.md`. A skill that "sets the type" via `--type` is silently a no-op.
- **GraphQL errors ride inside HTTP 200.** `gh api graphql` exits 0 on a failed mutation. Select enough of the response to detect failure and guard every mutation with a `jq -e` errors check — see `references/graphql-patterns.md`.
- **`--paginate` only works when the query is written for it.** Needs `$endCursor` + `pageInfo { hasNextPage endCursor }` + `after: $endCursor` on every paginated connection — see `references/graphql-patterns.md`.
- **Mutating GraphQL needs node IDs.** Every `*Id` input requires a preceding discovery query; the mutation snippets in `references/*.md` are paired with theirs — copy both.
- **Projects v2 needs the `project` token scope.** Issue-type org mutations need `admin:org` (classic PAT) or the fine-grained `Issue types` permission — see `references/auth-and-scopes.md`.
- **REST and GraphQL have separate rate-limit buckets.** GraphQL is metered by query cost (points). For bulk sub-issue / project / review-thread work, one GraphQL request with aliases beats N REST calls.

## For consumer skills

This skill is **reference-only** — it owns the *what to call* / *which layer* decision but never executes `gh`. A consumer skill must:

- declare its own `allowed-tools` sandbox — this reference widens nothing and does **not** authorise `Bash(gh:*)`; `Bash` access stays on the consumer, scoped to what its flow actually needs;
- copy the matching snippet (with its discovery query) from `references/*.md` into its flow;
- credit this skill in prose ("see the `cli` skill") rather than duplicate the rationale or source links.

Don't hand a skill a `gh` command from memory without checking the matching reference here — GitHub's surface evolves (issue types are REST-supported, not a `gh issue create` flag; sub-issues are REST-supported with no native `gh` subcommand; PR thread resolve stays GraphQL-only); what "needs GraphQL" may already be REST, and vice versa.

For interactive issue creation see the **gh-issue** skill, for commits the **commit** skill, for PR creation the **gh-pr** skill. To execute a fully-specified gh/REST/GraphQL operation out of the main context, hand it to the **gh-cli-executor** skill.
