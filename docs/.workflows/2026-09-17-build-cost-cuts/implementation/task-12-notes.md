# Task 12 - notes

## Runs
- node --test tests/superdev/merge-settings.test.ts -> tests 10, pass 10, fail 0 (duration_ms 710.3621)
- git ls-files -s superdev/skills/setup/scripts/merge-settings.sh | grep -c '^100755' -> 1

## Delta
Step 4: the `defaultMode: plan` case is written with a host `allow` that still lacks one template
entry, because a fully covered host plus a differing mode hits step 2's "brak zmian" rule and
prints `already up to date` - the report clause only exists on a line that merged something.

Step 4: a tenth case was added (shipped-template shape: 34 allow entries, no `mcp__*`, no host
key, `ask: []`, `defaultMode: acceptEdits`) - the DoD clause "szablon zawiera listy z kroku 1" had
no check otherwise; the shipped asset is also the template used by the create and no-node cases,
so its bytes are asserted twice over.

UNDERSPECIFIED: "already up to date" detection - computed semantically (nothing appended, no
defaultMode set, no list/permissions normalization) rather than by comparing serialized bytes, so
a host file formatted with its own indentation is left untouched instead of silently reformatted.

UNDERSPECIFIED: `defaultMode` already equal to the template's - reported with the same
`defaultMode already <x> (left untouched)` clause as a differing one, rather than a fourth line
shape outside step 3's list (case 9 of the suite pins it).

UNDERSPECIFIED: `permissions` present but not an object - treated as absent and replaced with a
fresh object, same as the non-array `allow`/`deny` failure mode.

UNDERSPECIFIED: target JSON whose top-level value is not an object (`[]`, `"x"`, `3`) - reported
as `settings.json: not valid JSON - left untouched (top-level value is not an object)`, exit 2,
reusing the documented line instead of adding one.

UNDERSPECIFIED: target that exists but cannot be read (EACCES) - one new line
`settings.json: unreadable - left untouched (<message>)`, exit 2, documented in the script header;
"not valid JSON" would have named the wrong cause and exit 2 already covers "target niepoprawny".

UNDERSPECIFIED: wrong argument count (none, or more than two) - usage on stderr and exit 1, the
`record-decision.sh` shape; stdout stays empty, so no consumer parses a usage error as a result
line.

UNDERSPECIFIED: V8 folds a JSON snippet with newlines into some parse-error messages - every
interpolated message is flattened (`\s+` -> single space) so the one-line stdout contract holds.

CARRY: superdev/CLAUDE.md - the setup skill's `node` dependency (merge-settings.sh, behind the
skip-with-note fallback) and the new `skills/setup/scripts/` entry are not named there yet; plan
header constraint on self-documentation is unmet until the documentation task lands.

## Fix round 1

### Runs
none - no `### Files` section in plan.md prefix-matches the one path this round changed

I1: fixed - no test: the finding is about the classification of a prose line in this notes file;
no repository test can express it. The "host list de-duplication" UNDERSPECIFIED line is dropped -
criterion 15 pins the behaviour, so nothing was left open and `## Decisions taken` must not list
it; merge-settings.sh is unchanged.

the file this round changed
touched: docs/.workflows/2026-09-17-build-cost-cuts/implementation/task-12-notes.md

## Review notes
- NOTE: plan defect - the target-unreadable (EACCES) branch and its exact stdout wording
(`settings.json: unreadable - left untouched (<message>)`, merge-settings.sh:101-106) were left to
the implementor. Task-12's `### Failure modes` enumerates five cases (not valid JSON, node absent,
template missing, non-array allow/deny, tmp-rename failure) and none covers a target that exists
but cannot be read; this is a new line of text a person reads that the task did not pin, so the
gap belongs in the plan, not in an ad hoc implementor choice.
