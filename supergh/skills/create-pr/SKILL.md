---
name: create-pr
description: GitHub pull request creation expert - interactive, template-driven flow. Use whenever the user wants to create a PR, open a pull request, submit changes for review, or raise a draft PR. Triggers include "create PR", "open PR", "pull request", "draft PR", "submit for review". Reads `.github/pull_request_template.md`, resolves the linked issue from branch name (`task.N`/`issue.N`), argument, or session context, and creates a draft PR via `gh pr create`. Do NOT call `gh pr create` directly via Bash - use this skill (it enforces template usage, draft mode, GitFlow branch routing, issue-driven title `[#N] {issue-title}`). Do NOT use for editing existing PRs, posting reviews, or merging.
allowed-tools: Read, Glob, Write, AskUserQuestion, Bash(sh:*), Bash(gh --version), Bash(gh auth status)
user-invocable: true
disable-model-invocation: true
model: sonnet
effort: medium
argument-hint: "[issue-number]"
---

# Create GitHub Pull Request

Interactive, template-driven draft-PR creator. Reads `.github/pull_request_template.md` fresh on every run, resolves the linked issue (argument -> branch name `task.N`/`issue.N` -> session context -> ask), titles the PR `[#<N>] <issue-title>`, routes the base branch via GitFlow defaults, aggressively pre-fills the body, and iterates an Edit / Save / Cancel preview loop before creating through the bundled `scripts/create.sh` (always draft). Meta-prompts match the user's conversation language; section headings stay verbatim from the template (template authority).

## Argument shape

`[issue-number]` - optional. Matches `^\d+$` -> use it directly and skip Step 3 priorities 2 and 3. Anything else -> one-line warning ("ignoring invalid argument: <arg>") and fall through to the regular cascade.

## Preflight

!`"${CLAUDE_PLUGIN_ROOT}/shared/scripts/preflight.sh"`

The `KEY=VALUE` block above is injected at load (read-only facts; STOP logic stays here). Read it - do NOT re-run `gh`/`git` probes. `BRANCH` is the current branch (`current`); `UPSTREAM` is its tracking ref. On any STOP: print a short, actionable message in the user's conversation language and halt - no further writes or questions.

- `GH_PRESENT=0` -> STOP: GitHub CLI is missing, link to https://cli.github.com/.
- `GH_AUTH=fail` -> STOP: not authenticated, instruct `gh auth login`.

## Step 1 - Preconditions (fail-fast)

`current` = `BRANCH` from Preflight. Same STOP discipline:

1. `current` in {`main`, `master`, `develop`} -> STOP: `Cannot open a PR from \`<current>\`. Switch to a feature branch first.` (Edge B)
2. `UPSTREAM` empty -> STOP: `Branch \`<current>\` is not pushed. Run \`git push -u origin <current>\` first.` (Edge C) Never auto-push - the sandbox intentionally excludes `git push`.

## Step 2 - Resolve target branch (routing)

Routing default from `current`:

- `hotfix/*` -> `main`.
- `feature/*` / `fix/*` / `refactor/*` -> `develop`.
- Anything else -> no default: `AskUserQuestion` with options `main`, `develop`, `(other - type manually)`.

Always-confirm: after computing the default, ALWAYS surface `AskUserQuestion` - `Target branch: \`<base>\` - confirm or change?`. Never skip it, even when routing is unambiguous - defaults must be explicit, never silent.

After confirmation, verify with one call:

```
sh "${CLAUDE_PLUGIN_ROOT}/skills/create-pr/scripts/check-base.sh" "<base>" "<current>"
```

- `BASE_EXISTS=0` -> `AskUserQuestion` over `REMOTE_BRANCHES` (pre-filtered: `origin/*` minus `origin/HEAD` and `<current>`); user picks an existing branch -> re-run the script with the new base. (Edge A)
- `OPEN_PR` non-empty -> STOP: `A PR from \`<current>\` to \`<base>\` already exists: <URL>. Use \`gh pr edit\` to modify it.` (Edge D)

Branch naming: `feature/{slug}` / `fix/{slug}` / `refactor/{slug}` / `hotfix/{slug}`, primary branch `main` - the host-project default the routing rules and the Step 3 regex expect, never assumed blindly (see Safety rules).

## Step 3 - Resolve issue number (4-priority cascade)

The first source that yields a number wins; later sources are not consulted.

