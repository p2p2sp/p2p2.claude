Title: "Test coverage for the 39 uncovered plugin scripts, with cross-OS invariants and a CI matrix"


## Goal
Every script this repo ships - 39 currently uncovered, on top of the 5 already covered - has a regression
test under `tests/`, driven by one runner and one command, exercising each documented output line, each
documented exit code and the edge cases that only show up on another OS or another shell. A new CI workflow
proves the suite green on Linux, macOS and Windows. No test reaches the network, mutates this repo's working
tree, or can push a tag.

## Context
The repo ships 44 scripts (`git ls-files` over `*.sh`/`*.ts` outside `tests/`, minus the 3 in-plugin bash
harnesses). `tests/` today covers 5 of them with a dedicated file each - all superui TypeScript modules,
imported in-process - leaving 39 uncovered (30 shell + 9 TS, `superui/scripts/inventory-format.ts` counted
as uncovered because it is only exercised incidentally through `validate_bundle.test.ts`). The 3 ad-hoc bash
harnesses live *inside* plugin dirs, so they are installed to end users. Nothing runs any of it in CI, so the plugins' cross-OS promise (bash / zsh /
Git-Bash on macOS / Linux / Windows) is unverified. This plan extends the existing `node --test` convention
with a subprocess harness, adds a static portability sweep for invariants a green run cannot catch (exec bit,
shebang, CRLF, unquoted globs in `!` preloads, bashisms under `#!/bin/sh`), and wires a 3-OS matrix on Node
24. Multi-shell execution is scoped where it proves something: a `#!/usr/bin/env bash` script always runs
under bash whatever the user's login shell is, so it is exercised under every bash *major* present (macOS
ships 3.2, Linux and Git-Bash ship 5.x - that is where the real divergence lives), while `#!/bin/sh`
scripts go through every POSIX shell present (dash, bash-as-sh, MSYS sh) and the zsh dimension is covered
statically, on the `!` preload lines the host shell actually parses. Verified against the repo, not
assumed: `node --test tests/superui/` FAILS (a directory argument is resolved as a module path),
`node --test "tests/**/*.test.ts"` passes 31/31, a zero-match glob exits 0 with no tests run, and helper
modules under `tests/` are not collected as test files.

## Acceptance criteria
1. `node --test "tests/**/*.test.ts"` runs the whole suite from the repo root and is green; that command is
   documented in root `CLAUDE.md`.
2. `tests/harness/` exposes `runScript`, `withTempDir`, `withGitRepo`, `withStub`, `forEachShell` and
   `writePng`, carries no knowledge of any individual script under test, and is itself covered by
   `tests/harness.test.ts`.
3. Every one of the 39 uncovered scripts has coverage under `tests/` - `tests/<plugin>/` for the four
   plugins, `tests/github/` for `.github/scripts/release.sh`; for the 36 full-coverage scripts (all but
   `vendor/jpeg-decode.ts`, `sample_colors.ts` and `release.sh`, which are scoped to their boundary),
   every documented stdout marker line and every documented exit code is asserted.
4. `tests/portability.test.ts` fails if any shipped script loses its exec bit in the git index, loses its
   shebang, gains a CRLF line ending, gains a bashism under a `#!/bin/sh` shebang, or if any SKILL.md `!`
   preload passes an unquoted argument containing `?`, `*` or `[`.
5. Every `#!/bin/sh` script is exercised under each POSIX shell present on the machine, and every
   bash-shebang script under each distinct bash major present; an absent shell is skipped with a recorded
   reason, never failed.
6. No test performs network I/O, mutates this repo's working tree, or creates a tag outside a throwaway
   repo: `gh` is always a PATH stub, `node` is a PATH stub wherever a script probes its version, every
   mutating `git` call runs in a `mkdtemp` repo with `HOME`, `GIT_CONFIG_GLOBAL` and `GIT_CONFIG_NOSYSTEM`
   isolated (read-only `git` against this repo is allowed - Task 2 needs the real index and Task 17
   asserts this repo's status and tag list are untouched), and the `release.sh` test pushes only to a
   local bare remote.
7. `superdev/hooks/scripts/review-plan.test.sh`, `superdev/scripts/read-config.test.sh` and
   `superdev/skills/setup/scripts/bootstrap.test.sh` are deleted, and every case they asserted is asserted
   in `tests/superdev/`.
8. `.github/workflows/tests.yml` runs the suite on `ubuntu-latest`, `macos-latest` and `windows-latest` with
   Node 24, on push and pull_request; `.github/workflows/release-version.yml` is unchanged.
9. Root `CLAUDE.md` states, in its `tests/` entry, both the tests tree's fixtures-stay-file-local
   convention and the single `tests/harness/` mechanism-only exception to it.

