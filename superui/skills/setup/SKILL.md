---
name: setup
description: Setup / diagnose the superui environment (Node.js runtime).
allowed-tools: Read, Bash(sh:*)
user-invocable: true
disable-model-invocation: true
---

# Setup - superui environment diagnostic

Report whether this machine can run superui's script steps (color sampling, pixel-geometry measurement, registry merge and `DESIGN.md` rendering, spec consolidation and seed-bundle validation, WCAG contrast checks). The bundled scripts are TypeScript run directly by Node's native type stripping - no build step, no packages to install beyond Node itself. Diagnostic only - never writes anything, never installs anything.

## Run

```!
sh "${CLAUDE_SKILL_DIR}/scripts/check_env.sh"
```

Trust its lines verbatim - do not re-verify them. It always exits 0; a `MISSING` line is data, not a script failure.

## Report

Turn the script's lines into a PASS/FAIL table (`NODE <cmd>` -> runtime row PASS with the command; `NODE MISSING` -> FAIL; `VERSION ...` -> informational row), then add install hints for a FAIL:

- Node missing or older than 22.6 -> install Node.js 24 LTS (or any version >= 22.6) - macOS: `brew install node`; Windows: installer from nodejs.org or `winget install OpenJS.NodeJS.LTS`; Linux: distro package manager or nodejs.org binaries.
- `NODE node --experimental-strip-types` (a 22.6–23.5 runtime) is a PASS - the skills use that command verbatim; upgrading to >= 23.6 just drops the flag.

Close with impact, so a FAIL is actionable: with no working Node, `design-extractor`'s builder stops at its env-check before any measuring, rendering, validating, or packing step runs, and pro-designer's contrast gate is skipped with a note; only pro-designer's non-script guidance remains usable.
