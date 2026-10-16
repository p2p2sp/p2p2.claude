# Final review 1

## Blocking

None.

## Minor

1. docs/viber-functions.html:651-672 and :857-874 - the function catalogue has no entry for `/viber:pr-feedback`. Proof: the "Pull requests" section lists only `/viber:pr-create`, and "Where it writes" lists `.temp/viber/` only as "scratch files and mockups" with no pr-feedback line. The catalogue is kept in step with skills (commit 98805e5d "Bring the function catalogue up to the folded skills"). Fix: add a section, or a list under "Pull requests", describing both calls of `/viber:pr-feedback` (collect threads, hand to intent, `--reply` posts once per thread, never resolves, stops on a wrong branch or an unpushed HEAD), and mention `.temp/viber/pr-feedback/` under "Where it writes".

2. viber/skills/setup/assets/help.html (the `skill-pr-feedback` card, Start row, `pl` text) - "na gałęzi głównej pull requesta" reads "on the pull request's main branch"; the `en` text says "own head branch". Fix: use "na gałęzi źródłowej pull requesta" (head branch).
