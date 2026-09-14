
## Task 2 - feat(superdev): add executor fork skill
- Covers: criteria #4, #7
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- Task 1 - blocks: Task 3

### Files
- add - superdev/skills/executor/SKILL.md

### Test Commands
#### Build
- `grep -cE '^(name: executor|context: fork|model: haiku|background: false)$' superdev/skills/executor/SKILL.md` (expected `4`)

#### Tests
- `grep -c 'effort:' superdev/skills/executor/SKILL.md` (expected `0`, exit 1)
- `grep -cE '^(allowed-tools: Read, Grep, Bash\(\$\{CLAUDE_PLUGIN_ROOT\}/skills/executor/scripts/run\.sh:\*\)|disallowed-tools: Edit, Write, NotebookEdit, Agent, AskUserQuestion, WebFetch, WebSearch, Skill)$' superdev/skills/executor/SKILL.md` (expected `2`)
- `grep -cE 'VERDICT: PASS \| FAIL \| ERROR \| TIMEOUT|^EXPECT:|^SUMMARY:|^FAILURES:|^LOG:' superdev/skills/executor/SKILL.md` (expected at least `5`)
- `LC_ALL=C grep -cE $'\xe2\x80(\x93|\x94)' superdev/skills/executor/SKILL.md` (expected `0`, exit 1)
- `node --test tests/portability.test.ts`

### Approach
1. Write the frontmatter: `name: executor`; a CSO `description:` of the shape "Runs one build, test, lint, type-check or any other shell command in a forked context and returns a short structured result (verdict, the tool's own summary line, the failures, a log path) instead of the full output. Use whenever a command's outcome must be judged but its output must not enter the caller's context - a build, a full or filtered test suite, a lint or type-check run, a script. Input is a labeled block: `command:` (required), `expect:`, `cwd:`, `timeout:`."; `context: fork`; `background: false`; `model: haiku`; no `effort:`; no `user-invocable:` line (the default keeps `/superdev:executor` usable); `allowed-tools` and `disallowed-tools` exactly as criterion 4 states.
2. Body `# Input contract`: the task arrives as the trailing `ARGUMENTS:` block (as `supergh:cli-executor` reads its own); labels `command:` (required, one shell line, run verbatim, never rewritten or completed), `expect:` (optional, one sentence naming the outcome the caller wants to see, e.g. "all green", "test X fails because the behaviour is missing", "build passes without warnings"), `cwd:`, `timeout:` (both passed through to `run.sh` untouched); an unknown label is ignored.
3. Body `# Iron law`: run and report, never fix; exactly one `run.sh` call per invocation, never a re-run "to confirm", never any other `Bash` command (no `sed -i`, no redirection into a tracked file, no `git checkout` / `reset` / `stash`, no `--fix` / `--write` flag, no install, no commit); a fork cannot prompt, so a missing `command:` is reported, never asked about; never look up a command in `CLAUDE.md` or anywhere else.
4. Body `# How to work`: (a) call `"${CLAUDE_PLUGIN_ROOT}/skills/executor/scripts/run.sh"` once, feeding the `command:` / `cwd:` / `timeout:` lines through a single-quoted heredoc (`<<'EOF'`) so the command line travels byte for byte; (b) read its `STATUS:` / `EXIT:` / `LOG:` / `LINES:` lines and map them to the verdict per the Task 1 contract; (c) when `LINES:` is 2000 or fewer, `Read` the whole log, otherwise `Read` the last 400 lines (offset `LINES - 400`) and `Grep` the log for the tool's failure markers (`FAIL`, `failed`, `Error`, `error TS`, `✗`, `×`, `AssertionError`) to locate every failure; (d) find the tool's own aggregate line verbatim (`42 passed, 3 failed`, `Build succeeded`, `0 problems`), or the last meaningful line when none; (e) judge `expect:` against the verdict, the aggregate line and the failure list, and reply.
5. Body `# Output format`, the reply is the whole output channel, at most 40 lines, in this fixed shape: line 1 `VERDICT: PASS | FAIL | ERROR | TIMEOUT (exit <n>, <duration>)`; line 2 `EXPECT: met | not met - <one line why>` only when `expect:` was given; `SUMMARY: <aggregate line verbatim>`; `FAILURES:` followed by one `- <test or target> - <message verbatim>` bullet per failure with its first stack frame indented below, at most 10 bullets then `- +<N> more, see LOG`, the section omitted when there is no failure; last line `LOG: <path>`; on `VERDICT: ERROR` the `REASON:` text from `run.sh` goes into `SUMMARY:`. Add a `PASS` example and a `FAIL` example in fenced blocks (language `text`, never a `!` fence).
6. Close with `# Safety`: never mutate the working tree, never ask the user, never dump raw log lines beyond the summary and the per-failure message plus first frame.

