# T5 coder notes

- "Searchable section" means every `<section>`: the test requires `data-search` on each one, nested ones included. The filter hides each one on its own, so a parent stays visible when any child matches, since the parent's text holds the child's.
- Search matches only the text in the shown language. It builds an en and a pl copy of each section's text once at load, before the copy buttons exist, so "Copy"/"Kopiuj" never matches. Switching language runs the filter again.
- h2 and some h3 had no id: the new ones are `<section-id>-title` (`getting-started-title`, `ref-skills-title`, ...), which matches the existing `guide-*-title` ones. The self-link is a bare `#` at the end of the heading.
- The script sets `span.lang` as a property and never writes a `lang="` string: the language-pair and focusable rules scan the whole `<body>` text, the inline script included.
- The cheat-sheet copy button goes after the enclosing `<a>`, never inside it (no nested interactive elements). A `pre` gets wrapped in `div.copy-wrap`.
- `[hidden] { display: none !important; }` is global, because the search hides sections through the `hidden` property. T6 has to keep it when restyling.
- The C2 self-checks change one substring of the `HOOKED` sample. If a replace misses, the sample stays clean and the self-check fails, so a stale pattern cannot pass quietly.
