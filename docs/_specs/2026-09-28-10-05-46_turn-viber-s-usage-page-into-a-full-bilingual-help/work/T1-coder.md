# T1 coder notes

- The test does not yet require the part ids (`getting-started`, `cheat-sheet`, `how-it-works`, `troubleshooting`, `glossary`) because T2 to T4 add them and are `TDD: none`. Only the guide-class rule is enforced (a `guide-*` section must carry `class="guide"` alone), and it passes trivially until T3.
- Language pair rule: a `lang` attribute nested inside another `lang` element breaks the strict en/pl order. Put a `<q>` or `<code>` inside a paired span with no `lang` of its own. Polish quote marks come from CSS (`[lang="pl"] q`).
- The Write tool turned `–`/`—` escapes into the real characters. The test builds them with `String.fromCharCode` so it holds neither one.
- Reference layout: `#reference` (h2) holds `#ref-skills`, `#ref-agents`, `#ref-config` (h3.sub). Cards and groups are h4 and strategy examples are h5, so T5's self-link rule (h2/h3 only) touches just those four headings.
- Group key ids (`key-directories`, `key-tiers`, `key-branching`) sit on the group's h4. Child ids sit on the `dl > div`.
- The old "ways in / after / schedule / any time / switches" sections are gone. The `#first` and `#issues` sections are left for T2 and T3 to replace.
- The template ships `issues: false`, so the page tags it off and says "five of seven start on".
