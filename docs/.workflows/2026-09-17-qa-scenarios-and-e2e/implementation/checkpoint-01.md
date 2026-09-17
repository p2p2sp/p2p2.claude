# checkpoint review

## Gates

- Build - none - the plan moves markdown, JSON and bash scripts only; nothing compiles
- Tests - pass - 29s

## Findings

### Important

- I1 - `Write-once check covers the index` - superdev/agents/qa-writer.md:103 - step 2 gates on "every
  artifact this run would write whose path already exists", but `<refs>/qa-format.md:3-6` - the file this
  agent is told to read before writing anything - defines the index `docs/qa/README.md` as one of the
  "Three artifacts", while its line 10 scopes write-once to "Both files of a build". An agent applying
  step 2 to the definition it was just handed fails every build after the first, because
  `docs/qa/README.md` always exists by then, and step 2 stops "having written nothing at all" - no
  acceptance document, no handoff file, no index line, `VERDICT: FAIL`. Step 6 ("Absent -> create it",
  existing groups kept) contradicts that reading, so the agent is left to pick. Fix: name the two files
  in step 2 instead of the word "artifact" - "the acceptance document and the handoff file, whose paths
  already exist" - and say the index is appended to, never write-once.

- I2 - `Area rule paraphrased, not shared` - superdev/agents/qa-writer.md:67 - the area of a build is now
  derived in two agents from two different statements of one rule. `changelog-writer.md:41` enumerates the
  roots that force a second segment (`superdev`, `superui`, `supergh`, `superfix`, `superbiz`, `tests`)
  and qualifies the paths as add/modify/delete; qa-writer's copy says only "one segment deeper when that
  segment is a plugin or suite root" with no list, and `qa-format.md:260` just asserts the two agree.
  qa-writer never reads `changelog-writer.md`, so the paraphrase is the whole rule it has: a build
  touching `superdev/skills/...` can be filed under `superdev` in `docs/qa/README.md` and under
  `superdev/skills` in `docs/changelog/README.md`, splitting the same build across two group names in the
  two indexes that are meant to be read side by side. Fix: give the rule one owner - either spell out the
  enumerated root list verbatim in qa-writer, or lift the derivation into a reference both agents read.

- I3 - `grepOnlyPath duplicated across test files` - tests/superdev/bootstrap.test.ts:37 - the same
  eight-line `grepOnlyPath()` is defined twice in this delta, identically apart from its error string
  (also at tests/superdev/check-playwright.test.ts:39). It is pure PATH/shell mechanism, which the repo's
  own convention assigns to `tests/harness/` ("shared *mechanism* only ... PATH stubs, shell discovery"),
  and both copies exist only because bootstrap.sh now shells out to check-playwright.sh. The two will
  drift: the shared header claim "no `playwright-cli`, no `git`" is already wrong on the CI ubuntu leg,
  where the first PATH directory holding `grep` is `/usr/bin` and that directory ships `git` too (the
  cases survive only because check-playwright.sh's `pwd` fallback is never reached there). Fix: move the
  helper into `tests/harness/` beside the other PATH helpers, import it in both files, and correct the
  rationale comment at the same time.

## Debt

- M1 - `Duplicate check-playwright test case` - tests/superdev/check-playwright.test.ts:92 - the fifth
  case is byte-identical to the second in stub, fixture and assertion, so it adds no coverage; the plan's
  Approach step 3 asked it to vary the `@playwright/test` dimension.
- M2 - `Nine positional booleans in expectedBody` - tests/superdev/read-config.test.ts:23 - nine unnamed
  positional `boolean` parameters across fifteen call sites; a transposed pair of `false` arguments is
  invisible. An options object keyed by switch name would make each call site self-checking.
- M3 - `Not automatable limited to ui IDs` - superdev/agents/qa-writer.md:126 - qa-writer restricts
  `## Not automatable` to `ui` IDs, `qa-format.md:184` does not; an `api` scenario no test can drive has
  no home and lands under `## API scenarios` as a normal entry.

## Notes

Task 1's commit (3462fd0) carries two files no task declared and no note records: `CLAUDE.md` (+6, the
stack-agnostic scope paragraph) and `docs/competitive-analysis-2026-09-17.md` (+444, an unrelated dev
note). Neither appears in Task 1's `### Files` and `task-01-notes.md` has no `touched:` line for either,
so the build's declared-set guarantee did not hold for that commit. No forward risk was found - Task 8's
`### Files` names three other regions of `CLAUDE.md` and does not collide with the committed paragraph -
but the history now attributes 450 unrelated lines to a config-switch task.

The `CARRY:` lines in `task-04-notes.md` (`plugin.json` `agents[]` and the root `CLAUDE.md` agent list not
yet naming `qa-writer`) are correct and owned by Task 8; `subagent_type: superdev:qa-writer` does not
resolve until that task lands.

## Assessment

The scripts, the config layer and their tests are sound and green, but the QA layer's prompt contracts
carry one clause that can stop every repeat build from writing anything, one derived value specified twice
in disagreeing words, and one test helper duplicated against the repo's own harness rule.

VERDICT: FAIL
