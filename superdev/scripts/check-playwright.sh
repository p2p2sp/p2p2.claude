#!/usr/bin/env bash
# check-playwright.sh - reports whether the Playwright tooling the e2e-ui /
# e2e-api flow needs is present in the host project, never installing it.
#
# Two callers: `setup`'s bootstrap.sh, right after it reports the config
# block, so `/superdev:setup` tells the operator what tooling is missing
# instead of guessing; and the `Add the e2e skill`'s own `!` preload, which
# invokes this script directly at skill-load time.
#
# Contract:
#   argv   : none.
#   cwd    : the project root (bootstrap.sh's own cwd, or the e2e skill's `!`
#            preload, both at skill-load time).
#   stdout : exactly two lines, always in this order -
#              "playwright-cli: found <version>"          - `command -v
#                playwright-cli` succeeds and `playwright-cli --version`
#                prints something on its first line, or
#              "playwright-cli: found (version unknown)"  - `command -v`
#                succeeds but `--version` fails or prints nothing, or
#              "playwright-cli: not found"                - no `playwright-cli`
#                on PATH;
#              "@playwright/test: found"                   - `<root>/package.json`
#                exists and names `"@playwright/test"`, or
#              "@playwright/test: not found"                - no root
#                package.json, it is unreadable, or it does not name the
#                package.
#            `root` is `git rev-parse --show-toplevel`, falling back to the
#            cwd when that fails (no git, or not a repository).
#   exit   : always 0 (report-only; installs nothing, ever).

set -u

root="$(git rev-parse --show-toplevel 2>/dev/null)" || root="$(pwd)"

if command -v playwright-cli >/dev/null 2>&1; then
  version_output="$(playwright-cli --version 2>/dev/null)"
  version_status=$?
  version="$(printf '%s\n' "$version_output" | head -n1)"
  if [ "$version_status" -eq 0 ] && [ -n "$version" ]; then
    echo "playwright-cli: found ${version}"
  else
    echo "playwright-cli: found (version unknown)"
  fi
else
  echo "playwright-cli: not found"
fi

if [ -f "${root}/package.json" ] && grep -q '"@playwright/test"' "${root}/package.json" 2>/dev/null; then
  echo "@playwright/test: found"
else
  echo "@playwright/test: not found"
fi

exit 0
