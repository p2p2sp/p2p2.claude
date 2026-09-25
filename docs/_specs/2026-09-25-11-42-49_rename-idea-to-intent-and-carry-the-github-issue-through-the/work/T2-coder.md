# T2 coder notes

- `bootstrap.sh`'s merge is fully generic over the template's top-level keys, so adding
  `issues: true` to `viber/skills/setup/templates/viber.yml` was enough for the merge to
  pick it up, report it, and insert it in template order - no bootstrap.sh code change
  needed, matching DoD.3 and C2 without touching the script.
- `config.sh`'s fixed key list lives in two places that must move together: the `for key in
  ...` loop and the header's `keys:`/example-output comment block. Both updated.
- Existing fixtures in `config.test.ts` and `bootstrap.test.ts` that hard-code the full
  switch/key set (`OFF`, the "seeded template" test, the "every template key" merge
  fixtures) needed `issues` added by hand; they don't derive from the template
  automatically, so DoD.4 is a manual per-fixture edit, not a single shared constant.
- Kept the template's new comment to one line per DoD.2's literal wording ("under a
  one-line comment"), unlike some neighbouring switches that carry two.
