---
source: /Users/dario/Projects/p2p2.claude/docs/_specs/2026-09-28-10-05-46_turn-viber-s-usage-page-into-a-full-bilingual-help/plan.md
---

To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Turn viber's usage page into a full bilingual help

## Goal

Replace the short cheat sheet at `viber/skills/setup/assets/usage.html` with a complete user help in one self-contained HTML file: a path for a newcomer, task guides with examples, an explanation of how viber works, troubleshooting, a glossary and a full reference of every skill and switch. A new test keeps the page from falling behind the plugin.

## Problem

The page opened by `/viber:help` and `/viber:setup` is a compact list of commands and switches. A newcomer cannot learn from it how viber works or how to do a common job (fix a bug, resume a stopped build, start from an issue), and a regular user finds no full description of each skill, its arguments and the switches that change it. Nothing checks the page against the plugin, so it already drifts: it tags `issues` as on while `viber/skills/setup/templates/viber.yml` ships `issues: false`. Left alone, every new skill or switch widens the gap.

## Current behaviour

One page, English and Polish side by side in the markup with an EN/PL switch that remembers the reader's choice and otherwise follows the browser language, light and dark themes from the system setting, a sticky table of contents on wide screens only. Sections: the four-step path, the `CLAUDE.md` prerequisite, the ways in, the GitHub issue thread, after a build, own schedule, any time, and the switches with `directories:`, `tiers:` and `branching:` (seven strategy examples). No search, no copy buttons, no skip link, no print style, no examples of a real session, no card for `planner`, `implementor`, `tdd`, `setup` or the agents. No test reads the page.

### Must not change

- The page stays at `viber/skills/setup/assets/usage.html`, one file with every style and script inline, so `/viber:help` and `/viber:setup` keep opening it unchanged.
- A language the reader picked is still the one shown on their next visit, the browser language is still the fallback, and the page still renders when the browser refuses to remember the choice.
- Light and dark themes still follow the system setting.

## Behaviour

### S1 - A newcomer gets from install to a first commit [CHANGED - was: a four-step strip and a CLAUDE.md note]

The page opens on "Getting started": install, `/viber:setup`, what `CLAUDE.md` must state, and one change walked from idea to commit. A short command cheat sheet follows right below.

Given a person who just installed viber
When they open the help and read the first section
Then they know which command to run first, what to put in `CLAUDE.md` and what one full run looks like

### S2 - A user finds the guide for the job at hand [NEW]

Each task guide is headed by the goal ("Fix a bug", "Resume a stopped build") and carries one three-step example: what you type, what viber does, what is left afterwards.

Given a user who wants to fix a bug
When they open the "Fix a bug" guide
Then they see the command to type, what `/viber:fixer` does and what it leaves behind

### S3 - A user understands why viber works this way [NEW]

"How viber works" explains plan before code, the plan-mode gate, the run directory, tasks with review and one commit each, the model range and what the build remembers.

Given a user surprised that viber will not write code before a plan
When they read "How viber works"
Then they find the reason and the way around it (a direct change asked for explicitly)

### S4 - A user stuck on a refusal finds the answer [NEW]

Troubleshooting entries are phrased as the question a user would ask; the glossary defines every term the page uses, and a term's first use links to it.

Given a user whose build refuses to start on a plan draft
When they open "Troubleshooting"
Then they find that question and what to do next, and every unfamiliar word in the answer links to the glossary

### S5 - A regular user looks up one skill or switch [CHANGED - was: one line per command, switches only]

Every skill has a card: what it does, how to start it (command or phrase), its arguments with an example, the switches that change it, where it writes. `planner`, `implementor` and `tdd` carry a "starts on its own" label and say how the user steers them. The 15 agents are listed one line each, grouped by stage. Every `viber.yml` key has its entry, `issue-type-mappings` included although the template ships it commented out.

Given a user who wants the arguments of `/viber:memory`
When they search for "memory" or open its card
Then they see `review`, `extend` and `reset` with an example each

### S6 - A user reads the whole help in one language [CHANGED - was: the same switch over a shorter page]

Given a reader who picked Polish
When they read any part of the help, the reference and the controls included
Then every piece of text is in Polish and no English duplicate shows

### S7 - A user finds something on a long page [NEW]

