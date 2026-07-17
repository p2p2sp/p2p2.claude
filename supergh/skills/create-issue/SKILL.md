---
name: create-issue
description: GitHub issue creation expert — interactive, template-driven flow. Use whenever the user wants to create a GitHub issue, report a bug, file a feature request, or open a ticket. Triggers include "create issue", "new issue", "report bug", "feature request". Reads `.github/ISSUE_TEMPLATE/` fresh per run, auto-fills from session context, previews, then creates via `gh issue create`. Do NOT write issue markdown by hand or call `gh issue create` directly via Bash — use this skill (it parses the template, enforces required fields, respects frontmatter labels/type/assignees). Do NOT use for editing or commenting on existing issues.
allowed-tools: Read, Glob, Write, AskUserQuestion, Bash(sh:*), Bash(gh --version), Bash(gh auth status)
user-invocable: true
model: sonnet
effort: medium
argument-hint: "[template-slug]"
---

# Create GitHub Issue

Interactive, template-driven creator of GitHub issues. Reads `.github/ISSUE_TEMPLATE/` fresh on every run (no caching), auto-fills `body[]` fields from the current session context and asks only about the rest, previews with an unbounded edit loop, then creates through the bundled `scripts/create.sh`. Meta-prompts match the user's conversation language; field labels stay verbatim from the template (template authority). Hallucination is strictly forbidden — any uncertainty falls through to the per-field prompt.

## Argument shape

`[template-slug]` — optional. Match against template files in `.github/ISSUE_TEMPLATE/` after stripping the leading `[0-9]+-` prefix and the `.yml`/`.yaml` extension (`feature-request` matches `02-feature-request.yml`). Unique match -> skip Step 3 selection and load that template. Zero or multiple matches -> one-line warning ("template not found" / "ambiguous") and fall back to interactive selection.

## Preflight

!`"${CLAUDE_PLUGIN_ROOT}/shared/scripts/preflight.sh"`

The `KEY=VALUE` block above is injected at load (read-only facts; STOP logic stays here). Read it — do NOT re-run `gh`/`git` probes. On any STOP: print a short, actionable message in the user's conversation language and halt — no further writes or questions.

- `GH_PRESENT=0` -> STOP: GitHub CLI is missing, link to https://cli.github.com/.
- `GH_AUTH=fail` -> STOP: not authenticated, instruct `gh auth login`.

## Step 1 — Preconditions (fail-fast)

Preflight covered `gh` + auth. Remaining check (same STOP discipline): `Glob(".github/ISSUE_TEMPLATE/*.yml")` + `Glob(".github/ISSUE_TEMPLATE/*.yaml")` — empty -> STOP: no issue templates in `.github/ISSUE_TEMPLATE/`, instruct to add one.

## Step 2 — Load templates

For each matched file: `Read`, parse the YAML in-context (no external `yq`/`python`), validate the minimum shape — top-level `name` (string) and `body` (array). Parse failure or wrong shape -> one-line warning (`template <filename>: malformed, skipped`) and skip the file. All templates skipped -> STOP (every template malformed). At least one valid -> continue with the valid set.

## Step 3 — Select template type

Argument path (`$ARGUMENTS` provided): compute each valid template's slug per Argument shape; find templates whose slug equals or contains the argument. Unique match -> load it, go to Step 4. Zero / multiple -> warning, fall through to the interactive path.

Interactive path: `AskUserQuestion` — "Which issue type?" (language-appropriate). Per option: `label` = template frontmatter `name`, `description` = template frontmatter `description` (truncate to ~80 chars).

## Step 4 — Collect title

Read top-level `title:` from the chosen template. Compute a `context_default` from the session (same source set and conservativeness as Step 4.5; ambiguous -> empty). Default priority:

1. `frontmatter.title` present -> use it (template authority wins; ignore `context_default`).
2. Else `context_default` non-empty -> use it as the editable starting point.
3. Else no default.

Prompt `Title (default: <default>)` or, with no default, `Enter issue title` (language-appropriate). The default is an editable starting point; user confirmation is mandatory regardless of source — never silently accept `context_default`. Reject empty / whitespace-only titles and re-prompt.

## Step 4.5 — Auto-fill body fields from session context

Populate `body[]` entries answerable from the current session so the user is asked only about the rest. The mechanism (in-context-only source set — transcript + already-quoted plan files, never a fresh `Glob`/`Read`/`Grep`), the per-field FILLED / MISSING algorithm, the type-specific constraints, and the output-map shape live in `references/auto-fill.md` — binding. When in doubt -> MISSING; hallucination is strictly worse than re-asking. Result: a map `{field_id -> {status: FILLED | MISSING, value?}}` keyed by `attributes.id` (or `body[]` index when `id` is missing), consumed by Step 5.

## Step 5 — Collect body fields

Iterate `body[]` in template order; skip `markdown` entries entirely (static template prose, not fields). Branch on the Step 4.5 map:

- FILLED -> take the value as the answer, skip the prompt. The Step 7 preview still surfaces it; a non-empty auto-filled value satisfies required-field discipline.
- MISSING + required -> per-field prompt below.
- MISSING + optional -> record as "no response" without prompting.

Per-field prompt (also used when the Step 7 edit loop re-runs a field):

