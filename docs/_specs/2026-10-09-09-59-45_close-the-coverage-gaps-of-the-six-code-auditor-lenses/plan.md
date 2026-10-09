---
source: C:/Projects/p2p2.claude/docs/_specs/2026-10-09-09-59-45_close-the-coverage-gaps-of-the-six-code-auditor-lenses/plan.md
---

To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Close the coverage gaps of the six code-auditor lenses

## Goal

Bring each of the six `viber:code-auditor` lenses (bugs, security, web-performance, runtime-performance, tests, design) and its map-signals file up to the coverage its domain's trusted sources expect. Every defect class gets exactly one owning lens, and every lens's Verify and Severity sections can actually reach the verdicts and bands they promise. The six review reports under `.temp/lens-review/<lens>.md` are the evidence and hold the proposed wording. A `README.md` in the skill directory then describes the six lenses for people.

## Problem

The reviews scored the lenses 6 to 7 out of 10:
- Common classes are missing: LLM and agent flaws, data integrity, timeouts, retries and fan-out, assertions that never run, complex hotspot functions, back/forward cache blockers.
- Some classes have no owner because each lens hands them to a sibling that excludes them: ReDoS, an attacker-triggered crash or hang, leaked listeners in a single-page app, test structure.
- Some Severity bands cannot be reached, and some Verify gates refute a whole angle by construction.
- Three signal commands are wrong: two filter whole output lines instead of the file path, and one test-or-spec substring filter drops ordinary source files. `\b` inside `git grep -E` is not guaranteed on macOS. The web-performance signals end the run on any repository with no JavaScript framework, template sites included.

Leaving it means an audit silently skips those classes and files findings it cannot verify.

## Current behaviour

Each lens has four headings (`## Hunts`, `## Excluded`, `## Verify`, `## Severity`); five carry 6 angles and web-performance 5. On the diff scope one hunter runs per angle. The mapper runs every bash block of `<lens>.signals.md` to rank units; `tests/viber/lens-map-signals.test.ts` runs every block in a throwaway repository and reads some blocks by position. `tests/viber/lenses.unit.test.ts` holds each lens to 3 to 6 angles and 8000 bytes.

### Must not change

- Every lens file keeps the four headings in order, 3 to 6 angles, no bash block, its `Worktree:` line (`none` for design, `required` for the other five) and at most 8000 bytes.
- Every signal block `## Contracts` C1 names sits at the position C1 gives and keeps the output shape C1 gives.
- Every `<scope>` in a signals file stays single-quoted and is the only placeholder.
- The lens set, `SKILL.md`, `references/synthesis.md` and the `mapper`, `scout`, `hunter` and `critic` agents stay as they are.

## Behaviour

### S1 - Prompt injection into an agent is hunted [CHANGED - was: excluded as "user content in an LLM prompt"]

Given a repository whose code passes an issue body to a model holding an unrestricted shell tool
When the security lens audits it
Then the `llm-and-agents` angle hunts it, and a critic verifies it with a stubbed model returning the injected tool call

### S2 - An attacker-triggered crash or a hang has an owner [CHANGED - was: bugs handed it to security, which excludes denial of service]

Given a null dereference, a deadlock or a loop that never ends, reached by any input, attacker input included
When the bugs lens audits it
Then its `crash-hang` angle owns it, and the security lens names the bugs lens in its denial-of-service exclusion

### S3 - ReDoS, unbounded growth and overload amplifiers have an owner [CHANGED - was: runtime-performance handed the exploitable regex to security, which excludes ReDoS, and no lens hunted missing timeouts]

Given a backtracking regex on untrusted input, a request body read whole with no size cap, or an outbound call with no timeout on a request path
When the runtime-performance lens audits it
Then it owns the finding, and the security lens names the runtime performance lens in its denial-of-service exclusion

### S4 - A server-rendered or plain HTML site gets web-performance units [CHANGED - was: `## Units` read `none:` with no JavaScript framework in `package.json`]

Given a repository with HTML or template files and no JavaScript framework dependency
When the mapper runs the web-performance signals
Then the template block lists those files and the run continues

### S5 - A stray `.only` on a critical suite can reach the top band [CHANGED - was: capped at 4 with no surviving mutant or flake]

Given a `.only` that silently disables a critical suite
When a critic verifies the tests-lens claim
Then it removes the marker and runs the file, and a failure is VERIFIED with no cap below the band

