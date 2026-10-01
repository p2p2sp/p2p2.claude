# supercc

Two skills. `skill-designer`: the authoring doctrine for skills and agents, three references read each at one workflow step, a tuning step that invokes `model-prompting`, and a linter. `model-prompting`: per-model prompting knowledge, one reference per current model plus `cross-model.md`, the body only picks which to read. No agents, no hooks, no preload, no `allowed-tools`.

## Contracts between files

- The doctrine is host-neutral: it is fired on any repo's skills, so it never names this repo's other plugins, paths or its own conventions beyond what holds for every Claude Code skill. It names `supercc:model-prompting` only, which always installs with it; renaming `model-prompting` updates that Workflow pointer, and model facts (profiles, prices, effort defaults, mitigation wording) live only in `model-prompting`, never duplicated into the doctrine.
- The hard platform caps are stated twice and move together: `SKILL.md` Frontmatter and Progressive disclosure (name 64 chars and its charset, reserved words, description 1024 chars, no angle brackets, body 500 lines, a reference over 100 lines carries a table of contents matching its `##` headings both ways round) and the matching checks in `scripts/lint_skill.sh`. Changing a cap in one without the other makes the linter contradict the doctrine it enforces.
- The linter's style checks (emoji, em/en dash, tables, italics, shouting count over 5, hedges, caller-narrative cues, `jq`/`bc`, `I` or `you` in the description) mirror the Body and Formatting rules of `SKILL.md`; a rule added to either side is added to both or deliberately left as judgment.
- Every file in `references/` is named in `SKILL.md` at the step that reads it: the linter WARNs on a reference the body never names. A new reference gets its one-line pointer in the Workflow, never an up-front read.
- `model-prompting` is a dated snapshot of the lineup (date in its body): adding or retiring a model adds or deletes its reference together with its pointer in the Workflow, the model names in the `description:`, and every cross-model line naming it. A profile line states only what the model's prompting guide, release notes or system card confirms; a claim none of them carries is cut, not hedged.
- `references/architecture.md` restates harness facts the root node also carries as invariants: `allowed-tools` pre-approves and never restricts, `disallowed-tools` never on a skill that dispatches agents, preload pattern entry, direct invocation, single-quoting `?`/`*`/`[`. A change to that harness knowledge updates both.

## Linter

- A directory target (or a file named `SKILL.md`) sweeps every `.md` under it plus `scripts/` and `references/`; any other file target lints that file alone, so linting one agent never reports a sibling's violations.
- Exit 1 on any FAIL, 0 otherwise; the last line is `FAIL=<n> WARN=<n>`. The CLAUDE.md-read check is a WARN on purpose: it cannot tell a worker's own memory from a host repo's.
