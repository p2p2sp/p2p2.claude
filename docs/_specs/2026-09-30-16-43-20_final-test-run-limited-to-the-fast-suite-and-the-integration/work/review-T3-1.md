# Review T3 - round 1

Verification ran: `grep -c "run: <dir>"` -> test-runner.md 3, implementor SKILL.md 1; `node --test ... tests/viber/help.test.ts tests/portability.test.ts` -> all pass. DoD.1-DoD.6 hold (test-runner.md frontmatter, Run section scope list and selection steps 1-3 ending on the required sentence, SKILL.md:175).

## Blocking

1. viber/skills/setup/assets/help.html:814 and :818 (walkthrough step "The build closes", EN and PL) - still says "The whole test suite runs once more" / "Cały zestaw testów uruchamia się jeszcze raz". Criterion #10, under this task's `Covers`, requires `help.html` in both languages to describe the final run as the fast command plus the change's integration tests, and no other task in this run touches these paragraphs (T6's DoD.4 covers only the setup check). Fix: reword both to the fast tests plus the integration tests the change reaches, matching the wording already used at hw-close.

2. viber/skills/setup/assets/help.html:1744-1750 (troubleshooting `#ts-tests`, EN and PL summary and body) - "What if the whole test suite fails at the end of a build?" / "cały zestaw testów nie przechodzi" and "The suite runs at most six times" still describe the final run as the whole suite. Same criterion #10. Fix: rename the question and body to the final test run (fast tests plus the change's integration tests).

3. viber/skills/setup/assets/help.html:2314 and :2319 (implementor description, EN and PL) - "before it runs the whole test suite" / "zanim uruchomi cały zestaw testów". Same criterion #10; the page now contradicts itself between hw-close / the test-runner entry and these passages. Fix: replace with the fast tests plus the change's integration tests in both languages.
