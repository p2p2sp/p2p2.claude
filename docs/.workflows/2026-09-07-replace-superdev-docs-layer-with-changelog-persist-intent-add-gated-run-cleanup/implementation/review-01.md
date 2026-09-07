## Output Format

### Strengths

- **Plan alignment is essentially exact.** All nine tasks were verified file by file against their `Files` / `Approach` / `Contracts` / `Edge cases` blocks: the five-key config rename (`read-config.sh:38`, `config.yml`, `bootstrap.sh:60,63`), `cleanup-run.sh`, the `Intent:` propagation in `decompose.sh:124-131,169,229`, the `superdev-changelog-writer` fork skill, the two-wave close-out plus cleanup step in both orchestrators, the docs-layer deletion, the `intent` skill's resume mode and history agent, and the `Intent:` preamble across all four spec/plan templates. Every changed file maps to a task's `Files` entry; no unmapped change.
- **`cleanup-run.sh` is a careful piece of work.** The safety guard rejects anything outside `docs/.workflows/` (an absolute path fails the prefix test, which is the documented intent, and the header comment says so explicitly rather than leaving it implicit). The completion check uses `10#` base-10 arithmetic, so zero-padded task numbers cannot be parsed as octal. The `Spec:` / `Intent:` resolution reuses `decompose.sh`'s exact trailing-HTML-comment strip, so the two scripts agree on what a preamble value is. Non-git, nothing-to-commit and skipped paths each produce their own single-line outcome.
- **The append-only guard on changelog entries is present and fails fast** - an existing entry file returns `VERDICT: FAIL` with `REASON: entry exists`, so a re-run can never overwrite recorded history. That is the one irreversible risk in the whole feature and it is closed.
- **Wave ordering is stated, not implied.** Both orchestrators place the changelog writer in a separate numbered item with explicit "after wave 1 completes" wording, so the `adr:` argument can actually carry wave 1's `ADR:` value. The conditional argument rules (`intent:` only when the decompose index printed one, `spec:` superbuild-only, `adr:` only when not `none`) match what the producers emit.
- **Test coverage for the new script is real, not nominal.** `cleanup-run.test.ts` (16 cases) exercises complete/incomplete runs, both commit prefixes, missing `Spec:` / `Intent:` lines, an `Intent:` naming a missing file, a workdir outside the guarded prefix, the no-git branch and the missing-argument exit.
- **The two recorded deviations are accurate and immaterial.** Splitting one planned `read-config.test.ts` fixture into two named tests improves failure isolation; writing this repo's own `.claude/superdev.yml` with shorter comments than the shipped asset touches no contract.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

**1. `docs/assets/superdev-flow.svg:452-453` - the diagram still documents the deleted docs layer**

Line 452 reads `A 3-5 sentence summary · ADR: / NODE: / RULE: / DOC: lines verbatim.` and line 453 reads `every GAP: → run superdev-memory, -rules or -docs`. Task 5 replaced the `DOC:` tagged line with `CHANGELOG:` / `INDEX:` and narrowed the GAP mapping to memory and rules only; Task 6 deleted `superdev-docs` outright. The diagram is embedded in `superdev/README.md` and renders publicly on GitHub, so it now tells readers that the orchestrator emits a tag it never emits and routes gaps to a skill that no longer exists.

Why the acceptance grep missed it: criterion #9 greps for `docs/product` and `superdev-docs`, and these two lines say `DOC:` and `-docs`. This is as much a plan gap as an implementation one - Task 9's `Files` entry named only lines 425, 426 and 432 of the SVG and never mentioned the Done node.

Fix: line 452 to `... ADR: / NODE: / RULE: / CHANGELOG: / INDEX: lines verbatim.`, line 453 to `every GAP: → run superdev-memory or -rules`.

**2. `docs/assets/superdev-flow.svg:3` - the accessibility description is stale for the same reason**

The `<desc id="svgDesc">` still ends `... a shared Close Out with optional adr, memory, rules and docs delegations.` This is the text a screen reader announces for the whole diagram, and it names the removed layer while omitting `changelog` and `cleanup`. Fix: `... with optional adr, memory, rules and changelog delegations, then an optional run cleanup.`

**3. `superdev/scripts/cleanup-run.sh:125` - a locally-modified target aborts the script mid-removal, with no `CLEANUP:` line and a partial staged deletion**

`git rm -r -q --ignore-unmatch -- "$t"` has no `-f`, so git refuses any target containing a tracked file with local modifications. Under `set -euo pipefail` that non-zero exit kills the script immediately.

