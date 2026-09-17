## Runs
- node -e "JSON.parse(require('fs').readFileSync('superdev/.claude-plugin/plugin.json','utf8'))" -> exit 0
- grep -q './agents/qa-writer.md' superdev/.claude-plugin/plugin.json && grep -q './agents/e2e-writer.md' superdev/.claude-plugin/plugin.json && grep -q './skills/e2e/' superdev/.claude-plugin/plugin.json && grep -q 'docs/qa/' CLAUDE.md && grep -q 'e2e-api' superdev/README.md && grep -q 'e2e-api' superdev/hooks/content/manifest.md -> exit 0

no deviations
