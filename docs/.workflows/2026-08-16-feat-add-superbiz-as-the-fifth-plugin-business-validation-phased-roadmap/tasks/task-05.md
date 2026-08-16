
## Task 5 - docs: register superbiz across the root CLAUDE.md
- Covers: criterion #10
- TDD: none

### Dependencies
- Task 1 - blocks: this task (documents what Task 1-3 ship)

### Files
- modify - CLAUDE.md (root; plugin counts, bullets, layout tree, invariants, versioning)

### Test Commands
#### Build
- none

#### Tests
- `grep -c 'superbiz' CLAUDE.md` - expected: >= 8
- `grep -n 'Why four plugins' CLAUDE.md; test $? -eq 1` - expected: exit 0 (heading renamed)

### Approach
1. Top blockquote and `## What this repo is`: "Four self-contained..." to "Five...", add `superbiz` to every plugin enumeration (source-of note, marketplace co-listing sentence, `"./superbiz"` in the catalog lists), and add a `- **superbiz** - ...` bullet after superfix: business validation + phased roadmap ecosystem, two CSO-routed entry skills each with a fork worker (researcher: opus web research to `docs/business/<idea-slug>/walidacja.md`; writer: phased plan folder at `docs/business/<idea-slug>/plan/`), no hooks/no manifest; the per-plugin-CLAUDE.md note gains `superbiz/CLAUDE.md`.
2. "no hooks and no manifest" enumerations throughout (`superui` / `supergh` / `superfix` lists, the artefacts paragraph "only superdev has hooks", the one-injected-manifest invariant): add `superbiz` to each list.
3. `## Why four plugins`: rename to `## Why five plugins`, add the superbiz install-subset clause (just the business ecosystem) and its manifest-less rationale to the closing parenthetical.
4. `## Repository layout (top level)`: add `superbiz/` tree line after `superfix/` (`The superbiz plugin (business validation / product roadmap; NO hooks, NO manifest) -> superbiz/CLAUDE.md`); update the marketplace.json comment line to name five entries.
5. `## Versioning`: "all four" to "all five" (both occurrences), add `superbiz/` to the manifest list.
6. `## Cross-plugin architecture invariants`: docs-layer invariant gains `docs/business/<idea-slug>/` (superbiz's validator report + `plan/` folder); the `.temp/` clause gains `.temp/superbiz/` capture files; the self-documentation invariant names superbiz's `skills[]` (four skills, no agents); the per-plugin-invariants pointer sentence gains superbiz.
7. `## When editing`: the marketplace co-listing sentence gains `"./superbiz"`.
8. Keep "four" wherever it genuinely still means four (none expected - verify each remaining `four` before leaving it).

### Edge cases
- none

### Contracts
- none

### DoD
Root CLAUDE.md consistently describes five plugins; no stale "four" enumeration that should include superbiz remains; grep checks pass.


### Covered criteria
10. Root `CLAUDE.md` is updated: "four" plugin counts become "five" (incl. the `## Why four plugins` heading), a superbiz bullet in `## What this repo is`, a `superbiz/` line in the layout tree, `## Versioning` says all five manifests, the docs-layer invariant lists `docs/business/<idea-slug>/` and the `.temp/` invariant lists `.temp/superbiz/`, the manifest-less-plugin statements and the self-documentation invariant name superbiz.