Verified in a throwaway repo, two scenarios:

```
# workdir carries one modified tracked file
$ cleanup-run.sh docs/.workflows/2026-01-02-demo superbuild
error: the following file has local modifications:
    docs/.workflows/2026-01-02-demo/status.md
EXIT=1                      # nothing removed, no CLEANUP line

# workdir clean, spec modified -> partial removal
$ cleanup-run.sh docs/.workflows/2026-01-02-demo
error: the following file has local modifications:
    docs/.workflows/20260102-demo.md
EXIT=1
$ git status --porcelain
D  docs/.workflows/2026-01-02-demo/plan-header.md   # workdir deleted, staged,
D  docs/.workflows/2026-01-02-demo/status.md        # never committed
 M docs/.workflows/20260102-demo.md                 # spec untouched
```

This breaks the script's own header contract ("exit 0 for every documented outcome except missing/invalid args") and the orchestrator's contract with it: Step 5 is told to trust the script and relay its `CLEANUP:` line, and here there is no line to relay. It also leaves the repository in a half-cleaned, uncommitted state that the orchestrator will not notice.

Likelihood is low in the normal flow - `commit-task.sh` commits after every task and the close-out commit runs immediately before Step 5 - but the trigger is anything as ordinary as an editor with unsaved-then-saved changes under the run dir. The plan prescribed this exact `git rm` invocation, so the implementation is faithful; the gap is in the plan.

Fix: add `-f` (`git rm -r -f -q --ignore-unmatch -- "$t"`) - the target is being deleted anyway and the content is recoverable from HEAD. Add one test fixture with a dirty tracked file in the workdir asserting exit 0 and the `(removed)` line.

#### Minor (Nice to Have)

**4. `docs/assets/superdev-flow.svg:432` - `cleanup` is named but never described.** Every other switch gets a `X: true → action` line in the Close Out box (lines 422-425); `cleanup` appears only in the Switches card list. Criterion #9 asks the diagram to describe the changelog *and cleanup* switches. One line such as `cleanup: true → cleanup-run.sh removes the run's working files` would close it.

**5. `superdev/skills/setup/assets/config.yml:2-6` - column alignment drifts.** `adr` / `rules` / `memory` align `false` at column 9; `changelog` / `cleanup` align at column 11. The Approach asked to keep the existing alignment style. Purely cosmetic, and `read-config.sh` parses both fine. The same drift is mirrored in `.claude/superdev.yml`.

**6. Stray untracked `out.txt` at the repo root** (418 bytes of SVG line-length measurements). Not part of the change set because it was never committed, but it is working-tree junk in a repo whose root carries only catalog files. Delete it.

**7. Full-suite result is 575 pass / 3 fail / 5 skipped, and the three failures are not this build's.** They are `tests/superdev/memory-scripts.test.ts:129` and `tests/superdev/rules-scripts.test.ts:235` (both `EPERM ... symlink` - creating symlinks on Windows needs Developer Mode or an elevated shell) and `tests/superfix/worktree.test.ts:169` (a superfix assertion, unrelated to superdev). None of those three test files, nor the scripts they exercise, appear in the change set, and every test file this build touched is green: read-config + bootstrap 23/23, cleanup-run 16/16, decompose + review-plan 76/76, portability 21/21. Criterion #10 is therefore not literally green on this machine, but nothing here is a regression from this work.

### Recommendations

- When a rename retires a vocabulary item (`docs` → `changelog`), grep for the *shorthand* forms too, not only the canonical identifier. `DOC:`, `-docs`, `product docs` and the SVG `<desc>` all survived a grep built around `superdev-docs|docs/product`. A `grep -rn -i "\bdoc\b\|DOC:" docs/assets/*.svg` at the end of Task 9 would have caught all three.
- A destructive script should treat `git` failure as an outcome to report, not an exception to die on. Either force the removal or wrap the loop so any git failure still prints a `CLEANUP: <workdir> (skipped - <reason>)` line and exits 0, so the orchestrator always receives exactly one contract line.
- The SVG is a shipped, publicly rendered asset with no test covering it. A tiny node test asserting that the diagram's text contains no retired tag names (`DOC:`, `superdev-docs`, `-docs`) would make the next rename self-policing.

### Assessment

**Ready to merge?** With fixes

**Reasoning:** All nine tasks match the plan and every test the build touches is green, but the shipped flow diagram makes three factual statements about behavior that no longer exists (including a deleted skill), and `cleanup-run.sh` can abort mid-removal with no contract line and an uncommitted partial deletion. Both are small, well-localized fixes.