A search field filters the sections by the typed text in the current language; the table of contents stays beside the text on wide screens and folds on narrow ones; every command and YAML block has a copy button; every section heading has a link to itself; advanced detail sits in folded blocks; a skip link leads to the content; printing expands the folded blocks and hides navigation.

Given a user on a laptop screen
When they type "branch" into the search field
Then only the sections mentioning branches stay visible

### S8 - The help works with no network [NEW]

Given a laptop with no network connection
When the user opens the help from the plugin directory
Then the page looks and works as it does online

### S9 - The page cannot silently fall behind [NEW]

Given a maintainer who adds a skill or a setting to viber and leaves the help as it was
When they run the repository's test suite
Then the suite fails and names the skill or setting the help does not describe

### S10 - The page reads well in both themes [CHANGED - was: colors never checked]

Given a reader whose system uses the dark theme, and one whose system uses the light theme
When each reads any text on the page, on any background it sits on
Then the text is as readable as WCAG AA asks of body text, and the page carries no stray markup left by a broken edit

### Edge cases

- Search text matching nothing -> a "no results" line in the current language, never an empty page.
- JavaScript disabled -> every section visible, the search field and copy buttons do not show, reading still works.
- Browser refuses to remember the language on a page opened from disk -> the browser language is used for that visit.
- Browser refuses to copy on a page opened from disk -> the button says copying failed and the text stays selectable.
- Narrow phone screen -> no sideways scrolling of the page; a wide code block scrolls inside its own box.

## Glossary

- skill card - the reference entry a reader opens for one skill; not a task guide.
- key entry - the reference entry for one `viber.yml` setting.
- task guide - a section headed by what the reader wants to get done, carrying one three-step example.
- three-step example - what you type, what viber does, what is left afterwards; never a verbatim terminal transcript.
- language pair - the same piece of text in English and in Polish, of which the reader sees one.

## Acceptance criteria

1. The page opens on "Getting started" (install, `/viber:setup`, what `CLAUDE.md` must state, one change from idea to commit) followed by a command cheat sheet naming every command a user can run.
2. A task-guides part holds one guide per goal - add a feature, fix a bug, start from a GitHub issue, see a UI mockup first, resume a stopped build, commit, continue in a new session, get end-to-end tests, refresh project memory and rules - each with one three-step example.
3. A "How viber works" part explains plan before code, the plan-mode gate, the run directory and its archive, tasks with review and one commit each, the model range and what the build close writes.
4. A troubleshooting and questions part and a glossary exist, every glossary term defined in one or two sentences.
5. The reference ends the page: a card for every skill in `viber/.claude-plugin/plugin.json` (what it does, how to start it, arguments with an example, switches changing it, where it writes), the self-starting skills labelled as such, every agent in one line grouped by stage, an entry for every key of `viber/skills/setup/templates/viber.yml` (the commented `issue-type-mappings` included) and the branching strategy examples.
6. Every piece of text exists in English and Polish, and the switch shows exactly one language at a time.
7. Every statement on the page matches the current skill, agent, script and template files it describes.
8. The page carries a search field filtering sections, a table of contents (sticky on wide screens, folding on narrow ones), a copy button on every command and YAML block, a self-link on every section heading, folded blocks for advanced detail, a skip link to the content and a print style expanding folded blocks and hiding navigation.
9. `tests/viber/usage.test.ts` passes on the finished page and each of its rules fails on a synthetic bad sample.
10. The page loads no external script, stylesheet, font or image and works opened from the local disk with no network.
11. The page holds no em dash and no en dash.
12. Every text color reaches the WCAG AA contrast ratio for body text on every background color a text can sit on, in both themes.
13. The page holds no closing tag without its opener, and `tests/orphan-tags.test.ts` passes on it.

## Scope

### File map

- modify - viber/skills/setup/assets/usage.html - the whole bilingual help page, its styles and its scripts
- add - tests/viber/usage.test.ts - static checks of the page against `plugin.json`, the skills' frontmatter, the `viber.yml` template and its own structure and colors
- modify - .claude/rules/tests-running.md - the suite and viber-subset file and test counts it states

### Out of scope