### S6 - A dead-code or import-cycle claim passes the design gates that apply to it [CHANGED - was: refuted by the duplication-only gates 2, 3 and 6]

Given a dead export last edited after its last caller went
When a critic verifies the design claim
Then only the gates that bind its angle apply, and the edit proves the change cost

### S7 - Runtime-performance loop signal reads the code, not the path [CHANGED - was: a path holding `exec` matched every line after a loop]

Given a file whose path holds `exec` and whose loop body makes no I/O call
When the mapper ranks runtime-performance units
Then that file is not ranked for I/O near a loop

### S8 - Tests flake signal tells test files by their path [CHANGED - was: any line holding the word `test` passed, whatever its file]

Given a production file with a line holding the word `test`, and a test file under `tests/` with a `setTimeout(` line
When the mapper ranks tests units for flake risk
Then only the test file's line is listed

### S9 - A reader finds every lens, angle and owner in one page [NEW]

Given a person deciding which lens to run
When they open `viber/skills/code-auditor/README.md`
Then they read what each lens audits, its angles, how its findings are verified, and which lens owns each class two lenses meet

### Edge cases

- A source file named `src/latest.ts` or `src/inspector.ts` with no test mentioning it -> the tests no-test block lists it.
- A non-test line holding the word `test` in a production file -> the tests flake block leaves it out; a `setTimeout(` line in a file under `tests/` -> listed.
- A loop in `src/executor.js` followed only by lines with no I/O call -> the runtime-performance loop block leaves the file out.
- A signals file holding `\b` -> `lenses.unit.test.ts` fails on it.
- A repository holding `views/index.html.erb` and no `package.json` -> the web-performance template block lists it.
- A `next/image` hero with neither `preload` nor `fetchPriority="high"` -> in scope (lazy by default), while its format stays excluded.

## Glossary

- Owner lens - the one lens that hunts a defect class; every other lens that meets the class hands it to the owner by name, and the owner never excludes it.
- Hand-off - the intro or `## Excluded` clause naming the owner lens of a class this lens leaves out.
- Hang versus missing timeout - a call, wait or loop that never returns whatever its dependencies do (deadlock, a loop or recursion with no exit, a lock never released) is a bugs hang; an outbound call with no timeout or deadline, which waits as long as its dependency does and multiplies load under overload, is a runtime-performance finding.

## Acceptance criteria

1. The security lens holds an `llm-and-agents` angle and 6 angles in all, `secrets-and-crypto` merged into the supply-chain angle; its LLM exclusion covers only a model holding no tool, secret or other users' data; its Verify names a stubbed model returning the injected tool call as a symptom; its denial-of-service exclusion names the bugs lens for crashes and hangs and the runtime performance lens for time and memory growth, ReDoS included.
2. The bugs lens owns crashes and hangs from any input, attacker input included (`crash-hang`), data integrity (`race-state`) and listeners, timers or subscriptions not released on the error path or on unmount, and hands memory growth and missing timeouts to the runtime performance lens.
3. The runtime-performance lens owns ReDoS, uncapped request bodies, uploads and decompression, missing timeouts, uncapped retries and unbounded fan-out, hands no regex to the security lens, and carries `query-shape` and `repeated-setup` in place of `schema-gap` and `startup-cost`.
4. The web-performance signals list HTML and template files and end the run only when neither a framework nor a template is found; its framework-image exclusion covers only format and compression; its intro hands a listener, timer or subscription never removed on unmount to the bugs lens.
5. The tests lens hands nothing to the design lens and itself excludes test style or structure with no missed regression; `## Verify` carries a dead-test procedure; the `## Severity` cap no longer blocks the band naming a stray `.only` or skip.
6. The design lens scopes its Verify gates per angle, its signals carry a copy-paste detector and a runnable dead-export command, and its Severity bands match what its gates can prove.
7. The reported signal bugs are fixed and pinned by tests: the runtime-performance loop block matches I/O on the line content, never on the path; the tests flake block decides "test file" from the path alone, never from the line content; the tests no-test block keeps `src/latest.ts` and `src/inspector.ts`; the web-performance template block lists templates in a repository with no framework; no signals file holds `\b`.
8. Every lens file passes its own `lenses.unit.test.ts` cases and every signals file passes its own `lens-map-signals.test.ts` cases.
9. Each report's top 5 recommendations is applied, or rejected with the one-sentence reason its task's `Delivers` gives.
10. `viber/skills/code-auditor/README.md` describes, in English, all six lenses as they stand after this change: what each audits, every angle by its slug, how its claims are verified (oracle, `Worktree:` line), and which class each hands to which owner lens.
11. Every hand-off in the six lens files names a class that an angle of the receiving lens covers, and the README's ownership table names that angle for each one.

