# viber instruction audit - 2026-09-26

Scope: every runtime markdown file of `viber` (skills, agents, references, fragments, templates,
manifest), compared with tag `0.57.7` (2026-09-23). Method: four area audits, then every claim
re-checked adversarially by two independent verifiers per group. Line numbers refer to HEAD
`af804a95` and may drift.

Legend: severity high / medium / low; "Verifiers" states whether both independent checks agreed.

## 1. Size and growth

1.1. Static runtime markdown: 126.1 KB (30 files) -> 202.2 KB (68 files), +60%. Most of it is new
features a build never loads (triage, prototype, handoff, commit, intent, three new agents, two
new references). Files present in both versions: 115.6 KB -> 143.4 KB, +24%.

1.2. Bytes a model reads in a typical 8-task build: about +21-25% (about 217 KB -> 271 KB with 6 of
8 tasks touching tests and one integration task; 254 KB -> 306 KB with every task under TDD). An
earlier figure of +31% was wrong: it counted `integration-tests.md` on every task, while coder and
reviewer read it only on an `Exclusive: true` or integration-fixture task.

1.3. Where the growth sits: the per-task set (task-coder 7.9 KB, task-reviewer 5.8 KB, tdd 2.9 KB,
test-strategy 4.7 KB read by both) is about 68% of a run and grew about 25 KB per run.
`implementor/SKILL.md` grew 12.2 -> 17.0 KB and stays in the main context for the whole build.

1.4. Verdict: the growth is mostly justified by features and observed-failure fixes; moving
switch-dependent text into fragments works well. Rating 6/10: minus for contract inconsistencies
and for duplication inside agents dispatched once per task or per node. Verifiers: both 6/10.

## 2. Contract defects (fix, not cut)

2.1. Coder and reviewer disagree on the review scope. Severity medium. Verifiers: both PARTLY.
- `agents/task-coder.md:25` allows three edits outside `Files`, reported on `EXTRA:`.
- `skills/implementor/SKILL.md:128` never passes the coder's `EXTRA:` paths to the reviewer;
  `:132` commits them through `--with`.
- `agents/task-reviewer.md:20` diffs only the task's files and calls any other dirty file "never
  evidence of anything"; `task-coder.md:41` keeps `EXTRA:` paths out of the notes file.
- Certain: edits outside `Files` are committed without review. Possible: a false Blocking "no test
  for this clause" on a `TDD: required` task (needs a plan defect that passed planner-review, since
  `plan-rules.md:17` and `:25` require the test file in `Files`).
- Fix: implementor adds `extra: <coder EXTRA paths>` to the reviewer dispatch; the reviewer diffs
  those paths as this task's work.

2.2. `task-reviewer.md:20` contradicts `task-reviewer.md:28` (Owned): a file outside `Files` is
"never evidence", yet Owned expects such files to come back on `EXTRA:`. Severity medium.
Verifiers: both found it independently.

2.3. The coder's third `EXTRA:` exception (a defect in a file of a `prior` task) edits files of an
already committed task; `commit-task.sh` only warns `took <path> - claimed by committed task`. No
gate reviews that change, nor any `EXTRA:` path on a review-waived task. Severity medium.
Verifiers: both found it independently.

2.4. Commit d488bd72 blocks a draft round without `gh`. Severity medium (one verifier low-medium).
- `skills/intent/fragments/issues-input.true.md:5` now runs `issue-facts.sh` when a returning
  draft carries `issue: <URL>`; `:8` stops on exit 1 or 2.
- `scripts/issue-facts.sh` exits 1 with no `gh`, no auth or no network; `issues: true` is the
  default.
- Contradicts `viber/CLAUDE.md:166-168` (input still works without `gh`). The fetch is not needed
  to keep the issue: `planner/SKILL.md` already carries the draft's `issue:` over.
- Fix: for a URL taken from the draft, report the `ERROR` line and continue unbound, write no
  `Issue:` line, skip the save/comment offer.

2.5. `skills/memory/SKILL.md:96` and `:100` say "the set" ("drop that target from the set", "leaves
the set", "Nothing left in the set"), never defined; the only defined set is the planned set
(`:72`). Read as the planned set, a node leaves `planned:`, `memory-node-writer.md:64` drops it
from the root index and step 8 (`:124`, `:128`) never restores it. Severity low-medium.
Verifiers: both CONFIRMED.
- Fix: "the target list" in all three places; add "the planned set never shrinks here" at `:72`.

2.6. `references/plan-rules.md:27` (TDD) lost precision in 3f025101: the dropped "and" makes "on a
task carrying `Repro:`" read as a qualifier of the no-decision clause, and "both as
`test-strategy.md` defines them" has no clear referent (`test-strategy.md:11` no test layer, `:23`
no decision). Impact low: the script rule at `plan-rules.md:28` still forces `Repro:` tasks.
Verifiers: both CONFIRMED.
- Fix: list the exemptions separately and name which two `test-strategy.md` defines.

