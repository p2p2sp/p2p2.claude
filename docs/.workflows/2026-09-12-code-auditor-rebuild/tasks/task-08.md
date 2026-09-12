
## Task 8 - docs(superfix): catalog and docs describe five agents, scope, sidecar and model inheritance; full suite and dash scan green
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: criteria #14, #19, #20

### Dependencies
- Task 7 - blocks: none

### Files
- modify - superfix/CLAUDE.md (`## Layout` agents line and scripts line; `## Components` `code-auditor` bullet gains a Phase 0 profile sentence and the scope sentence; agents bullet lists `profiler`; new invariant paragraph `**Plugin-specific invariant: the critic never sees the detective's reasoning.**`; new sentence on `model: inherit` for detective and critic and its consequence)
- modify - superfix/README.md (`## Quick start` step 1 shows `/superfix:code-auditor [<repo-path>] [<area-dir>]`, step 4 describes the 10-entry cap and `## Further findings`; a new paragraph after the two-track list: the session model is the detective and critic model, a weaker session model means weaker reproduction; `## Agents` table gains a `profiler` row and the `detective` / `critic` rows mention inherit and the sidecar)
- modify - CLAUDE.md (repo root; the superfix agents parenthetical `superfix's scout / edge-scout / detective / critic live there` gains `profiler`, and the superfix bullet under `## What this repo is` gains one clause on the profile step and the `[<area-dir>]` argument)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `node --test "tests/**/*.test.ts"` - expected: every test file passes, including the new cases from Tasks 1-3
- `grep -n 'profiler' superfix/CLAUDE.md superfix/README.md CLAUDE.md superfix/.claude-plugin/plugin.json` - expected: at least one hit per file
- `grep -n 'inherit' superfix/CLAUDE.md superfix/README.md` - expected: at least one hit per file
- `! grep -rn $'\u2013\|\u2014' superfix CLAUDE.md` - expected: no output, exit 0 (the `×` sign in superfix/CLAUDE.md is not a dash and stays)

### Approach
1. `superfix/CLAUDE.md`: layout line "Five plugin agents: profiler.md (session-model repo profiler, Phase 0) + scout.md ... + detective.md (session-model deep-dive) + critic.md (session-model refuter)"; scripts line notes `--scope` on both sweep scripts and `dependents_stem`'s lockstep literal; components bullet gains the profile sentence (profiler runs alongside the Phase 1 scripts, `job.md` carries `## Repo profile`, Phase 2 waits for it) and the scope sentence (records and pairs shrink to the area, signals stay repo-wide); agents bullet adds `profiler` and rewrites `critic` as "reads only the claim sidecar, mandate to refute, one retry on a missing verdict in its own `-retry` worktree"; new invariant paragraph stating the sidecar rule and why (a verifier that reads the discoverer's reasoning confirms its framing); one sentence that detective, critic and profiler are `model: inherit` so the session model is the reproduction model, weaker session model means weaker verification.
2. `superfix/README.md`: edits as listed in Files, keeping the table shape; agents table row for `profiler`: "Session model, Phase 0: reads the target's memory, tooling and fix history and writes the run's repo profile. One per run."
3. Root `CLAUDE.md`: the two edits listed in Files, nothing else.
4. Run the full suite and the dash scan; fix any dash the scan finds in files this plan touched.

### Failure modes
- none - documentation (the suite run is the verification step, and a red test here is a Task 1-3 defect to fix in place, not a branch of this task)

### Contracts
- none

### DoD
Full suite green under the current shell; every documentation file names the profiler, the argument form, `--scope`, the sidecar and model inheritance; the dash scan over `superfix` and the root `CLAUDE.md` prints nothing.


### Covered criteria
14. `superfix/README.md` i `superfix/CLAUDE.md` stwierdzają, że model sesji jest modelem detektywów i criticów, i że słabszy model w sesji oznacza słabszą reprodukcję.
19. `superfix/.claude-plugin/plugin.json` `agents[]` zawiera `./agents/profiler.md`; `superfix/CLAUDE.md` i `superfix/README.md` wymieniają pięciu agentów, argument `[<repo-path>] [<area-dir>]`, flagę `--scope` i sidecar claim.
20. `node --test "tests/**/*.test.ts"` przechodzi pod bash i Git-Bash, a `tests/superfix/` zawiera przypadki dla `--scope` w obu skryptach sweepu (kryteria 2 i 3), dla `dependents_stem` i dla scenariusza z kryterium 9.
