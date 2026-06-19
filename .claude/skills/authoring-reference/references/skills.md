# Skills (SKILL.md)

A skill is a directory whose entrypoint is `SKILL.md`: YAML frontmatter + markdown body. The body loads into context only when the skill is invoked.

## Locations

| Scope | Path | Applies to |
| :-- | :-- | :-- |
| Personal | `~/.claude/skills/<name>/SKILL.md` | all your projects |
| Project | `.claude/skills/<name>/SKILL.md` | this project (committed) |
| Plugin | `<plugin>/skills/<name>/SKILL.md` | where the plugin is enabled |

Project skills load from `.claude/skills/` in the start dir and every parent up to the repo root; nested package skills load on demand. Command name comes from the **directory name** (`deploy-staging/` → `/deploy-staging`); plugin skills are namespaced `/<plugin>:<name>`. The frontmatter `name` only sets the display label — except for a plugin-root `SKILL.md`, where it sets the command name.

## Frontmatter reference

All fields optional; only `description` recommended.

```yaml
---
name: my-skill                 # display label; defaults to directory name
description: What it does and when to use it.   # drives auto-invocation
when_to_use: trigger phrases / example requests # appended to description
argument-hint: "[issue-number]"                 # autocomplete hint
arguments: [issue, branch]     # named positional args → $issue, $branch
disable-model-invocation: true # only the user can invoke (hides from Claude). Default false
user-invocable: false          # only Claude can invoke (hides from / menu). Default true
allowed-tools: Read Grep       # pre-approved while active (space/comma string or YAML list)
disallowed-tools: AskUserQuestion  # removed from pool while active; clears next message
model: inherit                 # /model values or `inherit`; applies for the rest of the turn
effort: high                   # low|medium|high|xhigh|max
context: fork                  # run in a forked subagent context
agent: Explore                 # which subagent type when context: fork (default general-purpose)
hooks: { ... }                 # hooks scoped to this skill's lifecycle (see hooks.md)
paths: "src/**/*.ts"           # globs that gate auto-activation
shell: bash                    # bash (default) or powershell
---
```

- `description` + `when_to_use` are truncated at **1,536 chars** in the listing — put the key use case first.
- `allowed-tools` does NOT restrict tools; it pre-approves the listed ones. Permission rules still govern the rest.

### Invocation control matrix

| Frontmatter | User invokes | Claude invokes | Description in context |
| :-- | :-- | :-- | :-- |
| (default) | yes | yes | yes |
| `disable-model-invocation: true` | yes | no | no |
| `user-invocable: false` | no | yes | yes |

## String substitutions (in body)

| Token | Expands to |
| :-- | :-- |
| `$ARGUMENTS` | all args as typed |
| `$ARGUMENTS[N]` / `$N` | arg by 0-based index (`$0`, `$1`) |
| `$name` | named arg from `arguments:` |
| `${CLAUDE_SESSION_ID}` | current session id |
| `${CLAUDE_EFFORT}` | `low`…`max` (ultracode reports `xhigh`) |
| `${CLAUDE_SKILL_DIR}` | the skill's own directory (use for bundled scripts) |

Escape a literal with backslash: `\$1.00`. If a skill is invoked with args but has no `$ARGUMENTS` token anywhere in its body, Claude Code appends an `ARGUMENTS: <value>` block — a useful fallback when you deliberately keep the body token-free. `$ARGUMENTS` itself **does** substitute in `context: fork` skills, including those invoked programmatically via the `Skill` tool (see "Writing robust `!` blocks").

## Dynamic context injection

