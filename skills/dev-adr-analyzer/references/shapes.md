# dev-adr-analyzer — output shapes

The reply shapes this fork-skill emits, plus the lean ADR body format they embed. This is the single source of truth for those templates; the skill body reads it once at invocation and fills the matching shape verbatim. For the stdout contract (`^STATUS: (ADR|NO-ADR)$`, inline return — no `Report path:` handoff), see the skill's `# Output format`.

## Lean ADR body format

The ADR body inside the `STATUS: ADR` shape below follows this format. Fill every section, no placeholders.

```markdown
# (YYYY-MM-DD) Title in sentence case

## Context
- The issue motivating this decision, and any context that influences or constrains the decision.
- Describe all known forces at play.
- Consider architectural drivers:
  - Qualitative attributes: scalability, extensibility, security, auditability, configurability, observability
  - Project restrictions: time, budget, knowledge
  - Conventions: company-wide rules & conventions; other forces (e.g. choosing technology to stay competitive)

## Decision
The change we are proposing or have agreed to implement. Be specific about concrete artifacts, file locations, and naming so implementers can act on it.

## Consequences
List all known consequences — positive and negative. Go beyond the obvious; be honest about the trade-offs accepted.
```

The body carries no status line and no ADR number in the heading — the number lives only in the filename and the index. There is no `Rules` section and no derivation of `.claude/rules/*` (that machinery is intentionally out of this format).

## Reply shapes

**No-ADR shape:**

```
STATUS: NO-ADR

## Verdict
<one sentence — the posture opt-out quoted, or why the change is not architectural>
```

**ADR shape** (the `orchestrator` appends the fenced ADR block + the directive verbatim to the plan copy under an `## Architectural decisions (ADR)` heading, where the `decomposer` materializes it as a `tests-none` task):

```
STATUS: ADR

## Verdict
<one sentence naming the architectural decision captured>

## ADR-NNNN — <title>

​```markdown
# (YYYY-MM-DD) Title in sentence case
## Context
...
## Decision
...
## Consequences
...
​```

## Deferred-write directive
During plan implementation, write `ADR-NNNN` as a `tests-none` task with these steps, verbatim:
- create `.docs/adr/` and seed `.docs/ADR.md` if missing (header `# Architecture Decision Records` + table `| ADR | Title | Date |`);
- save the ADR body above to `.docs/adr/ADR-NNNN-<slug>.md`;
- add one index row to `.docs/ADR.md`, sorted by number ascending: `| [ADR-NNNN](adr/ADR-NNNN-<slug>.md) | <title> | <YYYY-MM-DD> |`.
- `## Touches` for that task: `.docs/adr/ADR-NNNN-<slug>.md` (docs) + `.docs/ADR.md` (docs).
```

For multiple decisions, emit one `## ADR-NNNN — <title>` block (with its own fenced body) plus one matching `## Deferred-write directive` per decision.
