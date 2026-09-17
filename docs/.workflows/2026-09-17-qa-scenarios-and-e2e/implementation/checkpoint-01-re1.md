# re-review review

## Gates

- Build - none - the plan moves markdown, JSON and bash scripts only; nothing compiles
- Tests - pass - 31s

## Prior findings

| ID | Title | Verdict | Evidence |
| --- | --- | --- | --- |
| I1 | `Write-once check covers the index` | ADDRESSED | superdev/agents/qa-writer.md:108 |
| I2 | `Area rule paraphrased, not shared` | ADDRESSED | superdev/agents/qa-writer.md:67 |
| I3 | `grepOnlyPath duplicated across test files` | ADDRESSED | tests/harness/stub.ts:52 |

I1 - step 2 now scopes the write-once check to exactly two named paths and states the index is appended,
never checked; `qa-format.md:10` carries the same qualification in the sentence that used to read "Both
files", so the definition the agent reads first and the step that applies it no longer disagree, and step 6
("Absent -> create it") is now the consistent reading rather than the contradicting one.

I2 - qa-writer's `Areas:` paragraph carries `changelog-writer.md:41`'s rule clause for clause: the
enumerated roots (`superdev`, `superui`, `supergh`, `superfix`, `superbiz`, `tests`), the add/modify/delete
qualification, the no-slash case and the dedupe order. Diffed both statements; they agree. `qa-format.md:262`
now points at that statement instead of asserting agreement.

I3 - the helper is one definition in `tests/harness/stub.ts`, imported by both suites; no `grepOnlyPath`
remains anywhere under `tests/`. Its comment drops the false "no `git`" claim and records why the `git`
branch is indifferent.

## Debt

- M4 - `Sync obligation is one-way` - superdev/agents/qa-writer.md:72 - the new clause binds the two
  statements of the area rule to change together, but it lives only in qa-writer.md and qa-format.md;
  `changelog-writer.md` has no mention of qa-writer or qa-format at all (grepped). An editor who opens
  `changelog-writer.md:41` - the file that owns the rule in practice - gets no signal that a second copy
  exists, which is the direction the drift will come from.
- M5 - `Per-script knowledge in the harness` - tests/harness/stub.ts:48 - `coreUtilsPath`'s comment reasons
  about `check-playwright.sh`'s `git rev-parse` branch and its temp cwd by name. The repo assigns
  `tests/harness/` shared mechanism only, "never per-script knowledge"; the rationale belongs in the
  consuming suite's header, with the harness comment saying only that the directory may ship `git`.

## Assessment

All three prior Important findings are fixed at both ends of each contract, the test suite is green, and the
fix introduced no Critical or Important defect - only two documentation-placement Minors.

VERDICT: PASS
