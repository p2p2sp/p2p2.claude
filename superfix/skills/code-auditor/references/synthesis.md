# Synthesis - verify, dedupe, score, and open new fronts

The detective sweep produces many candidate reports of mixed quality. This phase turns them into a trustworthy, severity-ranked findings list. The cardinal rule: **never file an unverified finding.** Cheap to generate, expensive to be wrong.

## Detective report schema

Each detective writes one file to `.temp/code-reviewer/<run-id>/reports/<rank>-<slug>.md`:

```markdown
# <short title>
LOCATION: path/to/file.ext:Lstart-Lend
CLASS: <bug class, e.g. SQL injection / use-after-free / missing authz / N+1>
ENTRY: <the hotspot it started from>

## Root cause
<2-4 sentences: what is actually wrong and why.>

## Reproduction
<concrete steps or a runnable PoC: input, command, expected vs actual.>

## Verification
<how it was confirmed on a CLEAN checkout - oracle output, crash trace,
failing request, etc.>

## Suggested fix (sketch)
<not a PR - just the shape of the fix and what it must not break.>

CONFIDENCE: <low | medium | high>
SEVERITY: <0.0-10.0>
```

If nothing real survives, the detective writes a file whose entire body is `NO FINDING` plus one line on what it checked. Keep these - they are coverage evidence.

## Clean-checkout verification (anti-self-poisoning)

The most common false positive: early in a session an agent edits the tree (adds a debug bypass, a print, a relaxed check), the context gets compacted a few times, and later it "finds" the very thing it introduced. Defeat this by verifying every finding in a **fresh, untouched checkout**, ideally in a separate subagent instance that never saw the investigation:

```bash
git worktree add /tmp/verify-<rank> <commit-or-HEAD>
# replay the PoC against /tmp/verify-<rank>; if it does not reproduce there,
# the finding is an artifact - drop it.
git worktree remove /tmp/verify-<rank>
```

For memory-corruption work, use a real oracle: build with ASan in the clean worktree and treat an ASan crash on the PoC input as confirmation. A perfect crash oracle is worth more than any amount of agent self-assessment.

## Deduplicate

Group reports by root cause, not by file - the same defect (e.g. a shared unchecked helper) often surfaces from several entry points. Merge them into one finding, list all affected locations, keep the highest severity and the clearest PoC.

## Severity scoring (greppable)

Give every surviving finding a `SEVERITY: N.N` on its own line (0-10). The exact number is a rough, internal ranking signal - not a published CVSS - but it must be consistent enough to sort by. Rough anchors:

- **9-10** unauthenticated RCE / full account takeover / trivial data breach
- **7-8** authenticated high-impact, or memory corruption with a plausible path
- **4-6** real bug, limited reach or needs preconditions
- **1-3** minor / hardening / quality issue

Rank by severity descending. Because the tag is on its own line, the final sort is a one-liner:

```bash
grep -rH '^SEVERITY:' .temp/code-reviewer/<run-id>/reports | sort -t: -k3 -rn
```

## findings.md (final output)

```markdown
# Findings - <run-id> (<job>)
Swept N files · M hotspots investigated · K confirmed findings · J fronts still open.

## 1. <title>  -  SEVERITY 9.2  (confidence: high)
LOCATION ... CLASS ... root cause ... repro ... fix sketch ...

## 2. ...

## Coverage notes
- Areas given only a shallow pass: ...
- Open fronts handed to the next wave: ...
```

## Open new fronts (Phase 6 loop)

Synthesis feeds the next iteration - this is what makes the workflow dynamic:

1. **Generalize a confirmed class.** A confirmed missing-authz / unchecked-length / unescaped-input finding becomes a *pattern*. Spawn a fresh scout wave whose job is "find this same pattern elsewhere," seeded with the confirmed example.
2. **Propagate impact.** Callers and importers of a confirmed-broken file inherit elevated Impact; re-sweep them at a lower threshold.
3. **Stop honestly.** End a run when new waves stop yielding top-right-corner hotspots, or the budget / coverage target is hit. Record what was NOT covered so the hotlist never reads as a false "all clear."
