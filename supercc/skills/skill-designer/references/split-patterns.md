# Split patterns

Read when the responsibility check fails or the request is a split. Pick the pattern matching the shape of the concerns.

## Non-overlapping branches

N modes with disjoint instructions are N responsibilities. Only the branch actually taken may reach the LLM.

- Heavy branches: one `context: fork` sub-skill per branch. The entry skill resolves the branch and dispatches it via the `Skill` tool, passing resolved inputs as args.
- Parsable selector: a deterministic router script reads the selector from `$ARGUMENTS` and prints only the chosen playbook; the entry skill `!`-injects its output. Other branches never enter context.
- Choose the script when a parsable argument selects the branch; choose forks when each branch is heavy work that also benefits from running out of context.

## Interactive skill

`AskUserQuestion` runs only in the main session, so asking plus heavy work pins the whole body to the main context for the whole session.

- Entry skill (main context): asks every question, resolves all ambiguity, hands off. Keep it small.
- Fork worker (`context: fork` + `user-invocable: false`): takes resolved inputs, does the heavy work, never asks the user.
- Hand off via args: short fields inline, large or multiline content as a PATH.

## Co-occurring concerns

When concerns can apply to the same task at once (style, consistency, links over one editing job), neither a monolith nor a shared dispatcher fits.

- One specialist skill per concern, each with its own `description:` trigger.
- Several fire independently for the same task. Each stays inside its own context budget.

## Locate-then-change over a large set

Never scan the repo in the main context.

- Fan out forks pinned to a cheap `model:` in parallel (an unpinned fork runs on the session model), each locating or scoring one file or shard. Each returns one compact tagged line (path + verdict), never file dumps.
- Gate and rank hits with a deterministic script, then dispatch expensive frontier workers only into the located shards.
- Main context keeps the shard list, never the search. Token cost stays flat as the repo grows.
