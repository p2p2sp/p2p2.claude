# supercc skills

## model-prompting references

- Each profile's header paragraph (alias, ID, release date, context, knowledge cutoff, price, thinking, effort default) is restated in `cross-model.md` (`Context`, `Knowledge`, `Thinking`, `Effort` and price lines under Where the models pull apart and Choosing model and effort). Correcting one of those figures in a profile updates the matching `cross-model.md` line in the same edit, and moves the `Knowledge as of` date in `SKILL.md`.
- Quoted snippets in the profiles are measured wording, some marked verbatim: an edit to a profile never paraphrases one, it only adds, drops or replaces whole clauses.

## Linter severity against the doctrine

- `lint_skill.sh` enforces some of the doctrine's hard caps more softly than `SKILL.md` states them: a reserved word in `name` is a WARN, a reference over 100 lines without a table of contents, or with one that does not match its `##` headings, is a WARN up to 300 lines and a FAIL only past that, and italics and an `I` or `you` in the description (the doctrine asks for the third person) are a WARN. Tightening or loosening one of these is a decision on both files, never a silent fix of one.
- WARN-only thresholds with no doctrine counterpart: description over 800 chars, under 15 or over 120 words, no when-to-use cue; body over 400 lines; a `.sh` in `scripts/` without the exec bit.
- The `scripts/` sweep skips `lint_skill.sh` by name, so linting `skill-designer` never flags the `jq`/`bc` pattern inside the linter's own regexes.
