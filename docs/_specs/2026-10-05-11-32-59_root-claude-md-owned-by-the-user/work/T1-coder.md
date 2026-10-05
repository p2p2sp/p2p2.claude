# T1 coder notes

- The root budget applies to the `node:` line of `CLAUDE.md` alone; a section beside the root (`CLAUDE.<topic>.md`) keeps `NODE_BUDGET` (DoD.4 pins it).
- DoD.6 (header text) has no test: test-strategy forbids asserting on a source file's text; the Verification grep proves it.
- Boundary cases (DoD.2, 3, 4, 5) passed on first run, so each was watched red under a temporary budget mutation (root 3999, node/section budget 4000, chain 33000), then restored.
- The OVER-NODE-wins and chain cases now need a fourth node level (`a/b/c/`) to pass 32000 with a 4000-byte root.
