# T10 coder notes

- The template's `issues: true` (T2) plus `intent`'s save/resume flow and `fixer`'s `#N` argument
  (T7) were already in the tree; this task only had to surface them in the two user docs and the
  diagram, and fix the switch-count prose (`five of the six` / `six of the seven`) that the new
  `issues` row shifted - not named in DoD but left stale otherwise, and Verification's own grep
  would still pass without it, so it was a judgment call to keep the docs internally consistent.
- SVG only needed the one `/viber:idea` -> `/viber:intent` text node changed for DoD.4 (labels the
  interview step); left the `--idea` CSS variable/class names (`.l-i`, `.mk-i`, `var(--idea)`)
  untouched since they are style tokens, not the diagram's label, and outside what the grep checks.
  Also reworded the `<desc>`'s "idea interview" phrase to "intent interview" since it names the
  skill by its old name, not just the general concept (unlike the title/h1's "from an idea...").
- Left generic uses of the word "idea" (README's title, "an idea too big for one cycle") alone:
  they describe the concept, not the `/viber:idea` command, so DoD.1 does not reach them and the
  Verification grep (`viber:idea|>idea<`) never matches them either.
