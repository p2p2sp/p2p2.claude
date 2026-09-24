# Refresh file - template and content rules

Loaded by the `intent` skill only at write time - right before the `Write` (or overwrite) of `<intent dir>/refresh.md`. Not needed while the refresh step's agents are still running.

## Content rules
- Write the file in the interview's language, in the exact structure below - the four sections in that order, nothing else.
- Every section carries `- ` bullets, or the single bullet `none` with a short reason after a hyphen when one is known (`none - fresh run`). A section is never dropped and never left empty: a source that found nothing, was not dispatched, or returned nothing usable is a `none` bullet - never a missing section, and never a reason to hold back the write.
- `Date:` is the date of this refresh, not the intent's. `Baseline:` is the `Date:` value read out of the refreshed intent file, copied verbatim; that file carries no `Date:` line, or one in any other shape than `YYYY-MM-DD` -> write `Baseline: unknown`.
- `Intent:` is the repo-relative path of the refreshed intent file. Use repo-relative paths everywhere else in the file too, never absolute ones.
- One line per finding. NEVER copy a changelog entry, an ADR or a commit message wholesale - say what it changed and name the artifact by its repo-relative path, so the reader can open it when the one line is not enough.
- What each section holds:
  - `## Since the baseline` - changelog entries newer than `Baseline:` and the ADRs they link, plus ADRs found independently under `docs/adr/`; for a phase intent, also what this run's earlier phases recorded.
  - `## Delivered state` - what the repo actually shows for the claims the intent rests on: every earlier phase's `Delivers:` named in its `## Constraints`, and every other `## Constraints` bullet, each either confirmed or reported in the shape it really has.
  - `## Other movement` - topics from the commits since `Baseline:` that no changelog entry records.
  - `## Impact on decisions` - one line per decision of the intent the delta touches.
- `## Impact on decisions` names each touched decision of the intent as `` `<question>` (decision <n>) `` - the question copied from its `### <n>.` heading, never a bare number - and nothing else; each line says what about that decision is now worth re-reading. A decision the delta leaves alone is not listed; no decision touched -> the single bullet `none`.
- This file is a delta report, never a requirement list: it records what moved since `Baseline:`, never what the change should now do, and nothing in it overrides a confirmed decision of the intent.
- Two fixed fillings, both written in this same shape:
  - Nothing to compare -> every section is the single bullet `none`, and `## Impact on decisions` reads `none - no change since <Baseline>`.
  - Fresh run (written beside a newly written `intent.md`) -> `## Since the baseline` carries what the history agent of `## Explore first` found, `## Delivered state` and `## Other movement` both read `none - fresh run`, and `## Impact on decisions` reads `none - written with this intent`. A greenfield request that explored nothing writes every section as the single bullet `none`.

## Template

```markdown
# Refresh: <intent title>
Date: <YYYY-MM-DD>
Intent: <repo-relative path to the refreshed intent.md>
Baseline: <the Date: value of that intent file, or `unknown`>

## Since the baseline
- <what a changelog entry or ADR newer than the baseline changed - repo-relative path> (or `none`)

## Delivered state
- <a `Delivers:` or `## Constraints` claim of the intent, and what the repo actually shows for it> (or `none`)

## Other movement
- <a topic from the commits since the baseline that no changelog entry records> (or `none`)

## Impact on decisions
- `<question>` (decision <n>) - <what about it the delta makes worth re-reading> (or `none`)
```
