# Synthesis - verify, dedupe, score

Turns many candidate detective reports of mixed quality into a trustworthy, severity-ranked findings list. Cardinal rule: never file an unverified finding.

## Detective report schema

Each detective writes one file to `.temp/superfix/<run-id>/reports/<rank>-<slug>.md`:

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

The most common false positive: early in a session an agent edits the tree (a debug bypass, a print, a relaxed check), the context gets compacted a few times, and later it "finds" the very thing it introduced. Defeat this by replaying every claim in a fresh checkout, in a subagent instance that never saw the investigation.

`scripts/worktree.sh` owns that checkout. It takes the run's `Target root:` and the caller's own reserved worktree path, verifies its own result, and handles every recovery internally, so no caller branches on a git error:

```bash
sh <worktree-script> add <target-root> <verify-worktree-path>
# replay the PoC there
sh <worktree-script> remove <target-root> <verify-worktree-path>
```

The worktree holds the whole repository, so an audited subtree sits under it at the target's own relative path. `WORKTREE_FAILED` means no clean checkout was possible and the claim cannot be settled: `NO FINDING` for a detective, `INCONCLUSIVE` for a critic.

For memory-corruption work, use a real oracle: build with ASan in the clean worktree and treat an ASan crash on the PoC input as confirmation. A crash oracle is worth more than any amount of agent self-assessment.

## Critic verdict schema

The `critic` agent replays one detective's claim on a fresh checkout and returns a tagged verdict in its final message - it writes no file:

```
VERDICT: VERIFIED | REFUTED | PARTIALLY VERIFIED | INCONCLUSIVE
COMMAND: <the exact command run to test the claim>
OBSERVED: <the actual output/result seen>
SEVERITY: <the critic's independent 0-10 judgement, or "unchanged">
```

Fold each verdict into `findings.md` like this:

- VERIFIED - keep the finding as filed; `CONFIDENCE` stays as filed. If the critic's independent `SEVERITY` names a number, adopt it as the filed severity and note the adopted value in the entry; if the critic returns `unchanged`, keep the detective's `SEVERITY`.
- PARTIALLY VERIFIED - keep only the sub-claims the critic's `OBSERVED` confirms, drop the rest; `CONFIDENCE` stays as filed. Apply the critic's independent `SEVERITY` the same way as for VERIFIED; when the critic gives no number at all, lower `SEVERITY` yourself to match the narrower, confirmed scope.
- REFUTED - drop the finding entirely. It does not appear in `findings.md`, not even at low severity.
- INCONCLUSIVE - keep the finding; `SEVERITY` stays as filed. Lower `CONFIDENCE` by one step (high -> medium, medium -> low); an entry already at low stays low. Name the missing oracle alongside the entry so the gap reads as honest coverage.

`INCONCLUSIVE` is the required verdict whenever no oracle can settle the claim - never let a critic invent a pass or fail to avoid it.

## Deduplicate

Group reports by root cause, not by file - the same defect (a shared unchecked helper, say) often surfaces from several entry points. Merge them into one finding, list all affected locations, keep the highest severity and the clearest PoC.

## Severity

Give every surviving finding a `SEVERITY: N.N` on its own line (0-10) and emit the entries already in descending severity order. The number is a rough internal ranking signal, not a published CVSS, but it must be consistent enough to sort by:

- 9-10 unauthenticated RCE, full account takeover, trivial data breach
- 7-8 authenticated high-impact, or memory corruption with a plausible path
- 4-6 real bug, limited reach or needs preconditions
- 1-3 minor, hardening, quality

## findings.md (final output)

```markdown
# Findings - <run-id> (<job>)
Swept N files · M hotspots investigated · K confirmed findings · J fronts still open.

## 1. <title>
SEVERITY: N.N
CONFIDENCE: <low|medium|high>
LOCATION ... CLASS ... root cause ... repro ... fix sketch ...

## 2. ...

## Coverage notes
- Areas given only a shallow pass: ...
- Open fronts handed to the next wave: ...
```
