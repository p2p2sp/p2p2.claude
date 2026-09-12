# task review - task-01-review-1

## Findings

### Critical

- C1 - superfix/skills/code-auditor/scripts/collect_signals.sh:109 - a bare absolute root (`--scope /`, `--scope //`) is normalised to the empty string by the trailing-slash strip loop on line 110, so the `[ -n "$SCOPE" ]` guard on line 112 skips validation entirely and the `/*` case on line 117 never fires; the run falls into the no-scope default and sweeps the whole repo with exit 0 and no `scope:` line (verified: `bash collect_signals.sh --scope /` emits every record, exit 0). - The task's first `### Failure modes` entry requires exit 2, no stdout and one stderr line for any value starting with `/`, and the `### Contracts` grammar repeats it; here the value instead fails open into the widest possible sweep, silently, for a value the caller (Task 7's skill) takes from the user. - Run the absolute-path half of the case on the RAW `--scope` value before the normalisation loops on lines 109-110 (keep the `..` patterns on the normalised value, per the recorded decision), and add `"/"` and `"//"` to the rejection list at tests/superfix/collect_signals.test.ts:304 so the hole stays closed.

## Notes

- The diff inserts a second blank line after the `sweep extensions:` printf (collect_signals.sh, around line 179); harmless, but it is unrelated to the change.

## Assessment

The `--scope` grammar, the record-set semantics, the probe-equality guarantee and the stderr line all land as planned and the suite is green (19/19), but one value named by the task's own Failure modes - an absolute `/` - bypasses validation and silently widens the sweep to the whole repo.

VERDICT: FAIL
