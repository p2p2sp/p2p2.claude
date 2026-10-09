# Runtime performance lens
Audits code that runs as a process (servers, workers, CLIs, scripts, hooks): work that grows faster than its input, I/O repeated per item, memory that never comes back, blocked event loops, overload amplifiers and per-invocation cost. A render, bundle or Core Web Vitals problem belongs to the web-performance lens, a data race or wrong result to the bugs lens, and structure without a measured cost to the design lens.

## Hunts
### complexity-cliff
Work growing faster than linear in data size: a list `includes`, `indexOf`, `in`, `find` or `sort`, string `+=` or `[...acc, x]` inside a loop over a growing collection.

### io-per-item
A DB query, HTTP fetch, file read, `exec`, `spawn` or `$(git ...)` inside a loop, a resolver or a per-record callback: ORM lazy loading, a shell loop starting one process per file, a write per row where a bulk call exists, independent awaits run in series in an API handler or job (loaders and server components belong to web-performance). Calls multiplied per failure: a retry with no cap, no backoff or no jitter, or retries at more than one layer.

### unbounded-growth
Module-level maps or caches with no eviction, `lru_cache(maxsize=None)`, queues with no backpressure, listeners, intervals, goroutines or tasks never released, buffers holding a whole stream. Concurrency equal to N: `Promise.all(xs.map(...))`, `asyncio.gather` over an input list, a goroutine or task per item with no semaphore or pool. A request body, upload, archive or decompressed stream read whole with no size cap. Growth only in a long-running process.

### blocking-hot-path
`*Sync` calls, `time.sleep`, a blocking client or a sync DB driver inside `async def` or an async handler, `.Result`/`.Wait()` on a request thread, CPU-heavy work on the event loop (hashing, compression, a large sort or `JSON.parse`), a regex that backtracks catastrophically on untrusted input, a lock, transaction or pooled connection held across I/O, an outbound HTTP, DB or RPC call on a request path with no timeout or deadline (`requests` without `timeout=`, Go `http.DefaultClient`, `fetch` with no `signal`).

### repeated-setup
Setup redone per call that could run once: a client, pool or connection built per request or job (`new PrismaClient()`, `new HttpClient()`, `requests.get` with no `Session`, `sql.Open`); a regex, schema, template or serializer compiled per call or iteration (`new RegExp`, `re.compile`, `Pattern.compile`, `ajv.compile`); heavy imports or config parsed again on every run of a frequent CLI or hook. State how often it runs.

### query-shape
A query whose rows or bytes grow with the table, not the answer: a list query with no limit, whole rows fetched for one field, rows loaded to count, filter, sort or page in code (`len(qs)`, `.all()` then filter, `ToList()` then `Where`), OFFSET paging a growing table, eager loads that multiply rows. A filter, join or sort column with no index in the migrations, or one wrapped in a function or a leading-wildcard `LIKE`; Django `ForeignKey`, Rails `references` and MySQL foreign keys index themselves.

## Excluded
- Micro-optimizations: a constant-factor gain under 2x, "use a faster library", "add a cache".
- Cold paths: one-shot migrations, setup, test code, dev tooling (unless the tooling is the product).
- N bounded by the code or a cited limit (page cap, config maximum, schema constraint).
- Any finding with no stated input dimension, no estimate of how often the path runs, or only "could be slow".
- Cost-based query-plan claims (planner choice, selectivity) that need real optimizer statistics.
- Browser-side findings (render, bundle size, Core Web Vitals, layout): handed to the web-performance lens.
- Data races (bugs lens); a backtracking regex only on trusted or length-capped input.
- Calls the framework provably batches: Prisma `findUnique` issued concurrently in one tick, a DataLoader; never a sequential `await` loop.

## Verify
Worktree: required
Oracle: a measured growth curve or a call count. Reasoning alone never counts.

1. Cite the bound on N and every caller; a bounded N or an unreachable path is REFUTED, quoting the bound.
2. In the clean worktree, build the smallest harness driving the unit with fixtures only: in-memory SQLite, fakes, or a stub wrapping the I/O boundary with a counter.
3. Prefer deterministic counters to wall time: query, spawn, fetch or allocation counts, bytes read. Count queries with the stack's own hook: Django `CaptureQueriesContext`, SQLAlchemy `before_cursor_execute`, Rails `sql.active_record`, Hibernate `Statistics`, Prisma `$on('query')`, EF Core `LogTo`, Laravel `DB::listen`.
4. Measure at N and 10N (add 100N when a run stays under 60 s) and compute the exponent b = log10(m(10N) / m(N)). N+1: the call count rises about 10x while a batched version stays constant. Quadratic: b of at least 1.7.
5. When timing: warm up, take the median of at least 5 runs, discard a series whose coefficient of variation exceeds 10%. For a CLI, `hyperfine --warmup 3 --parameter-scan n 1000 10000 -D 9000 'cmd --size {n}' --export-json`.
6. Memory: K and 10K iterations, compare RSS or heap after a forced GC; growth that survives it is retention.
7. Blocking: measure event-loop or handler lag for a concurrent request, with and without the payload (Node `perf_hooks.monitorEventLoopDelay`, Python asyncio debug mode `slow_callback_duration`).
8. Fan-out, retries, timeouts: a stub records peak in-flight calls against N, attempts and the gaps between them under a failing dependency, and the elapsed time against one that never answers.
9. Index: load the migrations into SQLite and read `EXPLAIN QUERY PLAN` (SCAN versus SEARCH); a dialect SQLite cannot load caps the claim at PARTIALLY VERIFIED.
10. Strongest, optional: apply the minimal fix in the worktree and show the curve flattens.

Verdicts:
- VERIFIED: the curve or call count grows as claimed at the stated N, and the implied fix flattens it.
- PARTIALLY VERIFIED: growth is real but the stated N or frequency is not shown realistic.
- REFUTED: the curve is flat, N is bounded, or the path is unreachable.
- INCONCLUSIVE: the result depends on the real data distribution, the query planner, network latency, production volume, contention that needs real hardware, a live service, or noise exceeds the effect.

## Severity
- 9-10: a hot per-request or per-item path with superlinear or unbounded growth reachable at realistic N, ending in timeout, OOM or outage.
- 7-8: a hot path with N+1 or I/O per item, or more than 10x slower at realistic N; a dependency call with no timeout, retries that multiply load, or concurrency equal to N; a client built per request on a server; a leak in a long-running worker under normal load.
- 4-6: a warm path (per job, batch or CLI run) with a measured 2-10x cost; setup repeated on a frequent CLI or hook; one process per file in a script over a large repository.
- 1-3: verified but cold, small N in practice, or a small constant factor.

Adjust by 1 up when untrusted input controls N, 2 down when N needs unusual input; cap at 6 when PARTIALLY VERIFIED.