2.7. `references/node-doctrine.md:34` ("a node carrying an index of nodes gains the new one in the
same write") contradicts `agents/memory-node-writer.md:64` (keep the list equal to `planned:`
"even when a split created a node outside it") for a non-root parent that splits; the final pass
(`memory/SKILL.md:128`) reconciles only the root. Severity low-medium. Found by one verifier.

2.8. `DROPPED:` has two formats: `memory-writer` returns `DROPPED: <path>: <fact>`,
`memory-node-writer` returns `DROPPED: <fact>`. Severity low. Found by one verifier.

2.9. `skills/planner/SKILL.md:67` tells the model to re-run the branch report after a title change
even under `branching.mode: off`, where no branch report exists. Severity low. Found by one
verifier; fixed by 4.5.

2.10. `agents/rules-writer.md:34`: "the same way, confirmed with `Glob` first" right after "never
by a `Glob` call" is ambiguous (dead globs are confirmed by the map, removed conventions by
`Glob`; "the same way" means only the `rm --` form). Also, under the spec shape (implementor) there
is no map, so a rule whose glob went dead can never be removed there. Severity low. Verifiers:
both.

2.11. `skills/commit/SKILL.md:43` ("Has something changed in the meantime? So what...") is
colloquial for a `model: haiku` fork and can be read as permission to break `:40`. Intent: a tree
changed after the snapshot never stops the commit. Severity low. Verifiers: both CONFIRMED.

2.12. `skills/setup/SKILL.md:19` is false: "The switches land on", while the template ships
`qa: false` and `branching.mode: off`. Severity low. Verifiers: both.

2.13. `skills/triage/SKILL.md:15` promises "the two script lines below"; under `issues: false`
the fragments preload none. Severity low. Found by one verifier.

2.14. `skills/intent/SKILL.md:14-16` preloads the `issues-input` fragment before `## Returning to a
draft` (`:18`) tells the model to read the draft, so the draft's `issue:` check relies on implicit
ordering. Severity low. Found by one verifier.

2.15. The fixer's reproduction test is never checked against `test-strategy.md`, and the coder may
not rewrite it (`task-coder.md:16`), so a Repro test breaking a `(blocking)` rule can never be
fixed later. Severity low. Found by one verifier; quality gap, not a byte cut.

2.16. `rules-writer.md:48` still writes over budget and reports `OVER:`, while memory-writer now
drops facts (`DROPPED:`) after 8bd25e3b. Unclear whether the divergence is intended. Found by one
verifier.

## 3. Stale text

3.1. `agents/memory-node-writer.md:74` (and ", no `SIZE:`" at `:53`): `SIZE:` has no consumer and
never had one (dead since creation in 41ae35b3, not a leftover of 8bd25e3b). Remove. Verifiers:
both CONFIRMED.

3.2. `agents/memory-node-writer.md:81`: "A path left off `FILES:` never reaches the commit" is stale
since 8bd25e3b removed implementor's `--chore` commit of node-writer paths; "a deletion left off
leaves the file in the tree" is stale too (the agent runs `rm` itself). `FILES:`/`DELETED:` now only
feed the skill's node accounting (`memory/SKILL.md:120-124`). Rewrite. Verifiers: both CONFIRMED.

3.3. `skills/implementor/SKILL.md:186`: "Commit an `OVER:` line's path like any other" is
mechanically redundant: only rules-writer emits `OVER:` and every such path is already on its
`FILES:`. One verifier: remove; the other: reduce to "an `OVER:` path is never held back".

3.4. `skills/commit/SKILL.md:6` `background: false`: not confirmed that skill frontmatter honours
the field (the repo already dropped it from agents). Check the docs before removing.

## 4. Cuts that keep quality

4.1. Split `references/test-strategy.md` (the only cut with real weight). Verifiers: both CUT
PARTLY SAFE.
- Coder (`task-coder.md:29`, `:35`) and reviewer (`task-reviewer.md:26`) read the whole file per
  test-writing task; "Where the proof lives", "What runs when" and "Slicing" are planning rules.
- Quality gain: the reviewer is told to raise every `(blocking)` rule, including slicing rules
  (`:7`, `:21`) a repair coder cannot act on, which risks false Blocking findings.
