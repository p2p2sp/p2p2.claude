# Synthesis - verify, dedupe, score, and open new fronts

The detective sweep produces many candidate reports of mixed quality. This phase turns them into a trustworthy, severity-ranked findings list. The cardinal rule: **never file an unverified finding.** Cheap to generate, expensive to be wrong.

## Detective report schema

Each detective writes one file to `.temp/code-reviewer/<run-id>/reports/<rank>-<slug>.md`:

```markdown
# <short title>
LOCATION: path/to/file.ext:Lstart-Lend
CLASS: <bug class, e.g. SQL injection / use-after-free / missing authz / N+1>
ENTRY: <the hotspot it started from - one path, or a pair `<path A> <-> <path B>` for an edge entry>

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

For an edge entry, the contract between the two endpoints is the first thing to check; `LOCATION` may name either endpoint or both, whichever carries the defect.

If nothing real survives, the detective writes a file whose entire body is `NO FINDING` plus one line on what it checked. Keep these - they are coverage evidence.

## Clean-checkout verification (anti-self-poisoning)

The most common false positive: early in a session an agent edits the tree (adds a debug bypass, a print, a relaxed check), the context gets compacted a few times, and later it "finds" the very thing it introduced. Defeat this by verifying every finding in a **fresh, untouched checkout**, ideally in a separate subagent instance that never saw the investigation. Reproduce the issue in the verification-worktree path you were given (never invent your own path). That worktree contains the whole repository, so an audited subtree sits under it at the target's own relative path:

```bash
git worktree add <verify-worktree-path> HEAD
# replay your PoC there; if it does not reproduce, it is an artifact - drop it.
git worktree remove --force <verify-worktree-path>
```

The replay leaves untracked artifacts (PoC files, build output) sitting in the worktree, which a bare
`git worktree remove` refuses to delete - always pass `--force`.

Recovery, if `git worktree add` fails:
- `fatal: ... is a missing but already registered worktree` -> run `git worktree prune`, then retry `git worktree add`.
- `fatal: '<verify-worktree-path>' already exists` -> run `git worktree remove --force <verify-worktree-path>`. If that succeeds, retry `git worktree add`. If it instead fails with `fatal: ... is not a working tree`, the directory is an orphaned leftover, not a registered worktree - remove it directly (`rm -rf <verify-worktree-path>`) and retry `git worktree add`.

Recovery, if `git worktree remove --force` still fails:
- `fatal: ... contains modified or untracked files` -> `--force` did not clear it; run `rm -rf <verify-worktree-path>`, then `git worktree prune`, then retry `git worktree add`.

For memory-corruption work, use a real oracle: build with ASan in the clean worktree and treat an ASan crash on the PoC input as confirmation. A perfect crash oracle is worth more than any amount of agent self-assessment.

## Critic verdict schema

The `critic` agent (`subagent_type: superfix:critic`) independently replays one detective's claim on a fresh
checkout and returns a tagged verdict in its final message - it writes no file:

```
VERDICT: VERIFIED | REFUTED | PARTIALLY VERIFIED | INCONCLUSIVE
COMMAND: <the exact command run to test the claim>
OBSERVED: <the actual output/result seen>
SEVERITY: <the critic's independent 0-10 judgement, or "unchanged">
```

Fold each verdict into `findings.md` like this:

- **VERIFIED** - keep the finding exactly as filed by the detective.
- **PARTIALLY VERIFIED** - keep only the sub-claims the critic's `OBSERVED` confirms; drop the rest and lower
  the `SEVERITY` to match the narrower, confirmed scope.
- **REFUTED** - drop the finding entirely. It does not appear in `findings.md`, not even at low severity.
- **INCONCLUSIVE** - keep the finding, lower its `CONFIDENCE` by one step (high -> medium, medium -> low), and
  name the missing oracle (what would have settled it) alongside the entry so the gap reads as honest coverage,
  not a silent gap.

`INCONCLUSIVE` is the required verdict whenever no oracle can settle the claim - never let a critic invent a
pass or fail to avoid it.

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
