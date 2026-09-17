## Runs

- grep -n "UNDERSPECIFIED:" superdev/agents/qa-writer.md -> 41:deviations. A note records a deviation as a deviation line, an `UNDERSPECIFIED: <value> - <decision>`
- grep -n "decisions.md" superdev/agents/qa-writer.md -> 34:Workdir: the `workdir:` value from the prompt. Read `<workdir>/implementation/decisions.md` when it

no deviations

Commit a765678 also carries `docs/.workflows/2026-09-17-vibe-track/intent.md` and `.../spec.md` - a
separate run's workdir that no step of this task wrote, and the same pair Task 6's commit already swept in.
Those files were modified in the working tree when the commit ran; `commit-task.sh` never stages outside
the declared set, so it reported them as `undeclared:` and refused, and they entered the commit only
through the loop's step-4 **include named ones** answer (a re-run with one `--path` per file). Not scope
creep and deliberately not `touched:` lines - a later `commit-task.sh --notes` run over this file must not
declare those paths again.
