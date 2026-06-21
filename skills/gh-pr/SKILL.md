---
name: gh-pr
description: GitHub pull request creation expert driving an interactive, template-driven flow. Use this skill whenever the user wants to create a PR, open a pull request, submit changes for review, or raise a draft PR. Triggers include "create PR", "new PR", "open PR", "create pull request", "open pull request", "raise PR", "draft PR", "submit for review". Reads `.github/pull_request_template.md`, resolves the linked issue from branch name (`task.N` / `issue.N`), command argument, or session context, and creates a draft PR via `gh pr create`. Do NOT call `gh pr create` directly via Bash — use this skill first; it enforces template usage, draft mode, GitFlow branch routing, and issue-driven title format `[#N] {issue-title}`. Do NOT use for editing existing PRs, posting reviews, or merging — that is separate tooling. Trigger applies in any language and to descriptive phrasing too.
allowed-tools: Read, Glob, Write, AskUserQuestion, Bash(gh --version), Bash(gh auth status), Bash(gh pr create:*), Bash(gh pr list:*), Bash(gh issue view:*), Bash(git rev-parse:*), Bash(git branch:*), Bash(git log:*)
user-invocable: true
effort: medium
argument-hint: "[issue-number]"
---

# Create GitHub Pull Request

Interactive, template-driven draft-PR creator. Reads `.github/pull_request_template.md` on every run (no caching), resolves the linked issue from the branch name (`task.N` / `issue.N`), command argument, or session context, fetches the issue title via `gh issue view`, formats the PR title as `[#<N>] <issue-title>`, routes the target branch via hardcoded GitFlow (`hotfix/*` → `main`, `feature/*` → `develop`, else → ask), agressively pre-fills the body, and lets the user iterate through an Edit / Save / Cancel preview loop before calling `gh pr create --draft`. Meta-prompts match the user's conversation language; section headings are kept verbatim from the template (template authority).

## Contents

