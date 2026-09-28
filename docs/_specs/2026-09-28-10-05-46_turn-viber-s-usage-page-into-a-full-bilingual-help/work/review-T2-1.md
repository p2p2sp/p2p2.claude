# Review T2 - round 1

## Blocking

1. viber/skills/setup/assets/usage.html:511 (en) and :516-517 (pl) - "A step whose tool is missing skips with a note." / "Krok, któremu brakuje narzędzia, zostaje pominięty z krótką informacją." is false for Playwright, one of the three tools the sentence covers. `viber/skills/e2e/SKILL.md:36` says a `not found` from `check-playwright.sh` raises one `AskUserQuestion`: install it now, or abort. Nothing is skipped. That breaks covered criterion #7 (every statement matches the files it describes) and the task's Out of scope rule that the page follows the code. Fix: say what really happens for each tool, e.g. "Without `node` the settings merge is skipped and the recommended block is printed. `/viber:e2e` offers to install Playwright or stops.", and match the Polish text to it. Or limit the skip-with-note sentence to the tools where it holds.
