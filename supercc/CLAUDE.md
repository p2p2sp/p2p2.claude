# supercc - Claude Code's own configuration

> Dev-time orientation for **editing this plugin's source**. Like the repo root `CLAUDE.md`, it is **not a
> plugin input** - it never reaches the skill as runtime data. See the root `CLAUDE.md` for the repo-wide
> warnings and cross-plugin invariants; this file holds only what is specific to `supercc`.

`supercc` configures **Claude Code itself** on the machine it runs on, not the host project. It ships **no
`hooks/` and no injected manifest** - its single skill routes purely via its CSO `description:`. The catalog of
record is `.claude-plugin/plugin.json` `skills[]`.

## Layout (supercc internals)

```
supercc/
  .claude-plugin/plugin.json   The plugin manifest - skills[] is the catalog of record
  skills/setup-permissions/    The only skill; bundles references/ (rule-syntax.md, rules.json)
                               + scripts/ (apply-permissions.mjs) - all addressed via `${CLAUDE_SKILL_DIR}/...`
```

## Components (qualified `supercc:<name>`)

- `setup-permissions` (skill, main context, model-invocable) - writes permission rules into the **user's own**
  settings (`~/.claude/settings.json`), never into the host project's. Two paths: `--preset fast` applied in one
  shot with no further questions, or a four-question `AskUserQuestion` interview over blocks, confirmations,
  extras and start mode. `secrets-core` (credential reads) and `power` (shutdown / reboot) are the always-on
  floor; everything else is the user's choice. Content is Polish - it is a user-facing configuration dialogue,
  not a code artifact.

**Plugin-specific invariant: this is the one plugin that writes outside the host repo.** Every other plugin
confines itself to the consuming repo (`docs/`, `.claude/`, `.temp/`); `setup-permissions` edits the user's
machine-wide settings file by design, because permission rules must hold in every repository and the auto-mode
classifier reads `autoMode` from user settings only. The repo-wide "no plugin-named dot-dir in the host repo"
invariant is untouched - supercc creates nothing in the host repo at all.

**Plugin-specific invariant: two machine-wide targets, both under `~/.claude/`, both marker-scoped.** Besides
`settings.json`, a block may carry a `memory` array, which the script merges into the user's memory
(`CLAUDE.md` next to the settings file) inside the `<!-- supercc:setup-permissions:begin/end -->` markers -
only that block is ever rewritten, the rest of the file is left alone. A `memory` entry is for what no
permission rule can express: `shell-path-hygiene` exists because with any `Read(...)` deny rule a read-like
shell command whose path cannot be resolved statically (relative path behind a `cd`, subshell, variable)
forces a permission prompt that **no `allow` rule and no permission mode suppresses** - the only cure is
prevention in the model's standing instructions. Prose belongs in `memory` only when it changes model
behaviour machine-wide; anything expressible as a rule stays a rule.

**Plugin-specific invariant: `references/rules.json` is the single source of rules.** A new block is a JSON
edit, never a script edit and never a rule inlined into `SKILL.md`. `apply-permissions.mjs` resolves that file
relative to its own location (`import.meta.url`), so the bundle stays relocatable and needs no plugin-root env
expansion inside the script.

**Plugin-specific invariant: rules must be written in cross-platform form.** Paths anchor on `//` (filesystem
root - Windows paths are normalised to POSIX before matching, so `//**/x` covers every drive) or `~/` (home).
A single leading `/` anchors to `~/.claude/` in user settings, not to the drive root - it is never the right
form here.

Requires Node.js on the machine (plain ESM, no packages, no type stripping - any maintained Node runs it).

`supercc` declares no cross-plugin chains.
