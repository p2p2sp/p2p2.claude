---
name: gh-issue
description: GitHub issue creation expert driving an interactive, template-driven flow. Use this skill whenever the user wants to create a GitHub issue, report a bug, file a feature request, open a ticket, or submit a structured issue using the project's issue templates. Triggers include "create issue", "new issue", "open issue", "report bug", "file a bug", "feature request". Reads `.github/ISSUE_TEMPLATE/` fresh on every run, auto-fills fields from session context, shows a preview, and creates the issue via `gh issue create`. Do NOT write issue markdown by hand or call `gh issue create` directly via Bash — use this skill first; it parses the template, enforces required fields, and respects frontmatter labels/type/assignees. Do NOT use for editing or commenting on existing issues — that is separate tooling. Trigger applies in any language and to descriptive phrasing too.
allowed-tools: Read, Glob, Write, AskUserQuestion, Bash(gh --version), Bash(gh auth status), Bash(gh issue create:*), Bash(gh issue view:*), Bash(gh api:*)
user-invocable: true
effort: medium
argument-hint: "[template-slug]"
---

# Create GitHub Issue

Interactive, template-driven creator of GitHub issues. Reads `.github/ISSUE_TEMPLATE/` of the current repo on every run (no caching). **Context-aware**: before per-field prompting, auto-fills `body[]` entries from the current session transcript (prior interview, exploration, plan files quoted in-session, sub-agent results) and asks the user only about fields the context cannot unambiguously answer. Shows a preview with an edit loop, then calls `gh issue create` with body via tempfile. Meta-prompts match the user's conversation language; field labels are kept verbatim from the template (template authority). Hallucination is strictly forbidden — any uncertainty falls through to the existing per-field prompt.

## Contents