## Scope

### File map

- modify - viber/skills/code-auditor/references/lenses/security.md - security hunts, exclusions, oracle, bands
- modify - viber/skills/code-auditor/references/lenses/security.signals.md - security map signals
- modify - viber/skills/code-auditor/references/lenses/bugs.md - bugs hunts, exclusions, oracle, bands
- modify - viber/skills/code-auditor/references/lenses/bugs.signals.md - bugs map signals
- modify - viber/skills/code-auditor/references/lenses/web-performance.md - web-performance hunts, exclusions, oracle, bands
- modify - viber/skills/code-auditor/references/lenses/web-performance.signals.md - web-performance map signals
- modify - viber/skills/code-auditor/references/lenses/design.md - design hunts, exclusions, gates, bands
- modify - viber/skills/code-auditor/references/lenses/design.signals.md - design map signals
- modify - viber/skills/code-auditor/references/lenses/runtime-performance.md - runtime-performance hunts, exclusions, oracle, bands
- modify - viber/skills/code-auditor/references/lenses/runtime-performance.signals.md - runtime-performance map signals
- modify - viber/skills/code-auditor/references/lenses/tests.md - tests hunts, exclusions, oracle, bands
- modify - viber/skills/code-auditor/references/lenses/tests.signals.md - tests map signals
- modify - tests/viber/lens-map-signals.test.ts - regression cases for the path filters, the test-or-spec filter and the template block
- modify - tests/viber/lenses.unit.test.ts - a signals rule rejecting `\b`, with its self-check
- add - viber/skills/code-auditor/README.md - the human-readable guide to the six lenses: scope, angles, verification and ownership of each class

### Out of scope

- `viber/agents/mapper.md` step 5 keeps its fix-history regex `fix|bug|regress|revert`, so `bugs.signals.md` block 0 keeps the same regex (the word-start tightening would need both changed).
- `viber/skills/code-auditor/SKILL.md`, `references/synthesis.md`, the `scout`, `hunter` and `critic` agents: they read any lens generically and need no change.
- `viber/skills/setup/assets/help.html` and the docs: they name lenses, never angles.
- The 6-angle and 8000-byte caps of `lenses.unit.test.ts`, and any new lens.

## Solution requirements

