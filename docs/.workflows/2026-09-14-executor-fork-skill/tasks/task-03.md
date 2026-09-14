
## Task 3 - feat(superdev): route implementors through executor and document it
- Covers: criteria #5, #6, #7
- TDD: none
- Model: sonnet
- Effort: medium

### Dependencies
- Task 2 - blocks: none

### Files
- modify - superdev/agents/superbuild-task-implementor.md (`## 2. Build + Test`, the `TDD discipline` bullet)
- modify - superdev/agents/simplebuild-task-implementor.md (`## 3. Run Build & Tests`, the `TDD discipline` bullet)
- modify - superdev/.claude-plugin/plugin.json (`skills`)
- modify - superdev/README.md (table under `### Entry and environment`)
- modify - CLAUDE.md (the `superdev` bullet under `## What this repo is`; the `.temp/` sentence under `## Cross-plugin architecture invariants`)

### Test Commands
#### Build
- `node -e "const s=JSON.parse(require('fs').readFileSync('superdev/.claude-plugin/plugin.json','utf8')).skills; if(!s.includes('./skills/executor/')) process.exit(1)"`

#### Tests
- `grep -c 'superdev:executor' superdev/agents/superbuild-task-implementor.md superdev/agents/simplebuild-task-implementor.md` (expected at least `2` per file)
- `grep -cE 'never go through raw .Bash' superdev/agents/superbuild-task-implementor.md superdev/agents/simplebuild-task-implementor.md` (expected at least `1` per file)
- `grep -c 'Fix loop max 5 rounds' superdev/agents/superbuild-task-implementor.md superdev/agents/simplebuild-task-implementor.md` (expected `1` per file)
- `grep -c '^| `executor` | Fork - ' superdev/README.md` (expected `1`)
- `grep -c '\.temp/superdev/logs/' CLAUDE.md` (expected at least `1`)
- `LC_ALL=C grep -cE $'\xe2\x80(\x93|\x94)' superdev/agents/superbuild-task-implementor.md superdev/agents/simplebuild-task-implementor.md superdev/README.md CLAUDE.md` (expected `0` for each, exit 1)
- `node --test "tests/**/*.test.ts"`

### Approach
1. In both implementors, rewrite step 1 of the build-and-test section to: run every command through the `executor` skill (`Skill` tool, `superdev:executor`), one command per invocation, with `command:` copied verbatim from the task's `Test Commands` and `expect:` naming the outcome this run must show; build first, then tests; read the reply's `VERDICT:` and `EXPECT:` lines and open its `LOG:` path with `Read` only when `FAILURES:` is not enough to act. Keep step 2 ("Any red -> fix, then re-run from step 1") and the `Fix loop max 5 rounds` line unchanged.
2. In both implementors add one bullet right after that step: build, test, lint, type-check, formatter and script runs never go through raw `Bash`; raw `Bash` is for `git`, file inspection and other read-only work.
3. In both implementors extend the `TDD: required` bullet with: every VERIFY RED and VERIFY GREEN run of the `tdd` cycle goes through `superdev:executor` the same way, with `expect:` naming the test and the missing behaviour it must fail on (RED) or the green state it must show (GREEN).
4. In `superdev/.claude-plugin/plugin.json` insert `"./skills/executor/"` into `skills` right after `"./skills/tdd/"`.
5. In `superdev/README.md` add a row to the `### Entry and environment` table after the `tdd` row: `| \`executor\` | Fork - runs one build, test, lint or any other command on haiku and returns a short result (\`VERDICT:\`, \`EXPECT:\`, the tool's summary line, the failures, a \`LOG:\` path under \`.temp/superdev/logs/\`) instead of the full output; both task implementors route every build and test run through it, and you can call it yourself with a \`command:\` line. |`.
6. In root `CLAUDE.md`: add `.temp/superdev/logs/<timestamp>-<slug>-<pid>.log` (the `executor` fork's command logs) to the `.temp/` sentence next to `.temp/superdev/{memory,rules}/capture-<RUN_ID>.md`; add one sentence to the `superdev` bullet under `## What this repo is` stating that both task implementors run build and test commands only through the `executor` fork skill (haiku), which keeps full tool logs out of the implementor's context and returns a short verdict, and that it is model-invocable via its `description:`.

### Failure modes
- none - documentation

### Contracts
- consumes the Task 2 reply shape (implementors read `VERDICT:`, `EXPECT:`, `FAILURES:`, `LOG:`)
- consumes the Task 1 log location (README and CLAUDE.md name `.temp/superdev/logs/`)
- `plugin.json` `skills[]` stays a flat list of directory paths with a trailing slash; `agents[]` untouched (a worker never appears in both)

### DoD
Both implementors name `superdev:executor` in their build-and-test step and in the TDD bullet with the raw-`Bash` prohibition, `plugin.json` parses and lists `./skills/executor/`, the README row and both CLAUDE.md mentions exist, no touched file carries an em or en dash, and `node --test "tests/**/*.test.ts"` is green.


### Covered criteria
5. `superdev/.claude-plugin/plugin.json` `skills[]` zawiera `./skills/executor/`, `superdev/README.md` ma wiersz `executor` w tabeli "Entry and environment", a root `CLAUDE.md` wymienia `.temp/superdev/logs/` przy `.temp/<plugin>/` i executor w opisie `superdev`.
6. Oba implementory w kroku Build + Test uruchamiają każdą komendę przez `superdev:executor` (Skill tool, jedna komenda na wywołanie, `command:` dosłownie plus `expect:`), z zakazem builda, testów, lintu, type-checku i formatera przez surowy `Bash`, przy niezmienionej pętli poprawek (build najpierw, potem testy, do 5 rund); wpis o TDD kieruje VERIFY RED / VERIFY GREEN tą samą drogą.
7. Żaden nowy ani zmieniony plik nie zawiera myślnika em (U+2014) ani en (U+2013).