1. Argument - `$ARGUMENTS` matches `^\d+$` -> use directly.
2. Branch regex - `(?:task|issue)\.(\d+)` (case-insensitive) on `current` (`feature/task.1234-add-config` -> `1234`; `task.7` -> `7`).
3. Session-context scan - last ~20 turns for `#\d+` or phrases like `issue 1234` / `task 5678`. Exactly one distinct number -> `AskUserQuestion`: `Wykryto #<N> w kontekście rozmowy. Użyć dla tego PR?` (language-appropriate) with `Tak (use #<N>)` / `Nie, podaj inny` / `Pomiń (no issue prefix)`. Multiple distinct numbers -> skip this priority (never ask to disambiguate).
4. Ask user - `Numer issue dla tego PR (puste = bez issue prefix)` (language-appropriate). Empty -> no issue number.

No number resolved -> continue with `N = null` (title fallback path).

## Step 4 - Gather facts & resolve title

One call (its output also feeds Step 6):

```
sh "${CLAUDE_PLUGIN_ROOT}/skills/create-pr/scripts/pr-facts.sh" "<base>" "<current>" [<N>]
```

Block: `ISSUE_TITLE` / `ISSUE_ERROR` (only when `<N>` was passed), `FIRST_SUBJECT`, `CLOSES` (distinct closes/fixes/resolves refs from commit messages, `<N>` excluded), `CHANGED_FILES`, `COMMITS:` (raw subjects + bodies). Trust the block - do not re-run `gh issue view` / `git log` / `git diff`.

Title resolution:

- `N` non-null + `ISSUE_TITLE` -> `title = "[#<N>] <ISSUE_TITLE>"`.
- `N` non-null + `ISSUE_ERROR` -> warn `Issue #<N> nie dostępne: <ISSUE_ERROR>. Wpisz tytuł ręcznie:` (language-appropriate) -> manual prompt -> `title = "[#<N>] <user-input>"` (prefix preserved; reject empty / whitespace-only and re-prompt).
- `N` null + `FIRST_SUBJECT` non-empty -> `title = FIRST_SUBJECT` (no prefix).
- `N` null + `FIRST_SUBJECT` empty -> prompt `Wpisz tytuł PR` (language-appropriate); reject empty / whitespace-only and re-prompt.

## Step 5 - Load PR template

`Read` `.github/pull_request_template.md`.

- Exists -> use its content.
- Missing -> use the hardcoded fallback skeleton below and surface a one-line info in the preview: `Nie znaleziono szablonu PR - używam minimalnego szkieletu.` (language-appropriate).
  ```markdown
  ### Podsumowanie zmian
  - ...

  ### Plan testów
  - [ ]
  ```

Parse in-context (no external markdown parser):

- Sections are delimited by lines matching `^#{2,3}\s+` (`##` and `###`).
- A section's content runs to the next heading (or EOF).
- HTML comments (`<!--\s.*?\s-->`, possibly multi-line) are hints for Edit-field prompts; NEVER render them in the final body.
- Lines matching `^\s*-\s+\[[\sxX]\]\s+` are checkbox items - preserve literally (no stripping, no pre-checking; user edits via Edit field).
- Other dash-prefixed lines (`- closes #...`, `- ...`) are placeholders - replaceable by Step 6 auto-fill, retained verbatim when no rule matches the section.

## Step 6 - Auto-fill body (aggressive pre-fill, preview-first)

Per parsed section, match the heading case- and accent-insensitively (`Powiązane zadania` matches like `Powiazane zadania`):

- Heading contains `zadan` / `issue` / `closes` / `link` / `relat` -> linked issues: if `N` is set, emit `- closes #<N>` first; then one `- closes #<M>` per number in `CLOSES` (Step 4 block). No numbers at all -> leave the section's original placeholder lines untouched.
- Heading contains `podsumow` / `summary` / `changes` / `zmian` -> Summary auto-fill per `references/auto-fill.md`: short prose description of WHAT changed (never a copy of commit subjects), grouped by area when large, `#`-strip applied; `COMMITS` / `CHANGED_FILES` from the Step 4 block are the raw input.
- Heading contains `test` / `qa` / `walidacj` -> Test-section auto-fill per `references/auto-fill.md`: testability classifier (in-context first, `CHANGED_FILES` fallback), concrete bullets when testable, `skip=true` when untestable (section omitted from the rendered body entirely - no heading, no `_No response_`). Never carry the template's literal `- [ ] Test 1` / `- [ ] Test 2` placeholders.
- Anything else -> preserve the section verbatim (placeholders like `...` remain; user sees them in the preview and can Edit field).

After auto-fill, drop remaining HTML comments from each section. Both heuristics in `references/auto-fill.md` are binding - a sparse-context body must never be empty, and specific names must never be fabricated.

