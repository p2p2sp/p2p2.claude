# Task 9 notes

- `CLAUDE.md` left unedited (Files lists it as `modify`) - audited both the "What this repo is" superdev
  bullet and "Cross-plugin architecture invariants" for stale mentions of the seven removed reference files
  (`tdd/references/*.md`, `superdev-memory-writer/references/node-examples.md`,
  `superdev-memory/references/capture-protocol.md`) and of a separate pre-loop ADR step; neither ever named
  these specifics (the file already describes `superdev/references/` and `docs/adr/` only generically), so
  there was nothing stale to correct. Verified with `grep -n "superdev"` over the whole file and targeted
  greps for the deleted filenames and ADR-ordering phrasing - no hits requiring a fix.
- Measured line count: `find superdev -name '*.md' | xargs grep -c "" | awk -F: '{s+=$2} END {print s}'` = 2284
  (also cross-checked with `wc -l` = 2281, matching the baseline note that some files lack a trailing
  newline). Baseline was 2755 (wc -l baseline 2752) -> reduction of 471 lines, above the required 400 and
  under the task's 2355 ceiling, so no further cuts from tasks 1-3 were needed.
