# Vibe brief - template and content rules

Loaded by the `vibe` skill at write time, right before the `Write` of `<run dir>/brief.md`, and again
before every whole-file rewrite that appends a line to it. The `superdev:vibe-implementor` agent reads the
written brief; it never reads this template.

## Content rules
- Write the file in the exact structure below: the two header lines, then the five sections in that order,
  nothing else. Every section is written every time - a section with nothing to carry gets its own empty
  value (below), never a dropped heading.
- `Goal:` is the request reduced to ONE sentence, and it is the same sentence the commit is titled with.
  A brief carrying no `Goal:` line carries no unit of work, and the agent stops on it.
- `## Files` - one `- <repo-relative path>` bullet per file reconnaissance expects the change to touch.
  Advisory for the agent (it changes a file the goal needs and this list misses, and leaves a listed file
  the goal does not need alone), so a short honest list beats a guessed one. Nothing found -> the single
  bullet `none`.
- `## Checks` - one `- <command>` bullet per check command the host's own memory declares for the touched
  area, copied verbatim, never widened to the full suite and never invented. The host declares none -> the
  single line `none - <what the memory does not declare>`; the agent copies that reason into its notes as
  the reason nothing ran.
- `## Sensitive` - one `- <glob>` bullet per sensitive glob read out of the host's memory and kept (one
  line, no quote character). It records the guard's input for whoever reads the run; the agent matches it
  against nothing. None kept -> the single bullet `none`.
- `## Decisions` - one `- <answer>` bullet per answer the user gave to a `DECISION:` line of the notes, in
  the order they were asked, appended before the re-dispatch. Each one carries the force of the goal for
  the agent. None -> the single bullet `none`.
- `## Notes` - one `OVERRIDE: <stage> - <reason>` line per stop the user overrode, `<stage>` one of
  `entry guard`, `size guard`, `failed checks`, `no verdict`. Context for the reader, never a work item.
  None -> the single line `none`.
- Repo-relative paths everywhere; the run directory's own absolute path is never written into the file.
- Appending to a written brief is a `Read` of the whole file followed by a `Write` of the whole file with
  the new line in its section: `Edit` is disallowed in the `vibe` skill and `Write` truncates.

## Template

```markdown
# Vibe brief
Goal: <the request in one sentence>

## Files
- <repo-relative path> (or `none`)

## Checks
- <command> (or `none - <reason>`)

## Sensitive
- <glob> (or `none`)

## Decisions
- <the answer the user gave to a DECISION line> (or `none`)

## Notes
OVERRIDE: <stage> - <reason> (or `none`)
```
