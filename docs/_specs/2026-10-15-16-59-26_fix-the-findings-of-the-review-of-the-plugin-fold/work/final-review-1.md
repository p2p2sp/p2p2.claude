# Final review 1

## Minor

1. `docs/viber-functions.html:93,99,100` - the header carries stale counts: "version 0.81.2", "18 skills", "23 agents". `viber/.claude-plugin/plugin.json` says 0.84.1, `viber/skills/` holds 21 skill directories and `viber/agents/` holds 24 agents. T7 added sections for three skills (pro-designer, idea-validator, skill-designer), so the page now describes more skills than its header states. `work/T7-coder.md` line 1 records these stats as left stale. Fix: set the eyebrow to version 0.84.1, the skills stat to 21 and the agents stat to 24.
