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
