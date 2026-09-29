# Versioning and CI

- Tag-driven, one shared namespace across all five plugins (`MAJOR.MINOR.PATCH`, no `v` prefix,
  seed `0.1.0`). The only versioning path is `.github/workflows/release-version.yml`: a manual
  `workflow_dispatch` (patch/minor/major) on a **self-hosted** runner, running
  `.github/scripts/release.sh`, which writes the version into all five `plugin.json`, commits
  `chore(bump): ...`, tags, pushes and publishes a GitHub Release. Nothing bumps on push.
- `release.sh` requires `jq` and `gh` (its header assumes them preinstalled, as on
  `ubuntu-latest`): the self-hosted runner must carry both or the release fails.
- `release.sh` never touches `.claude-plugin/marketplace.json`: its own `version` is separate and
  hand-maintained. Verify script mechanics against `release.sh` before restating them.
- CI (`.github/workflows/ci.yml`) runs the suite on Linux only for push/PR; the macOS + Windows
  matrix, where portability actually gets exercised, runs only on a manual dispatch.
- CI pins Node 24 (`actions/setup-node`, `node-version: 24`) while local runs use a newer Node: a
  test or `.ts` script relying on newer Node behaviour passes locally and fails in CI.
- `.gitattributes` forces `eol=lf` on every text file - a CRLF script breaks under bash.