- Keep for coder and reviewer: `:15` (run your own `Verification` and nothing wider, the tree is
  shared), `:17` (end-to-end only on the user's ask, paired in `viber/CLAUDE.md:142`), the "never
  introduce a test framework" clause of `:11`.
- Same edit: `plan-rules.md:27`, `integration-tests.md:3`, the header at `test-strategy.md:3`,
  `planner/SKILL.md:22`, `planner-review.md:31`, `viber/CLAUDE.md:4` and `:142`. Planner and
  planner-review then read both files.
- Saving: about 1.8 KB per coder read and per reviewer read, about 20-28 KB per 8-task run
  (7-9%).
- Cheaper first step, with most of the quality gain: scope `task-reviewer.md:26` to "`## Writing
  tests` and the end-to-end rule" (about 60 bytes).

4.2. `skills/tdd/SKILL.md:4` description: drop "On `resume`, `reason` or `report` input the code
already in the tree is kept and tested, never deleted" and "mandatory verify-red and verify-green
checkpoints, no horizontal slicing"; keep "`TDD: required`" and "Invoked by `viber:task-coder` ...
never directly". Resume protection lives in the body (`:16`) and `task-coder.md:16`; the skill is
invoked by name. Saves about 240 bytes in every session listing and every coder dispatch.
Verifiers: both CUT SAFE.

4.3. `agents/rules-auditor.md:28` "A candidate failing it is dropped with no line at all..."
(duplicates `rule-admission.md:29`; `DROP` is defined at `:39`) and `:45` "never `STALE`, `GONE`,
`UNVERIFIABLE`, `DROP` or `OK`..." (implied by "only `MISS` lines can appear"). Keep `:47`. Saves
about 238 bytes per auditor dispatch. Verifiers: both CUT SAFE.

4.4. `agents/memory-node-writer.md`, about 200 bytes per node dispatch. Verifiers: both CUT PARTLY
SAFE.
- `:26`: cut only the grammar clause; keep "`CLAUDE.local.md` never among them" (guards a user file
  next to the writer's `rm` rights). Update the "duplicated on purpose" list in `viber/CLAUDE.md`.
- `:59`: keep the action ("name each one missing, drop each line whose file is gone", delete in the
  same write); about 60 bytes can go.
- `:61`: cut only "never leaves the child node over its cap"; keep "keeps every fact already in it".
- `:63-64`: merge, keeping "even when a split created a node outside it" (settle 2.7 first).

4.5. `skills/planner/SKILL.md`, about 560-750 bytes on a run with branching off. Verifiers: both
PARTLY.
- `:54` (draft carries `work:`/`branch:`) folds into the existing `fragments/branching.*.md`.
- `:44` "the branch question below still applies" is branching-only too.
- `:67` (step 3) and the branch half of `:86`/`:88` (step 4) need new per-step fragments, e.g.
  `branching-fix.*` and `branching-land.*`: the existing fragments load in step 2, and
  `.claude/rules/viber/switch-fragments.md` forbids later-step text there.
- `:18` second sentence (about 190 bytes) repeats `:38`; keep the guard "that line, not the scope".
- `:86`: drop only "honours `into:` and points `source:` at itself" (`plan-path.sh` does it).
- Optional, low value: the draft-landing block `:82-92` (1.2 KB) into a reference read only on a
  draft.

4.6. `agents/qa-writer.md:34` (fully covered by `qa-format.md:13`, `:42`, `:93`, `:94`), `:31`
(`qa-format.md:7`), `:35` (`qa-format.md:81`). About 0.5 KB, only under `qa: true`. Verifiers: both
CONFIRMED.

4.7. `skills/commit/SKILL.md:27-28` (about 600 bytes): the `## Selector:` line of
`commit-context.sh` already carries mode and action, and `commit-conventions.md:19` says to copy
`Refs:` verbatim. Keep `:25-26`: they carry the literal command the permission pattern matches.
Also `:12` second sentence (output stated three times). Outside a build. Verifiers: both PARTLY.

4.8. `skills/setup/SKILL.md:19-21` (about 280 bytes): feeds no step; `bootstrap.sh:139`, `:153`
print the same; `:19` is false (2.12). Verifiers: both CONFIRMED.

4.9. User-only skills, about 1 KB total, outside a build. Verifiers: both.
- `skills/e2e/SKILL.md:22` repeats step 3 (`:47-54`); fold "never carried over from another
  project" into `:54`.
- `agents/e2e-writer.md:18` repeats `qa-format.md:8`; `:58` repeats `qa-format.md:81`, `:89`, keep
  "through `Edit` alone, replace or append".
- `skills/triage/SKILL.md`: keep the tools line (`:15`, required with `disallowed-tools:`) and
  `:58`; trim the duplicate `Write` clause in `:13`; `:48` repeats
  `fragments/issues-publish.true.md`.
- `skills/prototype/SKILL.md:14`: keep the tools line; drop "`Write` for the comment file alone"
  there or the matching sentence in `fragments/issues-exit.true.md`, plus that fragment's
  "(the `Edit(...)` rule pre-approves it)".
- `skills/intent/fragments/issues-input.true.md:1`: drop "(the `Edit(./.temp/viber/intent/**)` rule
  pre-approves them)"; the model never sees `allowed-tools`.
