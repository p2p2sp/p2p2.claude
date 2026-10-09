# Runtime performance lens map signals
Rank a unit higher the more signals it carries, and weigh a unit by how often its code runs: request handlers, workers and hooks above one-shot setup. Each perf fix is a seed: read it with `git show <hash>` and search for siblings of the fixed pattern.

Perf-fix history of the last 12 months, each `@<hash> <subject>` line followed by the files that fix touched:
```bash
git -c core.quotePath=false log --no-merges -i -E --grep='perf|slow|n\+1|latency|leak|timeout|memory|quadratic|eager|preload|batch|oom|backoff|throttl' --since='12 months ago' --name-only --format='@%h %s' -- '<scope>' | grep -v '^$' | head -80
```

Hot entry points, per file:
```bash
git -c core.quotePath=false grep -c -E '(router|app|fastify|server)\.(get|post|put|patch|delete|route|use)\(|@(Get|Post|Put|Patch|Delete|Request)(Mapping)?\(|\[Http(Get|Post|Put|Delete)|Map(Get|Post)\(|Route::(get|post)|HandleFunc|\.(GET|POST)\(|@(app|router)\.(get|post|route)|@(shared_task|KafkaListener|Scheduled)|new Worker\(|def perform|def handle|consume\(|on\(.message' -- '<scope>' | sort -t: -k2 -nr | head -30
```

I/O near a loop (6-line window), the I/O filter reading the code after the line number, never the path:
```bash
git -c core.quotePath=false grep -n -A6 -E '^[[:space:]]*(for|foreach|while)[[:space:](]|\.(forEach|map|each|flatMap)[[:space:](]' -- '<scope>/*.js' '<scope>/*.ts' '<scope>/*.tsx' '<scope>/*.mjs' '<scope>/*.py' '<scope>/*.rb' '<scope>/*.go' '<scope>/*.java' '<scope>/*.kt' '<scope>/*.cs' '<scope>/*.php' ':!*test*' ':!*spec*' | grep -E '[-:][0-9]+[-:].*(await |\.(query|execute|find[A-Za-z]*|save|create|insert|update)\(|fetch\(|requests\.|exec(Sync)?\(|spawn(Sync)?\(|readFile|SaveChanges|::find|->save\()' | head -40
```

A process spawned inside a shell loop:
```bash
git -c core.quotePath=false grep -n -A5 -E '(^|[^[:alnum:]_])(while|for)[[:space:]]' -- '<scope>/*.sh' | grep -E '\$\((git|awk|sed|grep|jq|cat)' | head -40
```

Blocking calls; check the enclosing function is `async` or a handler:
```bash
git -c core.quotePath=false grep -n -E 'readFileSync|execSync|spawnSync|pbkdf2Sync|hashSync|(deflate|inflate|gzip|gunzip)Sync|time\.sleep|Thread\.sleep|requests\.(get|post)|subprocess\.(run|call|check_output)|\.Result([^[:alnum:]_]|$)|\.Wait\(\)|GetResult\(\)' -- '<scope>' | head -40
```

Per-call setup and fan-out, indented lines only so a module-level singleton stays out: a client, pool or regex built per call, `Promise.all` or `gather` over an input, retries:
```bash
git -c core.quotePath=false grep -n -E '^[[:space:]]+.*(new (PrismaClient|HttpClient|Pool|Redis|MongoClient)\(|requests\.(get|post)\(|re\.compile\(|new RegExp\(|Pattern\.compile\(|Regex::new\(|ajv\.compile\(|Promise\.all\(|asyncio\.gather\(|http\.DefaultClient|retry|backoff)' -- '<scope>' ':!*test*' | head -40
```

Unbounded fetch: a query with no limit, a whole table pulled into code, OFFSET paging:
```bash
git -c core.quotePath=false grep -n -E 'findMany\(|\.all\(\)|findAll\(|ToList(Async)?\(|SELECT \*|OFFSET|\.offset\(|\.skip\(|Skip\(' -- '<scope>' ':!*test*' | head -40
```

Growth without a bound:
```bash
git -c core.quotePath=false grep -n -E 'lru_cache\(maxsize=None\)|@cache([^[:alnum:]_]|$)|setInterval\(|^(const|let|var) +[A-Za-z_]+ *= *(new Map|\{\}|\[\])|^[A-Za-z_][A-Za-z0-9_]* *= *(\{\}|\[\]|dict\(\)|defaultdict)|static (final )?(Map|List|Set)<|^var [A-Za-z_]+ *= *(make\(map|map\[)' -- '<scope>' | head -40
```

Schema files; compare `references`, `ForeignKey`, `@relation` against `CREATE INDEX`, `@@index`, `add_index`, `db_index`, on PostgreSQL only: Django `ForeignKey`, Rails `references` and MySQL foreign keys are indexed by default:
```bash
git -c core.quotePath=false ls-files -- '<scope>' | grep -iE 'migrat|schema\.prisma|schema\.rb|models\.py|entit|dbcontext|\.sql$' | head -30
```
