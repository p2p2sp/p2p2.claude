
## Task 4 - docs: register council-this across superbiz and repo docs
- Covers: criteria #6, #7, #8, #9
- TDD: none

### Dependencies
- Task 3 - blocks: this task (docs describe the finished pair + agents)

### Files
- modify - superbiz/CLAUDE.md (intro, Layout tree, Skills bullets, new `## Agents` section, invariants)
- modify - CLAUDE.md (root - superbiz bullet, forks/references sentence, entry-skill counts, agents/ carriers sentence, docs-layer + .temp invariants, manifest invariant, Self-documentation invariant)
- modify - README.md (line-3 recap, superbiz plugin bullet, `## Super Biz` section intro + two table rows)

### Test Commands
#### Build
- none

#### Tests
- `grep -RE '—|–|✅|⚠️|❌' superbiz/; test $? -eq 1` - expected: exit 0 (whole-tree hygiene sweep)
- `grep -Ri 'karpathy' superbiz/; test $? -eq 1` - expected: exit 0 (no source attribution)
- `grep -RE '^\|.*---' superbiz/; test $? -eq 1` - expected: exit 0 (no Markdown table separators in skill/agent sources)
- `grep -c 'council-this' superbiz/CLAUDE.md` - expected: >= 4
- `grep -c 'council' README.md` - expected: >= 3
- `grep -c '{validator,roadmap,council}' CLAUDE.md` - expected: 1

### Approach
1. `superbiz/CLAUDE.md`: extend the intro paragraph (the plugin also runs a framed decision through a five-advisor council; catalog of record becomes `skills[]` + `agents[]`); add `agents/` (five `council-*.md` files, one line each) and the two new skill dirs to the Layout tree; add two `## Skills` bullets mirroring the existing four (entry: intake + framing, capture to `.temp/superbiz/council/capture-<RUN_ID>.md`, dispatch via Skill, relay; fork: convenes the five persona agents in one parallel dispatch, chairman synthesis in the fork itself, writes `docs/business/<decision-slug>/rada.md` / `council.md`, returns the `COUNCIL:` line); add a `## Agents` section after `## Skills` (five one-line bullets, dispatched only by `council-this-chairman` via the Agent tool, all `model: opus`); update the invariants - "four skills" becomes "six skills" in the no-manifest bullet, the artifact-home bullet gains `rada.md` (`council.md` in English) and `.temp/superbiz/council/`, the honesty-rule bullet is rephrased: the researcher and writer forks share the sourced-numbers invariant, and the council chairman applies the same tiering to any number its verdict cites; the "Both entries are model-invocable" paragraph after the skills list becomes "All three entries".
2. Root `CLAUDE.md`, edits by anchor: the superbiz bullet in `## What this repo is` (lines 75-82) - rewrite to three CSO-routed entry pairs, adding `council-this` + `council-this-chairman` (five persona agents dispatched by the fork, verdict at `docs/business/<decision-slug>/rada.md`); the sentence "`superbiz` likewise ships no scripts and no plugin-root `references/` dir - each of its two forks keeps its own `references/`" (line 93) - now: no scripts and no plugin-root `references/`, the researcher and writer forks keep their own `references/` (the chairman fork bundles none), and it carries plugin-root `agents/` (the five council personas); "superbiz's two entry skills route purely via CSO descriptions, each backed by its own fork worker" (line 117) - two becomes three; "`superui` and `superfix` both carry `agents/`; `superbiz` carries no plugin-root `scripts/`, `references/`, or `agents/` - it ships no agents..." (line 163) - superui, superfix and superbiz carry `agents/`; superbiz still has no plugin-root `scripts/` or `references/`; the `docs/business/<idea-slug>/` parenthetical in the docs-layer invariant (lines 194-196) - add that `council-this-chairman` writes the council verdict there; `.temp/superbiz/{validator,roadmap}/capture-<RUN_ID>.md` (line 203) - add `council`; "superbiz's two entry skills route the same way, each with its own fork worker behind it" (line 213) - two becomes three; the Self-documentation invariant (lines 261-263) - superbiz's six skills enumerated (add `council-this` / `council-this-chairman`) and "it ships no `agents[]`" becomes: its `agents[]` carries the five council persona agents (dispatched by the chairman fork).
3. Root `README.md`: line 3 - "superbiz's two entry skills route via CSO descriptions, each backed by an internal fork worker" becomes three; the superbiz bullet (line 9) - append a `council-this` clause (runs a decision through a council of five advisor agents, chairman verdict written by its fork to `docs/business/<decision-slug>/`); `## Super Biz` intro (line 96) - "the two entry skills" becomes "the three entry skills route via their CSO `description:`, each backed by a fork worker; the council fork additionally dispatches five persona agents"; append two table rows: `council-this` (interactive entry - frames the decision and its stakes with the user, then hands one capture file to its fork worker) and `council-this-chairman` (fork - convenes the five council persona agents in parallel and writes the chairman verdict to `docs/business/<decision-slug>/`).
4. Repo prose style throughout: spaced ` - `, no em/en dashes, English only; README tables are allowed (the skill-source table ban does not apply to README.md).

