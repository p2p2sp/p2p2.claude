
## Task 5 - Remove adr-writer from the build close-out and link ADRs from git
- TDD: none
- Model: opus
- Effort: medium
- Covers: `Link w changelogu` (#8), `Agent usunięty` (#9), `Konfiguracja nietknięta` (#11)

### Dependencies
- `Plan the ADR write as the first task` (Task 4) - blocks: the ADR files land under `docs/adr/` inside the build's own commits, which is what the `git diff` below finds

### Files
- delete - superdev/agents/adr-writer.md
- modify - superdev/.claude-plugin/plugin.json (`agents[]` loses `"./agents/adr-writer.md"`)
- modify - superdev/skills/superbuild/SKILL.md (`## Config`, `## Step 4 - Close Out`, `## Step 5 - Done`)
- modify - superdev/skills/simplebuild/SKILL.md (`## Config`, `## Step 4 - Close Out`, `## Step 5 - Done`)
- modify - superdev/agents/changelog-writer.md (`## Input`, `## Write`)
- modify - superdev/references/changelog-entry-format.md (`## Template` header line `- ADR:`)

### Test Commands
#### Build
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superbuild && bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simplebuild && bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/changelog-writer.md` - exit 0, each last line `FAIL=0 WARN=<n>`

#### Tests
- `test ! -e superdev/agents/adr-writer.md` - exit 0
- `! grep -rq --exclude=README.md 'adr-writer' superdev/` - exit 0 (the README is Task 6's)
- `grep -c -- '--diff-filter=A <base>..HEAD -- <root>/docs/adr/' superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md` - prints `1` for each file
- `grep -c 'close out memory, rules and changelog' superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md` - prints `1` for each file
- `grep -c 'one line per ADR' superdev/references/changelog-entry-format.md` - prints `1`
- `grep -c 'docs/adr/20260907140501' superdev/references/changelog-entry-format.md` - prints `2` (the worked example is left untouched)
- `node --test tests/superdev/read-config.test.ts tests/superdev/bootstrap.test.ts` - all pass, test files unchanged (`git diff --quiet -- tests/` exits 0)
- `node --test "tests/**/*.test.ts"` - all pass
- `! LC_ALL=C grep -q $'\xe2\x80[\x93\x94]' superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md superdev/agents/changelog-writer.md superdev/references/changelog-entry-format.md` - exit 0

### Approach
1. Both orchestrators, `## Config`: the gated close-out delegations are `rules`, `memory`, `changelog` (the `adr` switch is read but gates nothing here; it gates the `intent` skill).
2. Both orchestrators, Step 4 wave 1: delete the `adr: true` bullet, so wave 1 dispatches `memory-writer` and `rules-writer` only. Wave 2, before the `changelog-writer` dispatch: when the index's `base:` is not `none`, run `git diff --name-only --diff-filter=A <base>..HEAD -- <root>/docs/adr/` with the Bash tool (the pathspec joined with the index's `root:`, because the orchestrator never `cd`s and a session may start in a subdirectory; `--diff-filter=A` keeps an older ADR the build only marked superseded out of the list) and append one `adr: <root>/<printed path>` line per printed path to the labeled prompt (`--name-only` prints repository-root-relative paths, so they join with `root:` like every other path); no printed path -> no `adr:` line. State the `base:` branch explicitly in both files: when the index's `base:` is `none`, run no `git diff` and pass no `adr:` line. Drop `ADR:` from the relayed-lines list of `## Step 4 - Close Out` item 4, from its `--path` enumeration in item 5 and from the `## Step 5 - Done` summary list; the close-out commit message becomes `chore(superbuild): close out memory, rules and changelog` and `chore(simplebuild): close out memory, rules and changelog`, with `--path` entries unchanged otherwise.
3. `changelog-writer.md` `## Input`: `adr` is optional and repeatable, one line per ADR file written by this build, each read as one `## adr` block; extend the `## intent` sentence so the no-rejected-alternatives rule names its one exception, the intent's own `## ADR` section. `## Write`: one header bullet `- ADR: <path>` per `adr:` value in the given order, omitted entirely when none; a `## Decisions` line may cite the ADR that records it.
4. `changelog-entry-format.md` template header line: `- ADR: <path>            (one line per ADR written for this run; omit when none)`; the `## Decisions` example line keeps its `(ADR: <path>)` form. Touch nothing else in that file: the worked example's own stamp shape stays as it is, because the spec puts the changelog format out of scope beyond this one bullet.
5. Delete `superdev/agents/adr-writer.md` and remove its `agents[]` entry from `plugin.json`. Leave `superdev/hooks/content/manifest.md` alone: it names neither `adr` nor the Close Out waves, so this change owes it nothing.

### Failure modes
- when the index's `base:` is `none` -> response: run no `git diff`, pass no `adr:` line, log: nothing, test: `grep -c '`base:` is `none`' superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md` prints at least `1` for each file
- when `git diff` exits non-zero -> response: pass no `adr:` line and note the failure in the Step 5 summary, log: the Step 5 summary line, test: `grep -c 'exits non-zero' superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md` prints at least `1` for each file

### Contracts
- `adr:` labeled line, repeatable, one absolute path per line, orchestrator -> `changelog-writer` (steps 2 and 3, same task) - consumed by no other task

### DoD
No `adr-writer` reference survives under `superdev/` outside `README.md` (Task 6 clears that one), wave 1 dispatches two writers, wave 2 derives `adr:` lines from `git diff`, `changelog-writer` accepts repeated `adr:`, the full test suite passes with `tests/` untouched, and the test commands above pass.


### Covered criteria
8. Link w changelogu - przy `changelog: true` wpis changelogu tego buildu niesie jeden bullet `ADR: <ścieżka>` na każdy plik zapisany w buildzie pod `docs/adr/`; build, który nie zapisał tam żadnego pliku, daje wpis bez bulletu `ADR:`.
9. Agent usunięty - `superdev/agents/adr-writer.md` nie istnieje, a nazwa `adr-writer` nie występuje w `superdev/.claude-plugin/plugin.json`, `superbuild/SKILL.md`, `simplebuild/SKILL.md`, `superdev/README.md` ani root `CLAUDE.md`; wave 1 close-outu obu orkiestratorów wysyła wyłącznie `memory-writer` i `rules-writer`.
11. Konfiguracja nietknięta - `tests/superdev/read-config.test.ts` i `tests/superdev/bootstrap.test.ts` przechodzą bez zmian w treści testów, a `adr` pozostaje pierwszym kluczem w wyjściu `read-config.sh`.
