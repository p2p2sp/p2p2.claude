# supercc

## Purpose

The Claude Code authoring plugin. ONE skill, `skill-designer`, whose subject is the extension
surface itself: SKILL.md files, agent `.md` files, their frontmatter, bundled `scripts/` and
`references/`. Creates a new skill or agent, refactors an existing one, splits an overloaded one
into forks, shrinks a bloated one, or audits a set. Smallest plugin in the repo. Model-invocable,
routing purely via its own CSO `description:`. Ships NO hooks, NO manifest, NO agents; no
plugin-root dirs - the single skill bundles its own `references/` and `scripts/`.

## Entry points

- `skills/skill-designer/SKILL.md` - one workflow shared by four request classes (create,
  refactor, split, shrink/audit): classify, responsibility check, placement decision, write,
  lint, report.
- `skills/skill-designer/references/architecture.md` - fork vs main-context placement, chaining
  stages, reusing an existing skill instead of restating it.
- `skills/skill-designer/references/split-patterns.md` - the split catalogue (fork sub-workers,
  mode-router script, independent co-occurring specialists).
- `skills/skill-designer/scripts/lint_skill.sh` - lints a skill dir or a single agent/skill
  `.md` file; prints FAIL/WARN lines, exit 1 on any FAIL. Plain bash only, invoked THROUGH
  `bash` in the body (so it needs no exec bit, unlike a `!`-preloaded script).

## Contracts & invariants

- The linter checks form, the skill judges substance. `lint_skill.sh` owns only what is
  mechanically decidable (frontmatter presence/field caps, name charset, reserved words, body
  length, orphaned bundled files). Everything requiring judgment (one responsibility? does the
  description trigger? is this line caller narrative?) stays with the model. Never migrate a
  judgment call into the script - a false FAIL on a judgment call is worse than no check, since
  the skill is instructed to fix every FAIL.
- A FILE target lints that file ALONE; only a directory (or a file literally named `SKILL.md`,
  which names its own skill root) sweeps siblings and bundled dirs. Reporting another file's
  violation under this file's run sends the skill to edit a file the request never named.
- The CLAUDE.md-read check is a WARN, never a FAIL, and it skips a host/target-qualified line.
  Naming a CLAUDE.md read is only wrong for the worker's OWN project; it is correct for a repo
  the worker was pointed at (`superfix/agents/profiler.md`, `superdev/agents/qa-writer.md`) and
  it is not an instruction at all inside a template body (`superdev/references/memory-templates.md`).
  As a FAIL it was wrong on all three of the repo's own hits and right on none.
- Bundled paths are addressed via `${CLAUDE_SKILL_DIR}/...`, never relatively - a relative
  `references/x.md` does not resolve from the invoking session's cwd.
- supercc writes NO `docs/<layer>/` of its own and never will. Its deliverable is the skill/
  agent file itself, which belongs wherever the request puts it
  (`.claude/skills/`, a plugin's `skills/`, an `agents/` dir) - a knowledge layer here would be a
  copy of the artifact, not a record about it.
- This plugin's own sources are its first test case: every rule `skill-designer` states is one
  the repo's other five plugins already follow. A rule its own `SKILL.md` violates is a bug in
  the rule or in the file - fix one of them, never document the exception.

## Anti-patterns

- Adding a mechanical check for something that is actually a judgment call.
- Writing a `docs/<layer>/` entry for a skill/agent it just authored.

## Related context

- Root cross-plugin invariants: `../CLAUDE.md`
- supercc declares no cross-plugin chains.
