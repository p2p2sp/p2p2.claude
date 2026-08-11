## Output Format

### Strengths

Before the gate finding below: the six tasks' own diffs, read in isolation, are well executed.

- `superui/scripts/measure_geometry.ts` (Task 1/2): `scanShadow`'s rewrite is exactly what the plan specified -
  `margin` iterations (not `margin + 1`), a fixed `SETTLE_RUN`/`SETTLE_DELTA` floor independent of `--tol`,
  `peakDelta`/`peakOffset`/`peakHex` computed over the full walked profile, `samples[]` truncated after the
  last above-floor sample. `scanGradient` mirrors `--edges`'s midline convention, computes `maxDeviation`
  against a proper linear interpolation, and uses fixed module-level thresholds
  (`GRADIENT_FLAT_DELTA`/`GRADIENT_LINEAR_FLOOR`/`GRADIENT_LINEAR_FRACTION`), not flags, per the plan.
- `superui/scripts/render_design_md.ts` (Task 3): `buildFrontMatter` exported as required, `shadows`/`gradients`
  maps emit `{}` when empty exactly like `rounded`, and `renderShadowsAndEffects` mirrors
  `renderRadiiAndBorders`'s split-by-prefix shape faithfully.
- `superui/scripts/validate_bundle.ts` (Task 4): `checkEffectLines`'s regex
  (`^[ \t>|*-]*\*{0,2}<property>\*{0,2}[ \t]*:`) correctly rejects `border-radius:` while accepting bold-labelled
  and table-cell forms - verified directly (`border-radius:` does not satisfy `border`; `| shadow: none |` and
  `**shadow:**` both satisfy `shadow`). Wired into `main` in the documented emission order.
- Full regression suite is green: `node --test "tests/**/*.test.ts"` -> 520/520 passing.
- Task 6's `superui/CLAUDE.md` edits (scripts inventory, front-matter bullet, agent bullets) accurately reflect
  Tasks 1-4's actual contracts.

### Issues

#### Critical (Must Fix)

**The reviewed change set (`git diff --name-status b908a2e27b0aff4c335d6f3283659afe64144436..HEAD`) is not
this build's work alone - it is contaminated with a large, entirely unrelated `pro-designer` feature, both
mid-branch and as the literal tip commit, undisclosed or materially under-disclosed in the implementation
notes.**

Two distinct contamination points, both inside the diff bound this review is required to judge:

1. **`be93633` ("chore(simplebuild): decompose plan ...")** - the very first commit after base SHA, created
   by `decompose.sh`'s `git add -A && git commit`, which stages and commits *whatever is dirty in the working
   tree*, not just the plan/task files it generates. Alongside the 10 plan/task markdown files it legitimately
   creates, this single commit also carries:
   - `superui/skills/pro-designer/SKILL.md` +36/-9 lines (new "Surface mode" section, "Scope discipline"
     section, reference-routing entries)
   - `superui/skills/pro-designer/references/distinctiveness.md` - new file, 61 lines
   - `superui/CLAUDE.md` +6/-2 lines describing the `pro-designer` skill's new aesthetic-direction duties

   None of this is in any task's `Files` list (Tasks 1-6 name only `measure_geometry.ts`,
   `render_design_md.ts`, `validate_bundle.ts`, four agent files, `design-extractor-builder/SKILL.md`, and
   `superui/CLAUDE.md`'s handoff-bundle/scripts-inventory/agents bullets - never `pro-designer/SKILL.md` or a
   `distinctiveness.md` reference).

2. **`6422c33` ("feat(pro-designer): add anti-slop forensic catalog and enhance design reference guidance")** -
   the actual tip of `HEAD`, sitting *after* Task 6's commit (`7fde94f`). `status.md` (the build's own
   tracker) reads `task: 06`, confirming the build itself believes it stopped at Task 6 - this commit was made
   by a separate, concurrent process/session after the build finished. It touches 14 files, all under
   `superui/skills/pro-designer/` plus `superui/CLAUDE.md` (133 insertions, 97 deletions): a new
   `references/anti-slop.md` (51 lines), and edits to `accessibility.md`, `color.md`, `components-states.md`,
   `distinctiveness.md`, `forms.md`, `layout-spacing.md`, `mobile.md`, `process.md` (new), `saas-dashboards.md`,
   `typography.md`, `ux-psychology.md`, `SKILL.md`, and `superui/CLAUDE.md` again. None of it is mentioned in
   any plan task or any `implementation/task-0N-notes.md` file - it postdates all six notes files.

