# final review

## Gates

- Build - none - the plan moves markdown, JSON and bash scripts only; nothing compiles
- Tests - fail - 30s - `Tests: 570 passed, 1 failed, 3 skipped, 574 total` - LOG: C:/Projects/p2p2.claude/.temp/superdev/logs/20260917T120846Z-node-test-tests-.test.ts-16305.log
- Integration - none - the repo has no integration suite, and the new `e2e` skill needs a running host application that this repo does not have

## Prior findings

| ID | Title | Verdict | Evidence |
| --- | --- | --- | --- |
| I1 | `Write-once check covers the index` | ADDRESSED | superdev/agents/qa-writer.md:108 |
| I2 | `Area rule paraphrased, not shared` | ADDRESSED | superdev/agents/qa-writer.md:67 |
| I3 | `grepOnlyPath duplicated across test files` | ADDRESSED | tests/harness/stub.ts:52 |

Re-verified at this stage, not carried over from `prior`: the write-once check names exactly the two
document paths and states the index is appended (qa-writer.md:108-112); the `Areas:` paragraph carries the
enumerated roots, the add/modify/delete qualification and the no-slash case (qa-writer.md:67-74); no
`grepOnlyPath` exists anywhere under `tests/` and both suites import `coreUtilsPath` from
`tests/harness/stub.ts`.

## Findings

### Critical

- C1 - `Dead permission entry reddens the gate` - superdev/skills/e2e/SKILL.md:7 - the `allowed-tools`
  line carries `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh:*)`, but `commit-task.sh` is git mode
  100644 and is never invoked bare: `## Commit` (SKILL.md:150) runs it as
  `bash "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" …`. Two consequences, both live. First,
  `tests/portability.test.ts:440` reads that frontmatter path as a bare invocation and fails - the
  repo-root suite is red at HEAD (570 pass, 1 fail), which is the plan's whole `#### Tests` gate. Second,
  the pattern is dead weight even on its own terms: a `Bash(<path>:*)` entry prefix-matches the command
  string, and a command beginning `bash "` never matches a pattern beginning with the script path, so the
  entry pre-approves nothing and the commit call still prompts. Every other superdev skill carries such a
  pattern only for a script it `!`-preloads directly (`intent`, `phases`, the two reviewers, and this
  skill's own `check-playwright.sh`, which is 100755); `superbuild` and `simplebuild` call
  `commit-task.sh` exactly the same way and carry no entry for it. Fix: drop
  `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh:*)` from the `allowed-tools` line - the bare `Bash`
  entry already there covers the `bash …` call, matching both orchestrators - and re-run the suite.

### Important

- I4 - `Writable-locations invariant not amended` - CLAUDE.md:318 - Task 8 extended the `docs/<layer>/`
  bullet with `docs/qa/` and noted there that the `e2e` flow commits `@playwright/test` files "into the
  host's own e2e test directory, not under `docs/qa/`", but left the very next invariant reading "Only
  three host-repo locations are writable: `docs/<layer>/` …, `.claude/` … and `.temp/`". `e2e-writer`
  writes one spec file per scenario into `<spec-dir>` (e2e-writer.md:86), a host path resolved from the
  host's own memory and therefore none of the three; the `e2e` skill then commits it. As it stands the
  repo's governing document asserts a rule this build's own delivery breaks, in the one file a future
  editor consults before touching any plugin, so the next person either treats `e2e-writer` as a violation
  to "fix" or treats the invariant as advisory. Fix: amend that bullet to name the fourth case explicitly -
  the host's own test directory, written only by `e2e-writer` under the `e2e` skill, as a location the
  host's memory names rather than one a plugin chooses - so the rule and the delivery agree.

## Debt

- M6 - `Slug example contradicts the slug rule` - superdev/references/qa-format.md:342 - the
  `## Automation status lines` worked example writes `qa-02-odrzucenie-bez-powodu.spec.ts` for the entry
  titled `QA-02 Odrzucenie bez powodu jest blokowane` (qa-format.md:214), while `e2e-writer` fixes the
  name as the title lowercased, diacritics folded, trimmed on a word boundary to roughly forty characters
  (e2e-writer.md:79-81) - which yields `qa-02-odrzucenie-bez-powodu-jest-blokowane.spec.ts`, 36 characters
  of slug and so untrimmed. The other three example paths in that block use the full title. Traceability
  is unaffected because the status line records the path the writer actually wrote, but the reference and
  the agent that reads it disagree on the one rule the reference is supposed to own.
- M7 - `accounts label typed two ways` - superdev/skills/e2e/SKILL.md:62 - the Preflight table types
  `accounts:` as "the file the logins and their credentials live in" and gives its fallback as "the
  handoff's `Accounts:` line", whose format is prose (`<role> <login> / <role> <login> - <where the
  passwords live>`, qa-format.md:145), not a path. `e2e-writer` reads file-valued labels by Read
  (e2e-writer.md:19-22), so on that fallback it is handed a string no Read resolves. It recovers, because
  the agent independently names the handoff's `Accounts:` line as its own fallback (e2e-writer.md:38-39),
  but the label carries two types depending on which branch filled it. Cheapest resolution: on the
  fallback branch omit `accounts:` entirely - `## Loop` already tells the skill to omit a label this host
  has none for, and the writer's own fallback then covers the case once instead of twice.

## Assessment

The build's cross-task seams hold - the `check-playwright.sh` two-line contract, the `QA:` / `E2E:` /
`QA-INDEX:` relay, the `e2e-writer` label set and both `CARRY:` lines from Task 4 are all satisfied at both
ends - but the plan's `#### Tests` gate is red at HEAD on a frontmatter entry that also pre-approves
nothing, and the root `CLAUDE.md` now contradicts the delivery it documents.

VERDICT: FAIL