- The page's path, the `help` and `setup` skills and `viber/scripts/open-page.sh`.
- `viber/README.md`, the root `README.md` and every other plugin.
- Any change to viber's behaviour: where the page and the code disagree, the page follows the code.

## Constraints

- One self-contained file that a reader opens from disk with nothing else to download; size does not matter.
- Prose in both languages follows the `humanizer` skill's rules, run by each task over the text it writes; Polish is written as natural Polish, never a sentence-by-sentence copy of the English.
- The visual design and every navigation control follow `superui:pro-designer`.
- No em dash or en dash anywhere, no orphan closing tag, LF line endings.
- The maintainers' rule "every user-visible viber change (a skill, an argument, a switch, a write location, the flow) updates the help page in the same edit, and the help's test enforces the skill cards, agent lines, key entries and language pairs" belongs in `viber/CLAUDE.md`; with `memory: true` the build close writes it, no task does.

## Tasks

<!-- TASK -->
### T1 - Add the skill and configuration reference with its guard test
- TDD: required
- Covers: #5, #6, #7, #9, #10, #11
- Uses: C1
- Depends-on: none
- Files: viber/skills/setup/assets/usage.html, tests/viber/usage.test.ts
- Delivers: the page's closing reference part (a card per skill, the agents grouped by stage, an entry per `viber.yml` key with the branching strategy examples) replacing today's command and switch lists, written from the current skill, agent and template files in both languages; a test enforcing the C1 rules over the page, each rule with a self-check on a synthetic bad sample.
- Verification: node --test tests/viber/usage.test.ts -> every test passes, the self-checks included; grep -c 'id="skill-' viber/skills/setup/assets/usage.html and grep -c '"./skills/' viber/.claude-plugin/plugin.json -> the same number
- DoD: the page has a card anchored `skill-<name>` for every skill `plugin.json` lists; the cards of exactly the skills whose frontmatter says `user-invocable: false` carry the self-starting label in both languages; the page has a line anchored `agent-<name>` for every agent `plugin.json` lists; the page has an entry anchored `key-<path>` for every key C1 names; the test fails on a sample missing a skill card; the test fails on a sample missing an agent line; the test fails on a sample where a self-starting card lacks its label or another card carries it; the test fails on a sample missing a key entry; the test fails on a sample breaking a language pair; the test fails on a sample with an internal link to a missing id; the test fails on a sample holding an em dash or an en dash; the test fails on a sample loading an external script or stylesheet; the test fails on a sample naming a `/viber:<name>` command no skill carries
<!-- /TASK -->

<!-- TASK -->
### T2 - Open the help with getting started and a command cheat sheet
- TDD: none
- Covers: #1, #6, #7
- Uses: C1
- Depends-on: T1
- Files: viber/skills/setup/assets/usage.html
- Delivers: the opening part replacing today's four-step strip and `CLAUDE.md` note: install, `/viber:setup`, what `CLAUDE.md` must state, one change walked from idea to commit, then a cheat sheet of every command a user can run, each linking to its skill card; both languages, humanizer rules applied.
- Verification: node --test tests/viber/usage.test.ts -> every test passes; grep -n 'id="getting-started"\|id="cheat-sheet"\|href="#skill-setup"' viber/skills/setup/assets/usage.html and grep -n '^name: setup' viber/skills/setup/SKILL.md -> both sections, the link and the skill name found
- DoD: the first section after the header is anchored `getting-started`; it names `/viber:setup` and the build and test commands `CLAUDE.md` must state; it walks one change from idea to commit; a section anchored `cheat-sheet` follows it; the cheat sheet lists every skill a user can start, each linking to its card
<!-- /TASK -->

<!-- TASK -->
### T3 - Add the task guides with three-step examples
- TDD: none
- Covers: #2, #6, #7
- Uses: C1
- Depends-on: T2
- Files: viber/skills/setup/assets/usage.html
- Delivers: a task-guides part with one guide per goal named in criterion 2, each headed by the goal, each with one three-step example (what you type, what viber does, what is left) checked against the skill it uses, rare cases folded in `<details>`, today's GitHub issue thread folded into the issue guide; both languages, humanizer rules applied.
- Verification: node --test tests/viber/usage.test.ts -> every test passes; grep -c 'class="guide"' viber/skills/setup/assets/usage.html -> 9, and grep -n 'argument-hint' viber/skills/fixer/SKILL.md beside grep -n '/viber:fixer' viber/skills/setup/assets/usage.html -> the fixer guide's example matches the skill's argument
- DoD: nine guides exist, one per goal of criterion 2; each guide holds exactly one three-step example; each example's command exists as a skill `plugin.json` lists; each guide links to the skill card it uses
<!-- /TASK -->

