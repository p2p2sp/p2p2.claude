#!/usr/bin/env bash
# release.sh — tag-driven version bump for the superdev plugin.
#
# Computes the next MAJOR.MINOR.PATCH version (no "v" prefix) from the highest
# existing git tag, syncs it into .claude-plugin/plugin.json (.version), commits
# with [skip ci], creates the tag, and pushes the commit + tag to the branch.
#
# Usage:    .github/scripts/release.sh <major|minor|patch>
# Source of truth: highest tag matching ^[0-9]+\.[0-9]+\.[0-9]+$ ; none => seed 0.1.0
#                  (seed taken as-is, no bump applied on the very first run).
# Requires: checkout with fetch-depth: 0 (+ tags), permissions: contents: write,
#           jq (preinstalled on ubuntu-latest).
# Outputs:  new version on stdout and as `version=<v>` to $GITHUB_OUTPUT.
set -euo pipefail

part="${1:?usage: release.sh <major|minor|patch>}"
manifest=".claude-plugin/plugin.json"
seed="0.1.0"

current="$(git tag --list --sort=-v:refname \
  | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | head -n1 || true)"

if [ -z "$current" ]; then
  new="$seed"
else
  IFS=. read -r MA MI PA <<<"$current"
  case "$part" in
    major) new="$((MA + 1)).0.0" ;;
    minor) new="${MA}.$((MI + 1)).0" ;;
    patch) new="${MA}.${MI}.$((PA + 1))" ;;
    *) echo "release.sh: invalid part '$part'" >&2; exit 2 ;;
  esac
fi

if git rev-parse -q --verify "refs/tags/$new" >/dev/null; then
  echo "release.sh: tag $new already exists" >&2; exit 3
fi

git config user.name  "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

# 1. Write the new version into the plugin manifest.
tmp="$(mktemp)"
jq --arg v "$new" '.version = $v' "$manifest" >"$tmp"
mv "$tmp" "$manifest"

# 2. Commit the bump FIRST — this commit is what the release tag points at.
#    The no-diff branch is recovery only: a prior run already committed this exact
#    version but failed before tagging, so re-tag that commit instead of fabricating
#    an empty one (rerun-safe).
git add "$manifest"
if git diff --cached --quiet; then
  echo "release.sh: $new already committed; re-tagging existing release commit" >&2
else
  git commit -m "chore(release): $new [skip ci]"
  git push origin "HEAD:${GITHUB_REF_NAME:-main}"
fi

# 3. Only now create + push the release tag, on the committed bump.
git tag "$new"
git push origin "refs/tags/$new"

echo "$new"
echo "version=$new" >>"${GITHUB_OUTPUT:-/dev/null}"
