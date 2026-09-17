## Runs
- grep -q '^name: e2e' superdev/skills/e2e/SKILL.md && grep -q '^disable-model-invocation: true' superdev/skills/e2e/SKILL.md && grep -q 'check-playwright.sh' superdev/skills/e2e/SKILL.md && grep -q 'superdev:e2e-writer' superdev/skills/e2e/SKILL.md && grep -q 'commit-task.sh' superdev/skills/e2e/SKILL.md -> exit 0

Added beyond Approach 1: `argument-hint` in the frontmatter (quoted - the value carries `: `, which
unquoted makes the line a YAML mapping). A user-invocable command whose argument is a labeled line needs
the hint the `phases` skill already sets the precedent for.

Approach 2 names `Launch:` / `Accounts:` as the handoff fallbacks; `Base:` is used the same way for the
base URL. `qa-format.md` (`## Handoff file`, first rule) states one rule over all three header lines.

Added beyond Approach 3: a `curl`-absent branch - the probe becomes `playwright-cli open <base-url>`, the
fallback `e2e-writer` (`## Generate` step 1) already carries. Without it the launch gate cannot run at all
on a host with no curl, and `## Loop` would dispatch against an application nobody confirmed was up.

Added beyond Approach 4: the dispatches are sequential, never two in flight - one running application,
and writers seed and clean shared data.

Added beyond Approach 4: the `e2e-writer` dispatch passes no `model:` / `effort:` (review-contract
`## Dispatch strength` - no parameter hands strength to the agent's own frontmatter, which pins opus/high).

UNDERSPECIFIED: the launch poll bound. Approach 3 says "up to a timeout" only. Decided: probe every 2
seconds up to 120 seconds, and the `retry with a longer timeout` answer doubles the previous bound with
the recipe left running.

UNDERSPECIFIED: what **abort** does in the second-FAIL question of failure mode 5. Decided: stop
dispatching but continue to `## Commit` with the IDs already processed. A spec already green carries its
`file` status line in the handoff, so every later run skips that ID - uncommitted, it would be committed
by nobody.

UNDERSPECIFIED: `<handoff title>` in Approach 5's commit message - the handoff format has a `Run:` line
and no title. Decided: the `Run:` value, the basename without `.e2e.md` when that line is absent.

UNDERSPECIFIED: where an operator-provided conventions value goes, the two labels that carry conventions
being path-valued. Decided: a directory rides as `rules:`, a file as `memory:`, replacing the host path
for that label - that path was silent on conventions or the question would not have been asked.

UNDERSPECIFIED: whether an ID this run skipped as already automated gets a `## Done` line. Decided: yes,
its `file <path>` line off the handoff; an ID an abort never reached gets none and lives in the summary
count instead.
