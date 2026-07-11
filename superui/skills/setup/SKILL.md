---
name: setup
description: Setup / diagnose the superui environment (Python + required modules).
allowed-tools: Read, Bash(sh:*)
user-invocable: true
disable-model-invocation: true
---

# Setup — superui environment diagnostic

Report whether this machine can run superui's Python steps (token sampling, contrast checks,
tokens.css/DESIGN.md/index generation, spec-token/preview linting). Diagnostic only — never writes
anything, never installs anything.

## Run

```
sh "${CLAUDE_SKILL_DIR}/scripts/check_env.sh"
```

Trust its lines verbatim — do not re-verify them. It always exits 0; a `MISSING` line is data, not a
script failure.

## Report

Turn the script's lines into a PASS/FAIL table, one row per check (`PYTHON ...` -> interpreter row,
each `MODULE ...` -> a module row), then add install hints for anything not `OK`:

- Interpreter missing -> macOS: `brew install python3`; Windows: install from python.org and ensure
  it's added to PATH during setup; Linux: use the distro package manager (e.g. `apt install
  python3`).
- Any `MODULE ... MISSING` line -> `pip install pillow numpy pyyaml` (installs all three at once;
  the script's own per-module hint installs just that one).

Close with which skills need what, so a partial PASS is still actionable:
- Pillow + numpy -> inspiration-image sampling (`design-system-creator` step 3, `spec-writer`'s
  screenshot sampling).
- PyYAML -> the token pipeline (`token-composer`, `validate_tokens.py`, `tokens_to_css.py`) —
  everything that reads or writes `dtcg.yml`.
- No third-party module -> contrast checks, spec/preview linting, and index generation are stdlib-only
  and run under any working interpreter.
- Interpreter missing entirely -> every `*.py` step across all four skills (extractor, creator,
  completer, generator) stops at its env-check; only the guardian and pro-designer's non-script
  guidance remain usable.