### Failure modes
- when `command:` is absent from `ARGUMENTS` -> response reply `VERDICT: ERROR (exit -, -)` with `SUMMARY: missing command:` and no `LOG:` line, log none, test grep for the `missing command:` wording in SKILL.md
- when `run.sh` prints `STATUS: error` -> response `VERDICT: ERROR` with the `REASON:` text as `SUMMARY:` and `LOG:` when the script printed one, log none, test grep for `STATUS: error` mapping wording in SKILL.md
- when `run.sh` prints `STATUS: timeout` -> response `VERDICT: TIMEOUT`, `SUMMARY:` the last meaningful log line, `LOG:`, log none, test grep for `TIMEOUT` in SKILL.md
- when the log holds no recognisable aggregate line -> response `SUMMARY:` carries the last non-empty log line, log none, test covered by the "last meaningful line" wording check in SKILL.md
- when `expect:` was given and the observed outcome contradicts it (e.g. expected a failing test but `EXIT: 0`) -> response `EXPECT: not met - <why>` while `VERDICT:` still reports the command's own outcome, log none, test grep for `not met` in SKILL.md

### Contracts
- consumes the Task 1 stdin block and stdout lines (feeds the block via a quoted heredoc; maps `STATUS` / `EXIT` to `VERDICT`)
- reply shape (`VERDICT:`, optional `EXPECT:`, `SUMMARY:`, optional `FAILURES:`, `LOG:`; at most 40 lines); consumed by Task 3 (both implementors read `VERDICT:` and `EXPECT:` and open `LOG:` only when the failure list is not enough)
- `expect:` is free text from the caller; it never influences which command runs, only the `EXPECT:` judgement

### DoD
`superdev/skills/executor/SKILL.md` exists, every grep under Test Commands returns its expected count, `node --test tests/portability.test.ts` is green (no `!` preload, no unquoted glob), and the body reads as a complete, self-contained instruction for a haiku fork with no reference to `recipe.sh`, `Scope hints:` or `BLOCKED`.


### Covered criteria
4. `superdev/skills/executor/SKILL.md` istnieje z frontmatter `name: executor`, opisem pod CSO, `context: fork`, `background: false`, `model: haiku` (bez `effort:`), `allowed-tools: Read, Grep, Bash(${CLAUDE_PLUGIN_ROOT}/skills/executor/scripts/run.sh:*)`, `disallowed-tools: Edit, Write, NotebookEdit, Agent, AskUserQuestion, WebFetch, WebSearch, Skill`, i treścią definiującą kontrakt wejścia (`command:`, `expect:`, `cwd:`, `timeout:`), żelazną zasadę "uruchom i zaraportuj, nigdy nie naprawiaj", sposób pracy (heredoc do `run.sh`, odczyt logu) i format wyjścia (`VERDICT: PASS | FAIL | ERROR | TIMEOUT`, `EXPECT:`, `SUMMARY:`, `FAILURES:`, `LOG:`, maksymalnie 40 linii).
7. Żaden nowy ani zmieniony plik nie zawiera myślnika em (U+2014) ani en (U+2013).
