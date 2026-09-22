---
paths:
  - "superdev/scripts/*.sh"
  - "superdev/hooks/scripts/*.sh"
  - "superdev/skills/*/scripts/*.sh"
  - "superfix/skills/code-auditor/scripts/*.sh"
  - "supergh/shared/scripts/*.sh"
  - "supergh/skills/*/scripts/*.sh"
  - "supercc/skills/*/scripts/*.sh"
  - "superui/skills/pro-designer/scripts/*.sh"
  - "viber/scripts/*.sh"
  - "viber/hooks/scripts/*.sh"
  - "viber/skills/*/scripts/*.sh"
  - ".github/scripts/*.sh"
---

# Git exec bit on a new shell script

- This repo has `core.filemode=false`, so `git add` on a brand-new `.sh` file stages it 100644
  regardless of the filesystem bit; `chmod +x` before adding changes nothing in the index. Right
  after creating a script that must ship 100755, run
  `git update-index --add --chmod=+x <path>` (a later `git add -A` keeps that mode). Evidence:
  both `viber/skills/memory/scripts/memory-map.sh` and `viber/skills/rules/scripts/rules-map.sh`
  needed this call, or they would have entered the index at 100644 and failed the exec-bit
  assertion the portability suite runs.
- Verify the recorded mode, not the filesystem: `git ls-files -s <path>` must read `100755`. The
  filesystem bit means nothing on a Windows checkout either way.
- If another in-flight task's `git add -A` sweeps an in-progress copy of the file into ITS commit
  first, that commit lands the file at 100644; the exec bit then only shows up once the script's
  own commit lands as a modification on top. Check `git ls-files -s` after the commit that is
  meant to own the file, not an earlier one that happened to include it.
