# Design lens map signals
Rank a unit higher the more signals it carries. Pairs in different directories with no import between them rank highest; a test paired with its source is expected and does not count.

Co-change pairs of the last 12 months, shared commits first (at least 3):
```bash
git -c core.quotePath=false log --since='12 months ago' --no-merges --invert-grep -i -E --grep='^(chore|build)(\([^)]*\))?: *(bump|release)|^(bump|release)' --name-only --format=format:@ -- '<scope>' | awk 'function e(){if(n>1&&n<=30)for(i=1;i<n;i++)for(j=i+1;j<=n;j++)c[f[i]" | "f[j]]++;n=0} /^@$/{e();next} NF{f[++n]=$0} END{e();for(k in c)if(c[k]>=3)print c[k],k}' | sort -nr | head -30
```

Churn times size hotspots, churn count first, then lines:
```bash
git -c core.quotePath=false log --since='12 months ago' --no-merges --name-only --format= -- '<scope>' | grep -v '^$' | sort | uniq -c | sort -rn | head -50 | while read c f; do [ -f "$f" ] && echo "$((c * $(wc -l < "$f"))) $c $f"; done | sort -rn | head -30
```

Largest files:
```bash
git ls-files -z -- '<scope>' | xargs -0 wc -l | sort -rn | head -20
```

Repeated literals, a candidate for knowledge duplication (a literal found in 3 or more places); `git log -S` on a literal shows commits that touched only some copies:
```bash
git grep -ohE '"[A-Za-z0-9_./:-]{12,}"' -- '<scope>' | sort | uniq -c | sort -rn | awk '$1>=3' | head -30
```

Import fan-in, the modules most depended on:
```bash
git grep -hE '^(import|from) |require\(' -- '<scope>' | grep -oE "['\"][^'\"]+['\"]" | sort | uniq -c | sort -rn | head -20
```

Import fan-out, the files depending on most others:
```bash
git -c core.quotePath=false grep -cE '^(import|from) |require\(' -- '<scope>' | sort -t: -k2 -rn | head -20
```

Dead export candidates: an exported name that `git grep -lw` finds in only one file. These are leads, not findings.
