---
paths:
  - "superdev/scripts/*.sh"
---

# Shell script header comment

- Open the script with a comment block that names the file, says what it does, says WHY it exists - the duplication or the failure it replaced - and closes with a `Contract:` block. `last-commit-date.sh:1-34` is the full shape: purpose, the failure it replaced, the two reasons it is a bundled script rather than an inline preload, then a `Contract:` block of `argv` / `cwd` / `env` / `stdout` / `exit`.
- Spell out in `Contract:` what each of argv, cwd, env, any file read, stdout and the exit code mean, including what an absent or empty value means. `read-config.sh:10-20` documents a missing config file as fail-open with every key false; `last-commit-date.sh:24-34` documents an unestablishable date as the single word `none` on stdout with an exit that is "ALWAYS 0", naming `none` a value rather than an error.
- Write the header in English. `read-config.sh:2-20` is the only script whose header is in Polish and it contradicts the repo-wide English rule - do not copy that file's style.
- A script whose header carries its I/O contract is TRUSTED by its caller: the caller never re-verifies its output and never retries it. Keep the header true to the code, because nothing else enforces it.
- 12 of the 15 scripts in `superdev/scripts/` carry such a header; `cleanup-run.sh`, `decompose.sh` and `status-update.sh` do not. Follow the 12.
