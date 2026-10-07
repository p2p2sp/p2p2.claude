# Runtime performance lens
Audits code that runs as a process (servers, workers, CLIs, scripts, hooks): work that grows faster than its input, I/O repeated per item, memory that never comes back, blocked event loops and per-invocation cost. A render, bundle or Core Web Vitals problem belongs to the web-performance lens, a data race or wrong result to the bugs lens, an exploitable regex to the security lens, and structure without a measured cost to the design lens.

## Hunts
### complexity-cliff
Work growing faster than linear in data size: a list `includes`, `indexOf`, `in`, `find` or `sort`, string `+=` or `[...acc, x]` inside a loop over a growing collection. Name the input dimension N and where it comes from.

### io-per-item
A DB query, HTTP fetch, file read, `exec`, `spawn` or `$(git ...)` inside a loop, a resolver or a per-record callback: ORM lazy loading, a shell loop starting one process per file. Name what the loop iterates.

### unbounded-growth
Module-level maps or caches with no eviction, `lru_cache(maxsize=None)`, queues with no backpressure, listeners or intervals never removed, buffers holding a whole stream. Only in a long-running process.

### blocking-hot-path
`*Sync` calls, `time.sleep`, blocking HTTP clients or a large `JSON.parse` in an async handler, a lock held around I/O, a regex that backtracks catastrophically on untrusted input.

### startup-cost
Heavy top-level imports, eager initialization, or config and schema parsed again on every call of a CLI or hook that runs often. State how often it runs.

### schema-gap
A foreign key, filter or sort column in a migration with no index. A lead only: Verify cannot prove a query plan.

## Map signals
History and patterns only rank units, they are never a finding. Rank a unit higher the more signals it carries, and weigh a unit by how often its code runs: request handlers, workers and hooks above one-shot setup. Each perf fix is a seed: read it with `git show <hash>` and search for siblings of the fixed pattern.

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

## Excluded
- Micro-optimizations: a constant-factor gain under 2x, "use a faster library".
- Cold paths: one-shot migrations, setup, test code, dev tooling (unless the tooling is the product).
- N provably bounded by the code (cite the bound) or small in practice.
- Any finding with no stated input dimension, no estimate of how often the path runs, or only "could be slow".
- Query-plan claims that need real optimizer statistics.
- Browser-side findings (render, bundle size, Core Web Vitals, layout): handed to the web-performance lens.
- Data races (bugs lens); ReDoS only on untrusted input, and the exploit framing belongs to the security lens.
- Loops the framework already batches (Prisma batches same-tick `findUnique`).

## Verify
Worktree: required
Oracle: a measured growth curve or a call count. Reasoning alone never counts. The critic works only from the claim's location, class and recipe.

1. Cite the bound on N and every caller; a bounded N or an unreachable path is REFUTED, quoting the bound.
2. In the clean worktree, build the smallest harness driving the unit with fixtures only: in-memory SQLite, fakes, or a stub wrapping the I/O boundary with a counter.
3. Prefer deterministic counters to wall time: query, spawn, fetch or allocation counts, bytes read.
4. Measure at N and 10N (add 100N when a run stays under 60 s) and compute the exponent b = log10(m(10N) / m(N)). N+1: the call count rises about 10x while a batched version stays constant. Quadratic: b of at least 1.7.
5. When timing: warm up, take the median of at least 5 runs, discard a series whose coefficient of variation exceeds 10%. For a CLI, `hyperfine --warmup 3 --parameter-scan n 1000 10000 -D 9000 'cmd --size {n}' --export-json`, or a `time` loop without it.
6. Memory: K and 10K iterations, compare RSS or heap after a forced GC; growth that survives it is retention.
7. Blocking: measure event-loop or handler lag for a concurrent request, with and without the payload.
8. Strongest, optional: apply the minimal fix in the worktree and show the curve flattens.

Verdicts:
- VERIFIED: the curve or call count grows as claimed at the stated N, and the implied fix flattens it.
- PARTIALLY VERIFIED: growth is real but the stated N or frequency is not shown realistic, or the effect is below the claimed band.
- REFUTED: the curve is flat, N is bounded, or the path is unreachable.
- INCONCLUSIVE: the result depends on the real data distribution, the query planner, network latency, production volume, contention that needs real hardware, a live service, or noise exceeds the effect.

## Severity
- 9-10: a hot per-request or per-item path with superlinear or unbounded growth reachable at realistic or attacker-controlled N, ending in timeout, OOM or outage.
- 7-8: a hot path with N+1 or I/O per item, or more than 10x slower at realistic N; a leak in a long-running worker under normal load.
- 4-6: a warm path (per job, batch or CLI run) with a measured 2-10x cost; startup cost on a frequent CLI or hook; one process per file in a script over a large repository.
- 1-3: verified but cold, small N in practice, or a small constant factor.

Adjust by 1 up when untrusted input controls N, 2 down when N needs unusual input; cap at 6 when PARTIALLY VERIFIED.