`` !`<command>` `` at line start (or after whitespace) runs the shell command and replaces the placeholder with its output **before** Claude sees the content. Multi-line: a fenced ` ```! ` block. Runs once; output is not re-scanned. Disable globally with `disableSkillShellExecution: true`.

```yaml
---
description: Summarize uncommitted changes.
---
## Current changes
!`git diff HEAD`
## Instructions
Summarize the diff above and flag risks.
```

### Writing robust `!` blocks

The placeholder is filled by **textual substitution before the shell parses the line** — `$ARGUMENTS` (and any token) is spliced in as raw text, then the result is executed. **This holds for every invocation path alike — direct (`/skill args`), programmatic (`Skill` tool), and `context: fork`** (in a fork, `` !`echo $ARGUMENTS` `` renders as `!echo <the actual args>` — a pre-exec textual splice, not a bash env var). Consequences, all verified the hard way:

- **Never interpolate `$ARGUMENTS` into a quoted string** (`ARGS="$ARGUMENTS"`). A literal `"`, `` ` ``, `$(…)`, or stray `(` in the argument closes/derails the quoting → the whole block dies with a shell syntax error and the injection comes back empty. Worse, a hostile `;` / `$(…)` in the args could **hijack** the command (the splice is raw text spliced straight into the command line) — sanitize when the args are untrusted. Capture it with a **quoted here-doc**, which takes the text literally (no quote / paren / `$` / backtick interpretation):

  ```!
  ARG=$(cat <<'__ARGS__'
  $ARGUMENTS
  __ARGS__
  )
  # parse "$ARG" with bash builtins below
  ```

  The only thing that breaks a quoted here-doc is an argument line equal to the delimiter — pick an unlikely one.

- **`$ARGUMENTS` reaches a `context: fork` skill** — including a fork invoked programmatically by another skill or the main session via the `Skill` tool. It substitutes in prose, in a full `` !`…$ARGUMENTS…` `` block, and in a bare `` !`echo $ARGUMENTS` `` — all carrying the same value. A few corollaries specific to forks:
  - **`allowed-tools` must cover every command your `!` blocks run** (e.g. `Bash(echo *) Bash(mkdir *) Bash(cat *)`). A missing permission silently kills the context block, so the splice you were counting on never lands.
  - **An `!` block's stdout is injected into the fork's context only — it never returns to the parent**, which gets back just the fork's final text. To observe an args value from outside, persist it (`>> .tmp/<skill>/args.log`) or have the subagent quote it in its final report; otherwise it vanishes with the fork.
  - (Optional) Writing **no** `$ARGUMENTS` token still gets you the auto-appended `ARGUMENTS: <value>` block to read instead — both paths work.

- **Parse with bash builtins, not external tools.** The shell that runs `!` blocks is not your interactive shell. On Windows / Git Bash `awk` is unreliable there — `command -v awk` resolves `/usr/bin/awk`, yet `tolower()` and field-splitting silently misbehave and yield empty output; `sed`, `head`, `cat`, `printf` and builtins (`read`, `${var,,}`, `${var#…}`, `case`) work. First word, lowercased, zero external commands:

  ```!
  read -r TOKEN _ <<<"$ARG"; TOKEN=${TOKEN,,}
  ```

- **Windows paths resolve only when quoted.** `[ -f "$f" ]` and `cat "$f"` accept a backslash absolute path (`C:\Users\…\file.md`) — MSYS converts it at the syscall boundary. Backslashes break only if the value is left unquoted or run through `echo -e` / `printf %b`; keep it `"$quoted"`.

## Supporting files (progressive disclosure)

Keep `SKILL.md` focused; move detail into sibling files and reference them so Claude loads them on demand:

```
my-skill/
├── SKILL.md          (required — overview + navigation)
├── reference.md      (loaded when needed)
└── scripts/helper.py (executed, not loaded)
```

```markdown
## Additional resources
- For API details, see [reference.md](reference.md)
```

## Gotchas

- **Keep `SKILL.md` under 500 lines.** Body stays in context across turns once invoked — every line is a recurring cost.
- The body is read once at invocation and persists; write standing instructions, not one-time steps.
- Custom commands (`.claude/commands/<name>.md`) are skills too and share this frontmatter; prefer the directory layout for new skills.
- Not triggering? Strengthen `description` keywords; verify via "What skills are available?"; run `/doctor` if descriptions are being truncated by the listing budget.
- **Testing arg substitution?** Don't pick a test value that looks like a placeholder (a URL, the word `ARGUMENTS`) — a verifying subagent can mistake a correctly-substituted value for a hardcoded placeholder and return a false "didn't substitute" verdict. Use an unmistakable sentinel like `DOWOD-42 alpha-beta`; substitution failed only if the output shows a literal `$ARGUMENTS` token or an empty string.
