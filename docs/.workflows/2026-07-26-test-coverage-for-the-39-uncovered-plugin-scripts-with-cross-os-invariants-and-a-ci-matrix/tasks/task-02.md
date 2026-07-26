
## Task 2 - test(portability): add the static cross-OS invariant sweep over every shipped script
- Covers: criterion #4
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/portability.test.ts`

### Test Commands
*Build*
- none

*Tests*
- `node --test tests/portability.test.ts`

### Approach
1. Enumerate shipped scripts from the git index via `runScript("git", ["ls-files", "-s", …])` over `*.sh`
   and `*.ts` outside `tests/`, parsing mode + path.
2. Assert per script: a shebang on line 1; no `\r\n` anywhere in the file; the exec bit `100755` for every
   script the repo invokes without an interpreter, derived by grepping every `SKILL.md` and
   `superdev/hooks/hooks.json` for the invocation and classifying it as bare vs `bash …`/`sh …`/`node …`.
3. Assert on every `` ! `…` `` preload line and every ` ```! ` block found in `**/SKILL.md`: any argument
   token containing `?`, `*` or `[` is single-quoted (the zsh `nomatch` class that aborts a whole fork
   load), and `${CLAUDE_PLUGIN_ROOT}`/`${CLAUDE_SKILL_DIR}` are double-quoted.
4. Assert no bashism in any `#!/bin/sh` script: `[[`, `((`, arrays `=(`, `local -`, `<<<`, `${var//`,
   `${BASH_`, `function ` - matched line-wise with comment lines stripped.
5. Report every violation as one assertion message naming file and line, so one broken script does not
   mask the rest.
6. Make each detector a local pure function taking file text (or a mode + path pair) and returning
   violations, and add a self-check test per detector that feeds it a synthetic bad sample - a CRLF line,
   a missing shebang, a `100644` mode on a bare-invoked path, an unquoted `'?plan'`, a `[[` under
   `#!/bin/sh` - and asserts it fires. That keeps the red side proven without a manual `chmod`.

### Edge cases
A script with a shebang but no trailing newline; a `.ts` module with no shebang (allowed - it is imported,
never executed); `superui/scripts/vendor/*.ts` excluded from the bashism and shebang rules; a `!` preload
argument legitimately containing `*` inside a double-quoted string; `git ls-files` run from a subdirectory.

### Contracts
none

### DoD
`node --test tests/portability.test.ts` is green on the current tree, and every detector has a paired
self-check case proving it fires on a synthetic violation.


### Covered criteria
4. `tests/portability.test.ts` fails if any shipped script loses its exec bit in the git index, loses its
   shebang, gains a CRLF line ending, gains a bashism under a `#!/bin/sh` shebang, or if any SKILL.md `!`
   preload passes an unquoted argument containing `?`, `*` or `[`.
