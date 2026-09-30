---
paths:
  - "supercc/skills/*/scripts/*.sh"
  - "superui/skills/pro-designer/scripts/*.sh"
  - "viber/scripts/*.sh"
  - "viber/hooks/scripts/*.sh"
  - "viber/skills/*/scripts/*.sh"
---

# Pass a shell value into awk via ENVIRON, not -v

- Hand a shell value to an awk program through an exported environment variable, read back with
  `ENVIRON["NAME"]`, never through `awk -v`: BSD/macOS awk aborts outright on a `-v` assignment
  whose value holds a newline, and `-v` also runs its own escape processing, so a backslash in
  the value is not passed through literally. `viber/skills/code-auditor/scripts/collect_signals.sh:295-296`
  (`KEPT_EXTS="$kept_exts" awk '... ENVIRON["KEPT_EXTS"] ...'`) inline-documents both traps;
  `viber/scripts/issue-facts.sh:109` uses the same shape
  (`TYPE_LINE="TYPE=$type" awk '... ENVIRON["TYPE_LINE"] ...'`) so a backslash in an issue type
  name is not escape-processed.
