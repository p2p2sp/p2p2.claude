# final review

## Gates

- Build - none - the plan moves markdown, JSON and bash scripts only; nothing compiles
- Tests - fail - 31s - `Tests: 570 passed, 1 failed, 3 skipped, 574 total` - LOG: C:/Projects/p2p2.claude/.temp/superdev/logs/20260917T120304Z-node-test-tests-.test.ts-3289.log
- Integration - none - the repo has no integration suite, and the new `e2e` skill needs a running host application that this repo does not have

## Coverage

- `Przełączniki domyślnie wyłączone` (#1) - met - superdev/skills/setup/assets/config.yml:8-10 (`qa`/`e2e-ui`/`e2e-api` seeded `false`); superdev/skills/superbuild/SKILL.md:155 and simplebuild/SKILL.md:145 only dispatch `qa-writer` when one of the three reads `true`, so all three off dispatches nothing and creates nothing under `docs/qa/`; gate: tests/superdev/bootstrap.test.ts (seed-when-absent), tests/superdev/read-config.test.ts.
- `Przełączniki rozwiązywane jak dotychczasowe` (#2) - met - superdev/scripts/read-config.sh:38 (nine-key loop, fixed order); tests/superdev/read-config.test.ts ("every key set true", "output always carries ... in that fixed order", "e2e-ui: true and e2e-api: true resolve independently").
- `Narzędzia raportowane przez setup` (#3) - met - superdev/scripts/check-playwright.sh:35-52 (the two fixed lines, exit 0, no install); superdev/skills/setup/scripts/bootstrap.sh:92 calls it after the config block; gate: tests/superdev/check-playwright.test.ts, tests/superdev/bootstrap.test.ts.
- `Dokument odbioru istnieje` (#4) - met - superdev/agents/qa-writer.md:108-113 (write-once check over the acceptance-document path, `VERDICT: FAIL`/`REASON: entry exists ...` on a re-write); superdev/skills/superbuild/SKILL.md:159 and simplebuild/SKILL.md:149 relay `QA:`/failure lines into the Step 5 summary.
- `Scenariusz na każde kryterium` (#5) - met - superdev/agents/qa-writer.md:115-118 (every criterion gets a scenario or an out-of-scope line with reason) and its `## Validate` step (qa-writer.md:158-159); superdev/references/qa-format.md `## Acceptance document` rules.
- `Kroki czytelne dla człowieka` (#6) - met - superdev/references/qa-format.md:76-83 (one action/one outcome per row, no status column, no automation vocabulary), enforced by qa-writer.md's `## Validate` grep check (qa-writer.md:162-164).
- `Indeks jako widok regresji` (#7) - met - superdev/references/qa-format.md `## Index line`; superdev/agents/qa-writer.md:143-147 (written only when the acceptance document was, existing lines never rewritten except the supersedes suffix).
- `Zastąpienia oznaczone` (#8) - met - superdev/references/qa-format.md `## Supersedes rule` (exact-match key, both-or-neither effect); superdev/agents/qa-writer.md:137-142.
- `Plik przekazania istnieje` (#9) - met - superdev/agents/qa-writer.md:124-136 (handoff written under `e2e-ui`/`e2e-api` independent of `qa`; sections gated independently; shared IDs with the acceptance document).
- `Wpisy przekazania komplette` (#10) - met - superdev/references/qa-format.md `## Handoff file` (all seven/five fields, `unknown` never invented); superdev/agents/qa-writer.md `## Validate` (qa-writer.md:165).
- `Pominięcia nazwane` (#11) - met - superdev/agents/qa-writer.md:149-151 (`skipped - <reason>` per artifact when the matching change is absent or the switch is off), relayed verbatim by both orchestrators' Step 5.
- `Warunki wstępne przebiegu E2E` (#12) - met - superdev/skills/e2e/SKILL.md `## Preflight` steps 2-4 (`AskUserQuestion` on a missing host-memory value or missing tooling, install only on explicit yes, abort leaves nothing generated).
- `Testy zielone przed commitem` (#13) - met - superdev/agents/e2e-writer.md `## Run` (green required before a `file` status line; an application defect is `blocked` with the generated file deleted, never a code fix).
- `Testy commitowane i trasowalne` (#14) - met - superdev/skills/e2e/SKILL.md `## Commit` (exactly the generated specs plus the handoff, via `commit-task.sh`'s declared-set check) and `## Loop` step 2 (a re-run skips `file` IDs, retries `blocked` ones); test titles carry the ID and criterion title (agents/e2e-writer.md:83-84).
- `Katalog i dokumentacja aktualne` (#15) - met - superdev/.claude-plugin/plugin.json (`./skills/e2e/`, `./agents/qa-writer.md`, `./agents/e2e-writer.md`); superdev/README.md; root CLAUDE.md; superdev/hooks/content/manifest.md - all describe the three switches, `docs/qa/`, and the two-stage model; gate: Task Checks of Task 8 (`node -e "JSON.parse(...)"`, the grep checks).
- `Testy skryptów zielone` (#16) - not met - the Tests gate command (`node --test "tests/**/*.test.ts"`) is red: `tests/portability.test.ts`'s exec-bit check fails for `superdev/scripts/commit-task.sh` (git mode `100644`). See C1.

## Findings

### Critical

- C1 - `commit-task.sh` invocation trips the exec-bit gate, breaking the test suite - superdev/skills/e2e/SKILL.md:7 - Task 7's `allowed-tools` line adds `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh:*)`. `tests/portability.test.ts`'s `execBitViolations` check (tests/portability.test.ts:429, logic at :243-261) treats any occurrence of a script's invocation text not immediately preceded by `bash`/`sh`/`node` as a "bare" invocation requiring git mode `100755`; the word immediately before this occurrence is `Bash` (capitalized, from the `allowed-tools` list), which is not in the lowercase interpreter set, so it counts as bare. `superdev/scripts/commit-task.sh` has never carried the exec bit (100644 since it was first added, across several unrelated prior commits) and nothing referenced it this way before this build, so the check passed until now. Matters because this is exactly the plan's own Tests gate command, `node --test "tests/**/*.test.ts"`, which criterion 16 requires green, and it is red on the current tree (`Tests: 570 passed, 1 failed, 3 skipped, 574 total`). Fix: give `superdev/scripts/commit-task.sh` the exec bit (`git update-index --chmod=+x superdev/scripts/commit-task.sh`), matching the precedent Task 2 set for `check-playwright.sh` and the existing `read-config.sh`/`Bash(...)` pairing in superbuild/simplebuild's own `allowed-tools`; or drop the redundant `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh:*)` pattern from `superdev/skills/e2e/SKILL.md:7`, since the plain `Bash` entry already on that same line pre-approves the call it is meant to cover.

## Assessment
Every acceptance criterion but one is satisfied by code and tests already in the tree, and the checkpoint round's three Important findings are confirmed addressed; the plan's own Tests gate is red on the current tree, breaking criterion 16 (`Testy skryptów zielone`) through a one-line consequence of Task 7's `allowed-tools` addition on a script that was never given the exec bit.

VERDICT: FAIL