## Step 7 - Preview & edit loop

Print:

```
## PR preview

**Title:** <title>
**Base:** <base>
**Head:** <current>
**Draft:** yes

---

<rendered body markdown>

---
```

Then `AskUserQuestion` with three options:

- `Save` -> Step 8.
- `Edit field` -> second `AskUserQuestion` listing every editable field: `Title`, `Base`, then each parsed section by its heading (leading `##`/`###` stripped for display). `Draft` is not editable - this skill always creates draft PRs. User picks one -> conversational prompt with the previous value as the starting point -> re-run Step 6 auto-fill for non-edited sections only (keep user-edited content) -> re-render -> back to Step 7. A section skipped in Step 6 is listed with a `(pominięto - przywróć?)` suffix; selecting it flips `skip=false` and prompts for its content. The loop is unbounded.
- `Cancel` -> print `Anulowano. Nie utworzono PR.` (language-appropriate) and STOP. Tempfiles under `.temp/create-pr/` stay - `.temp/` is gitignored, debug-friendly.

## Step 8 - Persist & create

Echo the final content first (mandatory, unconditional): before any `Write` or create call, re-print the exact PR about to be saved - same block shape as the Step 7 preview, body byte-for-byte what lands in `<body_path>` - under a `## Saving PR` heading. This fires regardless of auto-fill ratio or whether the edit loop ran. Only then:

1. `body_path = Bash("sh \"${CLAUDE_PLUGIN_ROOT}/shared/scripts/body-path.sh\" create-pr \"<title>\"")` - deterministic (timestamps, slugifies, creates `.temp/create-pr/`, prints the ready path). Trust its single output line. Empty -> STOP with a short, actionable message; no `Write`, no create.
2. `Write` the rendered body markdown to `<body_path>`.
3. Create:
   ```
   sh "${CLAUDE_PLUGIN_ROOT}/skills/create-pr/scripts/create.sh" "<base>" "<current>" "<body_path>" "<title>"
   ```
   The script wraps `gh pr create` with `--draft` and `--body-file` hardcoded (always draft, body never inline) and prints `PR_URL` / `PR_NUMBER`. Trust the block - do not re-verify.
4. Script exit != 0 -> STOP with its stderr line.

## Step 9 - Output

Print exactly two lines (emoji literal, verb language-appropriate), nothing else - no preamble, no follow-up suggestions:

```
✓ Created draft PR #<PR_NUMBER>: <title>
  <PR_URL>
```

## Body format

Final body markdown matches what GitHub renders via the UI - PRs created by this skill are visually indistinguishable from manually-authored ones using the same template.

For each parsed section in template order:

```
### <heading from template>

<content per Step 6, or "_No response_">

```

Rules:

- Heading line preserved verbatim from the template - same level (`##`/`###`), casing, emojis, accents, language.
- Single blank line between heading and content, and between content and the next heading.
- HTML comments from the template - omitted entirely.
- Empty section (no auto-fill, no user edit, placeholders stripped) -> `_No response_` under the heading (matches `create-issue` semantics).
- Checkbox lines (`- [ ]` / `- [x]`) preserved as-is when retained from the template or set via Edit field.
- Sections with `skip=true` -> fully omitted (no heading, nothing).
- No trailing whitespace; file ends with a single newline.

## Safety rules

(Deltas only - invariants already stated above are not repeated.)

- NEVER pass the body inline to any `gh` call - it always travels as the Step 8 tempfile through `create.sh` `--body-file` (inline escaping of newlines/quotes/backticks under bash is a footgun).
- NEVER create a non-draft PR - `scripts/create.sh` hardcodes `--draft`. Draft -> ready is a follow-up the user does via `gh pr ready` or the UI; the API-level conversion and resolving review threads are GraphQL-only - the `cli` skill owns the layer choice, and the fully-specified operation goes to `cli-executor`.
- NEVER widen the sandbox - `git push`, labels/reviewers/assignees collection, `gh pr edit`, `gh pr ready`, `gh pr view --web` are deliberate "no"s; the only surfaces are `Bash(sh:*)` (bundled scripts) and the two preflight probes.
- NEVER assume the template, branch naming, or routing reality match the current repo - this skill ships stack-agnostic; GitFlow routing is an opinionated default kept in check by always-confirm and Edge A. Behavior derives entirely from the template, the actual branch name, and the script-gathered facts at runtime.
- NEVER bypass the Step 7 preview or the Step 8 echo - auto-fill ratio is irrelevant; the user always sees the Save / Edit field / Cancel triad and the exact persisted content before it is written.
