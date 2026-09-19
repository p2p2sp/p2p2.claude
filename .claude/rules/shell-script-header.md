---
paths:
  - "superdev/scripts/*.sh"
---

# Shell script header comment

- Open the script with a comment block that names the file, says what it does, says WHY it exists - the duplication or the failure it replaced - and closes with a `Contract:` block. `last-commit-date.sh:1-34` is the full shape: purpose, the failure it replaced, the two reasons it is a bundled script rather than an inline preload, then a `Contract:` block of `argv` / `cwd` / `env` / `stdout` / `exit`.
- Spell out in `Contract:` what each of argv, cwd, env, any file read, stdout and the exit code mean, including what an absent or empty value means. `read-config.sh:10-20` documents a missing config file as fail-open with every key false; `last-commit-date.sh:24-34` documents an unestablishable date as the single word `none` on stdout with an exit that is "ALWAYS 0", naming `none` a value rather than an error.
- Write the header in English. Every shipped script's header now is; the only non-ASCII left anywhere is the Polish transliteration table `supergh/shared/scripts/body-path.sh` transliterates FROM, which is data, not prose. Keep it that way: a header written in another language is a defect, not a style.
- A script whose header carries its I/O contract is TRUSTED by its caller: the caller never re-verifies its output and never retries it. Keep the header true to the code, because nothing else enforces it.
- State the cwd even when it does not matter, and say which it is. Three answers cover every script here: the script resolves the repository root itself and the caller's cwd is irrelevant (`decompose.sh`, `commit-task.sh`, `cleanup-run.sh`, `run-gate.sh`, `read-config.sh`, `stats-record.sh`, `stats-report.sh`); every path derives from argv, so cwd only ever resolves a relative argument (`status-update.sh`, `phases-status.sh`); or the cwd IS the contract and the script says why (`supergh/shared/scripts/body-path.sh`, whose emitted path is spent from that same directory). An unstated cwd is the defect - a subdirectory session then fails or writes to the wrong tree with nothing in the header to contradict it.
- `superdev/scripts/` holds 16 scripts. Eight carry a literal `Contract:` block - `check-playwright.sh`, `cleanup-run.sh`, `last-commit-date.sh`, `read-config.sh`, `status-update.sh` and the three `lib_` files - and the rest open on a purpose-plus-`Usage:` header that states the same facts without the heading. Follow the eight: a script you add or substantially edit gets a real `Contract:` block.
