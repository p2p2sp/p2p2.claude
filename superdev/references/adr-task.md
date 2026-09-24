# ADR task

The plan's first task whenever the intent carries a `## ADR` section: one task that writes every
accepted ADR as its own file under `docs/adr/`. `simpleplan` and `superplan` both fill the block
below from that section and copy the result into the plan as Task 1.

## Fill rules

- One task per plan, never one per ADR. A single task writes every `### <slug>` block the intent's
  `## ADR` section carries.
- Title: one block -> `Write ADR` followed by that block's title as plain text, no backticks and no
  quotes of any kind; two or more blocks -> `Write ADRs`, with no title. The title is the
  `# <Short title of the decision>` heading of the block's fenced body, without its leading `#`.
- The task heading is spent by both orchestrators as a double-quoted shell argument to
  `commit-task.sh`, so it NEVER carries `` ` ``, `$`, `"` or `\`. A block title carrying one of
  those four characters has it dropped here (the surrounding words are kept, no substitute
  punctuation added); the ADR body itself is copied verbatim and is never edited for this.
- `<slug>`: the block's own `### <slug>` heading, one per block.
- `Supersedes:`: a block carrying that line contributes its path to `### Files` and its own step to
  `### Approach`; a block without one contributes neither.
- The fenced body of each block is copied into `### Approach` verbatim, byte for byte, frontmatter
  and all - never summarised, never re-wrapped, never trimmed. That body is the ADR file's whole
  content, and shrinking it here loses the record.
- Marker order follows the plan template in use: `Covers:` sits above `TDD:` in `simpleplan`'s
  template and below `Model:` (and the optional `Review:`) in `superplan`'s. Every marker the two
  templates share carries the same value either way; the `Review:` marker is the one they do not
  share, and the rule below settles it.
- `Review: none` is written directly under `Model: sonnet` in the `superplan`-track block, and
  nowhere in the `simpleplan`-track one. It is not an option here: `superplan` defaults a `scaffold`
  task to `Model: sonnet` AND `Review: none`, so a block carrying only the first half would have
  `decompose.sh` print `-` in the `<review>` column, which `superbuild` reads as "dispatch the
  per-task reviewer with no `model` parameter" - the opposite of the default this block is meant to
  encode. The Simple track has no `Review:` slot in its template and runs no per-task reviewer at
  all, so the marker is left out there rather than set to anything.
- `Kind: scaffold` stays exactly as the block writes it: B22 derives that kind from this task's
  `### Task Checks` existence check, and an `### Approach` carrying its output verbatim - step 2's
  fenced body - is output the implementors' scaffold discipline writes as given. It is not a missing
  generator and never a reason to retype the marker as `text`.
- The task is always Task 1, and every other task of the plan is renumbered after it. No task ever
  lists it under `### Dependencies` - nothing in the build reads an ADR file.
- Angle-bracket annotation lines are fill instructions in the plan template's own convention: obey
  them and drop them, exactly as with `templates/plan.md`.

## Task block

````text
## Task 1 - Write ADR <title>
- Covers: `ADR` (intent `## ADR`)
- TDD: none
- Kind: scaffold
- Model: sonnet
- Review: none
<the `Review:` line is `superplan`'s alone - drop it in the `simpleplan`-track block, whose template
has no such slot>

### Dependencies
- none

### Files
- add - docs/adr/ (<slug>.md per ADR, name stamped at write time)
- modify - <Supersedes path>
<the modify line repeats once per `Supersedes:` line in the `## ADR` section, carrying that line's
path verbatim; no `Supersedes:` line anywhere -> drop it>

### Task Checks
- ls docs/adr/ | grep -q -- '-<slug>.md$'
<one line per `<slug>`, the slug written out literally>

### Approach
1. Run `date +%Y%m%d%H%M%S` once and keep its output as `<stamp>`; every file this task writes
   carries that same stamp.
2. `Write` `docs/adr/<yyyyMMddHHmmss>-<slug>.md` - the path being `docs/adr/<stamp>-<slug>.md` -
   with exactly this content, which the `Write` also creates `docs/adr/` for:
   ```markdown
   <the fenced body of that `### <slug>` block, verbatim>
   ```
<step 2 repeats once per `### <slug>` block, all of them sharing the one `<stamp>`>
3. In `<Supersedes path>`, set the YAML frontmatter key `status` to
   `superseded by docs/adr/<stamp>-<slug>.md` at the top of the file; a file carrying no
   frontmatter gets one holding that single key.
<step 3 repeats once per `Supersedes:` line; none anywhere -> drop it>

### Failure modes
- none - single write

### Contracts
- none

### DoD
Every file listed under `### Files` exists and carries the content given above.
````

On every build `decompose.sh` prints `warning: ... has no 'Covers:' criteria - none appended` for
this task and carries on: its `Covers:` line points at the intent's `## ADR` section rather than at
a numbered acceptance criterion, so there is no criterion text to append. Expected, not a problem.
