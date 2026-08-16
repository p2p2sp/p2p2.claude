
## Task 4 - feat(marketplace): co-list superbiz and document it in the README
- Covers: criteria #8, #9
- TDD: none

### Dependencies
- Task 1 - blocks: this task (marketplace `source` must point at an existing plugin dir)

### Files
- modify - .claude-plugin/marketplace.json (append entry, bump version)
- modify - README.md (intro count, bullet list, install block, routing recap, new section)

### Test Commands
#### Build
- none

#### Tests
- `node -e "const m=JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json','utf8')); if(m.version!=='3.4.0'||m.plugins.length!==5||m.plugins[4].name!=='superbiz') process.exit(1)"` - expected: exit 0
- `grep -c 'superbiz' README.md` - expected: >= 4

### Approach
1. In `.claude-plugin/marketplace.json`: bump `version` `"3.3.0"` to `"3.4.0"`; append after the superfix entry: `{"name": "superbiz", "source": "./superbiz", "description": "Super Biz ecosystem for Claude Code."}` (same 3-key shape and order as siblings).
2. In `README.md` line 3: "Four independent" to "Five independent"; extend the parenthetical routing sentence with `superbiz` among the manifest-less plugins (both its entry skills route via CSO descriptions with fork workers behind them).
3. Add a bullet after the superfix bullet (line 8): `- **superbiz** - the business validation / product roadmap ecosystem: ...` describing the validator (deep web research, GO/PIVOT/NO-GO report at `docs/business/<idea-slug>/`) and the roadmap (phased execution docs at `docs/business/<idea-slug>/plan/`), closing with "No manifest, no hooks - both entry skills route via CSO descriptions."
4. Add `claude plugin install superbiz@p2p2 --scope user` to the install block after the superfix line (line 21).
5. Extend the line-28 recap sentence to name superbiz among CSO-routed plugins. Do NOT touch the Node.js line 26 (superbiz ships no scripts).
6. Append a `## Super Biz` section after `## Super Fix`: one-line lede ("Flat-named... No manifest, no hooks - the two entry skills route via their CSO `description:`, each backed by a fork worker:") plus a `| Skill | Role |` table with four rows (validator entry, researcher fork, roadmap entry, writer fork) in the style of the `## Super GH` table, mentioning the in-plugin validator-to-roadmap chain.

### Edge cases
- none

### Contracts
- Marketplace entry `description` string identical to `superbiz/.claude-plugin/plugin.json` `description`.

### DoD
Both files updated; JSON parses with 5 entries and version 3.4.0; README names superbiz in all five spots; test commands pass.


### Covered criteria
8. `.claude-plugin/marketplace.json` has a fifth entry (`name` `superbiz`, `source` `./superbiz`, `description` `"Super Biz ecosystem for Claude Code."`) appended after `superfix`, and its top-level `version` is `"3.4.0"`.
9. Root `README.md` says "Five independent..." with a superbiz clause in line 3, has a superbiz bullet in the plugin list, an install line `claude plugin install superbiz@p2p2 --scope user`, mentions superbiz in the line-28 routing recap, and carries a new `## Super Biz` section with a `| Skill | Role |` table for the four skills.
