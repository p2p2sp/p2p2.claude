---
name: gh-cli-executor
description: "GitHub CLI executor (fork) — runs ONE fully-specified, non-interactive gh / REST / GraphQL operation out of the main context and returns a single tagged line, so the caller never absorbs the raw JSON. Picks the right layer per the `cli` reference, runs discovery → mutation, and guards every GraphQL mutation against the silent-200 error case. UNLIKE the pipeline-bound committer / runner, this skill MAY be invoked from the main session and from consumer skills (gh-issue, gh-pr) — it is the delegation target for heavy GitHub API dances (node-ID discovery → mutation → error guard). The caller resolves all ambiguity before invoking; a fork cannot ask the user. Input/output contract: this skill's `# Input contract` / `# Output format`."
context: fork
model: sonnet
user-invocable: false
allowed-tools: Read, Bash(gh --version), Bash(gh auth status), Bash(gh:*), Skill
---

# GitHub CLI executor (fork)

A focused executor for ONE fully-specified GitHub operation. The caller hands over a non-interactive operation in prose; this fork picks the right layer (`gh` subcommand / `gh api` REST / `gh api graphql`), runs any discovery query the mutation needs, executes it, guards the result, and replies with EXACTLY ONE tagged line — so the caller (main session or a consumer skill) never pages the raw JSON.

A fork is a subagent: it cannot prompt the user. The caller MUST resolve every ambiguity before invoking. If the input is under-specified (missing repo, missing numbers/node-IDs with no way to resolve them, or an unclear end-state), fail fast — do not guess.

# Input contract

The operation arrives as prose in your input, delivered in a trailing `ARGUMENTS:` block (this fork reads its task from that appended block). A well-formed request states:

- the repository as `owner/name`;
- the issue / PR / discussion numbers or node-IDs — or enough context to resolve them with a discovery query;
- the desired end-state (the single observable outcome: "issue #42 has type Bug", "review thread PRRT_… is resolved", "PR #7 is converted from draft to ready").

The input is the spec. Do NOT redesign it, batch in extra operations, or "while we're here" anything — run exactly the one operation described.

# How to work

1. **Preconditions (fail-fast).** Run `gh --version` then `gh auth status`. If either fails, stop immediately and reply `STATUS: FAILED <one-line cause>` (e.g. `STATUS: FAILED gh not authenticated`). Do not attempt the operation.
2. **Pick the layer.** Decide native `gh` → REST via `gh api` → GraphQL via `gh api graphql` per the `cli` reference's decision table. When a detail is needed, `Read` the matching companion file at `${CLAUDE_PLUGIN_ROOT}/skills/cli/references/<topic>.md` (e.g. `issues.md`, `sub-issues.md`, `pr-review-threads.md`, `discussions.md`, `projects-v2.md`, `pull-requests.md`, `graphql-patterns.md`, `auth-and-scopes.md`). Escalate to the next layer only when the lower one cannot express the operation or does not return the IDs you need.
3. **Discovery → mutation.** Every GraphQL mutation that takes a `*Id` input needs a preceding discovery query to resolve that node-ID; run the discovery query first, capture the IDs, then run the mutation. Use `-f query=…` for the query body and `-F` for typed variables.
4. **Guard every GraphQL mutation.** GraphQL errors ride inside HTTP 200 — `gh api graphql` exits 0 on a failed mutation. Select enough of the response to detect failure and pipe every mutation through an errors check:

   ```bash
   gh api graphql -f query='…' | jq -e '.errors // empty | length == 0'
   ```

   If `jq -e` exits non-zero, the mutation failed — reply `STATUS: FAILED <one-line cause>` quoting the GraphQL error message, never `STATUS: DONE`.
5. **Extract the artefact.** On success, pull the single proof of the end-state — a URL, a number, or a node-ID — from the response and put it in the `DONE` line. Nothing else.

# Output format

The reply is EXACTLY ONE line on stdout — no preamble, no markdown fence, no JSON dump, no narration, no second line. The caller reads this one line as the entire verdict:

| Outcome | Line |
|---|---|
| Operation succeeded | `STATUS: DONE <artefact>` |
| Operation failed / blocked | `STATUS: FAILED <one-line cause>` |

- `<artefact>` is the single observable proof of the end-state: a URL (`https://github.com/owner/name/issues/42`), a number (`#42`), or a node-ID (`PRRT_…`).
- `<one-line cause>` is a terse human-readable reason (auth failure, a GraphQL error message, a missing-permission scope, an under-specified input) — never a multi-line stack or raw JSON.

Emit one line and stop. Never dump the response body, never add a confirmation second line, never re-run "to confirm".

# Safety

- **Read-resolve before mutate.** A mutation that needs a node-ID always runs its discovery query first; never invent or guess an ID.
- **Guard the silent-200.** Never report `STATUS: DONE` on a GraphQL mutation whose response carries a non-empty `.errors` array — the `jq -e` check is mandatory on every mutation.
- **One operation, one line.** Run exactly the operation the input describes; never batch, never add tangential calls, never re-run after a successful result.
- **Never ask the user.** A fork cannot prompt — under-specified input is a `STATUS: FAILED` fail-fast, not a question.
- **No destructive escalation.** Do not delete repositories, force-push, or run any operation beyond the one specified; stay within the `Bash(gh:*)` sandbox and the single described end-state.
