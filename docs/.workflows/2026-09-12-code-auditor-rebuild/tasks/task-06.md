
## Task 6 - feat(superfix): profiler agent writes profile.md from the target repo's memory, tooling and fix history
- TDD: none
- Model: opus
- Effort: high
- Covers: criteria #4, #5, #19

### Dependencies
- none - blocks: Task 7

### Files
- add - superfix/agents/profiler.md (frontmatter `name: profiler`, `model: inherit`, `tools: Read, Write, Grep, Glob, Bash`; sections `## Inputs you are given`, `## Method`, `## Output`, `## Hard rules`)
- modify - superfix/.claude-plugin/plugin.json (`agents[]` gains `./agents/profiler.md` as the first entry, before `./agents/scout.md`)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `node -e "const p=require('./superfix/.claude-plugin/plugin.json'); if(!p.agents.includes('./agents/profiler.md')) process.exit(1)"` - expected: exit 0
- `grep -n '^model: inherit$\|^tools: Read, Write, Grep, Glob, Bash$' superfix/agents/profiler.md` - expected: two hits
- `grep -n '## Bug classes from history\|## Contract shape\|## Critical paths\|## Severity calibration\|no fix history in window' superfix/agents/profiler.md` - expected: at least five hits, every one of the five terms present
- `! grep -rn $'\u2013\|\u2014' superfix/agents/profiler.md superfix/.claude-plugin/plugin.json` - expected: no output, exit 0

### Approach
1. Frontmatter: `name: profiler`, `description: Repo profiler - reads the target repo's memory, tooling and fix history and writes the run's repo profile. Invoked only by the code-auditor skill, never directly.`, `model: inherit`, `tools: Read, Write, Grep, Glob, Bash`.
2. Inputs: `Target root: <path>`, `Window: <days>`, optional `Scope: <dir>`, the `job.md` path of this run (for the job's class of issue), the output path `.temp/superfix/<run-id>/profile.md`.
3. Method: (a) read `CLAUDE.md` files and `.claude/rules/*.md` under the target root, the build and test entry points the memory names (or, absent memory, the manifest and test directories found with Glob); (b) run `git -C <target-root> log --since=<window>d -i --grep=fix --grep=hotfix --grep=revert --stat --format='%h %s' -- <scope or .>` (one `git log` call, `--stat` names the touched files; no other git subcommand); (c) derive bug classes from those commits (grouped by recurring symptom, each with 1-3 example hashes), the producer/consumer contract shape of this stack (how modules reference one another: imports, filenames, routes, config keys), critical paths (files the memory calls core, plus the top fix-touched files), and severity calibration (what a 9-10, 7-8, 4-6, 1-3 finding is in this repo, in one line each); (d) write `profile.md` with exactly the four `##` headings in that order and one preamble line `Already fixed in window: <n> commits` followed by the hash list (the "do not rediscover" list).
4. Output section shows the file skeleton with the four headings and the `no fix history in window` sentence used under `## Bug classes from history` when step (b) returns nothing.
5. Hard rules: Bash runs `git log` only; Write targets the given output path only; never read `.temp/superfix/` outside this run's directory; never read a previous `findings.md`; stay under one page; English.

### Failure modes
- when `git log` returns no commits in the window -> response `## Bug classes from history` contains the single sentence `no fix history in window` and the preamble says `Already fixed in window: 0 commits`, log none (it is content, not an error), test the grep check for the sentence in the agent file (the runtime branch is exercised by the skill, not by a script test)
- when the target has no `CLAUDE.md` and no `.claude/rules/` -> response derive contract shape and critical paths from the manifest and test layout found with Glob and say so in `## Contract shape`, log none, test none - prose-only
- when Write to the output path fails -> response return the profile text in the final message so the skill can retry the dispatch (Task 7 owns the retry), log none, test none - prose-only

### Contracts
- `profile.md` layout: preamble `Already fixed in window: <n> commits` + hashes, then `## Bug classes from history`, `## Contract shape`, `## Critical paths`, `## Severity calibration` in that order - consumed by Task 7 (job.md recipe appends the whole file under `## Repo profile`; Phase 0 checks the four headings before accepting the profile; Phase 6 seeds waves from `## Bug classes from history`) and Task 4's severity source rule
- Profiler brief: `Target root`, `Window`, optional `Scope`, `job.md` path, output path - consumed by Task 7 (Phase 0 dispatch)
- `plugin.json` `agents[]` now lists five agents - consumed by Task 8 (CLAUDE.md and README agent tables)

### DoD
`superfix/agents/profiler.md` exists with the frontmatter and four headings above; `plugin.json` lists it; all grep and node checks pass; the dash scan prints nothing.


### Covered criteria
4. Przed Fazą 2 w `.temp/superfix/<run-id>/` istnieje `profile.md` napisany przez agenta `superfix:profiler` z czterema nagłówkami: `## Bug classes from history` (klasy błędów z commitów fix/hotfix/revert w oknie sweepu), `## Contract shape` (kształt kontraktów producer/consumer w tym stacku), `## Critical paths` (ścieżki krytyczne), `## Severity calibration`; a `job.md` zawiera jego treść jako sekcję `## Repo profile`. Profiler, który nie napisał `profile.md` lub napisał plik bez któregoś z tych czterech nagłówków, jest dispatchowany ponownie raz; po drugiej porażce run kontynuuje bez sekcji `## Repo profile`, a `findings.md` w `## Coverage notes` niesie linię "repo profile unavailable".
5. Wejściem profilera jest wyłącznie repo docelowe (CLAUDE.md, `.claude/rules/`, pliki build i testów, `git log`) oraz `job.md` bieżącego runu; żaden plik z innego runu w `.temp/superfix/` nie jest jego wejściem. Pusta historia commitów fix/hotfix/revert w oknie daje profil z jawną adnotacją "no fix history in window", nie pusty plik.
19. `superfix/.claude-plugin/plugin.json` `agents[]` zawiera `./agents/profiler.md`; `superfix/CLAUDE.md` i `superfix/README.md` wymieniają pięciu agentów, argument `[<repo-path>] [<area-dir>]`, flagę `--scope` i sidecar claim.
