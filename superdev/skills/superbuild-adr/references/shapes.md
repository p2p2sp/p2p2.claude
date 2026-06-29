# superbuild-adr — output shapes

The reply shapes this fork-skill emits, plus the lean ADR body format it writes to disk. This is the single source of truth for those templates; the skill body reads it once at invocation and fills the matching shape verbatim. For the stdout contract (`^STATUS: (ADR|NO-ADR)$`, inline return), see the skill's `# Output format`. The recorder writes the ADR file(s) + the `.superdev/ADR.md` index itself (Step 3); the reply is a verdict + a hand-off, not a deferred-write directive.

## Lean ADR body format

The body the recorder `Write`s to `.superdev/adr/ADR-NNNN-<slug>.md` follows this format. Fill every section, no placeholders.

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

The body carries no status line and no ADR number in the heading — the number lives only in the filename and the index. There is no `Rules` section and no derivation of `.claude/rules/*` (that machinery is intentionally out of this format). The `YYYY-MM-DD` in the heading is the date from the skill's **## Today's date (pre-injected)** block, stamped verbatim.

## Index row

Each recorded ADR adds one row to `.superdev/ADR.md`, sorted by number ascending:

```
| [ADR-NNNN](adr/ADR-NNNN-<slug>.md) | <title> | <YYYY-MM-DD> |
```

When `.superdev/ADR.md` does not yet exist, seed it first with the header `# Architecture Decision Records` and the table head `| ADR | Title | Date |` / `| --- | --- | --- |`, then add the row.

## Reply shapes

**No-ADR shape** (nothing was written to disk):

```
STATUS: NO-ADR

## Verdict
<one sentence — the posture opt-out quoted, or why the change is not architectural>
```

**ADR shape** (the recorder has already written the file(s) + index row(s); the `superbuild` commits them by passing the `Commit-subject:` line verbatim to `commit-adr.sh`):

```
STATUS: ADR

## Verdict
<one sentence naming the architectural decision(s) captured>

## Written
- .superdev/adr/ADR-NNNN-<slug>.md
- .superdev/ADR.md
<one ADR-file line per decision; the index line appears once>

Commit-subject: docs(adr): record ADR-NNNN — <title>
```

For multiple decisions, list every written ADR file under `## Written` and name each number in the single `Commit-subject:` line — `Commit-subject: docs(adr): record ADR-0007, ADR-0008`.
