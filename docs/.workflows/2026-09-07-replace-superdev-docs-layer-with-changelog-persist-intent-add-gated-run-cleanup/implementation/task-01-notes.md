# Task 1 notes

- Added two extra `read-config.test.ts` fixtures beyond the Approach's single "cleanup + leftover docs key" fixture - split into two separate tests (`a leftover \`docs: true\` key ... is ignored` and `cleanup: true resolves independently of changelog`) instead of one, for clearer failure isolation; not a Files/contract change.
- `.claude/superdev.yml` was rewritten with short inline comments (`# ADR capture`, `# Changelog`, `# Run cleanup`) rather than byte-for-byte copying `config.yml`'s longer comments - the task only requires the five keys, all false, in this repo's config, not asset parity.

no other deviations
