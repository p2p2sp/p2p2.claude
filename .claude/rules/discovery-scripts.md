---
paths:
  - "superdev/skills/**/scripts/*.sh"
---
# Discovery Scripts

- Open each bundled discovery script with a `# superdev / <skill> — <name>` header line plus a `# Contract:` block documenting input, output, and notes.
- Make the `lib_find_excludes.sh` sourcing decision deliberate and document it inline: recursive tree scan sources it; a single flat-dir scan does not.
- Test a deterministic script with a `<name>.test.sh` sibling that runs the SUT against `mktemp -d` fixtures and asserts on its final stdout state line plus exit code — no test framework needed.
- Keep a no-separator backward-compat arg path byte-identical by gating new behavior behind an explicit `HAS_SEP` flag and expanding arrays with the `set -u`-safe `"${ARR[@]+"${ARR[@]}"}"` form, leaving the legacy `$@` iteration unchanged.