- [Argument shape](#argument-shape)
- [Step 1 — Preconditions (fail-fast)](#step-1--preconditions-fail-fast)
- [Step 2 — Load templates](#step-2--load-templates)
- [Step 3 — Select template type](#step-3--select-template-type)
- [Step 4 — Collect title](#step-4--collect-title)
- [Step 4.5 — Auto-fill body fields from session context](#step-45--auto-fill-body-fields-from-session-context)
- [Step 5 — Collect body fields](#step-5--collect-body-fields)
- [Step 6 — Render body markdown](#step-6--render-body-markdown)
- [Step 7 — Summary & confirm loop](#step-7--summary--confirm-loop)
- [Step 8 — Persist & create](#step-8--persist--create)
- [Step 9 — Output](#step-9--output)
- [Body format](#body-format)
- [Safety rules](#safety-rules)

## Argument shape

`[template-slug]` — optional. When provided, skill matches it against template files in `.github/ISSUE_TEMPLATE/` after stripping the leading `[0-9]+-` numeric prefix and the `.yml`/`.yaml` extension (e.g. `feature-request` matches `02-feature-request.yml`). On a **unique** match → skip Step 3 type-selection and load that template directly. On **zero** or **multiple** matches → emit a one-line warning ("template not found" / "ambiguous") and fall back to interactive selection in Step 3.

## Step 1 — Preconditions (fail-fast)

Run these three checks in order. On any failure: print a short, actionable message in the user's conversation language and STOP — do not proceed to later steps, do not write anything, do not ask further questions.

1. `Bash(gh --version)` — exit code ≠ 0 → message: GitHub CLI is missing, link to https://cli.github.com/.
2. `Bash(gh auth status)` — exit code ≠ 0 → message: not authenticated, instruct `gh auth login`.
3. `Glob(".github/ISSUE_TEMPLATE/*.yml")` ∪ `Glob(".github/ISSUE_TEMPLATE/*.yaml")` — empty → message: no issue templates in `.github/ISSUE_TEMPLATE/`, instruct to add one.

## Step 2 — Load templates

For each matched file:

1. `Read` the file.
2. Parse YAML in-context (no external `yq`/`python` dependency — Claude parses the structure directly).
3. Validate the minimum shape: top-level `name` (string) and `body` (array). If parsing fails or shape is wrong → log a one-line warning (`template <filename>: malformed, skipped`) and skip this file.

If after the loop **all** templates were skipped → STOP with a fail-fast message: every template is malformed. If at least one template is valid → continue with the valid set.

## Step 3 — Select template type

**Argument path** (argument-slug provided in `$ARGUMENTS`):

- Compute `slug(file) = strip_prefix_digits(filename_without_ext)` for every valid template (e.g. `02-feature-request.yml` → `feature-request`).
- Find templates whose slug equals or contains the provided argument-slug.
- Unique match → load that template, skip to Step 4.
- Zero / multiple matches → print warning, fall through to interactive path.

**Interactive path** (no argument or ambiguous match):

- `AskUserQuestion` with one question: "Which issue type?" / language-appropriate equivalent.
- Each option:
  - `label` = `name` from template frontmatter (e.g. `"✨ Feature Request"`).
  - `description` = `description` from template frontmatter (truncated to ~80 chars if longer).
- User's selection identifies the template to load.

## Step 4 — Collect title

Read top-level `title:` from the chosen template's frontmatter. Then compute a `context_default` from the current session (see Step 4.5 mechanism — same source set, same conservativeness rule; if context is ambiguous, `context_default` is empty).

Resolve the prompt default in this priority:

1. `frontmatter.title` present → use it (**template authority wins**); ignore `context_default`.
2. `frontmatter.title` absent + `context_default` non-empty → use `context_default` as the editable starting point.
3. Both absent → no default.

Then:

- Default available (case 1 or 2) → prompt: `Title (default: <default>)` / language-appropriate equivalent. User submits final title; treat the default as an editable starting point (user may keep, extend, or replace).
- No default (case 3) → prompt: `Enter issue title` / language-appropriate equivalent. User submits a non-empty title.

Reject empty / whitespace-only titles and re-prompt. The user's confirmation is mandatory regardless of source — never silently accept `context_default`.

## Step 4.5 — Auto-fill body fields from session context

Before per-field prompting, populate `body[]` entries with values inferable from the current session, so the user is asked only about fields the context cannot unambiguously answer. The mechanism (in-context-only source set — transcript + already-quoted plan files, never a fresh `Glob` / `Read` / `Grep`), the per-field FILLED / MISSING algorithm, the type-specific constraints, and the output-map shape live in `references/auto-fill.md`. **Binding rule**: when in doubt → MISSING; hallucination is strictly worse than re-asking. The result is a map `{field_id → {status: FILLED | MISSING, value?}}` (keyed by `attributes.id`, or `body[]` index when `id` is missing) consumed by Step 5.

## Step 5 — Collect body fields

Iterate over `body[]` in template order. For each non-`markdown` entry, branch on the Step 4.5 auto-fill map:

- **`FILLED`** → consume the auto-filled value as the field's answer. **Skip the prompt entirely.** Store under the field's `id` / index. The Step 7 preview and edit loop still surface this value for confirmation; required-field discipline below is satisfied by the non-empty auto-filled value.
- **`MISSING` + required** → run the per-field prompt below; existing "re-prompt on empty" loop applies.
- **`MISSING` + optional** → record as "no response" (same semantics as today's empty-optional answer) without prompting.

**Per-field prompt** (used only for `MISSING` + required, or when the edit loop in Step 7 re-runs a single field):

| `type` | Handling |
|--------|----------|
| `markdown` | **Skip** — these are static intro/footer instructions for the human, not fields to fill. |
| `textarea` | Conversational prompt: show `attributes.label`, `attributes.description` (if present), and `attributes.placeholder` as a hint ("e.g. ..."). User pastes / types multi-line text. |
| `input` | Conversational prompt, same shape as `textarea` but treat input as single-line. |
| `dropdown` | `AskUserQuestion` (single-select) with `attributes.options[]` as the options. `label` = each option string. `description` = empty unless template provides one. |
| `checkboxes` | `AskUserQuestion` with `multiSelect: true`. Options come from `attributes.options[].label`. Pre-checked options (`attributes.options[].required: true` or `selected: true` if such a field exists) are surfaced in the prompt copy but the user still confirms. |

**Required-field discipline.** If `validations.required: true` and the value (auto-filled or user-provided) is empty / whitespace-only (textarea/input) or zero options selected (checkboxes) → re-prompt with a short note ("This field is required"). Do not advance until a non-empty answer is provided. Auto-fill MUST NOT bypass this — Step 4.5 returns MISSING when uncertain, which routes the field to the prompt path.

**Optional fields.** If `validations.required` is missing or `false`, empty answers (including auto-fill MISSING) are accepted — record them as "no response" for later rendering.

Store collected answers keyed by the field's `id` (or its index in `body[]` if `id` is missing).

## Step 6 — Render body markdown

Iterate the collected fields in template order and assemble the body string per the format spec below (`## Body format` section). Skip `markdown`-typed entries entirely.

## Step 7 — Summary & confirm loop

Print a preview block:

```
## Issue preview

**Title:** <title>
**Type:** <type or "—">
**Labels:** <comma-joined labels or "—">
**Assignees:** <comma-joined assignees or "—">
**Projects:** <comma-joined projects or "—">

---

<rendered markdown body>

---
```

Then `AskUserQuestion` with three options:

- `Save` — proceed to Step 8.
- `Edit field` — second `AskUserQuestion` lists every editable field: the title, then each body field by its `attributes.label` (skipping `markdown` types). User picks one → re-run the matching prompt from Step 4 (title) or Step 5 (body field), passing the previous value as the default / starting point → re-render Step 6 → **return to Step 7**.
- `Cancel` — print "Cancelled. Nothing saved." (language-appropriate) and STOP. Any tempfile under `.temp/gh-issue/` (if already written) stays — `.temp/` is in `.gitignore`, debug-friendly.

The edit loop is unbounded — user may edit any number of fields before saving.

## Step 8 — Persist & create

1. **Compute a unique body path** (so parallel `gh-issue` runs do not clobber each other):
   ```
   ts   = Bash("date +%Y%m%d-%H%M%S")          # e.g. 20260522-143045
   slug = slugify(<title>)                      # see "Slugify" below
   body_path = ".temp/gh-issue/" + ts + "-" + slug + ".md"
   ```
   **Slugify** — apply in order to the issue title:
   1. Lowercase.
   2. Transliterate Polish diacritics: `ą→a, ć→c, ę→e, ł→l, ń→n, ó→o, ś→s, ź→z, ż→z`.
   3. Replace every char outside `[a-z0-9]` with `-`.
   4. Collapse runs of `-` into a single `-`.
   5. Trim leading/trailing `-`.
   6. Truncate to 40 chars; if the cut lands inside a word, back off to the last `-` before the limit.
   7. If the result is empty, use `untitled`.
2. `Write` the rendered body to `<body_path>` (create the directory if missing).
3. Construct the `gh issue create` invocation:
   ```
   gh issue create \
     --title "<title>" \
     --body-file "<body_path>" \
     [--label "<each-label>"]... \
     [--assignee "<each-assignee>"]... \
     [--project "<each-project>"]...
   ```
   Each value comes straight from the template's top-level frontmatter — pass through verbatim. Title MUST go via `--title`; body MUST go via `--body-file` (never `--body` with inline string — see Safety rules). **Do NOT pass `--type`** — that flag does not exist in `gh issue create`; the type is applied in step 5 via REST PATCH.
4. On success `gh issue create` prints the new issue URL to stdout — capture it and parse `{owner}`, `{repo}`, and `{N}` (issue number) from the tail (`https://github.com/{owner}/{repo}/issues/{N}`).
5. **Set issue type via REST PATCH** (only when `frontmatter.type` is present):
   ```
   gh api -X PATCH repos/{owner}/{repo}/issues/{N} -f type="<frontmatter.type>"
   ```
   On success: continue to Step 9. On error whose stderr/response contains any of `not enabled`, `not found`, `issue types`, `Validation Failed: Type`, `403`, `404` → print a single-line warning that the type was dropped and continue to Step 9 (the issue already exists; do not roll back). Propagate any other error. The `cli` skill is the source of truth for why this is a REST PATCH (issue type is not a `gh issue create --type` flag) — see its decision table. Optionally, this fully-specified PATCH MAY be delegated to the `gh-cli-executor` skill to run out of the main context; the inline logic and flow above stay the default.

## Step 9 — Output

Print exactly two lines (language-appropriate verb; emoji literal):

```
✓ Created issue #<N>: <title>
  <URL>
```

`<N>` is extracted from the URL tail (`.../issues/<N>`). If parsing fails, print just `<URL>` on its own line under the `✓` line. Reply with nothing else — no preamble, no follow-up suggestions.

## Body format

Final body markdown matches what GitHub Issue Forms produces when submitted via the UI — issues created by this skill are visually indistinguishable from UI-created ones.

For each non-`markdown` field in template order:

```
### <attributes.label>

<content or "_No response_">

```

Rules:

- `### ` heading with the **exact** `attributes.label` string — keep emojis, keep punctuation, keep language.
- Single blank line between heading and content; single blank line between content and the next heading.
- **Content rendering by field type:**
  - `textarea` / `input` → user's raw text as-is.
  - `dropdown` → the selected option string.
  - `checkboxes` → markdown list `- [x] <label>` for each selected, `- [ ] <label>` for each not selected (preserves all options).
- **Empty optional fields** → `_No response_` (single-line italic) under the heading. This matches GitHub UI behavior.
- **`markdown`-typed entries** → fully omitted (no heading, no content).
- No trailing whitespace on lines; file ends with a single newline.

## Safety rules

- NEVER call `gh issue create` outside this skill from the main session for the same flow — use this skill so template parsing and required-field validation happen.
- NEVER cache parsed templates between runs — re-read `.github/ISSUE_TEMPLATE/` on every invocation. Templates may have changed.
- NEVER skip required-field validation. If `validations.required: true`, an empty answer means re-prompt, not "carry on".
- NEVER use `gh issue create --body "<inline>"` — body markdown contains newlines, quotes, dollar signs, backticks; inline escaping under bash is a footgun. Always `--body-file "<body_path>"` where `<body_path>` is the per-run unique file computed in Step 8.1.
- NEVER pass `--type` to `gh issue create` — the flag does not exist. Issue type is set via REST PATCH (`gh api -X PATCH repos/{o}/{r}/issues/{n} -f type=...`) in Step 8.5. The `cli` skill is the source of truth for the issue-type / labels / milestones layer rules (which operations are native `gh` flags vs. REST) — consult it rather than re-deriving the layer here.
- NEVER widen the sandbox to general `Bash` or general `Bash(gh:*)` — the allowed-tools list is intentionally narrow (only `gh --version`, `gh auth status`, `gh issue create:*`, `gh issue view:*`, `gh api:*`).
- NEVER assume the template set looks like the current repo's — this skill ships in a stack-agnostic plugin; behavior must derive entirely from what's present in `.github/ISSUE_TEMPLATE/` at runtime.
- NEVER fabricate field content during Step 4.5 auto-fill — any uncertainty, missing context, or conflicting signals → MISSING. Re-asking is strictly better than hallucination.
- NEVER auto-fill a value into a `dropdown` or `checkboxes` field that is not an exact member of `attributes.options[]` — context implying an out-of-set value → MISSING (do not partially select for `checkboxes`).
- NEVER auto-skip a required field without a confirmed value reaching Step 7 — required-field discipline (Step 5) applies regardless of whether the value came from auto-fill or the user.
- NEVER bypass the Step 7 preview / confirmation — auto-fill ratio is irrelevant; the user always sees the preview and the Save / Edit field / Cancel triad.
- NEVER scan the filesystem or project tree for field content during auto-fill — Step 4.5's source set is limited to the current session transcript and plan files already opened or quoted in-session. No new `Read`, `Glob`, or `Grep` calls for this purpose.
