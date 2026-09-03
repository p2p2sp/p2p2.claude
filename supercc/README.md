# supercc

Configures **Claude Code itself** on the machine it runs on. One skill writes permission rules into your
own user settings (`~/.claude/settings.json`, on Windows `%USERPROFILE%\.claude\settings.json`) - never into
a project's settings, because permission rules have to hold in every repository you open, and the auto-mode
classifier only reads `autoMode` from user settings.

It fixes both ends of the same problem: what Claude must never touch (credential reads, machine shutdown),
and what it should stop asking you about (the base tool allow list, so routine work runs without a prompt
per call).

This is the only plugin in this repo that writes outside the repository you are in. It creates nothing
inside the host project. Blocks that carry a memory section additionally write a marker-scoped `supercc`
block into your user memory (`~/.claude/CLAUDE.md`) - only that block is ever rewritten, the rest of the
file is left alone.

Rules are written in a cross-platform form: paths anchor on `//` (filesystem root - Windows paths are
normalised to POSIX, so `//**/x` covers every drive) or `~/` (home), so the same file works on Linux, macOS
and Windows.

The skill's dialogue is in Polish - it is a user-facing configuration conversation, not a code artifact.

## Install

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install supercc@p2p2 --scope user
```

Requires Node.js (any maintained version - plain ESM, no packages, no build step).

## Quick start

Ask for it in plain language: "skonfiguruj uprawnienia", "set up permissions", "żeby Claude nie czytał
`.env`", "czemu ciągle pyta o zgodę", "stop asking me for approval", "audit my settings.json permissions".
The skill audits your current settings first, then asks which path you want:

- **Defaults in one shot** - applies the `fast` preset (`secrets-core` + `power` + `tools-allow` +
  `shell-path-hygiene` + `auto-mode-hardening`) and stops. No further questions. Say "szybko" /
  "domyślnie" / "bez pytań" to skip straight to it.
- **Area by area** - a four-question interview over blocks, confirmations, extras and the start mode. Each
  option states what the block costs you, not just what it blocks.

Before every write it backs up each file it touches (`<file>.bak-<timestamp>`), merges without duplicates,
verifies the settings are still valid JSON, and re-runs the audit. Running it again with the same blocks
changes nothing. Removing a block later: `--remove <block>` takes out only the rules that belong to it
alone.

The change takes effect **from the next session** - `/permissions` shows the new state in the current one,
but the loaded rules are still the pre-edit ones.

## What it can set

`secrets-core` and `power` are the protection floor; everything else is your call.

| Block | Effect | Recommended |
| --- | --- | --- |
| `secrets-core` | Denies reading SSH/GPG keys, cloud credentials, package-registry tokens, `.env` files, keystores, system password stores and Terraform state | yes |
| `secrets-strict` | Adds the full `.env.*` spread, vault dirs, password-manager stores, shell history and any file with "secret" in its name; env dumps go to *ask* | no |
| `power` | Denies shutdown, reboot, sleep, hibernate and logout - Linux, macOS and Windows variants, via Bash and PowerShell, `sudo`/`doas` included | yes |
| `tools-allow` | Allows the bare Claude Code tool names (Read, Edit, Write, Bash, Grep, Glob, Agent, Skill, WebFetch, WebSearch, …) so everyday work stops prompting per call. Does not weaken any block - `deny` always wins | yes |
| `shell-path-hygiene` | Writes a rule into your user memory: no `cd … &&` prefix, absolute paths, read files with Read/Grep/Glob. The only cure for the forced prompt on a read command whose path cannot be resolved statically | yes |
| `system-config` | Denies edits to `/etc`, the Windows directory and shell startup files, plus registry, services, cron/scheduled tasks and firewall rules | no |
| `destructive` | Denies wiping root or home, formatting, `dd`, disk operations and `git push --force`; `git reset --hard` and `git clean` go to *ask* | yes |
| `git-remote` | Asks before anything leaves the machine: push, PR, release, package publish, `docker push` | no |
| `network` | Sends `curl`, `wget`, `nc`, `ssh`, `scp`, `rsync` and PowerShell HTTP cmdlets to *ask* | no |
| `packages-global` | Asks before installing outside the project (`npm -g`, `apt`/`dnf`/`pacman` via sudo, brew, winget, choco, scoop, `dotnet tool`, `Install-Module`) | no |
| `dev-allow` | A deliberately narrow allowlist for running tests and builds - no `npx`, no `docker exec`, no interpreters | no |
| `auto-mode-hardening` | Adds prose `hard_deny` rules to the auto-mode classifier, covering the indirect route (a script or subprocess) that `Read`/`Bash` patterns cannot see | yes |

A `hardened` preset swaps `tools-allow` out and adds `secrets-strict`, `system-config`, `destructive` and
`git-remote` - pick it for a machine holding production data or for unattended work.

The start mode (`defaultMode`) is a separate decision: nothing touches it unless you explicitly choose one.

## What it does not solve

- `Read`/`Edit` rules cover Claude's file tools and *recognized* shell commands (`cat`, `head`, `tail`,
  `sed`). They do **not** cover an arbitrary subprocess - a Python or Node script opens the file itself.
  `auto-mode-hardening` closes that at the classifier level; the hard system boundary is the sandbox.
- `permissions.deny` blocks an attempted tool use, not the exfiltration of data already in the context.
- User-level rules lose to organisation-managed settings for `allow` only; a `deny` at any level cannot be
  overridden - not even in `bypassPermissions`.

## Skills

| Skill | Role |
| --- | --- |
| `setup-permissions` | The whole flow: audit the current settings, pick the preset or run the interview, apply the rules through the bundled Node script, report what actually changed. All rules come from one source (`references/rules.json`). |
