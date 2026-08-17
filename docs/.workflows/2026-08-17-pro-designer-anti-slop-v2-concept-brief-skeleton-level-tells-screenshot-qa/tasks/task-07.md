
## Task 7 - docs(superui): sync superui CLAUDE.md with pro-designer anti-slop v2
- Covers: criteria #9, #10
- TDD: none

### Dependencies
- Task 1, Task 2, Task 3, Task 4, Task 5, Task 6 - blocks: none

### Files
- modify - superui/CLAUDE.md (the `pro-designer` bullet under `## Skills (flat-named, single domain)`)

### Test Commands
#### Build
- none (markdown-only plugin source, no build step)

#### Tests
- bash -c 'grep -n "concepting.md" superui/CLAUDE.md' (expect a match)
- bash -c 'node --test "tests/**/*.test.ts"' (sanity - no plugin script touched, suite stays green)

### Approach
1. Rewrite the pro-designer bullet's anti-slop clause: aesthetic direction split across three references - `references/concepting.md` (mandatory pre-layout concept brief + skeleton critique for new Persuade/Experience surfaces, binding even when the host defines a design system), `references/distinctiveness.md` (defaults refusal, subject grounding with the physical-artifact rule, signature element with 3-point recurrence, consistency locks), `references/anti-slop.md` (forensic tells catalog incl. skeleton-level sequence tells and the entropy meta-rule).
2. Mention the screenshot-based Final QA step (full-page render checks for new Persuade/Experience surfaces) in the same bullet.
3. Verify `superui/.claude-plugin/plugin.json` needs no change (references are not cataloged; no skill/agent added) - do not edit it.

### Edge cases
- none

### Contracts
- none

### DoD
`superui/CLAUDE.md` reflects the three-reference split and screenshot QA; grep matches; `node --test` suite green.


### Covered criteria
9. `superui/CLAUDE.md` describes pro-designer's anti-generic direction as split across three references (concepting.md, distinctiveness.md, anti-slop.md) and mentions the screenshot-based Final QA step.
10. No file under `superui/` gained an em dash (U+2014), en dash (U+2013), table, emoji, source URL, or external source name; `superui/.claude-plugin/plugin.json` is unchanged.