- [Argument shape](#argument-shape)
- [Step 1 — Preconditions (fail-fast)](#step-1--preconditions-fail-fast)
- [Step 2 — Resolve target branch (routing)](#step-2--resolve-target-branch-routing)
- [Step 3 — Resolve issue number (4-priority cascade)](#step-3--resolve-issue-number-4-priority-cascade)
- [Step 4 — Resolve title](#step-4--resolve-title)
- [Step 5 — Load PR template](#step-5--load-pr-template)
- [Step 6 — Auto-fill body (aggressive pre-fill, preview-first)](#step-6--auto-fill-body-aggressive-pre-fill-preview-first)
- [Step 7 — Preview & edit loop](#step-7--preview--edit-loop)
- [Step 8 — Persist & create](#step-8--persist--create)
- [Step 9 — Output](#step-9--output)
- [Body format](#body-format)
- [Safety rules](#safety-rules)

## Argument shape

`[issue-number]` — optional. When provided and matching `^\d+$`, the skill **skips branch-regex parsing and session-context scanning** (Step 3 priorities 2 and 3) and uses this number directly. Anything else (non-numeric, multiple tokens) → emit a one-line warning ("ignoring invalid argument: <arg>") and fall through to the regular resolution cascade.

## Step 1 — Preconditions (fail-fast)

Run these in order. On any failure: print a short, actionable message in the user's conversation language and STOP — do not proceed, do not write anything, do not ask further questions.

1. `Bash(gh --version)` — exit code ≠ 0 → message: GitHub CLI is missing, link to https://cli.github.com/.
2. `Bash(gh auth status)` — exit code ≠ 0 → message: not authenticated, instruct `gh auth login`.
3. `Bash(git rev-parse --abbrev-ref HEAD)` → `current` branch name.
4. Reject **current branch is a known base**: if `current ∈ {main, master, develop}` → STOP with `Cannot open a PR from \`<current>\`. Switch to a feature branch first.` (Edge B)
5. `Bash(git rev-parse --abbrev-ref @{u})` — non-zero exit or empty → STOP with `Branch \`<current>\` is not pushed. Run \`git push -u origin <current>\` first.` (Edge C) Do NOT auto-push; sandbox intentionally excludes `git push`.

## Step 2 — Resolve target branch (routing)

Compute a routing default from `current`:

| `current` matches | Default `base` |
|-------------------|----------------|
| `hotfix/*`        | `main`         |
| `feature/*`       | `develop`      |
| anything else     | (no default — `AskUserQuestion` with options `main`, `develop`, `(other — type manually)`) |

**Always-confirm:** after computing the default, ALWAYS surface an `AskUserQuestion` of the form `Target branch: \`<base\>\` — confirm or change?`. Never skip this prompt, even if the routing rule produced an unambiguous answer (this is the explicit user-requested invariant — defaults must be explicit, not silent).

After user confirmation/selection, verify the chosen base actually exists on origin:

- `Bash(git rev-parse --verify refs/remotes/origin/<base>)` — exit code ≠ 0 → `AskUserQuestion` with a list pulled from `Bash(git branch -r)` filtered to `origin/*` (exclude `origin/HEAD`, exclude `origin/<current>` itself). User picks an existing remote branch. (Edge A)

Then check for an already-open PR from this branch:

- `Bash(gh pr list --head <current> --base <base> --state open --json url --jq '.[0].url // ""')` — non-empty → STOP with `A PR from \`<current>\` to \`<base>\` already exists: <URL>. Use \`gh pr edit\` to modify it.` (Edge D)

**Branch naming.** Feature branches follow `feature/{slug}` / `fix/{slug}` / `refactor/{slug}`; the primary branch is `main`. This is the convention the routing rules above and the Step 3 branch-regex parse expect — it is a host-project default the skill never assumes blindly (see Safety rules).

## Step 3 — Resolve issue number (4-priority cascade)

Try each source in order. The first one that yields a number wins; later sources are not consulted.

1. **Argument** — if `$ARGUMENTS` matches `^\d+$`, use it directly.
2. **Branch regex** — apply `(?:task|issue)\.(\d+)` (case-insensitive) to `current`. Examples: `feature/task.1234-add-config` → `1234`; `bugfix/issue.42` → `42`; `task.7` → `7`. First capture group is the number.
3. **Session-context scan** — scan the conversation transcript (most recent ~20 turns) for `#\d+` or phrases like `issue 1234` / `task 5678`. If **exactly one** distinct number appears → `AskUserQuestion`: `Wykryto #<N> w kontekście rozmowy. Użyć dla tego PR?` / language-appropriate equivalent with options `Tak (use #<N>)` / `Nie, podaj inny` / `Pomiń (no issue prefix)`. Multiple distinct numbers → skip this priority (do not ask the user to disambiguate; fall through).
4. **Ask user** — `AskUserQuestion`: `Numer issue dla tego PR (puste = bez issue prefix)` / language-appropriate equivalent. Empty answer → no issue number; continue without prefix.

If no number was resolved → continue to Step 4 with `N = null` (title fallback path).

## Step 4 — Resolve title

If `N` is non-null:

1. `Bash(gh issue view <N> --json title --jq .title)`
   - Success (non-empty stdout, exit 0) → `title = "[#<N>] <issue-title>"`.
   - Failure (404, auth error, network, empty title) → emit warning `Issue #<N> nie dostępne: <error>. Wpisz tytuł ręcznie:` (language-appropriate) → conversational prompt for manual title → `title = "[#<N>] <user-input>"` (prefix preserved; reject empty / whitespace-only and re-prompt).

If `N` is null:

1. Try first-commit subject: `Bash(git log <base>..<current> --reverse --format=%s | head -1)` → if non-empty, use as `title` (no prefix).
2. If empty (fresh branch with no commits past base, or `<base>..<current>` is empty) → conversational prompt `Wpisz tytuł PR` / language-appropriate equivalent. Reject empty / whitespace-only and re-prompt.

## Step 5 — Load PR template

`Read` `.github/pull_request_template.md`.

- **Exists** → use file content as the template.
- **Not exists** → use a generic skeleton (hardcoded fallback):
  ```markdown
  ### Podsumowanie zmian
  - ...

  ### Plan testów
  - [ ]
  ```
  And surface a one-line info in the preview: `Nie znaleziono szablonu PR — używam minimalnego szkieletu.` (language-appropriate).

**Parse the template in-context** (no external markdown parser):

- Sections are delimited by lines matching `^#{2,3}\s+` (accept `## Heading` and `### Heading` — most repos use `###`).
- Each section's content is everything between its heading and the next heading (or EOF).
- HTML comments (`<!--\s.*?\s-->`, possibly multi-line) — interpret as **hints** to display in Edit-field prompts; NEVER render them in the final body.
- Within a section, lines matching `^\s*-\s+\[[\sxX]\]\s+` are **checkbox items** — preserve them literally in the rendered body (do not strip, do not pre-check, user edits via Edit field if they want).
- Other dash-prefixed lines (`- closes #...`, `- ...`) are **placeholders** — eligible for replacement by auto-fill (Step 6) or for verbatim retention if no auto-fill rule matches the section.

## Step 6 — Auto-fill body (aggressive pre-fill, preview-first)

For each parsed section, attempt to auto-fill content based on a heading heuristic. Match is **case-insensitive and accent-insensitive** (e.g. `Powiązane zadania` matches the same way as `Powiazane zadania`).

| Section type (heading contains any of) | Auto-fill rule |
|----------------------------------------|----------------|
| `zadan`, `issue`, `closes`, `link`, `relat` | Emit one line per linked issue. If `N` (from Step 3) is set → include `- closes #<N>` first. Then scan `Bash(git log <base>..<current> --format=%B)` for `(?i)(?:closes|fixes|resolves)\s+#(\d+)` and add one `- closes #<M>` per distinct extra number (de-duplicated against `N`). If no numbers at all → leave the section's original placeholder lines untouched. |
| `podsumow`, `summary`, `changes`, `zmian` | See **Summary auto-fill** in `references/auto-fill.md` — generate a short prose-style description of WHAT changed (not a copy of commit subjects), grouped by area when the diff is large; strip `#` from `#(\d+)` references; fall back to commit log only when both diff and session context are too sparse to summarize. |
| `test`, `qa`, `walidacj` | See **Test-section auto-fill** in `references/auto-fill.md` — classify scope (in-context first, single `git diff --name-only` fallback), generate concrete bullets when testable, **mark the section `skip=true` (omit from rendered body entirely — no heading, no `_No response_`) when untestable**. Never carry the template's literal `- [ ] Test 1` / `- [ ] Test 2` placeholders into the rendered body. |
| Anything else (custom heading) | Preserve section content verbatim from the template (placeholders like `...` remain — user sees them in preview and can Edit field). |

After auto-fill, drop any remaining HTML comments from each section. The result is the rendered body markdown.

The two heading heuristics that need detail — **Test-section auto-fill** (testability classifier) and **Summary auto-fill** (description, not commit list) — live in `references/auto-fill.md`. Apply them per that file when the matching section type is detected; their conservativeness and fallback rules are binding (a sparse-context PR body must never be empty, and specific names must never be fabricated).

## Step 7 — Preview & edit loop

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

- `Save` — proceed to Step 8.
- `Edit field` — second `AskUserQuestion` lists every editable field: `Title`, `Base`, then each parsed section by its heading (verbatim, with leading `###`/`##` stripped for display). **`Draft` is not editable** — the skill always creates draft PRs. User picks one → conversational prompt with the previous value as default / starting point → re-run Step 6 auto-fill for non-edited sections only (keep user-edited content), re-render preview → **return to Step 7**. If a section was marked `skip=true` in Step 6 (untestable change → Plan testów omitted), list it in the Edit-field options with a `(pominięto — przywróć?)` suffix so the user can opt back in; selecting it flips `skip=false` and triggers a conversational prompt for the section content.
- `Cancel` — print `Anulowano. Nie utworzono PR.` (language-appropriate) and STOP. Any tempfile under `.temp/gh-pr/` stays — `.temp/` is in `.gitignore`, debug-friendly.

The edit loop is unbounded — user may edit any number of fields before saving.

## Step 8 — Persist & create

1. **Compute a unique body path** (so parallel `gh-pr` runs do not clobber each other):
   ```
   ts   = Bash("date +%Y%m%d-%H%M%S")          # e.g. 20260522-143045
   slug = slugify(<title>)                      # see "Slugify" below
   body_path = ".temp/gh-pr/" + ts + "-" + slug + ".md"
   ```
   **Slugify** — apply in order to the PR title:
   1. Lowercase.
   2. Transliterate Polish diacritics: `ą→a, ć→c, ę→e, ł→l, ń→n, ó→o, ś→s, ź→z, ż→z`.
   3. Replace every char outside `[a-z0-9]` with `-`.
   4. Collapse runs of `-` into a single `-`.
   5. Trim leading/trailing `-`.
   6. Truncate to 40 chars; if the cut lands inside a word, back off to the last `-` before the limit.
   7. If the result is empty, use `untitled`.
2. `Write` the rendered body markdown to `<body_path>` (create the directory if missing).
3. Construct and execute:
   ```
   gh pr create \
     --base "<base>" \
     --head "<current>" \
     --draft \
     --title "<title>" \
     --body-file "<body_path>"
   ```
   - Title MUST go via `--title`; body MUST go via `--body-file` (never `--body` with inline string — see Safety rules).
   - `--draft` MUST be present unconditionally (the skill always creates draft PRs).
4. On success `gh pr create` prints the new PR URL to stdout — capture the tail line and parse `{owner}`, `{repo}`, `{N}` from `https://github.com/{owner}/{repo}/pull/{N}`.

## Step 9 — Output

Print exactly two lines (emoji literal, verb language-appropriate):

```
✓ Created draft PR #<N>: <title>
  <URL>
```

If parsing `<N>` from the URL fails, print just `<URL>` on its own line under the `✓` line. Reply with nothing else — no preamble, no follow-up suggestions.

## Body format

Final body markdown matches what GitHub renders when reading the file via the UI — PRs created by this skill are visually indistinguishable from manually-authored ones using the same template.

For each parsed section in template order:

```
### <heading from template>

<content per Step 6 heuristic, or "_No response_">

```

Rules:

- Heading line preserved **verbatim** from the template — same level (`##` or `###`), same casing, emojis, accents, punctuation, language.
- Single blank line between heading and content; single blank line between content and the next heading.
- HTML comments from the template — **omitted** entirely from the final body (they were hints for the author).
- Empty section (no auto-fill applied, user did not edit, original placeholders were stripped) → `_No response_` (single-line italic) under the heading. Match `gh-issue` semantics.
- Checkbox lines (`- [ ] ...`, `- [x] ...`) preserved as-is when retained from the template or set by the user via Edit field.
- No trailing whitespace on lines; file ends with a single newline.

## Safety rules

- NEVER call `gh pr create` directly via Bash from the main session for the same flow — use this skill so template parsing, draft enforcement, routing, and issue-driven title generation all happen.
- NEVER cache the parsed template between runs — re-read `.github/pull_request_template.md` on every invocation. The template may have changed.
- NEVER use `gh pr create --body "<inline>"` — body markdown contains newlines, quotes, dollar signs, backticks; inline escaping under bash is a footgun. Always `--body-file "<body_path>"` where `<body_path>` is the per-run unique file computed in Step 8.1.
- NEVER omit `--draft` — every PR this skill creates is a draft. Conversion to ready-for-review is an explicit follow-up step the user can do via `gh pr ready` or the GitHub UI. For the API-level draft↔ready conversion and for resolving PR review threads — both GraphQL-only operations — the `cli` skill is the source of truth on which layer applies (see its `references/pr-review-threads.md`); hand the fully-specified operation to the `gh-cli-exec` skill to run it out of the main context.
- NEVER widen the sandbox — `git push`, `gh label list`, `gh api repos`, `gh pr edit`, `gh pr ready`, `gh pr view --web` are intentionally out of scope. Each was a deliberate "no" during this skill's design (no auto-push of branches, no labels/reviewers/assignees collection, no in-skill conversion of draft to ready).
- NEVER hardcode `develop` as the silent fallback when it does not exist on origin — fallback path is the `AskUserQuestion` with a `git branch -r` list (Edge A). The user must see and pick.
- NEVER auto-push an unpushed branch — Edge C STOPs with an instruction. The user pushes manually so they own that side-effect.
- NEVER assume the template, the branch naming, or the routing reality look like the current repo's — this skill ships in a stack-agnostic plugin. The routing rules (`hotfix/*→main`, `feature/*→develop`) are a deliberate opinionated default; the always-confirm prompt and the not-exists fallback (Edge A) make sure the user always retains control. Behavior must derive entirely from `.github/pull_request_template.md`, the actual branch name, `git log`, `git branch -r`, and `gh issue view` at runtime.
- NEVER render the PR template's literal test-section placeholder lines (`- [ ] Test 1`, `- [ ] Test 2`, `- [ ] foo`, etc.) — they are example content, not contract. Either replace with concrete steps derived from session context (Step 6 + the **Test-section auto-fill** rules in `references/auto-fill.md`) or skip the entire section when the change is untestable (docs / assets / dotfiles only).
- NEVER fabricate specific function / endpoint / file / module names in auto-generated test bullets or Summary bullets — the conservativeness rule applies to both **Test-section auto-fill** and **Summary auto-fill** (`references/auto-fill.md`). When session context is sparse, fall back as defined there, never invent specifics.
- NEVER carry `#`-prefixed numeric references through the "Podsumowanie zmian" section — Summary auto-fill strips `#(\d+)` → `\1` so squash-merge subjects like `feat: foo (#123)` do not become noisy cross-reference renders in the PR body. The `#` is preserved only in the "Powiązane zadania" section, where GitHub keyword-linking (`closes #N`) requires it.
- NEVER render "Podsumowanie zmian" as a raw `git log` dump — that section is a **description of changes**, not a commit list. Apply Summary auto-fill: in-context reasoning to produce a short prose-style list (grouped by area when large), with commit-log fallback reserved for the case where both transcript and commit messages are too sparse to summarize.
