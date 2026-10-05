# Synthesis - verify, dedupe, score

Turns many candidate detective reports of mixed quality into a trustworthy, severity-ranked findings list. Cardinal rule: never file an unverified finding.

## Contents

- Detective report schema
- Claim sidecar schema
- Clean-checkout verification (anti-self-poisoning)
- Critic verdict schema
- Deduplicate
- Severity
- findings.md (final output)
- What the moderator reads

## Detective report schema

Each detective writes one file to `.temp/viber/code-auditor/<run-id>/reports/<rank>-<slug>.md`. It opens with a head block of six tagged lines, in exactly this order, so the whole pool can be ranked without opening a single report body:

```markdown
# <short title>
LOCATION: path/to/file.ext:Lstart-Lend
CLASS: <bug class, e.g. SQL injection / use-after-free / missing authz / N+1>
SEVERITY: <0.0-10.0>
CONFIDENCE: <low | medium | high>
ENTRY: <the hotspot it started from - one path, or a pair `<path A> <-> <path B>` for an edge entry>
```

Then the body: four sections in this order, each heading written at the start of its own line.

- `## Root cause` - 2-4 sentences: what is actually wrong and why.
- `## Reproduction` - concrete steps or a runnable PoC: input, command, expected vs actual.
- `## Verification` - how it was confirmed on a CLEAN checkout: oracle output, crash trace, failing request.
- `## Suggested fix (sketch)` - not a PR, just the shape of the fix and what it must not break.

For an edge entry, the contract between the two endpoints is the first thing to check; `LOCATION` may name either endpoint or both, whichever carries the defect.

If nothing real survives, the detective writes a file whose entire body is `NO FINDING` plus one line on what it checked. Keep these - they are coverage evidence.

## Claim sidecar schema

A detective that files a finding writes one more file next to its report, at `.temp/viber/code-auditor/<run-id>/reports/<rank>-<slug>.claim.md`. The sidecar is the claim with the reasoning stripped out, and it is the only thing the critic is ever given. Three parts, in this order, and nothing else:

1. `LOCATION: <the report's LOCATION line, verbatim>`
2. `CLASS: <the report's CLASS line, verbatim>`
3. One section headed `## Reproduce` (that heading at the start of its own line) carrying exactly three things:
   - the input - the exact file, request, argument or fixture the replay needs;
   - the command - the exact command line to run inside the clean checkout;
   - the observable symptom - one falsifiable line: an exit code, an output line, an HTTP status, a failing test name.

The sidecar never carries `CONFIDENCE`, never `SEVERITY`, never `ENTRY`, never a root-cause section, never a fix sketch, and not one sentence explaining why the code is wrong. A symptom the critic can observe, never a conclusion it can inherit: the reasoning stays in the report, where only the moderator sees it.

A `NO FINDING` report has no sidecar.

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

The `critic` agent settles one claim on a fresh checkout and returns a tagged verdict in its final message - it writes no file. It is given four things and no more: the claim sidecar path, the run's `job.md`, the worktree script path and its own reserved worktree path. It never gets the report path, so it never sees the detective's root cause, confidence or severity; a verifier that reads the discoverer's reasoning confirms that framing instead of testing it.

Its mandate is to refute the claim, not to confirm it: hunt for the reason the symptom is not a defect (a test fixture, an intended branch, a precondition the sidecar assumes but the code enforces) before and while replaying. `VERIFIED` is allowed only when the reproduction passed anyway, despite that attempt.

```
VERDICT: VERIFIED | REFUTED | PARTIALLY VERIFIED | INCONCLUSIVE
COMMAND: <the exact command run to test the claim>
OBSERVED: <the actual output/result seen>
SEVERITY: <the critic's independent 0-10 judgement, or "unchanged">
```

Fold each verdict into `findings.md` like this:

- VERIFIED - keep the finding as filed; `CONFIDENCE` stays as filed. If the critic's independent `SEVERITY` names a number, adopt it as the filed severity and note the adopted value in the entry; if the critic returns `unchanged`, keep the detective's `SEVERITY`.
- PARTIALLY VERIFIED - keep only the sub-claims the critic's `OBSERVED` confirms, drop the rest; `CONFIDENCE` stays as filed. Apply the critic's independent `SEVERITY` the same way as for VERIFIED; when the critic gives no number at all, lower `SEVERITY` yourself to match the narrower, confirmed scope.
- REFUTED - drop the finding entirely. It does not appear in `findings.md`, not even at low severity and not in the further-findings list.
- INCONCLUSIVE - keep the finding; `SEVERITY` stays as filed. Lower `CONFIDENCE` by one step (high -> medium, medium -> low); an entry already at low stays low. Name the missing oracle alongside the entry so the gap reads as honest coverage.
- No `VERDICT:` line at all (an empty final message, a crash, a timeout) is not a verdict, and it never silently drops the candidate. Dispatch that critic once more, with a fresh worktree path of its own. If the second run also comes back without a `VERDICT:` line, file the finding as `INCONCLUSIVE` under the rule above - `SEVERITY` as filed, `CONFIDENCE` one step lower - carrying the reason `critic returned no verdict` in place of a missing-oracle name.

