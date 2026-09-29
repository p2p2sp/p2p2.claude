# Final review - slice 1 (T1, T2, T3, T4)

## Blocking

None.

## Minor

1. `viber/skills/setup/assets/help.html:2159` - the `implementor` card's "Switches" entry (`#skill-implementor`, lines 2157-2166) is out of date. It lists `memory`, `rules`, `qa`, `cleanup`, `tiers` and `branching` as the switches that shape the build, in English and Polish. `baseline-tests` is missing from both lists and from the rest of the card, even though T4 made `implementor` read it: `viber/skills/implementor/SKILL.md:104-106` and `:160-162` preload `switch-text.sh baseline-tests ... baseline-run` / `baseline-close`. Someone reading the card to learn what changes a build will not find the new switch there. It is only reachable through the `#key-baseline-tests` entry, the `#hw-tasks` walkthrough and the `test-runner` agent line.
   Fix: add one clause to both language spans of that `<dd>`. English: `<a href="#key-baseline-tests"><code>baseline-tests</code></a> adds a baseline test run before the first task;`. Polish: `<a href="#key-baseline-tests"><code>baseline-tests</code></a> dodaje przebieg bazowy testów przed pierwszym zadaniem;`. Keep the two spans paired.
