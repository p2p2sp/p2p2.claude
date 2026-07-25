# GitHub Discussions

**GraphQL only.** REST has zero Discussions endpoints. `gh` has no `discussion` subcommand. Every read or write goes through `gh api graphql`.

## Operations

| Operation | Mutation / Query |
|---|---|
| List discussion categories of a repo | `repository.discussionCategories` |
| List discussions | `repository.discussions` |
| Read a discussion | `repository.discussion(number:)` |
| Create discussion | `createDiscussion` |
| Update discussion | `updateDiscussion` |
| Delete discussion | `deleteDiscussion` |
| Add a comment | `addDiscussionComment` |
| Mark a comment as the answer | `markDiscussionCommentAsAnswer` |
| Add reaction (👍, ❤️, etc.) | `addReaction` (yes, even on discussions - REST `/reactions` does not cover Discussions) |

## Discovery - needed every time

`createDiscussion` requires `repositoryId` and `categoryId`. Both are node IDs, not numbers:

```bash
gh api graphql -F owner="$O" -F name="$R" -f query='
  query($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      id
      discussionCategories(first: 25) {
        nodes { id name slug emoji isAnswerable }
      }
    }
  }'
```

Take `.repository.id` as `$REPO_ID` and the `id` of the chosen category as `$CAT_ID`.

## Create a discussion

```bash
gh api graphql \
  -F repoId="$REPO_ID" \
  -F catId="$CAT_ID" \
  -f title="Q1 planning" \
  -f body="…markdown body…" \
  -f query='
    mutation($repoId: ID!, $catId: ID!, $title: String!, $body: String!) {
      createDiscussion(input: {
        repositoryId: $repoId,
        categoryId: $catId,
        title: $title,
        body: $body
      }) {
        discussion { number url }
      }
    }'
```

The response gives you the discussion number and URL for follow-up.

## Add a comment / mark as answer

```bash
gh api graphql -F discId="$DISCUSSION_NODE_ID" -f body="…" -f query='
  mutation($discId: ID!, $body: String!) {
    addDiscussionComment(input: { discussionId: $discId, body: $body }) {
      comment { id }
    }
  }'
```

Take the returned `comment.id` and, if appropriate, mark it as the answer:

```bash
gh api graphql -F commentId="$COMMENT_NODE_ID" -f query='
  mutation($commentId: ID!) {
    markDiscussionCommentAsAnswer(input: { id: $commentId }) {
      discussion { number }
    }
  }'
```

## Auth

Repo Discussions need the same scope as repo content access (`repo` for private repos, or fine-grained `Discussions: Write`). See `auth-and-scopes.md`.

## Sources

- Discussions GraphQL guide: <https://docs.github.com/en/graphql/guides/using-the-graphql-api-for-discussions>
- GraphQL - createDiscussion: <https://docs.github.com/en/graphql/reference/mutations#creatediscussion>
