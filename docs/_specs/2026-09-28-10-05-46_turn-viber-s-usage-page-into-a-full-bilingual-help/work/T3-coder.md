# T3 coder notes

- The old `#issues` section is gone: its thread, sample commit and prototype note now sit in a `<details>` inside `#guide-issue`, and the TOC entry points to `#guides`. The `.thread`, `.commit` and `.caption` CSS still serve it.
- Part `<section id="guides">` wraps the nine `<section class="guide">`; every guide `h3.sub` already has an id (`guide-<slug>-title`) for T5's self-link rule, and the part opens with a `ul.guide-index` of chips.
- Three-step example = `ol.steps` with three `li`, each opening on `span.label` (You type / viber does / What is left); rare cases = `details > ul.rare`. New CSS: `.guide-index`, `.guide`, `.steps`, `details`, `summary`, `.rare`: T6 restyles them.
- Resume has no command (implementor is `user-invocable: false`), so its "You type" is the phrase `Continue the build` in `<q>`, never `/viber:implementor`.
- A command with no translatable words (`/viber:triage #42`, `/viber:handoff`, `/viber:e2e`, `/viber:memory review`) sits in a bare `<p>` with no `lang`; one with words is an en/pl `p` pair.
- The handoff paste line stays literal English in the en text only; the pl text describes it, since the skill words it in the conversation's language.
