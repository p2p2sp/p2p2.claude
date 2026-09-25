#!/usr/bin/env bash
#
# bootstrap.sh - seeds the host project for a viber run, and brings a config
# seeded by an older version up to the current template. Idempotent: it never
# overwrites a value the project already carries, so a second run is a no-op
# that still reports the truth.
#
# It is one script rather than a handful of inline commands because a `!` preload
# is permission-checked as ONE command: a compound `test && cp && grep` would ask
# for approval per member and stall the skill load on any mode that does not
# auto-accept.
#
# The config is MERGED rather than left alone, because a new version ships new
# switches: a file seeded once by an older one would never see them, and a user
# reading the README for a switch their own file does not carry has no way to
# turn it on. The merge is additive in one direction only - a key the template
# has and the file lacks is appended with the template's own comment and default
# value; every key the file already declares keeps its value, its comment and
# its position, and a key the template dropped is left standing. Hence `false`
# is the one way to turn a switch off: a deleted or commented-out top-level key,
# or a `directories:` child, is restored at the template's default the next run.
# A child of `tiers:` or `branching:` is the exception: the merge only appends
# one of those groups whole when it is missing entirely, never extends one
# already present, so a deleted child there is not restored - it just resolves
# to its default in config.sh.
#
# Contract:
#   argv   : none.
#   cwd    : any directory inside the host project - the repository root is
#            resolved here. Outside a repository, the cwd is the base.
#   env    : none.
#   writes : <root>/.claude/viber.yml (copied from templates/viber.yml when
#                                      absent; otherwise merged as above, the
#                                      merged text staged in a sibling temp file
#                                      and moved over the config in one step, so
#                                      a failed merge leaves the original)
#            <root>/.gitignore        (seeded from templates/gitignore.txt when the
#                                      project has none, otherwise ".temp/" is
#                                      appended only when no rule ignores it)
#   reads  : <root>/.claude/settings.json (existence only, never written - the
#                                      skill asks reset or merge when present)
#            <root>/CLAUDE.md         (existence only, never written - the agents
#                                      take the build and test commands from it)
#            gh on PATH               (existence only - never run, never
#                                      installed; viber talks to GitHub through it)
#   stdout : one result line per item - the skill carries them into its report
#            verbatim and never re-verifies them.
#   exit   : ALWAYS 0. A preload that exits non-zero aborts the whole skill load,
#            and a project that refuses one of these files is not a broken setup.
#
set -u

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
template="$here/../templates/viber.yml"
template_gitignore="$here/../templates/gitignore.txt"

root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$root" ] || [ ! -d "$root" ]; then
  root="$(pwd)"
fi

