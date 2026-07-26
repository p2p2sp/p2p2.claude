
## Task 13 - test(superfix): cover rank.ts and rank_edges.ts
- Covers: criterion #3
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/superfix/rank.test.ts`
- add - `tests/superfix/rank_edges.test.ts`

### Test Commands
*Build*
- none

*Tests*
- `node --test tests/superfix/rank.test.ts`
- `node --test tests/superfix/rank_edges.test.ts`

### Approach
1. Drive both scripts as subprocesses via `runScript("node", [script, …flags])`, not as imports: neither
   carries the repo's CLI guard idiom (`superui/scripts/check_contrast.ts:251`) and neither exports a
   single symbol, so importing them would run their CLI. Adding a guard would change plugin source, which
   this plan does not do; the written `--out-json` file exposes everything the ranking logic decides.
2. `rank.test.ts`: over a temp `--scores` JSONL, assert `hotlist.json` + `hotlist.md` contents encode
   `score = impact × opportunity` and the 2×2 quadrant cut, and that `--min-impact`, `--min-opportunity`,
   `--top`, `--job`, `--run-id` and `--signals` each change the output as documented.
3. `rank_edges.test.ts`: assert `MATCH` verdicts are dropped, the remaining pairs rank and cap at
   `--top-edges`, `edges.json` + `edges.md` are written, the per-path structural degree is reported, and
   `USAGE` is printed on bad arguments.
4. Cover the boundary inputs: an empty `--scores` file; a JSONL line that is not valid JSON; a record
   missing a required key; ties in the score (assert deterministic ordering); a `--top` of 0; a `--top`
   larger than the input; `--out-json` pointing at an unwritable path.

### Edge cases
A path in the input containing a Windows-style backslash. An input file with CRLF line endings. A score of
exactly the `--min-impact` threshold (inclusive vs exclusive). An `--out-md` in a directory that does not
exist.

### Contracts
`rank.ts --scores <jsonl> [--signals] [--min-impact N] [--min-opportunity N] [--top N] [--job] [--run-id] --out-json <p> --out-md <p>`.
`rank_edges.ts --edges <p> --verdicts <p> [--signals] [--top-edges N] [--job] [--run-id] --out-json <p> --out-md <p>`.

### DoD
Both test files green; `hotlist.json` and `edges.json` produced in the tests parse with `JSON.parse` and
their ordering is stable across two identical runs.


### Covered criteria
3. Every one of the 39 uncovered scripts has coverage under `tests/` - `tests/<plugin>/` for the four
   plugins, `tests/github/` for `.github/scripts/release.sh`; for the 36 full-coverage scripts (all but
   `vendor/jpeg-decode.ts`, `sample_colors.ts` and `release.sh`, which are scoped to their boundary),
   every documented stdout marker line and every documented exit code is asserted.
