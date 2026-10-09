# viber/skills - the nineteen viber skills and their bundled files

Owns every `skills/<name>/` directory: its `SKILL.md` and the `fragments/`, `templates/`, `references/`, `assets/` and skill-local `scripts/` beside it. The plugin-level scripts the skills call (`config.sh`, `switch-text.sh`, `plan-path.sh`, `plan-index.sh`, `commit-task.sh`, the `issue-*`, `pr-*` and `qa-comment.sh` scripts) belong to `viber/scripts/`, the agents they dispatch to `viber/agents/`; a skill's own body is its contract.

## Terms

- Preload: a ```` ```! ```` fenced block or a `` !`...` `` line in a `SKILL.md`, run by the shell when the skill loads, its stdout standing in its place before the model reads a word. A non-zero exit aborts the whole skill load, so every script used as a preload exits 0 in every data condition.
- Hand-off lines: the labelled lines carried verbatim into `planner`'s input: `Issue: <URL>` (intent, fixer), `Prototype: <absolute mockup path>` (written by prototype, carried through intent), `Work:` / `Branch:` (the `branching-handoff` fragments of intent and fixer), `Roadmap: <path>` (intent resuming a `roadmap.md`).

## Relationships

- Who starts a skill: `planner`, `implementor` and `tdd` carry `user-invocable: false` (`tdd` is loaded only by the `task-coder` agent); `e2e`, `extension`, `handoff`, `help`, `memory`, `rules`, `setup`, `talk` and `triage` are user-only (`disable-model-invocation: true`); `code-auditor`, `commit`, `create-issue`, `fixer`, `intent` and `prototype` the model may invoke; `create-pr` the model invokes only on the user's request or yes.
- Skill to skill: `prototype` invokes `intent`; `intent` and `fixer` invoke `planner`; `planner` names `implementor` as the next step and never invokes it; `implementor` invokes `create-pr` on the user's yes once a finished build on a pull request branch closes the last roadmap part; `triage` names the next step and invokes nothing; `talk` invokes nothing and ends on suggesting `/viber:handoff`; `intent`'s fast path ends on suggesting `/viber:commit`, never committing.
- Agents each skill dispatches: `implementor` (`task-coder`, `task-reviewer`, `arbiter`, `test-runner`, and through its close fragments `final-reviewer`, `memory-writer`, `rules-writer`, `qa-writer`, `closeout`, plus every `build.extensions` agent by its bare name), `planner` (`planner-review`, and `adr-screener` through `planner/references/adr-tasks.md`), `intent` (`prover` on `--prove` through `intent/references/prove.md`, `test-runner` on the fast path), `prototype` (`prototype-writer`), `talk` (`researcher`), `e2e` (`e2e-writer`), `memory` (`memory-auditor`, `memory-node-writer`), `rules` (`rules-auditor`, `rules-writer`), `code-auditor` (`mapper`, `scout`, `hunter`, `critic`). `plain-plan-review` runs only on the plan gate's request.
- Files read across skill directories: `help` and `setup` open `setup/assets/help.html`; `memory` reads `setup/templates/claude-md-prompt.txt`.
- Tool dependencies: `code-auditor` needs only git and a POSIX shell, no Node.js; `e2e` needs `playwright-cli` and `@playwright/test`, reported by `scripts/check-playwright.sh` and installed only on the user's yes.

## Contracts

- Every `switch-text.sh` call in a `SKILL.md` names a key of `switch-text.sh`'s list and a `<name>` with a `fragments/<name>.<value>.md` for at least one valid value; every fragment file is named by a call in its own skill's `SKILL.md`. Values: `true` / `false`, except `off` / `fast` / `full` for `build.baseline-tests`, `off` / `allowed` / `required` for `branching.mode` and `off` / `on` for `build.extensions`.
- A `branching.mode` call is written `branching.""mode`: the shell joins it into the one word `branching.mode`, and the portability sweep strips the quotes to read the key. A new call copies that spelling.
- A fragment reaches the model as `switch-text.sh` prints it: Claude Code substitutes nothing in a preload's output, so the script expands only `${CLAUDE_SKILL_DIR}` and `${CLAUDE_PLUGIN_ROOT}`; `$ARGUMENTS` or any other variable in a fragment stays literal.
- `planner` turns the hand-off lines into plan frontmatter: `issue:` from `Issue:`, `prototype:` from `Prototype:`, `work:` and `branch:` from `Work:` / `Branch:` through its `branching` fragments, `into:` on a draft round, `source:` always. `scripts/plan-path.sh` reads those keys when it lands the plan.
- Temporary files: a skill's own under `.temp/viber/<skill>/`, matched by an `Edit(./.temp/viber/<skill>/**)` allow where it edits there; `implementor` gives each task `.temp/viber/<task-id>/`, `memory` and `rules` use `.temp/viber/<map id:>/`, `code-auditor` `.temp/viber/code-auditor/<run-id>/`.
- `code-auditor` reads one lens file of `references/lenses/` per run, never the other five; the `<lens>.signals.md` beside it holds its map-signal commands, read only by `mapper`. A lens's `Worktree:` line under `## Verify` (`required` or `none`) decides whether its hunters and critics get reserved worktrees from `worktree.sh` and, on the diff scope, the working tree's uncommitted changes through `diff-overlay.sh`.

## Commands

- Preload quoting, the exec bit of every bare-invoked script and the fragment calls above: `node --test tests/portability.unit.test.ts`.
- The help page against `plugin.json`, each skill's frontmatter and the `viber.yml` template: `node --test tests/viber/help.unit.test.ts`.

## Change together

- A skill added, removed or renamed: `setup/assets/help.html` gains or loses its card `id="skill-<name>"`, which carries `<span class="tag auto">` (one `lang="en"` and one `lang="pl"` element) exactly when the skill is `user-invocable: false`.
- A hand-off line: the body or fragment writing it (`intent`, `fixer`, `prototype`), `planner/SKILL.md` and its `branching*` fragments, and `scripts/plan-path.sh`.
- The five items a root `CLAUDE.md` names (build, whole suite, single test file, fast command, layer marker convention): `setup/SKILL.md`'s check, `setup/templates/claude-md-prompt.txt`, `references/node-doctrine.md`'s Root and the `MISSING:` vocabulary of `agents/memory-node-writer.md`.
- The extension contract: `extension/templates/extension.md` (the `<!-- viber:extension -->` marker, the `run:` / `spec:` / `notes:` / `out:` lines, `VERDICT: WRITTEN | NONE | FAIL | DENIED`), the marker test in `extension/scripts/extension.sh` and the dispatch in `implementor/fragments/extensions.on.md`.
- The four map headings (`## Conventions`, `## History`, `## Severity calibration`, `## Units`): `agents/mapper.md` writes them, `code-auditor/SKILL.md`'s map gate checks them, `code-auditor/references/synthesis.md` and `agents/scout.md`, `hunter.md` and `critic.md` read them.
- The lens set (`bugs`, `security`, `web-performance`, `runtime-performance`, `tests`, `design`): the files under `code-auditor/references/lenses/`, `code-auditor/SKILL.md` (description, `argument-hint`, Arguments, Frame step 4 and the `lenses:` list of its directory message), `help.html` and `tests/viber/code-auditor.unit.test.ts`. Each lens file keeps the four headings `## Hunts`, `## Excluded`, `## Verify`, `## Severity` in that order and no bash block, its `<lens>.signals.md` holding the bash blocks, which `tests/viber/lenses.unit.test.ts` holds. `code-auditor/README.md` (for people, no agent loads it) lists every lens, its angles by slug and an ownership table: each hand-off clause in a lens intro or `## Excluded` names a class that an angle of the receiving lens covers, and the table names that angle, so a lens or angle added, renamed or re-homed changes the README row too.

## Traps

- Skill arguments reach a preload by text substitution before the shell runs: `commit` passes `'$ARGUMENTS'` and `handoff` `'$0'`, single-quoted so `$`, backticks and backslashes stay literal. An apostrophe in the arguments breaks the preload, and `$0` arrives as the literal `$0` when no argument came.
- A map-signal command in a `<lens>.signals.md` tells a test file by its path alone, never by a substring of the whole output line, and its test-or-spec filter matches a path shape (`tests/`, `.test.`, `test_`), never the bare substring `test`, which drops `src/latest.ts` and `src/inspector.ts`; `git grep -E` patterns use bracket classes, never `\b`. `tests/viber/lens-map-signals.test.ts` pins each of these cases.