<!-- TASK -->
### T4 - Explain how viber works and add troubleshooting and a glossary
- TDD: none
- Covers: #3, #4, #6, #7
- Uses: C1
- Depends-on: T3
- Files: viber/skills/setup/assets/usage.html
- Delivers: a "How viber works" part covering the topics of criterion 3, a troubleshooting and questions part drawn from the refusals and stops the skills and scripts really produce, and a glossary of the terms the page uses (run, task, node, rule, switch and the rest), each term linked from its first use; both languages, humanizer rules applied.
- Verification: node --test tests/viber/usage.test.ts -> every test passes; grep -n 'id="how-it-works"\|id="troubleshooting"\|id="glossary"' viber/skills/setup/assets/usage.html and grep -n 'state: draft' viber/skills/implementor/SKILL.md -> the three sections found and the draft refusal the troubleshooting part cites exists in the source
- DoD: a section anchored `how-it-works` covers each topic of criterion 3; a section anchored `troubleshooting` holds each entry as a question with its answer; a section anchored `glossary` defines each term in one or two sentences; every glossary term links back from its first use on the page
<!-- /TASK -->

<!-- TASK -->
### T5 - Add search, copy buttons and the reading aids
- TDD: required
- Covers: #8, #10
- Uses: C1, C2, C3
- Depends-on: T4
- Files: viber/skills/setup/assets/usage.html, tests/viber/usage.test.ts
- Delivers: the navigation controls of criterion 8, all inline, the page fully readable with JavaScript off and the language choice kept as C3 states; the test extended with the C2 rules, each with a self-check.
- Verification: node --test tests/viber/usage.test.ts -> every test passes, the C2 self-checks included; grep -n 'help-search\|data-copy\|beforeprint' viber/skills/setup/assets/usage.html -> each hook found both in the markup and in the script reading it
- DoD: the first focusable element is a skip link to `#main`; the search field sits in a container hidden until the script reveals it, with a label in both languages; every searchable section carries the search marker and the script reads it; the no-results line exists in both languages; every `pre` block and cheat-sheet command carries the copy marker and the script reads it; every `h2` and `h3` carries a self-link to its own id; the script reads and writes the language choice only inside a `try` block; an `@media print` block hides the navigation and the script opens every `details` element before printing; a folding table of contents holds the same links as the wide-screen one; the test fails on a sample breaking each C2 rule
<!-- /TASK -->

<!-- TASK -->
### T6 - Refresh the page design with a contrast guard
- TDD: required
- Covers: #12, #13
- Uses: C1, C2, C4
- Depends-on: T5
- Files: viber/skills/setup/assets/usage.html, tests/viber/usage.test.ts, .claude/rules/tests-running.md
- Delivers: the page's look refreshed under `superui:pro-designer` (type, spacing, color tokens renamed to the C4 scheme in both themes, every control from T5 styled), the test extended with the C4 rules and their self-checks, and the file and test counts in `tests-running.md` brought to the tree's real ones.
- Verification: node --test tests/viber/usage.test.ts tests/orphan-tags.test.ts tests/superui/import-safety.test.ts -> every test passes, the C4 and closing-tag self-checks included; grep -n 'contrastRatio' tests/viber/usage.test.ts superui/skills/pro-designer/scripts/check_contrast.ts -> the import and the export both found
- DoD: every C4 pair reaches 4.5:1 in the light theme; every C4 pair reaches 4.5:1 in the dark theme; the test fails on a sample with a token pair under 4.5:1; the page holds no closing tag whose opener it lacks; the test fails on a sample ending in a bare closing tag with no opener
<!-- /TASK -->

## Contracts

### C1 - Help page reference anchors and structure rules

File: viber/skills/setup/assets/usage.html, tests/viber/usage.test.ts