- `textarea` — conversational prompt: show `attributes.label`, `attributes.description` (if present), `attributes.placeholder` as a hint ("e.g. ..."); multi-line input.
- `input` — same as `textarea`, single-line.
- `dropdown` — `AskUserQuestion` (single-select); options = `attributes.options[]` strings verbatim.
- `checkboxes` — `AskUserQuestion` with `multiSelect: true`; options = `attributes.options[].label`. Pre-checked options (`required: true` / `selected: true`) are surfaced in the prompt copy but the user still confirms.

Required-field discipline: `validations.required: true` and an empty / whitespace-only value (textarea/input) or zero selections (checkboxes) -> re-prompt with "This field is required" until non-empty. Auto-fill MUST NOT bypass this — Step 4.5 returns MISSING when uncertain, which routes the field here. Optional fields accept empty answers as "no response".

Store answers keyed by the field's `id` (or its `body[]` index when `id` is missing).

## Step 6 — Render body markdown

Assemble the body string per `## Body format`: collected fields in template order, `markdown` entries omitted.

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

- `Save` -> Step 8.
- `Edit field` -> second `AskUserQuestion` listing every editable field: the title, then each body field by `attributes.label` (`markdown` types skipped). User picks one -> re-run the matching Step 4 / Step 5 prompt with the previous value as the starting point -> re-render Step 6 -> back to Step 7. The loop is unbounded.
- `Cancel` -> print "Cancelled. Nothing saved." (language-appropriate) and STOP. Tempfiles under `.temp/create-issue/` stay — `.temp/` is gitignored, debug-friendly.

## Step 8 — Persist & create

Echo the final content first (mandatory, unconditional): before any `Write` or create call, re-print the exact issue about to be saved — same block shape as the Step 7 preview, body byte-for-byte what lands in `<body_path>` — under a `## Saving issue` heading. This fires regardless of auto-fill ratio or whether the edit loop ran. Only then:

1. `body_path = Bash("sh \"${CLAUDE_PLUGIN_ROOT}/shared/scripts/body-path.sh\" create-issue \"<title>\"")` — deterministic (timestamps, slugifies, creates `.temp/create-issue/`, prints the ready path). Trust its single output line. Empty -> STOP with a short, actionable message; no `Write`, no create.
2. `Write` the rendered body to `<body_path>`.
3. Create:
   ```
   sh "${CLAUDE_PLUGIN_ROOT}/skills/create-issue/scripts/create.sh" "<body_path>" "<title>" \
     [--type "<frontmatter.type>"] [--label "<L>"]... [--assignee "<A>"]... [--project "<P>"]...
   ```
   Flag values come verbatim from the template's top-level frontmatter; omit absent ones. The script wraps `gh issue create --title --body-file` (`gh issue create` has no `--type` flag — the script applies the type via REST PATCH after creation; the `cli` skill documents that layer choice) and prints `ISSUE_URL` / `ISSUE_NUMBER` / `TYPE` (+ `TYPE_ERROR`). Trust the block — do not re-verify.
4. Script exit != 0 -> STOP with its stderr line. Otherwise branch on `TYPE`:
   - `applied` / `none` -> Step 9.
   - `dropped` -> one-line warning that the type was dropped -> Step 9 (the issue exists; never roll back).
   - `error` -> surface `TYPE_ERROR` -> Step 9 (the issue exists; never roll back).

## Step 9 — Output

Print exactly two lines (language-appropriate verb; emoji literal), nothing else — no preamble, no follow-up suggestions:

```
✓ Created issue #<ISSUE_NUMBER>: <title>
  <ISSUE_URL>
```

## Body format

Final body markdown matches what GitHub Issue Forms produces via the UI — issues created by this skill are visually indistinguishable from UI-created ones.

For each non-`markdown` field in template order:

```
### <attributes.label>

<content or "_No response_">

```

Rules:

- `### ` heading with the exact `attributes.label` string — keep emojis, punctuation, language.
- Single blank line between heading and content, and between content and the next heading.
- Content by field type: `textarea` / `input` -> raw text as-is; `dropdown` -> the selected option string; `checkboxes` -> `- [x] <label>` per selected, `- [ ] <label>` per not selected (all options preserved).
- Empty optional fields -> `_No response_` under the heading (matches GitHub UI behavior).
- `markdown`-typed entries -> fully omitted (no heading, no content).
- No trailing whitespace; file ends with a single newline.

## Safety rules

(Deltas only — invariants already stated above are not repeated.)

- NEVER pass the body inline to any `gh` call — it always travels as the Step 8 tempfile through `create.sh` `--body-file` (inline escaping of newlines/quotes/backticks under bash is a footgun).
- NEVER widen the sandbox to general `Bash` or `Bash(gh:*)` — the only surfaces are `Bash(sh:*)` (bundled scripts) and the two preflight probes; every `gh` mutation goes through `scripts/create.sh`.
- NEVER assume the template set looks like the current repo's — this skill ships stack-agnostic; behavior derives entirely from `.github/ISSUE_TEMPLATE/` at runtime.
- NEVER bypass the Step 7 preview or the Step 8 echo — auto-fill ratio is irrelevant; the user always sees the Save / Edit field / Cancel triad and the exact persisted content before it is written.
