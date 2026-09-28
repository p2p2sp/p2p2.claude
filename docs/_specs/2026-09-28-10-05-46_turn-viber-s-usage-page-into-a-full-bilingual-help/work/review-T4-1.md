# Review T4 round 1

Verification: `node --test tests/viber/usage.test.ts` gives 37/37 passing. Both greps find their targets: the three section ids and `state: draft` at implementor/SKILL.md:62. DoD.1 to DoD.4 are all built: every glossary term's first prose use links to it in both languages. The findings below are statements that break criterion 7 (the page must match the code).

## Blocking

1. viber/skills/setup/assets/usage.html:1347 (EN) and :1350-1351 (PL), section `hw-tasks`: "a failure gets up to three repair rounds before the build asks you" is wrong. implementor/SKILL.md:159-160 does this: test-runner FAIL on round 1 or 2 -> repair dispatch, FAIL on round 3 of 3 -> AskUserQuestion. That is three test runs and at most two repair rounds before the question. Fix: say the suite runs up to three times, with a repair round between runs, before the build asks. Reword the troubleshooting answer `ts-tests` (:1494-1499, "the suite runs again, for up to three rounds") the same way so it cannot be read as three repairs.

2. viber/skills/setup/assets/usage.html:1525-1531, `ts-e2e`: the answer gives `qa` off as the only reason there is no `qa.e2e.md`, and tells the reader to turn `qa` on. agents/qa-writer.md:27 writes `qa.e2e.md` only when the UI or the endpoints changed, and returns `VERDICT: NONE` otherwise. A build with `qa: true` and neither kind of change also leaves no handoff, and for that reader this answer is misleading. Fix: name both causes (`qa` off, or a change with no UI or endpoint part) in both languages. In the same way, the `hw-close` bullet at :1385-1390 says the qa close always writes both `qa.md` and `qa.e2e.md`. Make those writes conditional as qa-writer.md:27 states (qa.md when the UI changed, qa.e2e.md when the UI or the endpoints changed).
