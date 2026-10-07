# Runtime performance lens map signals
Rank a unit higher the more signals it carries, and weigh a unit by how often its code runs: request handlers, workers and hooks above one-shot setup. Each perf fix is a seed: read it with `git show <hash>` and search for siblings of the fixed pattern.

Perf-fix history, subjects to read:
```bash
git log --no-merges -i -E --grep='perf|slow|n\+1|latency|leak|timeout|memory|quadratic' --format='%h %s' -- <scope> | head -40
```

Files touched by those fixes in the last 12 months:
```bash
git log --no-merges -i -E --grep='perf|slow|n\+1|latency|leak|timeout|memory|quadratic' --since='12 months ago' --name-only --format= -- <scope> | grep -v '^$' | sort | uniq -c | sort -nr | head -30
```

Churn as a heat proxy:
```bash
git log --no-merges --since='12 months ago' --name-only --format= -- <scope> | grep -v '^$' | sort | uniq -c | sort -nr | head -30
```

Hot entry points, per file:
```bash
git grep -c -E '@(app|router)\.(get|post|route)|app\.(get|post|use)\(|@(Get|Post|Request)Mapping|HandleFunc|def handle|consume\(|on\(.message' -- <scope> | sort -t: -k2 -nr | head -30
```

I/O near a loop (6-line window):
```bash
git grep -n -A6 -E '^[[:space:]]*(for|while)\b|\.(forEach|map|each)\b' -- '<scope>/*.js' '<scope>/*.ts' '<scope>/*.py' '<scope>/*.rb' '<scope>/*.go' '<scope>/*.java' | grep -E 'await |\.query\(|\.find|\.get\(|fetch\(|requests\.|exec|spawn|readFile|open\(' | head -40
```

A process spawned inside a shell loop:
```bash
git grep -n -A5 -E '\b(while|for)\b' -- '<scope>/*.sh' | grep -E '\$\((git|awk|sed|grep|jq|cat)' | head -40
```

Blocking calls; check the enclosing function is `async` or a handler:
```bash
git grep -n -E 'readFileSync|execSync|spawnSync|time\.sleep|requests\.(get|post)' -- <scope> | head -40
```

Growth without a bound:
```bash
git grep -n -E 'lru_cache\(maxsize=None\)|@cache\b|setInterval\(|addEventListener\(|^(const|let|var) +[A-Za-z_]+ *= *(new Map|\{\}|\[\])' -- <scope> | head -40
```

Schema files; compare `references`, `ForeignKey`, `@relation` against `CREATE INDEX`, `@@index`, `add_index`, `db_index`:
```bash
git ls-files -- <scope> | grep -iE 'migrat|schema\.prisma|schema\.rb|models\.py|\.sql$' | head -30
```