### Edge cases
- none

### Contracts
- none

### DoD
All three docs updated at every listed anchor; hygiene sweeps over `superbiz/` pass; test commands pass.


### Covered criteria
6. Hygiene over the whole `superbiz/` tree: zero em/en dashes, zero emoji (the ✅/⚠️/❌ set), zero Markdown table separator lines, zero occurrences of `Karpathy` or any other source-attribution names.
7. `superbiz/CLAUDE.md` is synced: intro says the plugin also turns a framed decision into a council verdict and that the catalog of record is `skills[]` + `agents[]`; the Layout tree shows `agents/` (five files) and the two new skill dirs; `## Skills` gains two bullets (entry: intake, capture path `.temp/superbiz/council/capture-<RUN_ID>.md`, dispatch, relay; fork: convenes the five agents, chairman synthesis, artifact path, tagged return line); a new `## Agents` section lists the five personas as dispatched only by the chairman fork via the Agent tool; invariants update "four skills" to "six skills", the artifact-home bullet adds `rada.md` (`council.md` in English) and `.temp/superbiz/council/`, and the honesty-rule bullet says the research and roadmap forks share the sourced-numbers invariant while the council chairman applies the same tiering to any number its verdict cites.
8. Root `CLAUDE.md` is synced at these anchors: the superbiz bullet in `## What this repo is` (three CSO-routed entry skills, the council pair, the five agents); the "each of its two forks keeps its own `references/`" sentence (now: its researcher and writer forks keep their own `references/`, the chairman fork bundles none, and superbiz now carries plugin-root `agents/`); "superbiz's two entry skills route purely via CSO descriptions" in `## Why five plugins` becomes three; the "`superui` and `superfix` both carry `agents/`" sentence adds superbiz and drops "it ships no agents"; the docs-layer invariant's `docs/business/<idea-slug>/` parenthetical mentions the council verdict; `.temp/superbiz/{validator,roadmap}/capture-<RUN_ID>.md` becomes `.temp/superbiz/{validator,roadmap,council}/capture-<RUN_ID>.md`; the one-injected-manifest invariant's "superbiz's two entry skills route the same way" becomes three; the Self-documentation invariant enumerates superbiz's six skills and states its `agents[]` carries the five council personas.
9. Root `README.md` is synced: line-3 recap says superbiz's three entry skills route via CSO descriptions; the superbiz bullet in the plugin list gains a `council-this` clause (five-advisor council verdict at `docs/business/<decision-slug>/`); the `## Super Biz` section intro says three entry skills, each backed by a fork worker, plus five council persona agents; the skill table gains two rows (`council-this`, `council-this-chairman`).