# The merge reads the template first and the config second. It appends the block
# of every top-level key the config does not declare - the key line plus the
# comment lines directly above it - and inserts the missing children of the
# `directories:` group inside that group, where they have to sit to be read. A
# `directories:` carrying a value rather than a group is left untouched: only the
# shape the template ships can be extended safely. Every other group, `tiers:`
# among them, is appended whole when absent and never extended: a missing child
# resolves to its default in config.sh. A config written with CRLF
# endings comes back with one ending throughout, never a mix: an awk that hands
# the merge its CR keeps CRLF, one reading in text mode (Git-Bash) rewrites the
# file LF. A mixed file is the one outcome that would corrupt it, since a
# line-based reader takes a stray CR as part of the value. It always writes the
# result to `out`, and prints the keys it added only when it added some.
merge_config() {
  awk -v out="$2" '
    FNR == NR { t[FNR] = $0; tn = FNR; next }
    { h[FNR] = $0; hn = FNR; if ($0 ~ /\r$/) crlf = 1 }
    END {
      eol = (crlf ? "\r" : "")
      for (i = 1; i <= hn; i++) {
        if (h[i] !~ /^[A-Za-z_][A-Za-z0-9_-]*:/) continue
        k = h[i]; sub(/:.*$/, "", k)
        have[k] = 1
        if (k != "directories" || h[i] !~ /^directories:[ \t\r]*$/) continue
        dir_last = i
        for (j = i + 1; j <= hn; j++) {
          if (h[j] ~ /^[ \t]+[A-Za-z_][A-Za-z0-9_-]*:/) {
            c = h[j]; sub(/^[ \t]+/, "", c); sub(/:.*$/, "", c)
            have["directories." c] = 1
            dir_last = j
          } else if (h[j] !~ /^[ \t]*#/ && h[j] !~ /^[ \t\r]*$/) {
            break
          }
        }
      }
      for (i = 1; i <= tn; i++) {
        if (t[i] !~ /^[A-Za-z_][A-Za-z0-9_-]*:/) continue
        k = t[i]; sub(/:.*$/, "", k)
        start = i
        while (start > 1 && t[start - 1] ~ /^#/) start--
        end = i
        while (end < tn && t[end + 1] ~ /^[ \t]+[^ \t]/) end++
        if (!(k in have)) {
          added = (added == "" ? k : added ", " k)
          add[++na] = ""
          for (j = start; j <= end; j++) add[++na] = t[j]
        } else if (k == "directories" && dir_last > 0) {
          for (j = i + 1; j <= end; j++) {
            if (t[j] !~ /^[ \t]+[A-Za-z_][A-Za-z0-9_-]*:/) continue
            c = t[j]; sub(/^[ \t]+/, "", c); sub(/:.*$/, "", c)
            if (("directories." c) in have) continue
            added = (added == "" ? "directories." c : added ", directories." c)
            ins[++ni] = t[j]
          }
        }
        i = end
      }
      for (i = 1; i <= hn; i++) {
        print h[i] > out
        if (i == dir_last) for (j = 1; j <= ni; j++) print ins[j] eol > out
      }
      for (j = 1; j <= na; j++) print add[j] eol > out
      close(out)
      if (added != "") print added
    }
  ' "$1" "$3" 2>/dev/null
}

cfg="$root/.claude/viber.yml"
if [ ! -f "$template" ]; then
  echo "viber.yml: template missing at $template - nothing written"
elif [ ! -f "$cfg" ]; then
  mkdir -p "$root/.claude" 2>/dev/null
  if cp "$template" "$cfg" 2>/dev/null; then
    echo "viber.yml: seeded from template - every switch is commented in it"
  else
    echo "viber.yml: could not write $cfg"
  fi
else
  staged="$cfg.viber-merge.$$"
  added="$(merge_config "$template" "$staged" "$cfg" || true)"
  if [ ! -s "$staged" ]; then
    rm -f "$staged" 2>/dev/null
    echo "viber.yml: could not merge the template into $cfg (left untouched)"
  elif [ -z "$added" ]; then
    rm -f "$staged" 2>/dev/null
    echo "viber.yml: already present and complete (left untouched)"
  elif mv "$staged" "$cfg" 2>/dev/null; then
    echo "viber.yml: merged from the template: $added (your own values kept)"
  else
    rm -f "$staged" 2>/dev/null
    echo "viber.yml: could not merge the template into $cfg (left untouched)"
  fi
fi

# A project with no .gitignore gets the bundled one, which already carries
# .temp/. One that has its own keeps it: the only edit is the .temp/ rule the
# run needs, appended on its own line even when the file ends without one.
ignore="$root/.gitignore"
if [ ! -f "$ignore" ]; then
  if [ ! -f "$template_gitignore" ]; then
    if printf '.temp/\n' > "$ignore" 2>/dev/null; then
      echo ".gitignore: created with .temp/ - template missing at $template_gitignore"
    else
      echo ".gitignore: could not write $ignore"
    fi
  elif cp "$template_gitignore" "$ignore" 2>/dev/null; then
    echo ".gitignore: created from template (ignores .temp/)"
  else
    echo ".gitignore: could not write $ignore"
  fi
elif grep -qE '^[[:space:]]*(\*\*/|/)?\.temp(/(\*\*?)?)?[[:space:]]*$' "$ignore"; then
  echo ".gitignore: already ignores .temp/"
else
  if [ -s "$ignore" ] && [ -n "$(tail -c1 "$ignore")" ]; then
    printf '\n' >> "$ignore" 2>/dev/null
  fi
  if printf '.temp/\n' >> "$ignore" 2>/dev/null; then
    echo ".gitignore: .temp/ appended"
  else
    echo ".gitignore: could not write $ignore"
  fi
fi

# Reported, never written: merge-settings.sh owns this file, and an existing one
# makes the skill ask whether to reset it or merge into it.
if [ -f "$root/.claude/settings.json" ]; then
  echo "settings.json: present"
else
  echo "settings.json: absent"
fi

# Reported, never seeded: the build and test commands every agent reads live
# here, and a stub written by a script would be exactly the file that names
# none of them.
if [ -f "$root/CLAUDE.md" ]; then
  echo "CLAUDE.md: present - check it names the build and test commands"
else
  echo "CLAUDE.md: missing - run /init, then add the build and test commands"
fi

# Reported, never installed: a missing gh is a note, not a failed setup.
if command -v gh >/dev/null 2>&1; then
  echo "gh: present"
else
  echo "gh: missing - install the GitHub CLI (https://cli.github.com), then run gh auth login"
fi

exit 0
