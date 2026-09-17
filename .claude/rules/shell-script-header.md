---
paths:
  - "superdev/scripts/*.sh"
---

# Shell script header comment

- Open the script with a comment block that names the file, says what it does, says WHY it exists - the duplication or the failure it replaced - and closes with a `Contract:` block. `label.sh:1-32` is the full shape: purpose, when to use `resolve-input.sh` instead, the two reasons it is a script at all, then `input` / `output` / `exit`.
- Spell out in `Contract:` what each of argv, cwd, env, any file read, stdout and the exit code mean, including what an absent or empty value means. `read-config.sh:10-20` documents a missing config file as fail-open with every key false; `label.sh:22-31` documents a missing label as "NOTHING at all (no newline, no message)" with exit 0.
- Write the header in English. `read-config.sh:2-20` is the only script whose header is in Polish and it contradicts the repo-wide English rule - do not copy that file's style.
- A script whose header carries its I/O contract is TRUSTED by its caller: the caller never re-verifies its output and never retries it. Keep the header true to the code, because nothing else enforces it.
- 14 of the 18 scripts in `superdev/scripts/` carry such a header; `cleanup-run.sh`, `decompose.sh`, `resolve-input.sh` and `status-update.sh` do not. Follow the 14.
