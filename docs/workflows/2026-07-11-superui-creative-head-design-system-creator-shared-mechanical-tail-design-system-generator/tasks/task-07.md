
## Task 7 - feat(superui): setup skill, READMEs and final docs sync
- Covers: criteria #9, #10 (and closes #2's setup pointer)

### Dependencies
- Task 3, Task 6 - blocks: none

### Files
- add - superui/skills/setup/SKILL.md
- add - superui/skills/setup/scripts/check_env.sh
- add - superui/README.md
- modify - superui/.claude-plugin/plugin.json (skills[] += "./skills/setup/")
- modify - README.md (root: superui table lists extractor, creator, completer, guardian, pro-designer, setup + generator as internal; link to superui/README.md; Install section mentions superui requirements pointer)
- modify - superui/CLAUDE.md (layout: setup skill + README; final consistency audit of every section touched by Tasks 1-6)
- modify - CLAUDE.md (root: superui description - creator + generator + setup; catalog sentence about superui skill count)
- modify - superui/hooks/content/manifest.md (ONLY if it names `.superui/design-system/` writers - then add creator; otherwise untouched)

### Test Commands
*Build*
- `python3 -c "import json;json.load(open('superui/.claude-plugin/plugin.json'))"`

*Tests*
- `sh superui/skills/setup/scripts/check_env.sh` -> one line per check: `PYTHON <cmd>|MISSING`, `MODULE <name> OK|MISSING (pip install <pkg>)`; always exit 0
- `grep -n 'disable-model-invocation: true' superui/skills/setup/SKILL.md`
- `grep -n 'superui/README.md' README.md` -> link present
- `grep -rn 'shared/' superui/CLAUDE.md` -> no stale layout references

### Approach
1. check_env.sh (POSIX sh, `set -eu`, exit 0 always - diagnostic): source interpreter via `"${CLAUDE_PLUGIN_ROOT}/scripts/check_python.sh"` (fallback `$(dirname "$0")/../../../scripts/check_python.sh` for direct runs); print `PYTHON <cmd>` or `PYTHON MISSING`; for each module pair (`PIL`:pillow, `numpy`:numpy, `yaml`:pyyaml) run `<cmd> -c "import <module>"` and print `MODULE <module> OK` / `MODULE <module> MISSING (pip install <pkg>)`; header comment carries the I/O contract (self-verifying script, caller trusts output).
2. setup SKILL.md - frontmatter per superdev precedent: `name: setup`, `description: Setup / diagnose the superui environment (Python + required modules).`, `allowed-tools: Read, Bash(sh:*)`, `user-invocable: true`, `disable-model-invocation: true`. Body: run check_env.sh in a fenced `!` block? NO - plain instruction: run `sh "${CLAUDE_SKILL_DIR}/scripts/check_env.sh"`, trust its lines, report PASS/FAIL table to the user with per-OS install hints (macOS `brew install python3`, Windows python.org + PATH note, `pip install pillow numpy pyyaml`), remind which skills need what (sampling needs Pillow+numpy; token pipeline needs PyYAML; contrast/lint/index are stdlib).
3. superui/README.md: what the plugin is (4 user-facing skills + guardian doctrine + internal generator), requirements section (Python 3; `pip install pillow numpy pyyaml`; run `/superui:setup` to verify), quick-start flows (extract vs create vs complete), artifact location `.superui/design-system/`.
4. Root README.md superui section: full skill table + one-line generator note + link; root CLAUDE.md superui bullets: creator/generator/setup + "three writers" of `.superui/design-system/`.
5. Read manifest.md; apply the conditional edit only if writers are named.
6. Final audit pass over superui/CLAUDE.md for contradictions with Tasks 1-6 (per repo self-documentation invariant).

### Edge cases
- check_env.sh must not fail (`set -eu` + guarded command checks) when python is absent entirely - every probe wrapped so the script still prints its lines and exits 0.
- `${CLAUDE_PLUGIN_ROOT}` is unset when the user runs the script manually from the repo - the dirname fallback covers it.

### Contracts
- check_env.sh output contract above - the setup skill trusts it verbatim (script-vs-fork invariant).

### DoD
Setup runs and reports; both READMEs shipped; plugin.json final state has 7 skills + 12 agents; no stale `shared/` references anywhere; manifest decision recorded in the task's commit message.


### Covered criteria
9. `superui/skills/setup/SKILL.md` exists, user-only (`disable-model-invocation: true`), runs a bundled `scripts/check_env.sh` that reports interpreter (via `check_python.sh`) and third-party modules (Pillow, numpy, PyYAML) as PASS/FAIL lines with install hints; `superui/README.md` documents requirements (Python 3 + `pip install pillow numpy pyyaml`), setup usage and the skill/agent map; root `README.md` superui table lists all seven skills (extractor, creator, completer, guardian, pro-designer, setup, with generator noted as internal) and links `superui/README.md`.
10. `superui/.claude-plugin/plugin.json` lists skills `design-system-creator`, `design-system-generator`, `setup` and agents `design-director`, `spec-designer` (existing entries intact); `superui/CLAUDE.md` reflects the new layout, skill/agent taxonomy, head/tail invariant, extended provenance canon and scripts inventory; root `CLAUDE.md` superui description updated; `superui/hooks/content/manifest.md` untouched unless it names artifact writers (then extended by one line).
2. No superui SKILL.md contains a `` !` `` preflight line; extractor, completer, creator and generator each carry an explicit early env-check step (`sh "${CLAUDE_PLUGIN_ROOT}/scripts/check_python.sh"`; on `PYTHON_MISSING` stop and point at `/superui:setup`); pro-designer's contrast-script instructions handle a missing interpreter by pointing at `/superui:setup`.