`INCONCLUSIVE` is the required verdict whenever no oracle can settle the claim - never let a critic invent a pass or fail to avoid it.

## Deduplicate

Group reports by root cause, not by file - the same defect (a shared unchecked helper, say) often surfaces from several entry points. Group on what is already in hand, the head lines and the verdict blocks: the same `CLASS`, an overlapping or adjacent `LOCATION`, the same symptom in the critics' `OBSERVED`. Merge such reports into one finding, list all affected locations, keep the highest severity and the clearest PoC.

A merged group is one finding everywhere downstream: it takes one slot against the cap, it carries the strongest verdict of the group, and for a tie-break it counts as the lowest report `<rank>` among its members.

## Severity

Every surviving finding carries a `SEVERITY: N.N` on its own line (0-10), and the pool is emitted in descending severity order. The number is a rough internal ranking signal, not a published CVSS, but it must be consistent enough to sort by.

The bands themselves are repo-specific and come from the run's profile: `job.md`, section `## Repo profile`, sub-section `## Severity calibration`. That sub-section says what a 9-10 or a 4-6 means in this codebase, and it wins over anything on this page.

Only when `job.md` carries no `## Repo profile` section at all (the profiler missed twice) fall back to these generic bands, and record `repo profile unavailable` in the coverage notes so the ranking reads as uncalibrated:

- 9-10 unauthenticated RCE, full account takeover, trivial data breach
- 7-8 authenticated high-impact, or memory corruption with a plausible path
- 4-6 real bug, limited reach or needs preconditions
- 1-3 minor, hardening, quality

## findings.md (final output)

One file per run, at `.temp/viber/code-auditor/<run-id>/findings.md`, built in this shape:

- the title line `# Findings - <run-id> (<job>)`;
- directly under it the header line `N files swept · P pairs swept · M hotspots investigated · K confirmed findings · J fronts still open.`;
- then at most ten full entries, headed `## 1. <title>` through `## 10. <title>`, in descending severity order;
- then the further-findings list, then the coverage notes.

A full entry opens with its tagged lines, in this order:

```
SEVERITY: N.N
CONFIDENCE: <low | medium | high>
VERDICT: <VERIFIED | PARTIALLY VERIFIED | INCONCLUSIVE>
STATUS: INCONCLUSIVE - <missing oracle | critic returned no verdict>
LOCATION: path/to/file.ext:Lstart-Lend
CLASS: <bug class>
```

The `STATUS:` line is written only on an entry whose verdict is `INCONCLUSIVE`, and its reason is either the name of the oracle that was missing or, on the twice-silent-critic path, the words `critic returned no verdict`. Below the tagged lines the entry carries three short paragraphs lifted from the report: root cause, reproduction, fix sketch.

The cap is ten full entries, counted for the run and not for a wave:

- A finding whose severity falls in the 1-3 band never gets a full entry, even when slots are left over.
- An `INCONCLUSIVE` finding does count against the ten, with the severity it was filed at and the lowered confidence.
- When more findings qualify than there are slots, order them by higher `SEVERITY` first, then by verdict (`VERIFIED`, then `PARTIALLY VERIFIED`, then `INCONCLUSIVE`), then by higher `CONFIDENCE` (high, medium, low), then by lower report `<rank>`. The first ten get full entries; every other one drops into the further-findings list.

`## Further findings (N)` holds every surviving finding that got no full entry - the ones past the cap and every 1-3 band finding - as one line each, nothing more:

```
SEVERITY · LOCATION · CLASS · <title> · <report path>
```

`N` is the number of lines in that section. Nothing is silently lost on the way there: only a `REFUTED` finding leaves the file entirely.

`## Coverage notes` closes the file with its two bullets, plus one extra line per condition that held:

```
- Areas given only a shallow pass: ...
- Open fronts handed to the next wave: ...
- repo profile unavailable
- edge track skipped: collect_edges.sh passed its 5-minute deadline
```

After every Phase 6 wave, regenerate the whole file from the whole pool of the run - every report and verdict so far, not just the new wave's. The cap, the ordering, the further-findings list and `N` are properties of the run, so a late high-severity finding pushes an earlier one down into the list instead of being appended below it.

## What the moderator reads

Ranking a pool of reports must not cost one report read per report. Build the ranking from two inputs only:

- each critic's verdict block (`VERDICT`, `COMMAND`, `OBSERVED`, `SEVERITY`), which arrives in that critic's final message and is already in context - no file read at all;
- the first four lines of each report: `# <title>`, `LOCATION`, `CLASS`, `SEVERITY`. Read those four lines, never the whole file. `CONFIDENCE` sits on the fifth line; read it too, but only for the findings a tie-break leaves competing for the last slot.

A full report is opened once and only once: for an entry that made the cap, while that entry is being written, to lift its root cause, reproduction and fix sketch. No other section of any report is opened in any phase - not to deduplicate (that runs on the head lines and the verdict blocks), not to build the further-findings list (that runs on the same four lines), not to regenerate the file after a later wave.