- Tokens: every lens stays at or under 8000 bytes, and each task makes the cuts its report lists under "What to cut" to pay for its additions.
- Signal commands run in POSIX sh under Git Bash on Windows and on macOS: no heredoc, no `\b`, `\w`, `\s` or `\d` in a `git grep -E` or `grep -E` pattern (use bracket classes such as `[[:space:]]`), no `wc -l` output compared as a number (macOS pads it), BWK-compatible awk with no apostrophe inside the program, `<scope>` single-quoted.
- English, present state only, no change history, no em or en dash.
- Facts verified at planning and safe to write: Node `--test-randomize` and `--test-random-seed` exist from v26.1.0 (https://nodejs.org/api/cli.html); `next/image` defaults to lazy loading, Next.js 16 deprecates `priority` in favour of `preload`, and a missing `sizes` makes the browser assume `100vw` (https://nextjs.org/docs/app/api-reference/components/image). The CodeQL release date and Web Almanac percentages from the reports are evidence only and go into no lens.
- `.temp/lens-review/<lens>.md` is git-ignored and local: it is read, never staged.
- `code-auditor.unit.test.ts`, `portability.unit.test.ts` and the macOS and Linux shells are proven by the build's final test run and CI, not by a task. "Every signals block runs in Git Bash" is proven by `lens-map-signals.test.ts`, whose throwaway repository stands in for this one.
- The narrowed LLM exclusion follows `.temp/lens-review/security.md` gap 1 word for word ("no tool, secret or data beyond its sender's own"), adding "secret" to the intent's wording under the top-5 rule.
- Criteria 8 and 9 are build-level conditions (shape tests pass, every report item decided) with no scenario of their own.
- The merged security angle takes the slug `secrets-crypto-and-supply-chain` so its name covers what both merged angles held.

## Tasks

<!-- TASK -->
### T1 - Fix and pin the runtime-performance, tests and web-performance signals
- TDD: required
- Covers: #4, #7, #8, #9
- Uses: C1, C2
- Depends-on: none
- Files: viber/skills/code-auditor/references/lenses/runtime-performance.signals.md, viber/skills/code-auditor/references/lenses/tests.signals.md, viber/skills/code-auditor/references/lenses/web-performance.signals.md, tests/viber/lens-map-signals.test.ts, tests/viber/lenses.unit.test.ts
- Delivers: the three signals files with the signal items of their reports applied, each pinned where the edge cases name it. From `.temp/lens-review/runtime-performance.md` signals notes 1 to 9: the loop block filtering on line content, wider entry points and blocking calls, the merged history block, the churn block cut, the per-call setup and fan-out block and the unbounded-fetch block, the wider growth and schema blocks, no `\b`. From `.temp/lens-review/tests.md` signals notes 1 to 8: the flake block filtering on the path, the path-shaped test filter in the no-test and fix-hotspot blocks, the Rust in-file test check and wider extensions, the fix-with-no-test block, the wider skip, hollow and mock patterns, the diff-scope ranking sentence. From `.temp/lens-review/web-performance.md` gap 1 and every "Changes to existing signals" item: the HTML and template block after block 1, the ranking note ending the run only when blocks 0 to 2 all find nothing, the wider entry-file pattern, the four new blocks, the noisy heavy imports dropped, the whole-scope cache-header block. A signals rule in `lenses.unit.test.ts`, with its self-check, rejects `\b` in every signals file. Every block sits where C1 puts it.
- Verification: node --test tests/viber/lenses.unit.test.ts && node --test tests/viber/lens-map-signals.test.ts && grep -n -E 'erb|twig|blade' viber/skills/code-auditor/references/lenses/web-performance.signals.md && ! grep -q 'by the first two blocks' viber/skills/code-auditor/references/lenses/web-performance.signals.md -> both files pass whole, the new cases among them (nothing else runs then: every other task depends on this one), the grep prints the template block line, and the negated grep exits 0
- DoD: the C1 loop block of `runtime-performance.signals.md` leaves out `src/executor.js` holding a loop followed by no I/O call, proven by a `lens-map-signals.test.ts` case naming `runtime-performance.signals.md`; the C1 no-test block of `tests.signals.md` lists `src/latest.ts` and `src/inspector.ts` and still lists `src/żródło.js`, proven by a `lens-map-signals.test.ts` case naming `tests.signals.md`; the C1 flake block of `tests.signals.md` lists a `setTimeout(` line under `tests/` and leaves out a production line holding the word `test`, proven by a `lens-map-signals.test.ts` case naming `tests.signals.md`; the C1 template block of `web-performance.signals.md` lists `views/index.html.erb` in a repository with no `package.json`, proven by a `lens-map-signals.test.ts` case naming `web-performance.signals.md`; the ranking note of `web-performance.signals.md` ends the run only when blocks 0 to 2 all find nothing and no longer reads "by the first two blocks"; `signalsProblems` reports C2 for a sample holding `\b`, proven by a `lenses.unit.test.ts` self-check case named for the word boundary, and every real signals file passes it; the heavy-imports block of `web-performance.signals.md` holds neither `import \* as` nor `@mui/icons-material`
Invoke skill `supercc:skill-designer` through Skill before the first edit.
<!-- /TASK -->

<!-- TASK -->
### T2 - Extend the security lens to agents, protocols and races
- TDD: none
- Covers: #1, #8, #9, #11
- Uses: none
- Depends-on: T1
- Files: viber/skills/code-auditor/references/lenses/security.md, viber/skills/code-auditor/references/lenses/security.signals.md
- Delivers: the security lens and signals with these items of `.temp/lens-review/security.md` applied: gap 1 as an `llm-and-agents` angle in the slot freed by merging `secrets-and-crypto` into `exposure-and-supply-chain` under the slug `secrets-crypto-and-supply-chain`, with the narrowed LLM exclusion, the stubbed-model symptom and the 9-10 band entry; gap 2 (memory corruption sentence, sanitizer symptom); gap 3 (limit-overrun races, the race and timing exclusion rewrite); gaps 4 to 7 (authentication rewrite with JWT moved there, CORS and `postMessage`, GraphQL resolvers, Actions expression injection, SSRF allowlist bypass, archive traversal, the extra injections and deserializers); gap 8 as a denial-of-service exclusion naming the bugs lens for crashes and hangs and the runtime performance lens for time and memory growth, ReDoS included; the markdown-as-agent-instructions exclusion; the authorization policy-source line in Verify; the Severity notes (modifier line deleted, recognized provider credential, CSRF on credentials, CI with write tokens); signals notes 1 to 9 (note 9 removes the diff-only block); every "What to cut" item. Rejected: the SSRF path carve-out (optional, Anthropic hard exclusion 13 stays); the React 19 `href` exception (a framework-version detail a hunter can read from the code).
- Verification: node --test --test-name-pattern "security\.md" tests/viber/lenses.unit.test.ts && node --test --test-name-pattern "security\.signals" tests/viber/lens-map-signals.test.ts && grep -n -E '^### (llm-and-agents|secrets-crypto-and-supply-chain)$|stubbed model|runtime performance lens' viber/skills/code-auditor/references/lenses/security.md && ! grep -q -E '^### secrets-and-crypto$|^git diff HEAD|^Subtract [0-9]' viber/skills/code-auditor/references/lenses/security.md viber/skills/code-auditor/references/lenses/security.signals.md -> both test files pass, the first grep prints both angle headings, the stubbed-model symptom and the exclusion naming the runtime performance lens, and the negated grep exits 0
- DoD: `security.md` passes its `lenses.unit.test.ts` cases with 6 angles, `llm-and-agents` and `secrets-crypto-and-supply-chain` among them and no `secrets-and-crypto` heading; the LLM exclusion names a model holding no tool, secret or data beyond its sender's own; `## Verify` names a stubbed model returning the injected tool call as a symptom; the denial-of-service exclusion names the bugs lens and the runtime performance lens; `## Severity` holds no modifier line adding or subtracting points; `security.signals.md` passes its `lens-map-signals.test.ts` case and holds no `git diff HEAD` block
Invoke skill `supercc:skill-designer` through Skill before the first edit.
<!-- /TASK -->

<!-- TASK -->
### T3 - Give the bugs lens data integrity, hangs and an outside oracle
- TDD: none
- Covers: #2, #8, #9, #11
- Uses: C1
- Depends-on: T1
- Files: viber/skills/code-auditor/references/lenses/bugs.md, viber/skills/code-auditor/references/lenses/bugs.signals.md
- Delivers: the bugs lens and signals with these items of `.temp/lens-review/bugs.md` applied: gap 1 (`race-state` in place of `concurrency-resources`); gap 2 (`wrong-result` first sentence); gap 3 (`crash-hang` in place of `crash-path`, without the "network call with no timeout" clause, which the Glossary gives to runtime-performance, and with its leaked-resource clause reading "on the error path or on unmount"); gap 4 (`silent-failure` first sentence); gaps 5 and 6 (`contract-mismatch` and `past-fix-variant`); gap 7 as the intro owning crashes, hangs and handle, lock, port or process exhaustion from any input, attacker input included, and handing memory growth and missing timeouts to the runtime performance lens; the four exclusion changes and the two merges; the REFUTED case for an excluded claim; Verify additions 1 to 3; the Severity changes; signals findings 1 to 3 (block 3 rewritten in place, block 4 replaced in place by the environment-variable cross-check, the hazard-idiom block appended). Rejected: signals finding 4, since `agents/mapper.md` hard-codes the same fix-history regex and stays out of scope.
- Verification: node --test --test-name-pattern "bugs\.md" tests/viber/lenses.unit.test.ts && node --test --test-name-pattern "signals file bugs\.signals|fix history|my app" tests/viber/lens-map-signals.test.ts && grep -n -E '^### (race-state|crash-hang)$|on unmount|runtime performance lens|outside the code under test' viber/skills/code-auditor/references/lenses/bugs.md && ! grep -q -E '^### (crash-path|concurrency-resources)$|race with no observed harm' viber/skills/code-auditor/references/lenses/bugs.md && ! grep -q -F "'<scope>/*.json'" viber/skills/code-auditor/references/lenses/bugs.signals.md -> both test files pass (blocks 0 and 3 still list the windowed fix and the scope with a space), the first grep prints both angles, the unmount clause and the hand-off, and the negated grep exits 0
- DoD: `bugs.md` passes its `lenses.unit.test.ts` cases with 6 angles, `race-state` and `crash-hang` among them and neither `crash-path` nor `concurrency-resources`; the intro keeps a crash or hang any input triggers, attacker input included, and hands memory growth and missing timeouts to the runtime performance lens; `crash-hang` names listeners or timers not released on unmount; `## Verify` states the expected behaviour comes from outside the code under test, with INCONCLUSIVE when nothing states the intent; `## Severity` 1-3 no longer names a race with no observed harm; `bugs.signals.md` passes its own, fix-history and scope-with-a-space cases of `lens-map-signals.test.ts` and holds no `.json` key block
Invoke skill `supercc:skill-designer` through Skill before the first edit.
<!-- /TASK -->

<!-- TASK -->
### T4 - Scope the design gates per angle and detect copied code
- TDD: none
- Covers: #6, #8, #9, #11
- Uses: C1
- Depends-on: T3
- Files: viber/skills/code-auditor/references/lenses/design.md, viber/skills/code-auditor/references/lenses/design.signals.md
- Delivers: the design lens and signals with these items of `.temp/lens-review/design.md` applied: gap 1 (gate 7 replaced by the gate-scope line); gap 2 (complex hotspot functions in `change-preventers`, the linter exclusion reading "already enforces"); gap 3 (the copy-paste detector in place of "Largest files", the filtered literal signal); gap 4 (`boundary-coupling` against a declared layer or a stable-onto-volatile import, module-level mutable state, `rule-drift` grounded on ADR and CONTRIBUTING files too); gap 5 (multi-language fan-in and fan-out); gap 6 (Severity cap sentence and bands, present wrong behaviour handed to the bugs lens); gap 7 (INCONCLUSIVE on thin history only when history is the sole evidence); gap 8 (coupling degree in the co-change block); gap 9 (a runnable dead-export block, with no `wc -l` compared as a number); gap 10 (absence of expected change on the diff scope); the hotspot block's bump filter and `read -r`; the config-key and diff-scope exclusion additions; gate 4's file:line requirement; every "What to cut" item. The design exclusion of test-only duplication stays as it is. Rejected: the counted unwritten-convention extension (the report advises it only once a run shows the class missed).
- Verification: node --test --test-name-pattern "design\.md" tests/viber/lenses.unit.test.ts && node --test --test-name-pattern "signals file design\.signals|non-ASCII" tests/viber/lens-map-signals.test.ts && grep -n -E 'Test-only duplication|already enforces|Scope of the gates' viber/skills/code-auditor/references/lenses/design.md && grep -n -E '^Copy-pasted blocks|getline|git grep -lw' viber/skills/code-auditor/references/lenses/design.signals.md && ! grep -q 'xargs -0 wc -l' viber/skills/code-auditor/references/lenses/design.signals.md -> both test files pass (block 1 still prints a `<product> <churn> <path>` row for a non-ASCII path, read after `bugs.signals.md` and `tests.signals.md` are final), the first grep prints all three lines, the second prints the copy-paste heading, its awk window command and the dead-export command, and the negated grep exits 0
- DoD: `design.md` passes its `lenses.unit.test.ts` cases; `## Verify` names which gates bind which angle; its linter exclusion reads "already enforces"; `## Excluded` still holds the test-only duplication bullet; `## Severity` holds no band reachable only by a finding its gates refute; `design.signals.md` passes its own and non-ASCII cases of `lens-map-signals.test.ts`, holds no `xargs -0 wc -l` block, and its dead-export line is a bash block; `design.signals.md` holds a "Copy-pasted blocks" bash block printing file pairs that share normalized 6-line windows
Invoke skill `supercc:skill-designer` through Skill before the first edit.
<!-- /TASK -->

<!-- TASK -->
### T5 - Verify web-performance claims from code and own rendering mode
- TDD: none
- Covers: #4, #8, #9, #11
- Uses: none
- Depends-on: T1
- Files: viber/skills/code-auditor/references/lenses/web-performance.md
- Delivers: the web-performance lens with these items of `.temp/lens-review/web-performance.md` applied: gap 2 (the framework-image exclusion limited to format and compression, the lazy-by-default hero named in `lcp-critical-path`); gap 3 (static VERIFIED route for an LCP candidate, a forced reflow in a loop or an unbounded list, INCONCLUSIVE narrowed to measured values); gap 4 (back/forward cache blockers); gap 5 (HTML rendered per request that could be static, with its Verify line); gap 6 (`.next/` in step 2, the pnpm-safe attribution command in step 5, the dynamic-route fallback in step 3); gaps 7 to 10 (angle wording); gap 11 as an intro hand-off of a listener, timer or subscription never removed on unmount to the bugs lens; step 1's cap limited to byte claims; the Severity additions; every "What to cut" item. Rejected: the `size-limit` sentence (a project-specific tool, rare in audited repositories); the service-worker, speculation-rules and compression additions the report itself does not recommend.
- Verification: node --test --test-name-pattern "web-performance\.md" tests/viber/lenses.unit.test.ts && grep -n -E 'on unmount|format and compression|back/forward|\.next/' viber/skills/code-auditor/references/lenses/web-performance.md && ! grep -q 'Order of impact' viber/skills/code-auditor/references/lenses/web-performance.md -> the test file passes, the grep prints the hand-off, the exclusion, the bfcache clause and the `.next/` step, and the negated grep exits 0
- DoD: `web-performance.md` passes its `lenses.unit.test.ts` cases; its intro hands a listener, timer or subscription never removed on unmount to the bugs lens; its framework-image exclusion names only format and compression; `asset-and-delivery` names back/forward cache blockers; Verify step 2 names `.next/`; `## Hunts` holds no "Order of impact" sentence
Invoke skill `supercc:skill-designer` through Skill before the first edit.
<!-- /TASK -->

<!-- TASK -->
### T6 - Own overload, queries and ReDoS in the runtime-performance lens
- TDD: none
- Covers: #3, #8, #9, #11
- Uses: none
- Depends-on: T1
- Files: viber/skills/code-auditor/references/lenses/runtime-performance.md
- Delivers: the runtime-performance lens with these items of `.temp/lens-review/runtime-performance.md` applied: gap 1 (retries in `io-per-item`, the missing timeout in `blocking-hot-path`, fan-out in `unbounded-growth`); gap 2 (`query-shape` in place of `schema-gap`); gap 3 (`repeated-setup` in place of `startup-cost`); gap 4 (intro hands no regex to security, the exclusion line, uncapped bodies, uploads and decompression); gap 6 (Prisma exclusion); gaps 7 to 9; the exclusion changes ("cited limit", "add a cache"); Verify notes 1 to 4; the Severity notes; every "What to cut" item that touches this file. Rejected: "fit b between the two largest N" (marginal against the existing 100N step); the deploy-time migration-lock class (the report itself advises leaving it out).
- Verification: node --test --test-name-pattern "runtime-performance\.md" tests/viber/lenses.unit.test.ts && grep -n -E '^### (query-shape|repeated-setup)$|backtracking|timeout|size cap' viber/skills/code-auditor/references/lenses/runtime-performance.md && ! grep -q -E '^### (schema-gap|startup-cost)$|regex to the security lens' viber/skills/code-auditor/references/lenses/runtime-performance.md -> the test file passes, the grep prints both angles and the regex, timeout and size-cap clauses, and the negated grep exits 0
- DoD: `runtime-performance.md` passes its `lenses.unit.test.ts` cases with `query-shape` and `repeated-setup` and neither `schema-gap` nor `startup-cost`; its intro hands no regex to the security lens and its hunts own a backtracking regex on untrusted input; its hunts name a missing timeout, a retry with no cap, backoff or jitter, concurrency equal to N, and a request body, upload or decompressed stream read with no size cap
Invoke skill `supercc:skill-designer` through Skill before the first edit.
<!-- /TASK -->

<!-- TASK -->
### T7 - Catch never-run assertions and uncollected tests in the tests lens
- TDD: none
- Covers: #5, #8, #9, #11
- Uses: none
- Depends-on: T1
- Files: viber/skills/code-auditor/references/lenses/tests.md
- Delivers: the tests lens with these items of `.temp/lens-review/tests.md` applied: gaps 1 to 7 (never-run assertions and broad exception tests, the dead-test procedure and VERIFIED line, `dead-tests` rewritten for uncollected tests, `pseudo-tested` with the history fix as the mutant and the missing test as the finding, `flaky-tests` causes, mock drift, the break-the-assertion probe); the arid-production-code wording; the hang-counts-as-killed line; `node --test --test-random-seed=<S>` (Node 26.1 or newer), the rspec and phpunit shufflers, retries off and Go `-race` in the flake procedure; bands aligned to 9-10, 7-8, 4-6, 1-3 with the cap at 3; the production-race clause in the intro; every "What to cut" item that touches this file, the hand-off to the design lens and the slow-test exclusion among them; an exclusion of test style or structure with no missed regression. Rejected: the CI-only-test INCONCLUSIVE clause (the report advises it only once it proves a real false-positive source).
- Verification: node --test --test-name-pattern "tests\.md" tests/viber/lenses.unit.test.ts && grep -n -E 'random-seed|collect|structure' viber/skills/code-auditor/references/lenses/tests.md && ! grep -q -E 'design lens|Slow tests' viber/skills/code-auditor/references/lenses/tests.md -> the test file passes, the grep prints the `--test-random-seed`, collection and structure-exclusion lines, and the negated grep exits 0
- DoD: `tests.md` passes its `lenses.unit.test.ts` cases; its intro names no design lens; `## Excluded` excludes test style or structure with no missed regression; `## Verify` holds the dead-test procedure and `--test-random-seed`; the `## Severity` cap sits at 3, below every band naming a VERIFIED case
Invoke skill `supercc:skill-designer` through Skill before the first edit.
<!-- /TASK -->

<!-- TASK -->
### T8 - Describe the six lenses in a code-auditor README
- TDD: none
- Covers: #10, #11
- Uses: none
- Depends-on: T2, T4, T5, T6, T7
- Files: viber/skills/code-auditor/README.md
- Delivers: an English `README.md` beside `SKILL.md`, read by people and loaded by no agent: one section per lens in the order bugs, security, web-performance, runtime-performance, tests, design, each giving what the lens audits, every `### ` angle of its lens file by slug with a one-line summary, its oracle and `Worktree:` value, and its hand-offs; one ownership table with one row per hand-off clause in the intros and `## Excluded` sections of the six lens files, in the row shape `| <class> | <from lens> | <owner lens> | `<owner angle>` |`, where both lens columns hold the lens file slug (`runtime-performance`, never "runtime performance lens") and the owner angle is the receiving lens's angle covering that class. Each lens section opens with a line starting `Audits:` and holds a line starting `Verified by:` that names its oracle and `Worktree:` value. It states what holds now, with no change history, and repeats no signal command.
- Verification: cd viber/skills/code-auditor && grep -h '^### ' references/lenses/bugs.md references/lenses/security.md references/lenses/web-performance.md references/lenses/runtime-performance.md references/lenses/tests.md references/lenses/design.md | sed 's/^### //' | while read -r s; do grep -q -F -e "$s" README.md || echo "MISSING $s"; done; awk -F'|' 'NF==6 && $5 ~ /`/ {o=$4; a=$5; gsub(/[ `]/,"",o); gsub(/[ `]/,"",a); print o, a}' README.md | while read -r o a; do grep -q -x -e "### $a" "references/lenses/$o.md" || echo "BAD $o $a"; done; grep -c -E '^(Audits|Verified by):' README.md; awk -F'|' 'NF==6 && $5 ~ /`/' README.md | wc -l -> prints no `MISSING` and no `BAD` line, the `Audits:`/`Verified by:` count is 12, and the ownership-row count is at least 20 (the six lens files after this change hold about 25 hand-off clauses)
- DoD: each of the six lens sections holds one `Audits:` line and one `Verified by:` line; `README.md` names every angle slug that a `### ` heading of the six lens files declares; it gives each lens's `Worktree:` value as its lens file states it; every ownership-table row names an owner angle that is a `### ` heading of the owner lens's file; the table holds a row for each hand-off clause of the six lens files; it holds no em or en dash and no ```bash block
<!-- /TASK -->

## Contracts

### C1 - Signal blocks read by position

File: tests/viber/lens-map-signals.test.ts

Zero-based index of the ```bash block in its signals file after this change, and the output a test reads from it:
- `bugs.signals.md` [0]: fix history, `uniq -c` rows of files touched by commits whose subject matches `fix|bug|regress|revert` inside `--since='12 months ago'`.
- `bugs.signals.md` [3]: error swallowing, `<path>:<count>` rows from `git grep -c`, counting `try { run(); } catch (e) {}`.
- `web-performance.signals.md` [0]: framework config files across the whole repository, one path per line.
- `web-performance.signals.md` [1]: framework dependencies across the whole repository, one `package.json` path per line.
- `web-performance.signals.md` [2]: HTML and template files under the scope, one path per line.
- `design.signals.md` [1]: churn times size, `<product> <churn> <path>` rows.
- `tests.signals.md` [0]: source files with no test file, one path per line.
- `tests.signals.md` [7]: flake risk inside test files, `<path>:<line>:<content>` rows.
- `runtime-performance.signals.md` [2]: I/O near a loop, `git grep -n -A6` rows.

### C2 - Word-boundary signals problem

File: tests/viber/lenses.unit.test.ts

`signalsProblems(text: string): string[]` adds the entry `"word boundary \\b"` when a signals text holds `\b`.