- Skill card: an element with `id="skill-<name>"`, `<name>` the last path segment of each `viber/.claude-plugin/plugin.json` `skills[]` entry.
- Self-starting label: the card of every skill whose `SKILL.md` frontmatter has `user-invocable: false`, and no other card, holds `<span class="tag auto">` containing one `lang="en"` and one `lang="pl"` element.
- Agent line: an element with `id="agent-<name>"`, `<name>` the file name without `.md` of each `agents[]` entry.
- Key entry: an element with `id="key-<path>"` for each uncommented line of `viber/skills/setup/templates/viber.yml` at indent 0 or 2 that opens a key: `<path>` is the key itself at indent 0 (`key-adr`, and the group keys `key-directories`, `key-tiers`, `key-branching`) or `<group>-<child>` at indent 2 (`key-directories-runs`, `key-tiers-min`, `key-branching-mode`, `key-branching-work`); lines deeper than indent 2 (`base`, `name`, `target` under `work.main`) need no entry of their own. `key-branching-issue-type-mappings` is required as well, although the template ships it commented out.
- Part ids: `getting-started`, `cheat-sheet`, `how-it-works`, `troubleshooting`, `glossary`; each task guide is `<section class="guide" id="guide-<slug>">`, the class attribute holding `guide` alone.
- Language pair: inside `<body>`, the `lang` attributes appear in strict `en`, `pl`, `en`, `pl` order, each `pl` on an element with the same tag name as the `en` before it.
- Internal link: every `href="#<id>"` has a matching `id="<id>"` in the page.
- Command name: every `/viber:<name>` written on the page names a skill in `plugin.json`.
- No character U+2014 or U+2013 in the file.
- No `<script src=`, no `<link rel="stylesheet"`, no `@import`, no `url(` pointing to `http`.
- Every rule is a pure function over the page text (and the source texts) with a self-check proving it fires on a synthetic bad sample.

### C2 - Help page navigation hooks

File: viber/skills/setup/assets/usage.html, tests/viber/usage.test.ts

- `<main id="main">`; the first focusable element in `<body>` is `<a class="skip" href="#main">`.
- Search: `<div class="search" hidden>` holding `<input type="search" id="help-search">` and a `<label for="help-search">`; every searchable section carries `data-search`; `<p id="help-no-results" hidden>` holds one `lang="en"` and one `lang="pl"` element.
- Copy: every `<pre` in the page and every `<code` inside `id="cheat-sheet"` carries `data-copy`.
- Language storage: the script names `viber-usage-lang` only inside a `try` block (C3).
- Self-link: every `<h2` and `<h3` inside `<main>` has an `id` and contains `<a class="self" href="#<that id>">`.
- Narrow table of contents: `<details class="toc-narrow">` whose `href="#..."` set equals that of `<nav class="toc">`.
- Print: an `@media print` block hiding `.toc`, `.toc-narrow` and `.search`; the script listens for `beforeprint`.
- The script's own text names `help-search`, `data-search`, `help-no-results`, `data-copy` and `beforeprint`.
- Each rule above is a test rule with a self-check on a synthetic bad sample.

### C3 - Language choice storage

File: viber/skills/setup/assets/usage.html

`localStorage` key `viber-usage-lang`, value `en` or `pl`; read before first paint inside `try`, written on a switch click inside `try`; any other or missing value falls back to the first `en`/`pl` entry of `navigator.languages`, else `en`.

### C4 - Theme color pairs and closing tags

File: viber/skills/setup/assets/usage.html, tests/viber/usage.test.ts

- Every color token is a hex value declared in the light `:root` block and again in the `@media (prefers-color-scheme: dark)` `:root` block. A token whose name starts `--fg-` is a text color; one starting `--bg-` is a background a text color can sit on; any other token (borders, rules) is neither.
- Test rule: the token sets are read from the two blocks, never listed in the test; every `--fg-*` on every `--bg-*`, in each theme, has `contrastRatio(parseColor(fg), parseColor(bg)) >= 4.5`, both imported from `superui/skills/pro-designer/scripts/check_contrast.ts`; a theme with no `--fg-*` or no `--bg-*` token fails.
- Test rule: every closing tag in the page has an opener of the same name in the page.
- Each rule has a self-check on a synthetic bad sample.
