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

Error-swallowing density, per file (shell `2>/dev/null` and `|| true` are mostly deliberate and left out):
```bash
git -c core.quotePath=false grep -I -c -E 'catch *(\([^)]*\))? *\{ *\}|\.catch\(\(?[a-z_]*\)? *=> *\{ *\}|catch *\( *(Exception|Throwable|Error) [a-z]+ *\)|except( +(Base)?Exception)?( +as +[a-z_]+)? *: *(pass)? *$|rescue *(nil|=> *[a-z_]+)? *$|_ = err|let _ = |\.ok\(\) *;' -- '<scope>' ':!*.md' | sort -t: -k2 -nr | head -30
```

Environment variables read in code that no other tracked file mentions. A name listed is read in one file only and set nowhere tracked: a contract-mismatch candidate (a typo, or a variable only an untracked `.env` sets):
```bash
git -c core.quotePath=false grep -h -o -E '(process\.env\.|process\.env\[.|getenv\(.|Getenv\(.|environ\.get\(.|environ\[.|ENV\[.|ENV\.fetch\(.|env::var\(.|EnvironmentVariable\(.)[A-Z][A-Z0-9_]{2,}' -- '<scope>' | grep -o -E '[A-Z][A-Z0-9_]{2,}$' | sort -u | while IFS= read -r v; do [ -n "$(git grep -l -w -F -e "$v" | sed -n '2p')" ] || echo "$v"; done | head -30
```

Hazard idioms per file, tests and docs excluded (feeds crash-hang, race-state and wrong-result; density only, a hit is never a finding):
```bash
git -c core.quotePath=false grep -I -c -E 'forEach\(async|\.map\(async|async void|\.unwrap\(\)|[A-Za-z0-9_)]!\.[A-Za-z_]|\.sort\(\)|datetime\.(utcnow|now)\(\)|new Date\(\)|time\.Now\(\)|DateTime\.Now|def [A-Za-z_]+\(.*= *(\[\]|\{\})|go func|parseFloat\(|toFixed\(' -- '<scope>' ':!*.md' ':(exclude,glob)**/test/**' ':(exclude,glob)**/tests/**' ':(exclude,glob)**/__tests__/**' ':(exclude,glob)**/spec/**' ':(exclude,glob)**/specs/**' ':(exclude,glob)**/e2e/**' ':(exclude,glob)**/cypress/**' ':(exclude,glob)**/test_*' ':!*[._-]test.*' ':!*[._-]spec.*' ':!*[._-]cy.*' ':!*Test.*' ':!*Tests.*' ':!*Spec.*' | sort -t: -k2 -nr | head -30
```
