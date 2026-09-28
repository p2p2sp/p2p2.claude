# T2 coder notes

- The four-step `.path` strip, the `#first` section and their CSS (`.path`, `.flow`, `.step`, `.first`) are gone; the walk-through uses a new `ol.walk`, the CLAUDE.md list `ul.musts`. `#issues` and its `.thread` CSS are untouched for T3.
- Getting started holds four `h3.sub` with ids (`gs-install`, `gs-setup`, `gs-claude-md`, `gs-first-change`) so T5's self-link rule has an id on every h3 already.
- The cheat sheet (`dl.cheat`) keeps exactly one `<code>` per row, the command in the `dt`: C2 puts `data-copy` on every `<code` inside `#cheat-sheet`, so descriptions name `CLAUDE.md` and `.claude/rules/` as plain text.
- planner, implementor and tdd have no command, so the cheat sheet lists the 11 typed commands and a note links the three self-starting cards.
- A command example with translatable words is paired (`p.say` en, then pl) to keep the strict en/pl order.
- Missing tools differ: `gh` reports the script's ERROR (pasted text still works), `node` skips only a merge into an existing settings file (`merge-settings.sh`), Playwright gets an install-or-abort question (`e2e/SKILL.md`). Never write one blanket "skips with a note".