The only place any of this is acknowledged is `task-02-notes.md`, which says: *"the commit this task's changes
landed in (5509571) also carries an unrelated one-line change to superui/skills/pro-designer/SKILL.md (an
em/en-dash hard-rule bullet) ... noted here so it isn't mistaken for part of this task's delivery."* That note
describes only a 1-line addition. It does not account for the 36-line `SKILL.md` change and the 61-line new
`distinctiveness.md` file that actually shipped in the `be93633` decompose commit, and it says nothing at all
about the 14-file, 230-line `6422c33` commit sitting at `HEAD`. The disclosed scope is off by roughly two
orders of magnitude from the actual scope in the diff this review is bound to.

Per the review contract ("does every file in the change set map to a plan task's Files? ... An unmapped
change - or any deviation - NOT recorded in the notes is a misalignment in itself; a recorded one is judged on
merit") this is a gate failure on two counts: `superui/skills/pro-designer/references/anti-slop.md` and the
bulk of the `be93633`/`6422c33` diffs to `SKILL.md`/`distinctiveness.md`/other reference files are unmapped
and unrecorded; the one deviation that IS recorded (in `task-02-notes.md`) materially misstates the scope of
what actually landed. `superui/CLAUDE.md`'s current on-disk state is therefore a interleaving of Task 6's
legitimate edits with two rounds of unrelated `pro-designer` edits from `be93633` and `6422c33` - the file
diff shown against base SHA is not "Task 6's diff" in isolation, and a reader diffing base..HEAD on
`superui/CLAUDE.md` cannot tell which hunks belong to this plan and which do not without the archaeology done
in this review.

Per the review's own gate instruction, this stops the review here: further code-quality/architecture/testing
sections below are intentionally not exhaustively run past what is already reported in Strengths, since they
only apply once plan alignment is met.

**Fix**: split `HEAD` into two lineages before merge/close-out - the six task commits for this plan (which are
sound on their own, see Strengths) and the `pro-designer` anti-slop/distinctiveness work (`be93633`'s
non-plan hunks plus all of `6422c33`), which belongs to a different, undocumented piece of work and should
ship (and be reviewed) separately. At minimum, correct `task-02-notes.md`'s inaccurate "one-line change"
characterization and add a note accounting for the `6422c33` commit before this build is considered closed.

#### Important (Should Fix)

None beyond the Critical item above - not evaluated further per the gate instruction, since the six tasks'
own code (Strengths section) shows no independent Important-level defects in the sampling done before the
gate triggered.

#### Minor (Nice to Have)

None evaluated - gate stopped the review before a full pass.

### Recommendations

- Treat `decompose.sh`'s `git add -A` as a hazard: any dirty, unrelated working-tree state present when a
  `simplebuild` run starts becomes permanently and silently attributed to that build's decompose commit. Worth
  a pre-flight `git status --porcelain` check (fail loud if dirty) so a future build's change set is not
  polluted the same way.
- When an implementor's notes flag a "swept-in" unrelated change, they should diff-stat it (`git show --stat
  <commit>`) rather than eyeballing it, so the recorded scope matches reality - this note's inaccuracy is what
  masked the true size of the contamination until this review traced commit ancestry by hand.

### Assessment

**Ready to merge?** No

**Reasoning:** The base..HEAD change set this review is bound to contains ~230+ lines across 15+ files of an
unrelated `pro-designer` feature (an undocumented decompose-time sweep plus a trailing, post-Task-6 commit),
materially under-disclosed in the implementation notes; the plan-alignment gate fails on that basis even
though the six tasks' own code and tests are otherwise sound.
