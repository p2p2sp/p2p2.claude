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
