# supercc - the Claude Code authoring ecosystem

> Dev-time orientation for **editing this plugin's source**. Like the repo root `CLAUDE.md`, it is **not a
> plugin input** - it never reaches the skill as runtime data. See the root `CLAUDE.md` for the repo-wide
> warnings and cross-plugin invariants; this file holds only what is specific to `supercc`.

`supercc` holds **one skill**: `skill-designer` - the plugin that builds the plugins. Its subject is the
Claude Code extension surface itself: SKILL.md files, agent `.md` files, their frontmatter, their bundled
`scripts/` and `references/`. It creates a new skill or agent, refactors an existing one, splits an
overloaded one into forks, shrinks a bloated one, or audits a set of them.

It routes purely via CSO (frontmatter `description:`) - model-invocable, no `disable-model-invocation`. The
plugin ships **no `hooks/`, no injected manifest and no `agents[]`**: a single model-routable skill has
nothing to dispatch and nothing to auto-route beyond its own description. The catalog of record is
`.claude-plugin/plugin.json` `skills[]`.

## Layout (supercc internals)

```
supercc/
  .claude-plugin/plugin.json   The plugin manifest - skills[] is the catalog of record
  skills/
    skill-designer/
      SKILL.md                       Workflow, responsibility check, frontmatter / body / progressive-disclosure
                                     / script rules, audit mode, output contract
      references/architecture.md     Where the work runs: fork vs main context, chaining stages, reusing an
                                     existing skill instead of restating it
      references/split-patterns.md   The split catalogue - fork sub-workers, mode-router script, independent
                                     co-occurring specialists
      references/example.md          A worked BAD -> GOOD body rewrite, read before writing a body from scratch
      scripts/lint_skill.sh          Lints a skill dir (with SKILL.md) or a single agent/skill .md file;
                                     prints FAIL / WARN lines, exit 1 on any FAIL. Plain bash only
```

No plugin-root `agents/`, `scripts/`, `references/` or `shared/` dir - the skill bundles everything it needs.

## Skills

### `supercc:skill-designer`

Model-invocable, no argument contract: the request itself names what to create or change. Four request
classes share one workflow (classify, responsibility check, placement decision, write, lint, report), so
they stay in one body rather than splitting - they differ by a short checklist, which is exactly the case
the skill's own responsibility check calls a pass.

- Bundled paths are addressed via `${CLAUDE_SKILL_DIR}/...`, never relatively - a relative `references/x.md`
  does not resolve from the invoking session's cwd.
- `scripts/lint_skill.sh` is invoked **through `bash`** in the body, so it needs no exec bit (the
  portability sweep only demands `100755` for a script a `SKILL.md` invokes with no interpreter word).

**Plugin-specific invariant: the linter checks form, the skill judges substance.** `lint_skill.sh` owns only
what is mechanically decidable - frontmatter presence and field caps, name charset, reserved words, body
length, orphaned bundled files. Everything requiring judgment (is this one responsibility, does this
description trigger, is this line caller narrative) stays with the model. Do not migrate a judgment call
into the script to make the output look more objective; a false FAIL on a judgment call is worse than no
check, because the skill is instructed to fix every FAIL.

**Plugin-specific invariant: this plugin's own sources are its first test case.** Every rule
`skill-designer` states is one the repo's other four plugins already follow, so a rule that its own
`SKILL.md` violates is a bug in the rule or in the file - fix one of them, never document the exception.

`supercc` declares no cross-plugin chains.
