<!-- MIRROR: the 4 "What to check" dimensions + the 3-bucket Critical/Important/Minor severity
model below are a whole-plan adaptation of `superdev/skills/orchestrator/agents/rubric-task-review.md`
(its "What to check (the 5 dimensions)" + "Severity buckets" sections, ~lines 133-167) — that file is the
PRIMARY sync source: if its dimension criteria or severity buckets change, re-sync them here. No lint catches
drift. `superdev/shared/rubric.md` is RELATED but NOT an equal sibling — it is the Deliverable-completeness
rubric for `agent-plan-auditor`, a 2-bucket CRITICAL/Note model with no "dimensions" section; do not sync
against it. -->

# Code-review rubric (whole-plan quality lenses)

The shared rubric for the four whole-plan quality lenses invoked in parallel by `agent-final-reviewer`:
`agent-code-quality-auditor`, `agent-architecture-auditor`, `agent-testing-auditor`,
`agent-production-readiness-auditor`. Each lens applies EXACTLY ONE dimension below to the cumulative plan
diff; it does not touch the other three. `agent-plan-auditor` (Plan alignment) and `agent-runner` (full
suite) are separate lenses with their own contracts — not covered here.

## Reviewed scope — the changed hunks only

- The reviewed change is the `Diff file:` patch (`git diff <base>..HEAD` for the whole plan), materialized by
  the orchestrator. `Read` it: every `+`/`-` hunk is the plan's work; the surrounding code is pre-existing
  CONTEXT, not under review.
- Raise findings ONLY on lines inside the patch's hunks. A problem on an unchanged line is pre-existing — at
  most a `## Notes` aside, never a blocking finding.
- `Grep`/`Glob`/`Read` whole files only to UNDERSTAND a hunk (the surrounding function, the type it returns, a
  sibling using the same pattern) or to read conventions — never to hunt for issues outside the patch.
- Cite every finding with a `path:LINE` that appears in the patch.

## False-positive discipline (drop these — they are not findings)

- Pre-existing issues — anything on a line not in the patch.
- Something that looks like a bug but is not (verify the control flow before flagging).
- Pedantic nitpicks a senior engineer would not raise.
- Anything a linter / type-checker / compiler / formatter would catch (missing imports, type errors, style,
  newlines) — assume CI runs them; `agent-runner` is the execution gate.
- A documented convention the code explicitly silences with a rule-sanctioned marker (e.g. a lint-ignore the
  project's rules permit) — honor the rule.
- A change that is plausibly the intended behavior of this plan, even if it alters prior behavior.
- A general code-smell with no concrete, in-hunk consequence you can name.

When unsure whether something is real, default to NOT raising it; a noisy gate is worse than a missed nit.

## Severity buckets

Three buckets. Each lens reports its findings under these headings; the lens verdict is keyed to Critical
only (see "Lens verdict").

- **Critical** — an in-hunk defect that genuinely blocks shipping the plan: a real bug / data-loss / security
  hole introduced by the change, or (Testing lens) a gate test that asserts nothing real / cannot be trusted.
  Concrete, reproducible, cited at a patch `path:LINE`.
- **Important** — a should-fix the change would be better without: an in-hunk gap in error handling, an
  unhandled edge case, a missing back-compat consideration. Real, but not ship-blocking on its own.
- **Minor** — style, optimization, doc polish, a broader recommendation. Never blocks.

A cross-module / out-of-patch concern, however valid, is a `## Notes` item — never Critical or Important.

## Lens verdict (the `STATUS:` line)

- `STATUS: FAIL` — the lens found ≥1 **Critical** in its dimension.
- `STATUS: PASS` — no Critical (Important and/or Minor may still be present and ARE reported; they do not flip
  the lens to FAIL).

`agent-final-reviewer` synthesizes the six lens verdicts: the plan is a no-go (`STATUS: FAIL`) when
`agent-plan-auditor` FAILs, or `agent-runner` ∈ {FAIL, ERROR, TIMEOUT}, or any quality lens returns FAIL (≥1
Critical). Important + Minor findings always reach the written report (the `## What to fix` list) but never
flip the headline.

## What to check — the four dimensions (each lens owns ONE)

Apply only your own dimension to the patch's hunks.

1. **Code quality** (`agent-code-quality-auditor`) — separation of concerns, error handling, type safety
   where the language supports it, DRY without premature abstraction, edge cases in the changed logic.
   → Critical (real in-hunk bug / unhandled error that loses or corrupts data) · Important (in-hunk gap: an
   unhandled edge case / error path the change should cover) · Minor → `## Notes` (style, micro-optimization).
2. **Architecture** (`agent-architecture-auditor`) — sound design of the introduced structure, reasonable
   scalability / performance, security of the change, clean integration with the surrounding code it touches.
   → Critical (in-hunk security hole / data-loss design / a seam that breaks the surrounding contract) ·
   Important (in-scope design gap that should be reshaped) · `## Notes` (cross-module integration concern
   outside the patch).
3. **Testing** (`agent-testing-auditor`) — the change's tests verify real observable behavior (not the mock),
   cover the edge cases / failure modes the changed logic introduces, include integration coverage where the
   change crosses a real seam, and avoid the test anti-patterns (tautological / no-assertion / self-mocking SUT
   / conditional test logic / asserting on logs / order dependence). Do NOT re-run tests — `agent-runner` owns
   execution; this lens judges test PRESENCE + QUALITY in the patch.
   → Critical (a gate test that asserts nothing real or cannot be trusted; a changed branch / failure mode with
   no test) · Important (an in-hunk test-quality issue worth fixing) · `## Notes` (a coverage gap beyond what
   the change introduced).
4. **Production readiness** (`agent-production-readiness-auditor`) — migration / backward-compatibility when
   the change alters a schema / contract / public surface, documentation for what the change introduces, and
   the absence of obvious shipping bugs in the changed code.
   → Critical (an obvious shipping bug / a breaking change with no migration or back-compat path) · Important
   (in-scope readiness gap: missing migration note, undocumented new surface) · `## Notes` (broader,
   out-of-patch readiness observation).

## Per-lens output (each lens returns this)

```
STATUS: PASS | FAIL
Summary: <one line — the dimension's bottom line>

## Critical
- [<short tag>] <concrete in-hunk problem> — `path/to/file.ext:LINE`
  Why: <one line — the consequence> · Fix: <one line — concrete direction; omit when obvious>
## Important
- [<short tag>] <should-fix in-hunk problem> — `path/to/file.ext:LINE`
  Why: <one line> · Fix: <one line>
## Notes
- <Minor / cross-module / out-of-patch observation> — `path/to/file.ext:LINE`
```

Omit any of the three headings that has no entry — never emit an empty heading. Keep the whole reply under
~100 lines; concrete entries only, no padding. Every Critical / Important bullet cites a `path:LINE` inside
the patch on its first line.
