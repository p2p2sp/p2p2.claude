# fix-02 notes

## Runs

- grep -q '^name: e2e' superdev/skills/e2e/SKILL.md && grep -q '^disable-model-invocation: true' superdev/skills/e2e/SKILL.md && grep -q 'check-playwright.sh' superdev/skills/e2e/SKILL.md && grep -q 'superdev:e2e-writer' superdev/skills/e2e/SKILL.md && grep -q 'commit-task.sh' superdev/skills/e2e/SKILL.md -> exit 0
- node -e "JSON.parse(require('fs').readFileSync('superdev/.claude-plugin/plugin.json','utf8'))" -> exit 0
- grep -q './agents/qa-writer.md' superdev/.claude-plugin/plugin.json && grep -q './agents/e2e-writer.md' superdev/.claude-plugin/plugin.json && grep -q './skills/e2e/' superdev/.claude-plugin/plugin.json && grep -q 'docs/qa/' CLAUDE.md && grep -q 'e2e-api' superdev/README.md && grep -q 'e2e-api' superdev/hooks/content/manifest.md -> exit 0

C1: fixed
I4: fixed - no test: repo prose invariant in the root CLAUDE.md; no suite under tests/ reads this repo's own CLAUDE.md content

touched: superdev/skills/e2e/SKILL.md
touched: CLAUDE.md
