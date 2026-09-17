
## Task 8 - Catalog, docs and manifest
- TDD: none
- Model: sonnet
- Effort: low
- Covers: `Katalog i dokumentacja aktualne` (#15)

### Dependencies
- `Add the qa-writer close-out agent` (Task 4) - blocks: the agent path it catalogs
- `Add the e2e-writer agent` (Task 6) - blocks: the agent path it catalogs
- `Add the e2e skill` (Task 7) - blocks: the skill path it catalogs

### Files
- modify - superdev/.claude-plugin/plugin.json (`skills`, `agents`)
- modify - superdev/README.md (`## Quick start` step 1 and step 7, `## Config switches` table, `### Entry and environment` table, `### Knowledge layers (also runnable on their own)` table)
- modify - CLAUDE.md (the `superdev` bullet under `## What this repo is`, the `docs/<layer>/` invariant, the self-documentation invariant's agent list)
- modify - superdev/hooks/content/manifest.md (`## Build chain`)

### Task Checks
- node -e "JSON.parse(require('fs').readFileSync('superdev/.claude-plugin/plugin.json','utf8'))"
- grep -q './agents/qa-writer.md' superdev/.claude-plugin/plugin.json && grep -q './agents/e2e-writer.md' superdev/.claude-plugin/plugin.json && grep -q './skills/e2e/' superdev/.claude-plugin/plugin.json && grep -q 'docs/qa/' CLAUDE.md && grep -q 'e2e-api' superdev/README.md && grep -q 'e2e-api' superdev/hooks/content/manifest.md

### Approach
1. `plugin.json`: append `"./skills/e2e/"` to `skills` and `"./agents/qa-writer.md"`, `"./agents/e2e-writer.md"` to `agents`.
2. `README.md`: three rows in the config table (`qa`, `e2e-ui`, `e2e-api`) in the wording of the spec's Goal; step 1 mentions the tooling report; step 7 names `qa` in wave 1 and the two-stage model; an `e2e` row in the entry table; `superdev:qa-writer` and `superdev:e2e-writer` rows in the knowledge-layers table.
3. `CLAUDE.md`: extend the `superdev` bullet with the QA layer (three switches, `qa-writer` in wave 1, the two `docs/qa/` documents, the user-only `e2e` skill dispatching `e2e-writer`, tests never run in a build); add `docs/qa/` to the `docs/<layer>/` invariant; add the two agents to the self-documentation invariant's list of superdev agents; note `superdev/scripts/check-playwright.sh` where the plugin's shared scripts are described.
4. `manifest.md`: one bullet under `## Build chain`: config-gated by `qa`, `e2e-ui` and `e2e-api`, Close Out writes the QA acceptance document and the E2E handoff under `docs/qa/`; Playwright tests are generated only by the user-run `e2e` skill, never during a build.

### Failure modes
- none - documentation

### Contracts
- none

### DoD
`plugin.json` parses and lists the three new entries; README, root CLAUDE.md and manifest describe the switches, the `docs/qa/` layer and the E2E flow.


### Covered criteria
15. Katalog i dokumentacja aktualne - Katalog pluginu, README superdev, root `CLAUDE.md` i manifest opisują nowe przełączniki, warstwę `docs/qa/`, przebieg E2E oraz model dwuetapowy.
