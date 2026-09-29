# superfix/skills - the `code-auditor` skill body, references and scripts

`code-auditor/` is the only skill. Its files reach every agent through paths built on
`${CLAUDE_SKILL_DIR}`; no agent reads `references/scoring.md` or `references/jobs.md` itself, only the
copy of the rubric and the job's signal pair that Phase 0 inlines into `job.md`.

## Contracts inside the skill

- **Prose mirrors the gates.** `references/scoring.md` restates what `rank.ts` and `rank_edges.ts`
  compute: independent thresholds of 3 on each axis (also the `rank.ts` defaults and the literal
  `--min-impact 3 --min-opportunity 3` in `SKILL.md` Phase 3), the tie-break score, then impact, then
  churn, gate-clearing rows past `--top` landing in `overflow`, the `degenerate` flag, and the edge
  order `MISMATCH` before `UNCLEAR`, then `pair_impact`. A gate change edits the script and
  `scoring.md` in the same change.
- **Phase 4 reads gate output by key name.** `hotlist.json` `hotspots`, `edges.json` `dispatch` and
  `degree[]` (sorted by degree descending, then path). A renamed key in a rank script empties the
  dispatch set without an error. The two-slot degree budget is a rule of `SKILL.md`, not a script flag.
- **Phase 5 ranks by line position.** It reads only the first four lines of each report (`# <title>`,
  `LOCATION`, `CLASS`, `SEVERITY`), so the order of the head block in `synthesis.md` is load-bearing:
  reordering it changes what the moderator ranks on.
- **One window per run.** The `Window:` line in `job.md`, the profiler's brief and the first argument
  of `collect_signals.sh` carry the same number of days (30 unless the user asks otherwise).
