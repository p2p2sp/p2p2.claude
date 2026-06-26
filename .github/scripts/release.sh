#!/usr/bin/env bash
# release.sh — tag-driven version bump for the superdev + superui + supergh + superfix plugins.
#
# Computes the next MAJOR.MINOR.PATCH version (no "v" prefix) from the highest
# existing git tag, syncs it into ALL FOUR subdir plugin manifests' .version
# (superdev/, superui/, supergh/, superfix/ .claude-plugin/plugin.json — shared version,
# one tag namespace), commits the bump (`chore(bump): …`, no
# [skip ci]), creates + pushes the tag, then publishes a GitHub Release whose
# notes are built from the commits since the previous tag (grouped by conventional
# type) with GitHub's auto-generated notes appended.
#
# Loop guard: the bump commit carries NO [skip ci] token; auto-version.yml skips
# its own bump commits via an `if: !startsWith(head_commit.message, 'chore(bump)')`
# job guard instead — keep the `chore(bump)` prefix in sync with that workflow.
#
# Usage:    .github/scripts/release.sh <major|minor|patch>
# Source of truth: highest tag matching ^[0-9]+\.[0-9]+\.[0-9]+$ ; none => seed 0.1.0
#                  (seed taken as-is, no bump applied on the very first run).
# Requires: checkout with fetch-depth: 0 (+ tags), permissions: contents: write,
#           GH_TOKEN in env (for `gh release create`), jq + gh (preinstalled on
#           ubuntu-latest).
# Outputs:  new version on stdout and as `version=<v>` to $GITHUB_OUTPUT.
set -euo pipefail

part="${1:?usage: release.sh <major|minor|patch>}"
manifests=(superdev/.claude-plugin/plugin.json superui/.claude-plugin/plugin.json supergh/.claude-plugin/plugin.json superfix/.claude-plugin/plugin.json)
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

# 1. Write the new version into ALL plugin manifests (shared version).
for manifest in "${manifests[@]}"; do
  tmp="$(mktemp)"
  jq --arg v "$new" '.version = $v' "$manifest" >"$tmp"
  mv "$tmp" "$manifest"
done

# 2. Commit the bump FIRST — this commit is what the release tag points at.
#    The no-diff branch is recovery only: a prior run already committed this exact
#    version but failed before tagging, so re-tag that commit instead of fabricating
#    an empty one (rerun-safe). A diff in ANY manifest counts as a change, so the
#    re-tag path fires only when NO manifest changed.
git add "${manifests[@]}"
if git diff --cached --quiet; then
  echo "release.sh: $new already committed; re-tagging existing release commit" >&2
else
  git commit -m "chore(bump): bump version to $new"
  git push origin "HEAD:${GITHUB_REF_NAME:-main}"
fi

# 3. Only now create + push the release tag, on the committed bump.
git tag "$new"
git push origin "refs/tags/$new"

# 4. Build a commit-based changelog: previous version tag → the just-tagged bump
#    commit. First release (no previous tag) → full history. The bump commit itself
#    is excluded. Conventional types group into Features / Fixes / Other; an optional
#    "T<n>: " task prefix is stripped before reading the type.
if [ -n "$current" ]; then range="${current}..HEAD"; else range="HEAD"; fi
feats=""; fixes=""; others=""
while IFS=$'\t' read -r hash subject; do
  [ -z "$subject" ] && continue
  case "$subject" in "chore(bump)"*) continue ;; esac
  core="$subject"
  [[ "$core" =~ ^T[0-9]+:\ (.*)$ ]] && core="${BASH_REMATCH[1]}"
  case "$core" in
    feat\(*|feat:*|feat!*) feats+="- ${subject} (${hash})"$'\n' ;;
    fix\(*|fix:*|fix!*)    fixes+="- ${subject} (${hash})"$'\n' ;;
    *)                     others+="- ${subject} (${hash})"$'\n' ;;
  esac
done < <(git log "$range" --pretty=format:'%h%x09%s')

body=""
[ -n "$feats" ]  && body+=$'### Features\n'"$feats"$'\n'
[ -n "$fixes" ]  && body+=$'### Fixes\n'"$fixes"$'\n'
[ -n "$others" ] && body+=$'### Other\n'"$others"$'\n'
[ -z "$body" ] && body=$'_No notable changes._\n'

# 5. Publish the GitHub Release: our commit-based notes first, GitHub's generated
#    notes appended. Re-run-safe: skip if a release for this tag already exists.
if gh release view "$new" >/dev/null 2>&1; then
  echo "release.sh: GitHub release $new already exists; skipping" >&2
else
  printf '%s' "$body" | gh release create "$new" \
    --title "$new" --notes-file - --generate-notes
fi

echo "$new"
echo "version=$new" >>"${GITHUB_OUTPUT:-/dev/null}"
