# task review

## Findings

### Important
- I1 - UNDERSPECIFIED line claims a decision Covered criteria #15 already pins - docs/.workflows/2026-09-17-build-cost-cuts/implementation/task-12-notes.md:21-23 - the notes' "host list de-duplication" line frames "host entries copied verbatim, duplicates included; only the appended template entries are de-duplicated against them" as the implementor's own open decision. Task-12's Covered criteria #15 already settles this: "plik zawiera każdy wpis `allow` i `deny` z szablonu dokładnie raz, własne wpisy i pozostałe klucze hosta bez zmian" pins that host's own entries stay unchanged (not deduped) while only template entries must appear exactly once - exactly the behavior implemented. Recording a plan-pinned outcome as an implementor decision makes the notes an unreliable signal of what was genuinely left open for a later re-dispatch or reviewer to weigh. Reclassify the line as applying Criterion 15's pinned rule (or drop the UNDERSPECIFIED framing) rather than presenting it as a choice the implementor made.

## Notes
- NOTE: plan defect - the target-unreadable (EACCES) branch and its exact stdout wording (`settings.json: unreadable - left untouched (<message>)`, merge-settings.sh:101-106) were left to the implementor. Task-12's `### Failure modes` enumerates five cases (not valid JSON, node absent, template missing, non-array allow/deny, tmp-rename failure) and none covers a target that exists but cannot be read; the task's own convention of specifying every CLI output line exactly (Approach step 3, Contracts) means this wording belonged in the plan, not invented ad hoc.

## Assessment
One Important finding (the notes present a plan-pinned Criterion-15 outcome as the implementor's own open decision) keeps this from a clean pass; the code itself, the 10-case test suite (all green), the shipped template's exact list contents, the exec bit, and the DoD are otherwise sound.
VERDICT: FAIL
