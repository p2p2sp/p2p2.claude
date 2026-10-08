# Bugs lens map signals
Recent fixes weigh more than old ones, and commit subjects are noisy: some teams label feature work "fix". Rank a unit higher the more of these signals it carries; rank churn relative to size (`wc -l`), not absolute churn.

Fix history, the files touched by fix, hotfix, revert and regression commits of the last 12 months (seeds the past-fix-variant hunt):
```bash
git -c core.quotePath=false log --no-merges -i -E --grep='fix|bug|regress|revert' --since='12 months ago' --name-only --format= -- '<scope>' | grep -v '^$' | sort | uniq -c | sort -nr | head -30
```

Churn over the same window:
```bash
git -c core.quotePath=false log --no-merges --since='12 months ago' --name-only --format= -- '<scope>' | grep -v '^$' | sort | uniq -c | sort -nr | head -30
```

Co-change pairs, coupling the import graph misses, feed the contract-mismatch hunt:
```bash
git -c core.quotePath=false log --no-merges --since='12 months ago' --invert-grep -i -E --grep='^(chore|release|bump)' --name-only --format=format:@ -- '<scope>' | awk 'function e(){if(n>1&&n<=30)for(i=1;i<n;i++)for(j=i+1;j<=n;j++)c[f[i]" | "f[j]]++;n=0} /^@$/{e();next} NF{f[++n]=$0} END{e();for(k in c)if(c[k]>=5)print c[k],k}' | sort -nr | head -30
```

Error-swallowing density, per file:
```bash
git -c core.quotePath=false grep -c -E 'catch *(\([^)]*\))? *\{ *\}|except[^:]*: *pass|\|\| *true|2>/dev/null|rescue *nil|_ = err' -- '<scope>' | sort -t: -k2 -nr | head -30
```

Producer and consumer surface: the keys JSON files carry. Search each key in the code; a key found on one side only is a contract-mismatch candidate:
```bash
git grep -h -o -E '"[a-z_][a-zA-Z0-9_.-]{2,}" *:' -- '<scope>/*.json' | sort | uniq -c | sort -nr | head -50
```
