---
paths:
  - "viber/scripts/*.sh"
  - "viber/hooks/scripts/*.sh"
  - "viber/skills/*/scripts/*.sh"
---

# Shell script header comment

- Open the script with a comment block that names the file, says what it does, says WHY it exists - the duplication or the failure it replaced - and closes with a `Contract:` block. `viber/scripts/config.sh` is the full shape: purpose, why it is a bundled script, then a `Contract:` block.
- Spell out in `Contract:` what each of argv, cwd, env, any file read, stdout and the exit code mean, including what an absent or empty value means. `viber/scripts/config.sh` documents a missing config file as fail-open with every switch off and an exit that is always 0.
- Write the header in English. Every shipped script's header now is; the only non-ASCII left anywhere is the Polish transliteration table `supergh/shared/scripts/body-path.sh` transliterates FROM, which is data, not prose. Keep it that way: a header written in another language is a defect, not a style.
- A script whose header carries its I/O contract is TRUSTED by its caller: the caller never re-verifies its output and never retries it. Keep the header true to the code, because nothing else enforces it.
- State the cwd even when it does not matter, and say which it is. Three answers cover every script here: the script resolves the repository root itself and the caller's cwd is irrelevant (viber's `config.sh`, whose header argues it from the `!` preload running wherever the session started); every path derives from argv, so cwd only ever resolves a relative argument; or the cwd IS the contract and the script says why (`supergh/shared/scripts/body-path.sh`, whose emitted path is spent from that same directory). An unstated cwd is the defect - a subdirectory session then fails or writes to the wrong tree with nothing in the header to contradict it.
- Eight of viber's ten scripts carry that block, and a script you add or substantially edit gets one too: `config.sh`, `run-clock.sh`, `check-playwright.sh`, `plan-path.sh`, `plan-index.sh`, both hook scripts and `skills/setup/scripts/bootstrap.sh`. Only `commit-task.sh` and `merge-settings.sh` open on `Usage:` alone, and both still spell out every exit code in prose. `plan-index.sh` shows the shape for a script whose stdout IS its interface: the header prints the exact output lines, column by column, because the orchestrator has no other view of the plan.
