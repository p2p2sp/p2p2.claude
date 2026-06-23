---
paths:
  - "superdev/skills/**/scripts/*.sh"
---
# Discovery Scripts

- Open each bundled discovery script with a `# superdev / <skill> — <name>` header line plus a `# Contract:` block documenting input, output, and notes.
- Make the `lib_find_excludes.sh` sourcing decision deliberate and document it inline: recursive tree scan sources it; a single flat-dir scan does not.
