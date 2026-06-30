# superbuild-docs — output shapes

The reply shapes this fork-skill emits, plus the on-disk formats it writes to `.superdev/docs/`. Single source of truth for those templates; the skill body reads it once at invocation and fills the matching shape verbatim. For the stdout contract (`^STATUS: (DOCS|NO-DOCS)$`, inline return), see the skill's `# Output format`. The recorder writes the index + shard file(s) itself; the reply is a verdict + a hand-off, not a deferred-write directive.

## `.superdev/docs/index.md` — slice map

The entry point. One row per slice, sorted by slice name ascending. Seed it on the first run (when `.superdev/docs/` is absent) with the header + table head, then add rows.

```markdown
# Project documentation (as-built)

Agent-facing record of what the application does today. One row per slice; each links to its shard.

| Slice | File | Scope |
| --- | --- | --- |
| Auth | auth.md | Login, session lifecycle, password reset |
| Billing | billing.md | Subscription plans, invoices, dunning |
```

- Slice = a domain / vertical slice / module — the same boundary the codebase uses, not one row per file.
- File = shard filename relative to `.superdev/docs/` (kebab-case, `<slice>.md`).
- Scope = one sentence naming the slice's capabilities; never prose.

## Shard format — `.superdev/docs/<slice>.md`

One file per slice. Fill every section from the actual delta + code; no placeholders, no TBD.

```markdown
# <Slice name>

## Capabilities
- <outcome statement — what the app does, present tense, user/behaviour level>

## Acceptance criteria
- <declarative outcome the behaviour guarantees — observable, checkable; style as in superspec>

## Contracts
- <key data shape / API endpoint / message / invariant the slice exposes or upholds>

## Anchors
- code: <repo-relative path(s) implementing this slice>
- tests: <repo-relative path(s) covering it>
```

- Capabilities + Acceptance criteria are agent-facing behavioural truth (the "WHAT"), not how-built prose (that is CLAUDE.md) and not why (that is ADR).
- Anchors are pointers only — never paste code.
- Keep each shard narrow: split into a new slice rather than letting one shard sprawl across unrelated domains.

## Recording a FAIL final-review (mandatory)

When the injected final-review verdict is FAIL, every shard the run touches (and any new shard) MUST carry, directly under its `# <Slice name>` heading, exactly this line:

```
> Reconciled from a run whose final review returned FAIL (<YYYY-MM-DD>) — treat as provisional, not authoritative as-built.
```

On a PASS verdict, write no such line (and remove a stale one if a later PASS run reconciles the same shard). A docs entry written after a rejected run must never be silently asserted as authoritative.

## Reply shapes

**No-DOCS shape** (nothing was written to disk):

```
STATUS: NO-DOCS

## Verdict
<one sentence — why no reconciliation was needed (empty/zero delta), or the malformed-input reason>
```

**DOCS shape** (the recorder has already written the index + shard file(s); the `superbuild` commits them by passing the `Commit-subject:` line verbatim to `commit-docs.sh`):

```
STATUS: DOCS

## Verdict
<one sentence naming the slice(s) reconciled>

## Written
- .superdev/docs/index.md
- .superdev/docs/<slice>.md
<one shard line per touched slice; the index line appears once>

Commit-subject: docs(spec): reconcile <slice> — <short note>
```

For several slices, list every written shard under `## Written` and name them in the single `Commit-subject:` line — `Commit-subject: docs(spec): reconcile auth, billing`. The subject is always `docs(spec): …` (scope `spec` distinguishes it from `docs(adr): …`).