- `references/qa-format.md:3` last sentence and `skills/commit/references/commit-conventions.md:3`
  are dev-time prose.

4.10. Small ones on the build path.
- `skills/implementor/SKILL.md:55`: merge the non-zero exit handling into one line (about 110
  bytes).
- `agents/test-runner.md:38`: "run no test after it" repeats `:19` (about 25 bytes).
- `skills/implementor/SKILL.md:204`: reword the code-review line and state whether it counts
  toward the 7-line summary.

4.11. Within-skill repeats of the "one literal Bash line" rule: once per skill is needed (root
`CLAUDE.md` invariant, `planner/SKILL.md:50`); planner (`:50`, `:82`, both branching fragments),
memory (`:54`, `:60`) and rules (`:56`, `:62`) state it twice or more. Verifiers: both.

4.12. `agents/planner-review.md:26` "Fed in order" restates `plan-rules.md:15` (`Ordered`) almost
word for word, and `:24` already gates every `(review)` clause. Keep the forcing step as one short
line ("walk each task through `Ordered`, naming each input and its producer"). The failure behind
both is real (spec 2026-09-26-01-16-40, consumer task failed verification three times).
Verifiers: both lean REDUNDANT wording.

## 5. Checked and kept

5.1. `VERDICT: DENIED` in every agent: necessary (c266a258, spec 2026-09-22-23-58-02: refusals
were treated as failures, causing tier-up retries and needless repairs). The sentence "every one of
them loaded / ToolSearch / deferred-tools" came silently in 6e9b1004 with no recorded failure: keep
unless evidence shows it is unneeded, but note it costs about 370 bytes in each of about 20
dispatches per run (about 7 KB).

5.2. "Stop what you started" (task-coder, task-reviewer, test-runner, e2e-writer) plus the
implementor/e2e `SendMessage` nudge: necessary (597ee6bc, 86538ad2; the nudge quotes the harness
notice verbatim). About 6 KB per run.

5.3. Same-model continuation (cap of two) and the tier clamp: necessary as features (token saving,
spec 2026-09-26-09-08-37; `tiers:` config, 914aa453), not as failure guards.

5.4. task-coder self-check against the reviewer's blocking rules before PASS: necessary
(b918c70c, spec 2026-09-26-01-16-40 criterion 5: needless review rounds). Side effect: it may
re-read `test-strategy.md` in every task (`task-coder.md:35`).

5.5. Timeout lines in task-coder and task-reviewer (Exclusive tasks) and test-runner (full suite):
necessary, each agent reads only its own file (914aa453, 5bfa5080).

5.6. Also kept: implementor decide sanitizing (`:38`), continuation rules (`:118-126`), target line
(`:57`), `:25`, `:28`, `:89`, `:93`; the coder seam sentence (`:29`); "Input is fully resolved -
never ask the user"; memory-writer `:26` and `:30`; memory steps 7-8; refuse on `dirty:` and
re-map after reset; `memory-auditor.md:28`; `rules-auditor`/`rules-writer` "`matches`/`dead:`,
never `Glob`"; `planner/SKILL.md:24` e2e line and `:29`; `plan-rules.md:25` ADR carve-out;
`intent/SKILL.md:80`, `:103`; e2e literal-script and install lines; triage `:31`; setup
`AskUserQuestion` parenthetical; commit "no Co-Authored-By" and selector rules; handoff
`EXISTS=true` stop; prototype mockup path and loop lines.

## 6. Suggested order

6.1. Contract defects 2.1-2.6 and stale text 3.1-3.3.

6.2. Scope `task-reviewer.md:26` (4.1 cheap step), then the `test-strategy.md` split.

6.3. Remaining cuts 4.2-4.12 and defects 2.7-2.16.
