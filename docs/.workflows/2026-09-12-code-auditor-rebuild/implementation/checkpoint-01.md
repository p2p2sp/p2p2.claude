# checkpoint review - checkpoint-01.md

## Gates

- Build (every task's `#### Build` block): `none (no build step in this repo)` - nothing to run, as the plan declares for Tasks 1-8.
- `node --test "tests/**/*.test.ts"` (Task 8's suite command, run as the superset of the per-task ones) - PASS: 663 tests, 660 pass, 0 fail, 3 skipped, 58.5s.
- `! grep -rn $'–\|—' superfix/skills/code-auditor/scripts/collect_signals.sh tests/superfix/collect_signals.test.ts` (Task 1) - PASS, no output, exit 0.
- `! grep -rn $'–\|—' superfix/skills/code-auditor/scripts/collect_edges.sh tests/superfix/collect_edges.test.ts` (Task 2) - PASS, no output, exit 0.
- `! grep -rn $'–\|—' superfix/skills/code-auditor/scripts/collect_signals.sh superfix/agents/scout.md tests/superfix/collect_signals.test.ts` (Task 3) - PASS, no output, exit 0.
- `grep -c '^## ' superfix/skills/code-auditor/references/synthesis.md` (Task 4) - PASS, prints `9`.
- `grep -n 'Further findings\|critic returned no verdict\|## Reproduce\|Severity calibration' superfix/skills/code-auditor/references/synthesis.md` (Task 4) - PASS, every one of the four terms hits.
- `! grep -rn $'–\|—' superfix/skills/code-auditor/references/synthesis.md` (Task 4) - PASS, no output, exit 0.
- `grep -n '^model: inherit$' superfix/agents/detective.md superfix/agents/critic.md` (Task 5) - PASS, one hit per file.
- `grep -n '^effort: high$' superfix/agents/detective.md superfix/agents/critic.md` (Task 5) - PASS, one hit per file.
- `grep -n '^model: haiku$' superfix/agents/scout.md superfix/agents/edge-scout.md` (Task 5) - PASS, one hit per file, unchanged.
- `grep -n 'claim.md' superfix/agents/detective.md superfix/agents/critic.md` (Task 5) - PASS, at least one hit per file.
- `! grep -n 'report path' superfix/agents/critic.md` (Task 5) - PASS, no output.
- `! grep -rn $'–\|—' superfix/agents/` (Task 5) - PASS, no output, exit 0.
- Tasks 6, 7 and 8 are not yet implemented, so their own gate commands were not run at this round.

no e2e or integration suite in this host

## Findings

### Critical

- none.

### Important

- none.

### Needs decision

- none.

## Debt

- M1 - superfix/skills/code-auditor/scripts/collect_edges.sh:130 - the `--scope` reject helper, the raw absolute-path check, the `./` + trailing-slash normalisation and the post-normalisation `.. / absolute` case are byte-for-byte duplicated from `superfix/skills/code-auditor/scripts/collect_signals.sh:130-160` (only the script name in the message differs), and `collect_edges.sh`'s own header states the rule is "normalised and validated exactly as in collect_signals.sh" - two copies of one contract that must now be kept in lockstep by hand, with no shared helper and no test that compares them. Both copies were read in full and they do agree today.
- M2 - superfix/skills/code-auditor/scripts/collect_signals.sh:193 - the comment justifying `awk -v d="$SCOPE"` claims "a scope carrying a newline cannot reach here (a `..`-free, non-absolute single argument)"; that reasoning is false, since a newline-bearing scope passes both the raw absolute check and the `..` case, and the same wrong justification is repeated at collect_edges.sh:378. The value is in practice safe (a directory name with a newline is pathological, and such a path is C-quoted by git and skipped anyway), so the code is fine and only the stated reason is wrong; a later maintainer relying on that sentence would draw a false conclusion about which values are filtered upstream.
- M3 - tests/superfix/collect_signals.test.ts:319 - `assert.ok(stderrLines[0].endsWith(scope.replace(/\/+$/, "")))` degrades to `endsWith("")`, a vacuous assertion, for exactly the two cases the strip exists for (`/` and `//`), so the message-names-the-raw-value contract is unasserted precisely where the raw value is most load-bearing (a bare root must not be reported as the empty normalised string). Same line at tests/superfix/collect_edges.test.ts:271. Exit code 2 and the single-stderr-line count are still asserted for both.

## Notes

- NOTE: plan defect - critic.md:36 keeps `SEVERITY: <your independent 0-10 judgement, or "unchanged" if you agree with the original>` while the same task removed the report path from the critic's inputs, so the critic can no longer see any "original" severity to agree with. This is plan Task 5 Approach step 3 ("Keep both `## Output` blocks byte-identical to today so `synthesis.md`'s fold rules keep matching"), and `synthesis.md`'s fold does handle both branches, so nothing downstream breaks; the branch is simply unreachable-by-construction wording.
- NOTE: plan defect - collect_signals.sh:382 keeps `git ... grep -lI -- "$stem"`, which the plan's Task 3 Approach step 3 pins as unchanged. The literal is passed as a regex and matched as a substring, while uniqueness is decided by whole-string comparison, so a literal containing `.` or one that occurs inside a longer non-path token still over-counts `dependents`. The lockstep rule itself is sound: a segment-aligned suffix relation between two finalised literals is impossible, because the member that runs out of segments is dropped in the same round it is found colliding (verified against the collision fixture's `a/index.ts` and root `index.ts` cases).
- The two `UNDERSPECIFIED:` lines naming the same rule across tasks (task-01-notes.md and task-02-notes.md, both on "order of `--scope` validation vs the unborn-HEAD check") were checked against both scripts: validation sits after `cd "$ROOT"` and before the `git rev-parse --verify HEAD` guard in each, so a bad scope exits 2 in both regardless of repo state. The decisions agree. The same holds for the two other paired decisions, the raw-value rejection message and the `.. `-pattern set, which are identical in both scripts.
- Carried to the final review, not a defect now: `superfix/skills/code-auditor/SKILL.md:47` still describes a five-key `signals.jsonl` record and neither Phase 1 command carries `--scope`, and `jobs.md` is untouched. Both are Task 7's declared work, and the `## Repo profile` / `## Severity calibration` section that critic.md and synthesis.md now depend on is Task 6's. The plugin is coherent only once Tasks 6-8 land.
- `rank.ts` was checked for the new `dependents_stem` key: it reads signal fields through `has`/`get` and projects a fixed `hotKeys` list, so the added key cannot break it, which the green `rank.test.ts` in the full run confirms.
- The probe loop moved out of a pipeline into `while ... done <<< "$candidates"`, so it now runs in the main shell instead of a subshell. Nothing in the loop relies on subshell isolation and no variable set inside it is read after the loop, so the change is inert beyond materialising the candidate list, which is what makes the `scope:` count line possible.

## Assessment

Tasks 1-5 deliver a coherent slice: the `--scope` flag is applied at exactly one place in each script (after discovery, scoring and probing), which is what keeps a scoped record byte-identical to the unscoped one, and both scripts' tests prove that property rather than asserting on mocks. The lockstep literal algorithm terminates and cannot mint a suffix-colliding literal, the sidecar contract is consistent across synthesis.md, detective.md and critic.md, and no Critical or Important defect was found in the delta.

VERDICT: PASS
