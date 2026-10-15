To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Split staying on the current branch from building on it

## Goal

When the interview or diagnosis starts off the work entry's base, the "stay" answer today means two things at once. It keeps HEAD where it is now, and it also lands the build's commits on the current branch. Because it hands off `Branch: <current:>`, the plan pins whatever branch was checked out during planning (often the previous run's), and the later build switches back to it. This change splits the two meanings. In the interview, "stay" only keeps HEAD in place and never changes the run branch. Building on the current branch becomes its own explicit answer in both the interview and the diagnosis.

## Acceptance criteria

1. In `intent`'s `branching-start.allowed.md` and `branching-start.required.md`, the base check on `at-base: no` offers four answers: switch to the entry's `base:`, stay on `current:` for now, build on `current:`, and abort. "stay" moves nothing. The run branch stays the entry's own name and is cut from `base:` when the plan lands. "build on `current:`" makes no run branch, and the build's commits land on `current:`.
2. In `fixer`'s `branching-start.allowed.md` and `branching-start.required.md`, the base check on `at-base: no` offers switch to the entry's `base:`, build on `current:`, and abort, with no "stay" answer. The reproduction test that a diagnosis leaves uncommitted would block cutting the run branch from another commit when the plan lands. Once the reproduction test exists, a failed switch offers build on `current:` and abort.
3. In `branching-handoff.allowed.md` and `branching-handoff.required.md` of both `intent` and `fixer`, `Branch: <the current: value>` is handed off only after "build on `current:`". It is never handed off after "stay" or for `current: detached`. After "stay", only `Work: <entry key>` and the entry's run branch line are handed off, so the planner records the entry's `new:` name. `tests/viber/branching-stay-prose.unit.test.ts` passes.
4. Under `required`, "build on `current:`" is never offered on `current-is-base: yes` or `current: detached`. Because "stay" does not change the run branch, intent offers "stay" there too: a required run still gets its own branch.
5. When `intent` continues a `roadmap.md` on `at-base: no`, with `current-is-base: no` and `current:` not `detached`, it takes "build on `current:`" without a question, so the next part builds on the previous part's branch.
6. `intent`'s fast path is allowed under `branching.mode: off`, or after the start step settled "no branch" or "build on `current:`". It is never allowed after "stay", because "stay" leaves the run a branch that only a landed plan creates.
7. `viber/BRANCHING.md` and the `branching.mode` entry of `viber/skills/setup/assets/help.html` (`en` and `pl`) describe the start-step answers and their effect on the run branch, with no sentence left saying that staying puts the build's commits on the current branch.

## Scope

### File map

- modify - viber/skills/intent/fragments/branching-start.allowed.md - intent's base check and its answers under `allowed`
- modify - viber/skills/intent/fragments/branching-start.required.md - intent's base check and its answers under `required`
- modify - viber/skills/intent/fragments/branching-handoff.allowed.md - intent's `Work:` / `Branch:` hand-off under `allowed`
- modify - viber/skills/intent/fragments/branching-handoff.required.md - intent's `Work:` / `Branch:` hand-off under `required`
- modify - viber/skills/intent/fragments/fast-path.true.md - which start-step answers admit the fast path
- modify - viber/skills/fixer/fragments/branching-start.allowed.md - fixer's base check and its answers under `allowed`
- modify - viber/skills/fixer/fragments/branching-start.required.md - fixer's base check and its answers under `required`
- modify - viber/skills/fixer/fragments/branching-handoff.allowed.md - fixer's `Work:` / `Branch:` hand-off under `allowed`
- modify - viber/skills/fixer/fragments/branching-handoff.required.md - fixer's `Work:` / `Branch:` hand-off under `required`
- modify - viber/BRANCHING.md - the user-facing description of the start-step answers
- modify - viber/skills/setup/assets/help.html - the `branching.mode` entry, `en` and `pl`
- add - tests/viber/branching-stay-prose.unit.test.ts - the reproduction test, already RED in the tree

### Out of scope

- `viber/skills/planner/fragments/branching.allowed.md`, `branching.required.md` and `branching-fix.required.md` keep their own "stay on `current:`" question, asked at plan time when no `Work:` line came in. There it still means the commits land on `current:`, because the planner question is the run-branch decision itself. The planner still takes `Branch:` when the input carries one, and the entry's `new:` otherwise.
- `viber/scripts/run-branch.sh` and `viber/scripts/plan-path.sh`: `branch_land` already cuts a recorded branch from the entry's base wherever HEAD is, and refuses only on a dirty tree at another commit.
- The `help.html` planner card, which asks whether to continue on the current branch when no entry can name one. That is planner behaviour this change keeps.
