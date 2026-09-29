# Test Results

## Summary
Test suite ran with 1121 tests total:
- Pass: 1118
- Fail: 1
- Skipped: 2

## Failed Test

**File:** `tests/viber/merge-settings.test.ts`

**Test:** `the shipped template carries the recommended block only: built-in tools, recoverable operations asked, irreversible ones denied, no host-specific key`

**Location:** Line 479 (assertion at line 529)

**Error:**
```
AssertionError [ERR_ASSERTION]: ask should carry Bash(rm -rf:*)
```

**Details:**
The test verifies that the shipped settings template (`viber/skills/setup/templates/settings.json`) contains the recommended permission blocks. The `ask` array in the template is missing the `Bash(rm -rf:*)` entry, which should be present for recoverable operations that require user approval.

Expected in `ask`: `Bash(rm -rf:*)`

Current `ask` entries:
- `Bash(find * -delete*)`
- `Bash(find * -exec rm *)`
- `Bash(git * --force*)`
- `Bash(git reset --hard:*)`
- `Bash(gh issue delete:*)`
