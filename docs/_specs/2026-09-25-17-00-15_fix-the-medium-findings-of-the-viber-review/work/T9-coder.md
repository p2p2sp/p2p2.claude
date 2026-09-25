# T9 - coder notes

- Two spots carried the stale claim: the flow step's `.what` paragraphs and the `ways-in`
  `/viber:intent` `dd`. Both fixed, matching the existing `<code>issues</code>` inline-code style
  used elsewhere in the file rather than plain text.
- Flow step now names fixer's failing reproduction test explicitly (EN "reproduction test", PL
  "test reprodukcyjny") since that step covers both `/viber:intent` and `/viber:fixer`.
- No script or SKILL.md touched: `viber/skills/fixer/SKILL.md` already used "reproduction test"
  verbatim, satisfying the cross-file grep without edits there.
