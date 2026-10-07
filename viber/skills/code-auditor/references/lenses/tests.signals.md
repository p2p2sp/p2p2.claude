# Tests lens map signals
Rank a source unit higher the more of these signals it carries: critical code with no test, fixed often while its test rarely changed, tests skipped, hollow, mock-heavy or flaky. Compare each source file's churn with its test's churn in the second list, and rank by fixes relative to size (`wc -l`).

Source files with no test file mentioning their name:
```bash
git ls-files -- <scope> | grep -v -i -E 'test|spec' | grep -E '\.(js|jsx|ts|tsx|py|go|rs|java|rb|sh)$' | while read -r f; do b=$(basename "$f"); b=${b%.*}; git grep -q -F -e "$b" -- '*test*' '*spec*' || echo "$f"; done | head -40
```

Churn of the last 12 months, source and test files together:
```bash
git log --no-merges --since='12 months ago' --name-only --format= -- <scope> | grep -v '^$' | sort | uniq -c | sort -nr | head -60
```

Fix hotspots, source files only:
```bash
git log --no-merges -i -E --grep='fix|bug|regress|revert' --since='12 months ago' --name-only --format= -- <scope> | grep -v '^$' | grep -v -i -E 'test|spec' | sort | uniq -c | sort -nr | head -30
```

Skipped, focused and pending tests:
```bash
git grep -n -E '(it|test|describe)[.](skip|only|todo)|[^a-z]x(it|describe)[(]|@Disabled|@Ignore|pytest[.]mark[.](skip|xfail)|t[.]Skip[(]' -- <scope> | head -40
```

Hollow assertions:
```bash
git grep -n -E 'expect[(]true[)]|assert[(]true[)]|assert[.]ok[(]true[)]|assertTrue[(]true[)]|toBeDefined[(][)]|toBeTruthy[(][)]|toMatch(Inline)?Snapshot' -- <scope> | head -40
```

Mock density per file; rank by mocks per assertion:
```bash
git grep -c -E 'jest[.]mock|vi[.]mock|mock[.]patch|Mockito|sinon[.]|toHaveBeenCalled' -- <scope> | sort -t: -k2 -nr | head -30
```

Flake risk inside test files:
```bash
git grep -n -E 'sleep[(]|setTimeout|waitForTimeout|Thread[.]sleep|Date[.]now|new Date[(][)]|Math[.]random|https?://' -- <scope> | grep -i -E 'test|spec' | head -40
```
